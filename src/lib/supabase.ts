import { createClient } from '@supabase/supabase-js';
import { getSchoolFromHostname } from '@/config/themes';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
const supabase = createClient(supabaseUrl, supabaseKey);

// Utility function to get the correct schema based on the hostname
export function getSchemaForRequest(req: Request): string {
  const hostname = req.headers.get("host") || "";
  const school = getSchoolFromHostname(hostname);
  
  
  return school.shortName.toLowerCase();
}

// Function to get a Supabase client with the correct schema
export function getSupabaseWithSchema(req: Request) {
  const schema = getSchemaForRequest(req);
  console.log(`Using schema: ${schema} for hostname: ${req.headers.get("host")}`);
  return supabase.schema(schema);
}

export default supabase; 