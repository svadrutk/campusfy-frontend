import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithSchema } from '@/lib/supabase';
import { getSchoolFromHostname } from '@/config/themes';
import { databaseConfigs } from '@/config/database';
import { GetRequestSchema, PostRequestSchema } from '@/lib/schemas/api/classes';

// Interface for reviews (unused but kept for reference)
interface _Review {
  id: string;
  content: string;
  rating: number;
  date: string;
}

// Handle GET request based on university context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and parse input parameters
    const params = GetRequestSchema.safeParse(Object.fromEntries(searchParams));
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid input parameters', details: params.error.format() },
        { status: 400 }
      );
    }
    
    const { class_code, query, page, limit, count_only } = params.data;
    const offset = (page - 1) * limit;
    
    // Get the Supabase client with the correct schema
    const supabaseWithSchema = getSupabaseWithSchema(request);
    
    // Get current university configuration
    const hostname = request.headers.get("host") || "";
    const school = getSchoolFromHostname(hostname);
    const dbConfig = databaseConfigs[school.shortName.toLowerCase()];
    
    if (!dbConfig) {
      console.error('No database configuration found for school:', school.shortName);
      return NextResponse.json(
        { error: 'School configuration not found' },
        { status: 500 }
      );
    }
    
    // Build a query based on the university-specific fields from the request
    let classesQuery = supabaseWithSchema.from(dbConfig.tables.classes).select('*', { count: 'exact' });
    
    // Handle class code lookup
    if (class_code) {
      classesQuery = classesQuery.eq('class_code', class_code);
    }
    
    // Handle search query
    if (query && query.trim() !== '') {
      const searchQuery = query.trim().toLowerCase();
      const searchPattern = `%${searchQuery}%`;
      
      // Using the filter-builder API which is properly parameterized
      classesQuery = classesQuery
        .ilike('class_code', searchPattern)  // First condition
        .or('course_name.ilike.' + searchPattern);  // Second condition with .or()
    }
    
    // Apply pagination
    if (!count_only) {
      classesQuery = classesQuery.range(offset, offset + limit - 1);
    }
    
    // Execute the query
    const { data: classes, count, error: classesError } = await classesQuery;
    
    if (classesError) {
      console.error('Error searching classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to search classes', details: classesError },
        { status: 500 }
      );
    }
    
    if (!classes || classes.length === 0) {
      return NextResponse.json({
        classes: [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    
    // If count_only is true, return just the count
    if (count_only) {
      return NextResponse.json({
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    
    // Return the classes directly without fetching grades
    return NextResponse.json({
      classes: classes,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
    
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Handle POST request based on university context
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    
    // Validate the request body
    const result = PostRequestSchema.safeParse(rawBody);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const body = result.data;
    
    // Get the Supabase client with the correct schema
    const supabaseWithSchema = getSupabaseWithSchema(request);
    
    // Get current university configuration
    const hostname = request.headers.get("host") || "";
    const school = getSchoolFromHostname(hostname);
    const dbConfig = databaseConfigs[school.shortName.toLowerCase()];
    
    if (!dbConfig) {
      console.error('No database configuration found for school:', school.shortName);
      return NextResponse.json(
        { error: 'School configuration not found' },
        { status: 500 }
      );
    }
    
    // Handle pagination parameters
    const page = body.page || 1;
    const limit = body.limit || 20;
    const offset = (page - 1) * limit;
    
    // Start building the query
    let classesQuery = supabaseWithSchema
      .from(dbConfig.tables.classes)
      .select('*, vector_embedding, extracted_topics', { count: 'exact' });
    
    // Apply filters
    Object.entries(body).forEach(([key, value]) => {
      // Skip non-filter parameters
      if (key === 'page' || key === 'limit') return;
      
      // Special handling for boolean attributes
      if (key === 'boolean_attributes' && Array.isArray(value)) {
        // For each boolean attribute, add an OR condition
        const orConditions = value.map(attr => `${attr}.eq.true`);
        classesQuery = classesQuery.or(orConditions.join(','));
      } else if (key === 'credits' && Array.isArray(value) && value.length === 2) {
        // Handle credits filter for Utah (min_credits and max_credits)
        const [min, max] = value;
        classesQuery = classesQuery
          .gte('min_credits', min)
          .lte('max_credits', max);
      } else {
        // If no mapping found, use the key directly (fallback)
        if (Array.isArray(value)) {
          classesQuery = classesQuery.in(key, value);
        } else {
          classesQuery = classesQuery.eq(key, value);
        }
      }
    });
    
    // Apply pagination
    classesQuery = classesQuery.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: classes, count, error: classesError } = await classesQuery;
    
    if (classesError) {
      console.error('Error searching classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to search classes', details: classesError },
        { status: 500 }
      );
    }
    
    if (!classes || classes.length === 0) {
      return NextResponse.json({
        classes: [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    
    // Return classes without fetching grades
    return NextResponse.json({
      classes: classes,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 