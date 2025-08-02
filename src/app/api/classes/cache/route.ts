import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithSchema } from '@/lib/supabase';
import { getSchoolFromHostname, schoolConfigs } from '@/config/themes';
import { databaseConfigs } from '@/config/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Get the Supabase client with the correct schema
    const supabaseWithSchema = getSupabaseWithSchema(request);
    
    // Get current university configuration
    const hostname = request.headers.get("host") || "";
    const school = getSchoolFromHostname(hostname);
    const dbConfig = databaseConfigs[school.shortName.toLowerCase()];
    const schoolConfig = schoolConfigs[school.shortName.toLowerCase()];
    
    if (!dbConfig) {
      console.error('No database configuration found for school:', school.shortName);
      return NextResponse.json(
        { error: 'School configuration not found' },
        { status: 500 }
      );
    }

    // Get column names from school config's apiFields
    const apiFields = schoolConfig?.filters?.apiFields || {};
    const columnNames = Object.values(apiFields)
      .map(field => field.apiField)
      .filter(Boolean)
      .join(', ');

    // Add required fields that might not be in apiFields
    // Handle different credit column names for each university
    const creditFields = school.shortName.toLowerCase() === 'utah' 
      ? 'min_credits, max_credits'
      : 'credits';
    
    const requiredFields = `class_code, course_name, course_desc, ${creditFields}, requisites, grade_count, gpa, vector_embedding, indexed_difficulty, indexed_fun, indexed_workload, review_count, overall_rating`;
    const selectFields = `${requiredFields}${columnNames ? `, ${columnNames}` : ''}`;
    
    // Build query without grade data
    console.log('Attempting to fetch classes with fields:', selectFields);
    
    const { data: classes, count, error: classesError } = await supabaseWithSchema
      .from(dbConfig.tables.classes)
      .select(selectFields)
      .range(offset, offset + limit - 1);
    
    if (classesError) {
      console.error('Error fetching classes:', {
        error: classesError,
        query: {
          table: dbConfig.tables.classes,
          fields: selectFields,
          range: [offset, offset + limit - 1],
          school: school.shortName,
          schema: supabaseWithSchema.schema
        }
      });
      
      // Check if it's a column error
      if (classesError.message.includes('column') || classesError.message.includes('field')) {
        return NextResponse.json(
          { 
            error: 'Invalid column in query', 
            details: classesError.message,
            query: selectFields
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch classes', 
          details: classesError.message,
          query: selectFields
        },
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
    
    return NextResponse.json({
      classes,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error in cache endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 