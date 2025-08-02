import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithSchema } from '@/lib/supabase';
import { getSchoolFromHostname } from '@/config/themes';
import { databaseConfigs } from '@/config/database';

export async function GET(request: NextRequest) {
  try {
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
    
    // Get total count of classes
    const { count, error } = await supabaseWithSchema
      .from(dbConfig.tables.classes)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error getting class count:', error);
      return NextResponse.json(
        { error: 'Failed to get class count', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      total: count || 0
    });
  } catch (error) {
    console.error('Error in count endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 