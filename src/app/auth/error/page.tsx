"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSchoolFromHostname } from "@/config/themes";

function ErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get error details from URL
    const error = searchParams.get("error");
    console.log("Error page received error:", error);
    
    // Get the correct domain from school config
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? window.location.origin : `https://${school.domain}`;
    
    // Create a URL for redirection
    const redirectUrl = new URL("/auth/login", baseUrl);
    
    // Handle specific errors
    if (error === "CredentialsSignin" || error === "CallbackRouteError") {
      // Generic credentials error
      redirectUrl.searchParams.set("error", "InvalidCredentials");
    } else if (error) {
      // Pass through other errors
      redirectUrl.searchParams.set("error", error);
    }
    
    // Redirect to login page with error parameters
    router.replace(redirectUrl.toString());
  }, [router, searchParams]);
  
  // Show a loading state while redirecting
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Processing...</h2>
        <p className="text-gray-600">Redirecting you to the login page.</p>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
} 