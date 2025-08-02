import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithSchema } from '@/lib/supabase';
import { buildVectorIndex, searchVectorIndex } from '@/utils/vectorIndexUtils';
import { generateEmbedding } from '@/utils/vectorSearchUtils';
import { ClassData } from '@/types/classes/classTypes';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || 'artificial intelligence';
    
    // Get the Supabase client with the correct schema
    const supabaseWithSchema = getSupabaseWithSchema(request);
    
    // Fetch classes
    const { data: classes, error } = await supabaseWithSchema
      .from('classes_undergrad')
      .select('*')
      .limit(100);
    
    if (error) {
      console.error('Error fetching classes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }
    
    // Build vector index
    console.log(`Building vector index with ${classes.length} classes`);
    buildVectorIndex(classes as ClassData[]);
    
    // Generate embedding for query
    console.log(`Generating embedding for query: "${query}"`);
    const embedding = await generateEmbedding(query);
    
    if (!embedding) {
      return NextResponse.json(
        { error: 'Failed to generate embedding for query' },
        { status: 500 }
      );
    }
    
    // Search vector index
    console.log('Searching vector index...');
    const results = searchVectorIndex(embedding, 10, 0.1);
    
    return NextResponse.json({
      status: 'ok',
      query,
      totalResults: results.length,
      results: results.map(r => ({
        class_code: r.class_code,
        course_name: r.course_name,
        score: r.vectorScore
      }))
    });
  } catch (error) {
    console.error('Error in vector search test:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 