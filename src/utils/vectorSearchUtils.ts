import { ClassData } from '@/types/classes/classTypes';

// IndexedDB setup for embedding cache
const DB_NAME = 'embeddings_cache';
const STORE_NAME = 'embeddings';
const DB_VERSION = 1;

// In-memory cache for the current session to avoid duplicate API calls
const sessionEmbeddingCache = new Map<string, number[]>();

// Flag to track pending requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<number[] | null>>();

// Initialize the database
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, _reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      _reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'text' });
      }
    };
  });
}

// Get embedding from IndexedDB cache
async function getEmbeddingFromCache(text: string): Promise<number[] | null> {
  // Normalize the text for consistent caching
  const cacheKey = text.trim().toLowerCase();
  
  // Check session cache first (fastest)
  if (sessionEmbeddingCache.has(cacheKey)) {
    return sessionEmbeddingCache.get(cacheKey) || null;
  }
  
  // Then check IndexedDB
  try {
    const db = await initDB();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Also store in session cache for faster future access
          sessionEmbeddingCache.set(cacheKey, result.embedding);
          resolve(result.embedding);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error getting embedding from cache:', event);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return null;
  }
}

// Store embedding in IndexedDB cache
async function storeEmbeddingInCache(text: string, embedding: number[]): Promise<void> {
  // Normalize the text for consistent caching
  const cacheKey = text.trim().toLowerCase();
  
  // Store in session cache
  sessionEmbeddingCache.set(cacheKey, embedding);
  
  // Also store in IndexedDB for persistence
  try {
    const db = await initDB();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ text: cacheKey, embedding });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error storing embedding in cache:', event);
        resolve();
      };
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
  }
}

/**
 * Generates an embedding vector for the given text using the API
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || typeof text !== 'string') {
    console.error('Invalid input to generateEmbedding:', text);
    return null;
  }
  
  // Normalize the text for consistent caching
  const cacheKey = text.trim().toLowerCase();
  
  // If there's already a pending request for this text, return that promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) || null;
  }
  
  // Create a new request and store it in the pending map
  const embeddingPromise = (async () => {
    try {
      // Check cache first
      const cachedEmbedding = await getEmbeddingFromCache(cacheKey);
      if (cachedEmbedding) {
        return cachedEmbedding;
      }
      
      // If not in cache, call the API
      const startTime = performance.now();
      
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cacheKey })
      });
      
      const endTime = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`API response received in ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      if (!response.ok) {
        console.error('Error response from embeddings API:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        console.error('Invalid embedding response format:', data);
        return null;
      }
      
      // Store in cache for future use
      await storeEmbeddingInCache(cacheKey, data.embedding);
      
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    } finally {
      // Remove from pending requests when done
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store the promise in the pending map
  pendingRequests.set(cacheKey, embeddingPromise);
  
  return embeddingPromise;
}

/**
 * Calculates cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Reranks classes based on vector similarity to the query embedding
 */
export function reRankClassesByVectorSimilarity(
  classes: ClassData[],
  queryEmbedding: number[]
): ClassData[] {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return classes;
  }

  // Calculate similarity scores for each class
  const classesWithScores = classes.map(classItem => {
    // Skip if the class doesn't have a vector embedding
    if (!classItem.vector_embedding || !Array.isArray(classItem.vector_embedding)) {
      return { ...classItem, similarityScore: 0 };
    }

    // Calculate cosine similarity
    const similarity = cosineSimilarity(
      queryEmbedding,
      classItem.vector_embedding as number[]
    );

    return {
      ...classItem,
      similarityScore: similarity
    };
  });

  // Sort by similarity score (highest first)
  return classesWithScores.sort((a, b) => 
    (b.similarityScore || 0) - (a.similarityScore || 0)
  );
}

/**
 * Combines text search results with vector similarity search
 * Uses a weighted approach to balance keyword matching with semantic similarity
 */
