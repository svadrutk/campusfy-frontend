import { ClassData } from '@/types/classes/classTypes';
import { cosineSimilarity, parseVectorEmbedding } from './vectorSearchUtils';

// In-memory index for vector search
interface VectorIndex {
  classItems: ClassData[];
  initialized: boolean;
}

// Global index instance
let vectorIndex: VectorIndex = {
  classItems: [],
  initialized: false
};

/**
 * Builds an in-memory vector index from class data
 * @param classes Array of class data with vector embeddings
 */
export function buildVectorIndex(classes: ClassData[]): void {
  console.log(`Building vector index from ${classes.length} classes...`);
  
  // Filter classes that have valid vector embeddings
  const classesWithEmbeddings = classes.filter(c => 
    c.vector_embedding && (
      Array.isArray(c.vector_embedding) || 
      typeof c.vector_embedding === 'string'
    )
  );
  
  console.log(`Found ${classesWithEmbeddings.length} classes with vector embeddings`);
  
  if (classesWithEmbeddings.length === 0) {
    console.warn('No classes with valid embeddings found. Creating a basic index with all classes.');
    
    // Log a sample of classes to see what's wrong
    console.log('Sample classes without embeddings:');
    classes.slice(0, 3).forEach((c, i) => {
      console.log(`Class ${i+1}: ${c.class_code}`, {
        hasEmbedding: !!c.vector_embedding,
        embeddingType: c.vector_embedding ? typeof c.vector_embedding : 'undefined',
        isArray: c.vector_embedding ? Array.isArray(c.vector_embedding) : false,
        sample: c.vector_embedding ? 
          (typeof c.vector_embedding === 'string' ? 
            c.vector_embedding.substring(0, 50) + '...' : 
            Array.isArray(c.vector_embedding) ? 
              c.vector_embedding.slice(0, 3) + '...' : 
              'unknown format') : 
          'none'
      });
    });
    
    // Initialize the index with all classes anyway
    // We'll generate embeddings on the fly when needed
    vectorIndex = {
      classItems: classes,
      initialized: true
    };
    
    console.log(`Built basic vector index with ${classes.length} classes (without embeddings)`);
    return;
  }
  
  // Store classes with embeddings in the index
  vectorIndex = {
    classItems: classesWithEmbeddings,
    initialized: true
  };
  
  // Log a sample of the embeddings
  console.log('Sample embeddings from index:');
  classesWithEmbeddings.slice(0, 3).forEach((c, i) => {
    const embedding = Array.isArray(c.vector_embedding) 
      ? c.vector_embedding 
      : parseVectorEmbedding(c.vector_embedding as string);
    
    console.log(`Class ${i+1}: ${c.class_code}`, {
      embeddingType: typeof c.vector_embedding,
      embeddingLength: embedding ? embedding.length : 0,
      sample: embedding ? embedding.slice(0, 3) : 'none'
    });
  });
  
  console.log(`Built vector index with ${classesWithEmbeddings.length} vectors`);
}

/**
 * Searches the vector index for similar classes
 * @param queryEmbedding The query embedding vector
 * @param limit Maximum number of results to return
 * @param threshold Minimum similarity score threshold (0-1)
 * @returns Array of classes sorted by similarity
 */
export function searchVectorIndex(
  queryEmbedding: number[], 
  limit: number = 100,
  threshold: number = 0.4
): ClassData[] {
  console.log(`Searching vector index with ${queryEmbedding.length}-dimensional query embedding`);
  console.log('Query embedding sample:', queryEmbedding.slice(0, 5));
  console.log(`Using similarity threshold: ${threshold}`);
  
  if (!vectorIndex.initialized) {
    console.error('Vector index not initialized. Call buildVectorIndex first.');
    return [];
  }
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    console.error('Invalid query embedding');
    return [];
  }
  
  console.log(`Calculating similarity against ${vectorIndex.classItems.length} classes`);
  
  // Calculate similarity for each class
  const results = vectorIndex.classItems.map(classItem => {
    // Parse the vector embedding if needed
    let embedding = null;
    
    if (classItem.vector_embedding) {
      embedding = Array.isArray(classItem.vector_embedding) 
        ? classItem.vector_embedding 
        : parseVectorEmbedding(classItem.vector_embedding as string);
    }
    
    // If no embedding exists, generate a simple one from the class name and description
    if (!embedding) {
      console.log(`No embedding found for ${classItem.class_code}, generating simple embedding`);
      // Use available text fields for embedding
      const textToEmbed = `${classItem.class_code} ${classItem.course_name}`;
      embedding = createSimpleEmbedding(textToEmbed, queryEmbedding.length);
    }
    
    // Calculate cosine similarity
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    
    return {
      ...classItem,
      vectorScore: similarity
    };
  });

  // Sort by similarity score (highest first)
  const sortedResults = results.sort((a, b) => (b.vectorScore || 0) - (a.vectorScore || 0));

  // Find the maximum similarity score
  const maxScore = sortedResults[0]?.vectorScore || 0;

  // Normalize scores by dividing by the maximum score
  const normalizedResults = sortedResults.map(item => ({
    ...item,
    vectorScore: maxScore > 0 ? (item.vectorScore || 0) / maxScore : 0
  }));
  
  // Filter by threshold and limit results
  const filteredResults = normalizedResults
    .filter(item => (item.vectorScore || 0) >= threshold)
    .slice(0, limit);
  
  console.log(`Found ${filteredResults.length} results with normalized similarity >= ${threshold}`);
  
  // Log top results
  if (filteredResults.length > 0) {
    console.log('Top 3 results:');
    filteredResults.slice(0, 3).forEach((item, idx) => {
      console.log(`${idx+1}. ${item.class_code} - ${item.course_name} (Score: ${item.vectorScore?.toFixed(4)})`);
    });
  }
  
  return filteredResults;
}

