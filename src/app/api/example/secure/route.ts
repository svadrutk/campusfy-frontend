import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validateApiKey, isAllowedOrigin } from '@/lib/apiUtils';

/**
 * Example secure API endpoint
 * 
 * This endpoint demonstrates multiple layers of API security:
 * 1. Origin validation (via middleware)
 * 2. Authentication check
 * 3. API key validation (for programmatic access)
 * 4. CSRF protection
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Origin check (already handled by middleware, but we can double-check)
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    
    if (!isAllowedOrigin(origin, referer)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }
    
    // 2. Authentication check (for user-specific data)
    const session = await auth();
    
    // 3. API key validation (for programmatic access)
    // This is an alternative to session-based auth for server-to-server communication
    let isAuthenticated = false;
    
    // Check for API key in headers (for programmatic access)
    const apiKey = req.headers.get('x-api-key');
    if (apiKey && validateApiKey(apiKey)) {
      isAuthenticated = true;
    }
    
    // Or check for user session (for browser access)
    else if (session?.user) {
      isAuthenticated = true;
    }
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // 4. CSRF protection check (for browser-based requests)
    // Skip this check for API key requests (they're using a different auth mechanism)
    if (!apiKey) {
      const csrfToken = req.headers.get('x-csrf-token');
      
      // This is a simplified check - in practice, NextAuth handles this 
      // with proper token verification against the stored cookie value
      if (!csrfToken) {
        return NextResponse.json(
          { error: 'CSRF token required' },
          { status: 403 }
        );
      }
    }
    
    // If all security checks pass, return the protected data
    return NextResponse.json({
      message: 'Secure data access successful',
      user: session?.user?.email || 'API client',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler with the same security measures
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Origin validation
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    
    if (!isAllowedOrigin(origin, referer)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }
    
    // 2. Authentication check
    const session = await auth();
    
    // 3. API key validation
    let isAuthenticated = false;
    
    // Check for API key in headers
    const apiKey = req.headers.get('x-api-key');
    if (apiKey && validateApiKey(apiKey)) {
      isAuthenticated = true;
    }
    // Or check for user session
    else if (session?.user) {
      isAuthenticated = true;
    }
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // 4. CSRF protection check (for non-API key requests)
    if (!apiKey) {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken) {
        return NextResponse.json(
          { error: 'CSRF token required' },
          { status: 403 }
        );
      }
    }
    
    // 5. Parse and validate the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('JSON parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Return a success response
    return NextResponse.json({
      message: 'Data received successfully',
      data: requestData,
      user: session?.user?.email || 'API client',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 