export function hybridSearch(
  keywordResults: ClassData[],
  queryEmbedding: number[],
  topicWeight: number = 0.5
): ClassData[] {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return keywordResults;
  }

  console.log(`Performing hybrid search with topic weight: ${topicWeight}`);
  
  // Calculate similarity scores
  const resultsWithScores = keywordResults.map((classItem, index) => {
    // Keyword rank score (position in the original results)
    // Normalize to 0-1 range, with 1 being the highest rank
    const keywordScore = 1 - (index / Math.max(1, keywordResults.length - 1));
    
    // Vector similarity score
    let vectorScore = 0;
    if (classItem.vector_embedding && (
        Array.isArray(classItem.vector_embedding) || 
        typeof classItem.vector_embedding === 'string'
    )) {
      // Parse the vector embedding if it's a string
      const embedding = Array.isArray(classItem.vector_embedding) 
        ? classItem.vector_embedding 
        : parseVectorEmbedding(classItem.vector_embedding as string);
      
      if (embedding) {
        vectorScore = cosineSimilarity(
          queryEmbedding,
          embedding
        );
      }
    }
    
    // Combined score with weighting
    const combinedScore = (keywordScore * (1 - topicWeight)) + (vectorScore * topicWeight);
    
    return {
      ...classItem,
      keywordScore,
      vectorScore,
      combinedScore
    };
  });
  
  // Sort by combined score
  return resultsWithScores.sort((a, b) => 
    (b.combinedScore || 0) - (a.combinedScore || 0)
  );
}

/**
 * Parses the vector embedding from a string if needed
 */
export function parseVectorEmbedding(vectorString: string | number[] | null | undefined): number[] | null {
  if (!vectorString) return null;
  
  try {
    // If it's already an array, return it
    if (Array.isArray(vectorString)) {
      return vectorString as number[];
    }
    
    // Try to parse JSON string
    if (typeof vectorString === 'string') {
      if (vectorString.startsWith('[') && vectorString.endsWith(']')) {
        return JSON.parse(vectorString);
      }
      
      // Try to parse comma-separated values
      const values = vectorString
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(val => parseFloat(val.trim()));
      
      // Check if all values are valid numbers
      if (values.every(val => !isNaN(val))) {
        return values;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing vector embedding:', error);
    return null;
  }
}

/**
 * Gets the top matching topics for a class based on its vector embedding
 * This is useful for debugging and explaining why a class was ranked highly
 */
export async function getTopMatchingTopics(
  classItem: ClassData,
  allTopics: string[]
): Promise<{ topic: string, score: number }[]> {
  if (!classItem.vector_embedding || allTopics.length === 0) {
    return [];
  }
  
  // Get the class embedding
  const classEmbedding = Array.isArray(classItem.vector_embedding) 
    ? classItem.vector_embedding 
    : parseVectorEmbedding(classItem.vector_embedding as string);
  
  if (!classEmbedding) {
    return [];
  }
  
  // Calculate similarity for each topic
  const topicScores = await Promise.all(
    allTopics.map(async (topic) => {
      const topicEmbedding = await generateEmbedding(topic);
      if (!topicEmbedding) {
        return { topic, score: 0 };
      }
      
      const score = cosineSimilarity(classEmbedding, topicEmbedding);
      return { topic, score };
    })
  );
  
  // Return the topics sorted by score (highest first)
  return topicScores.sort((a, b) => b.score - a.score);
}

/**
 * Combines multiple embeddings using weighted averaging
 * @param embeddings Array of embedding vectors to combine
 * @param weights Optional array of weights for each embedding (defaults to equal weights)
 * @returns A single combined embedding vector
 */
export function combineEmbeddings(
  embeddings: number[][], 
  weights?: number[]
): number[] {
  if (!embeddings || embeddings.length === 0) {
    throw new Error('No embeddings provided to combine');
  }
  
  // Use provided weights or default to equal weights
  const embeddingWeights = weights || embeddings.map(() => 1);
  
  // Ensure weights array has the same length as embeddings array
  if (embeddingWeights.length !== embeddings.length) {
    throw new Error('Weights array must have the same length as embeddings array');
  }
  
  const dimensions = embeddings[0].length;
  const combinedEmbedding = new Array(dimensions).fill(0);
  let totalWeight = 0;
  
  // Calculate weighted sum
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    const weight = embeddingWeights[i];
    
    // Skip invalid embeddings
    if (!embedding || embedding.length !== dimensions) {
      console.warn(`Skipping invalid embedding at index ${i}`);
      continue;
    }
    
    totalWeight += weight;
    
    for (let d = 0; d < dimensions; d++) {
      combinedEmbedding[d] += embedding[d] * weight;
    }
  }
  
  if (totalWeight === 0) {
    throw new Error('Total weight is zero, cannot normalize');
  }
  
  // Normalize by total weight
  for (let d = 0; d < dimensions; d++) {
    combinedEmbedding[d] /= totalWeight;
  }
  
  // Normalize to unit length (important for cosine similarity)
  const magnitude = Math.sqrt(combinedEmbedding.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    throw new Error('Combined embedding has zero magnitude');
  }
  
  for (let d = 0; d < dimensions; d++) {
    combinedEmbedding[d] /= magnitude;
  }
  
  return combinedEmbedding;
}