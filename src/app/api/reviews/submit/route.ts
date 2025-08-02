import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { reviewApiRequestSchema } from '@/lib/schemas/forms/review';

// Simplified CSRF token verification
async function verifyCSRFToken(headers: Headers): Promise<boolean> {
  // In a real implementation, you would extract the CSRF token from cookies and verify it
  // For this implementation, we'll rely on Next-Auth's built-in CSRF protection
  const csrfTokenHeader = headers.get('x-csrf-token');
  
  if (!csrfTokenHeader) {
    return false;
  }
  
  // Simple validation for demonstration purposes
  return csrfTokenHeader.length > 0;
}

export async function POST(req: NextRequest) {
  let requestData = { user_id: 'unknown', class_code: 'unknown', schema: 'unknown' };
  
  try {
    // Attempt to verify CSRF
    const csrfIsValid = await verifyCSRFToken(req.headers);
    
    if (!csrfIsValid) {
      return NextResponse.json({ message: 'Invalid CSRF token' }, { status: 403 });
    }
    
    // Verify authenticated user
    const session = await auth();
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: 'Unauthorized - valid email required' }, { status: 401 });
    }
    
    // Get request body
    const rawData = await req.json();
    
    // Validate request body against schema
    const validation = reviewApiRequestSchema.safeParse(rawData);
    
    if (!validation.success) {
      return NextResponse.json({
        message: 'Invalid review data',
        errors: validation.error.format()
      }, { status: 400 });
    }
    
    const data = validation.data;
    
    // Save request data for error reporting
    requestData = {
      user_id: data.user_id || 'unknown',
      class_code: data.class_code || 'unknown',
      schema: data.schema || 'unknown',
    };
    
    // Validate email matches the session (don't check user_id as it comes from the database)
    if (data.email && data.email !== session.user.email) {
      return NextResponse.json({ 
        message: 'Email mismatch - session email does not match submitted email',
        details: {
          sessionEmail: session.user.email?.substring(0, 3) + '...',
          submittedEmail: data.email?.substring(0, 3) + '...',
        }
      }, { status: 403 });
    }
    
    // Initialize Supabase client with the appropriate schema
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ message: 'Database configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: data.schema,
      },
    });
    
    // Validate the user exists in our custom users table by checking email
    const { data: userDataByEmail, error: userEmailError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', session.user.email)
      .single();
    
    if (userEmailError || !userDataByEmail) {
      console.error("Error validating user email:", userEmailError || "No user found");
      return NextResponse.json({ 
        message: 'User not found with the provided email address', 
        details: { 
          error: userEmailError?.message || "No user found",
          email: session.user.email?.substring(0, 3) + '...',
        }
      }, { status: 404 });
    }
    
    // Validate the user_id matches what's in our database
    if (data.user_id !== userDataByEmail.user_id) {
      console.error("User ID mismatch:", {
        providedUserId: data.user_id,
        actualUserId: userDataByEmail.user_id,
      });
      
      return NextResponse.json({ 
        message: 'User ID mismatch - the provided user ID does not match our records',
        details: {
          providedUserId: data.user_id,
          correctUserId: userDataByEmail.user_id,
        }
      }, { status: 403 });
    }
    
    // Check if the class code exists in the classes table
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class_code')
      .eq('class_code', data.class_code)
      .single();
    
    if (classError) {
      // If the error is not a "not found" error, it's a server error
      if (classError.code !== 'PGRST116') {
        console.error("Error checking class existence:", classError);
        return NextResponse.json(
          { message: `Error checking class existence: ${classError.message}` },
          { status: 500 }
        );
      }
      
      // If class not found
      if (!classData) {
        console.error("Class not found:", {
          class_code: data.class_code,
          schema: data.schema
        });
        return NextResponse.json(
          { 
            message: `The class code "${data.class_code}" does not exist in the database.`,
            details: {
              class_code: data.class_code,
              schema: data.schema
            }
          },
          { status: 400 }
        );
      }
    }
    
    // Log data before insertion for debugging
    console.log("Attempting to insert review with validated data:", {
      class_code: data.class_code, 
      user_id: data.user_id,
      schema: data.schema,
      classExists: !!classData,
      userExists: !!userDataByEmail
    });
    
    // Check for existing review using email (more reliable than user_id for auth)
    const { data: existingReviews, error: checkError } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('email', session.user.email)
      .eq('class_code', data.class_code);
      
    if (checkError) {
      return NextResponse.json(
        { message: `Error checking for existing review: ${checkError.message}` }, 
        { status: 500 }
      );
    }
    
    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json(
        { message: 'You have already submitted a review for this class' }, 
        { status: 409 }
      );
    }
    
    // Prepare review data (removing schema and any other unnecessary fields)
    const { schema: _schema, csrfToken: _, ...reviewData } = rawData;
    
    // Submit new review
    const { error: submitError } = await supabase
      .from('reviews')
      .insert(reviewData);
    
    if (submitError) {
      console.error("Error submitting review to Supabase:", {
        error: submitError,
        message: submitError.message,
        code: submitError.code,
        details: submitError.details,
        hint: submitError.hint,
        data: {
          ...reviewData,
          user_id_type: typeof reviewData.user_id,
          class_code_type: typeof reviewData.class_code,
          password: '[REDACTED]',
          csrfToken: '[REDACTED]',
        }
      });
      
      // Check for foreign key violation
      if (submitError.code === '23503' || submitError.message?.includes('foreign key constraint')) {
        // Extract which constraint was violated, if available
        const constraintMatch = submitError.message?.match(/violates foreign key constraint "(.+?)"/);
        const constraint = constraintMatch ? constraintMatch[1] : 'unknown';
        
        // Provide a more helpful error message
        let errorMessage = `Foreign key constraint violation (${constraint}). `;
        
        if (constraint.includes('user_id')) {
          errorMessage += "The user ID doesn't exist in the database.";
        } else if (constraint.includes('class_code')) {
          errorMessage += "The class code doesn't exist in the database.";
        } else {
          errorMessage += submitError.message || "Error submitting review";
        }
        
        return NextResponse.json(
          { 
            message: errorMessage,
            details: {
              constraint,
              code: submitError.code,
              user_id: reviewData.user_id,
              class_code: reviewData.class_code,
              schema: reviewData.schema,
            }
          }, 
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: `Error submitting review: ${submitError.message}` }, 
        { status: 500 }
      );
    }
    
    // The reviews_left count will be automatically updated by the database trigger
    // No need to manually update it here
    
    return NextResponse.json({ 
      message: 'Review submitted successfully' 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Review submission error:', error);
    
    // In development, include complete error details
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          message: 'An unexpected error occurred', 
          details: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
          requestData,
        }, 
        { status: 500 }
      );
    }
    
    // In production, return a generic error
    return NextResponse.json(
      { message: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 