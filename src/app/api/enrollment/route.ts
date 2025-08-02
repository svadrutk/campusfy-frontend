import { NextResponse } from 'next/server';
import { EnrollmentDataSchema } from '@/lib/schemas/enrollment';
import { z } from 'zod';

// Map of school aliases to their canonical names
const SCHOOL_ALIASES: { [key: string]: string } = {
  'wisco': 'wisc',
  'wisc': 'wisc',
  'wisconsin': 'wisc',
  'utah': 'utah',
  'u of u': 'utah'
};

// Define Zod schema for enrollment request parameters
const EnrollmentRequestSchema = z.object({
  class_code: z.string()
    .min(1, { message: "Class code is required" })
    .regex(/^[A-Za-z\s]+\s*\d+$/, { 
      message: "Class code should be in format 'SUBJECT CODE' (e.g., 'COMP SCI 400')" 
    }),
  school: z.string()
    .min(1, { message: "School is required" })
    .toLowerCase()
    .refine(
      (val) => Object.keys(SCHOOL_ALIASES).includes(val),
      { message: `School must be one of: ${Object.keys(SCHOOL_ALIASES).join(', ')}` }
    ),
  term: z.string().optional(),
});

export async function GET(request: Request) {
  console.log('=== MAIN ENROLLMENT ROUTE START ===');
  console.log('Request URL:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate request parameters using Zod
    const validationResult = EnrollmentRequestSchema.safeParse({
      class_code: searchParams.get('class_code') || '',
      school: searchParams.get('school') || '',
      term: searchParams.get('term'),
    });
    
    if (!validationResult.success) {
      console.error('=== VALIDATION ERROR ===');
      console.error(validationResult.error.format());
      return NextResponse.json({ 
        error: 'Invalid request parameters', 
        details: validationResult.error.format()
      }, { status: 400 });
    }
    
    // Extract validated parameters
    const { class_code: classCode, school, term } = validationResult.data;
    
    console.log('=== VALIDATED REQUEST PARAMETERS ===');
    console.log('classCode:', classCode);
    console.log('school:', school);
    console.log('term:', term);

    // Normalize school name
    const normalizedSchool = SCHOOL_ALIASES[school];
    
    // Get the appropriate API endpoint based on the school
    const apiEndpoint = `/api/enrollment/${normalizedSchool}`;
    console.log('Using API endpoint:', apiEndpoint);

    // Forward the request to the appropriate API endpoint including headers
    // This preserves the referrer and other headers needed for middleware validation
    const forwardResponse = await fetch(`${new URL(request.url).origin}${apiEndpoint}?${searchParams.toString()}`, {
      headers: {
        // Pass through the original request's headers to preserve referrer
        ...Object.fromEntries(new Headers(request.headers)),
        // Add additional headers for internal API calls
        'X-Internal-Request': 'true',
        'X-Original-Referrer': request.headers.get('referer') || '',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    // If response is not ok, try to get the error message
    if (!forwardResponse.ok) {
      console.error('=== ERROR: School API response error ===');
      console.error('Status:', forwardResponse.status);
      let errorData;
      try {
        const text = await forwardResponse.text();
        console.error('Response text:', text);
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: text };
        }
      } catch {
        errorData = { error: 'Failed to read error response' };
      }
      console.error('Error data:', errorData);
      return NextResponse.json(errorData, { status: forwardResponse.status });
    }

    const data = await forwardResponse.json();

    // Validate the response against our schema
    const validatedResponse = EnrollmentDataSchema.parse(data);

    console.log('=== SUCCESSFUL RESPONSE ===');
    console.log('Sections:', validatedResponse.sections.length);
    console.log('Totals:', validatedResponse.totals);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('=== ERROR: Internal server error ===');
    console.error(error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 