import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getSchoolFromHostname } from "@/config/themes";
import { AuthCredentialsSchema, SignUpSchema } from "@/lib/schemas/auth/credentials";

// Custom error handling for NextAuth
export async function GET(request: NextRequest) {
  try {
    // Check if this is an error response
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    
    if (error) {
      console.log("NextAuth error in API route:", error);
      
      // Get the correct domain from school config
      const hostname = request.headers.get("host") || "";
      const school = getSchoolFromHostname(hostname);
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? url.origin : `https://${school.domain}`;
      
      // Handle CSRF errors specifically
      if (error === "MissingCSRF") {
        // Log detailed information about the request
        console.error("CSRF validation failed:", {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          hasCookies: request.headers.has('cookie'),
        });
        
        // Create a new URL with the error parameter
        const redirectUrl = new URL("/auth/login", baseUrl);
        redirectUrl.searchParams.set("error", "MissingCSRF");
        redirectUrl.searchParams.set("error_description", "Security validation failed. Please return to the original page and try again.");
        
        // Keep any callback URL from the original request
        const callbackUrl = url.searchParams.get("callbackUrl");
        if (callbackUrl) {
          redirectUrl.searchParams.set("callbackUrl", callbackUrl);
        }
        
        return NextResponse.redirect(redirectUrl);
      }
      
      // For other errors, redirect to login with the error
      const redirectUrl = new URL("/auth/login", baseUrl);
      redirectUrl.searchParams.set("error", error);
      
      // Keep any callback URL from the original request
      const callbackUrl = url.searchParams.get("callbackUrl");
      if (callbackUrl) {
        redirectUrl.searchParams.set("callbackUrl", callbackUrl);
      }
      
      return NextResponse.redirect(redirectUrl);
    }
    
    // Log the request for debugging
    console.log("Processing auth session request:", request.url);
    
    // Check environment variables before proceeding
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required Supabase environment variables");
      return new NextResponse(
        JSON.stringify({ 
          error: "Configuration Error", 
          message: "Missing required environment variables for authentication"
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handlers.GET(request);
  } catch (error) {
    console.error("Error in auth session API route:", error);
    
    // Provide more detailed error information
    let errorMessage = "There was a problem with the server configuration.";
    let errorDetails = "Check the server logs for more information.";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "No stack trace available";
    }
    
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Custom POST handler for better debugging and error handling
export async function POST(request: NextRequest) {
  try {
    // Log basic information about the POST request
    console.log(`Auth API POST request: ${request.url}`);
    
    // Check if this is a sign-out/logout request
    const url = new URL(request.url);
    const isSignOut = url.pathname.endsWith('/signout') || url.searchParams.has('signout');
    
    // Also check for callback and csrf token operations which shouldn't be validated the same way
    const isCallbackOperation = url.searchParams.has('callback');
    const isCsrfOperation = url.searchParams.has('csrf');
    
    // Skip validation for special NextAuth operations
    if (isSignOut || isCallbackOperation || isCsrfOperation) {
      console.log("Special NextAuth operation detected, bypassing credential validation");
      // Pass these requests directly to the handler without validation
      return handlers.POST(request);
    }
    
    const contentType = request.headers.get("content-type") || "";
    
    // Handle form-based authentication requests
    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        // Clone the request to read the body
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();
        
        // Determine which schema to use based on the request
        const isSignUp = formData.has("confirm");
        
        // Convert FormData to a plain object for validation
        const formDataObj: Record<string, string> = {};
        formData.forEach((value, key) => {
          formDataObj[key] = value.toString();
        });
        
        // Validate with the appropriate schema
        const validationResult = isSignUp 
          ? SignUpSchema.safeParse(formDataObj)
          : AuthCredentialsSchema.safeParse(formDataObj);
        
        if (!validationResult.success) {
          console.error("Validation error:", validationResult.error.format());
          
          // For JSON requests, return structured error
          if (formData.get("json") === "true") {
            return new NextResponse(
              JSON.stringify({ 
                error: "ValidationError", 
                details: validationResult.error.format()
              }),
              { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          // For form submissions, redirect to error page
          const url = new URL(request.url);
          const hostname = request.headers.get("host") || "";
          const school = getSchoolFromHostname(hostname);
          const isDev = process.env.NODE_ENV === 'development';
          const baseUrl = isDev ? url.origin : `https://${school.domain}`;
          
          const redirectUrl = new URL(isSignUp ? "/auth/register" : "/auth/login", baseUrl);
          redirectUrl.searchParams.set("error", "ValidationError");
          redirectUrl.searchParams.set("error_description", "Please check your input and try again.");
          
          // Keep any callback URL
          const callbackUrl = formData.get("callbackUrl")?.toString();
          if (callbackUrl) {
            redirectUrl.searchParams.set("callbackUrl", callbackUrl);
          }
          
          return NextResponse.redirect(redirectUrl);
        }
        
        // Log successful validation for debugging
        console.log("Form validation passed for", isSignUp ? "sign-up" : "sign-in");
      } catch (error) {
        console.error("Error processing form data:", error);
      }
    }
    
    // Pass the request to the NextAuth handler after validation
    const response = await handlers.POST(request);
    
    // Log the response status for debugging
    console.log(`Auth API response status: ${response.status}`);
    
    return response;
  } catch (error) {
    console.error("Error in auth POST handler:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 