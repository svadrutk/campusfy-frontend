import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.PROJECT_ID,
});

// Cache for embeddings to avoid redundant API calls
const embeddingCache = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      console.error('Invalid input to embeddings API:', { text });
      return NextResponse.json(
        { error: 'Invalid input: text is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Create a consistent cache key
    const cacheKey = text.trim().toLowerCase();
    
    // Check cache first
    if (embeddingCache.has(cacheKey)) {
      console.log(`Using cached embedding for: "${cacheKey.substring(0, 30)}..."`);
      const cachedEmbedding = embeddingCache.get(cacheKey);
      return NextResponse.json({ embedding: cachedEmbedding });
    }
    
    console.log(`Generating new embedding for: "${cacheKey.substring(0, 30)}..."`);
    
    try {
      // Call OpenAI API to generate embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
        dimensions: 256, // Using 256 dimensions for cost efficiency
      });
      
      // Extract the embedding vector
      const embedding = response.data[0].embedding;
      
      // Cache the result
      embeddingCache.set(cacheKey, embedding);
      console.log(`Cached new embedding with length: ${embedding.length}`);
      
      return NextResponse.json({ embedding });
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      
      // Fallback to simple embedding if OpenAI fails
      console.log('Falling back to simple embedding generation');
      const simpleEmbedding = createSimpleEmbedding(text);
      
      // Cache the fallback embedding too
      embeddingCache.set(cacheKey, simpleEmbedding);
      
      return NextResponse.json({ embedding: simpleEmbedding });
    }
  } catch (error) {
    console.error('Error in embeddings API:', error);
    return NextResponse.json(
      { error: 'Failed to process embedding request' },
      { status: 500 }
    );
  }
}

/**
 * Creates a simple embedding from text when OpenAI API is not available
 * This is a fallback method and not as effective as the OpenAI embeddings
 */
function createSimpleEmbedding(text: string): number[] {
  console.log('Using fallback embedding generation method');
  
  // Convert text to lowercase and remove punctuation
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  // Initialize embedding vector with zeros
  const dimensions = 256; // Match the OpenAI embedding dimensions
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