/**
 * Creates a simple embedding from text for fallback when no embeddings exist
 * This is a simplified version of the function in the API route
 */
function createSimpleEmbedding(text: string, dimensions: number = 256): number[] {
  // Convert text to lowercase and remove punctuation
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  // Initialize embedding vector with zeros
  const embedding = new Array(dimensions).fill(0);
  
  if (words.length === 0) {
    return embedding;
  }
  
  // For each word, update the embedding vector
  for (const word of words) {
    // Use a simple hash function to determine which dimensions to update
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to determine a position in the embedding
    const position = Math.abs(hash) % dimensions;
    
    // Update the embedding at that position
    embedding[position] += 1.0;
  }
  
  // Normalize the embedding to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Hybrid search combining keyword and vector similarity
 * @param classes Array of classes to search
 * @param queryEmbedding The query embedding vector
 * @param vectorWeight Weight to give vector similarity vs keyword ranking (0-1)
 * @param confidenceThreshold Minimum similarity score to include results (0-1)
 * @returns Array of classes sorted by combined score
 */
export function hybridVectorSearch(
  classes: ClassData[], 
  queryEmbedding: number[], 
  vectorWeight: number = 0.8,
  confidenceThreshold: number = 0.1
): ClassData[] {
  if (!classes || classes.length === 0 || !queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }
  
  console.log(`Performing hybrid search with vector weight: ${vectorWeight}, confidence threshold: ${confidenceThreshold}`);
  
  // Calculate vector similarity for each class
  const results = classes.map(classItem => {
    // Parse the vector embedding if needed
    let embedding = null;
    
    if (classItem.vector_embedding) {
      embedding = Array.isArray(classItem.vector_embedding) 
        ? classItem.vector_embedding 
        : parseVectorEmbedding(classItem.vector_embedding as string);
    }
    
    // Calculate vector similarity
    const vectorScore = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
    
    // Get keyword rank score (normalized to 0-1)
    // Lower rank number is better, so we invert it
    // Use index in the array as a fallback if rank is not available
    const rankScore = 1; // Default to 1 (highest) if no rank information is available
    
    return {
      ...classItem,
      vectorScore,
      rankScore
    };
  });

  // Sort by vector score to find maximum
  const sortedByVector = [...results].sort((a, b) => (b.vectorScore || 0) - (a.vectorScore || 0));
  const maxVectorScore = sortedByVector[0]?.vectorScore || 0;

  // Normalize vector scores and calculate combined scores
  const normalizedResults = results.map(item => ({
    ...item,
    vectorScore: maxVectorScore > 0 ? (item.vectorScore || 0) / maxVectorScore : 0,
    combinedScore: (maxVectorScore > 0 ? (item.vectorScore || 0) / maxVectorScore : 0) * vectorWeight + 
                  item.rankScore * (1 - vectorWeight)
  }));
  
  // Filter by confidence threshold and sort by combined score
  const filteredResults = normalizedResults
    .filter(item => (item.vectorScore || 0) >= confidenceThreshold)
    .sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
  
  console.log(`Hybrid search found ${filteredResults.length} results after applying confidence threshold`);
  
  // Log top results
  if (filteredResults.length > 0) {
    console.log('Top 3 hybrid results:');
    filteredResults.slice(0, 3).forEach((item, idx) => {
      console.log(`${idx+1}. ${item.class_code} - ${item.course_name} (Vector: ${item.vectorScore?.toFixed(4)}, Combined: ${item.combinedScore?.toFixed(4)})`);
    });
  }
  
  return filteredResults;
} 