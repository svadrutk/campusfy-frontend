"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/contexts/theme/ThemeContext";
import { getSchoolFromHostname } from "@/config/themes";

// Initialize Supabase client for client-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function LoginContent() {
  const searchParams = useSearchParams();
  const { school } = useTheme();
  
  // Initialize Supabase client with school context
  const _supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: school.shortName.toLowerCase(),
    },
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [returnUrl, setReturnUrl] = useState("/");

  // Set initial return URL from search params
  useEffect(() => {
    // Get return URL from query param
    const returnUrlParam = searchParams.get("callbackUrl");
    if (returnUrlParam) {
      console.log("Setting initial return URL from params:", returnUrlParam);
      setReturnUrl(returnUrlParam);
    }
  }, [searchParams]);

  // Check if user just registered
  useEffect(() => {
    const registered = searchParams.get("registered");
    if (registered === "true") {
      setSuccessMessage("Account created successfully! You can now log in.");
    }

    // Check for errors in URL (can be added by NextAuth)
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (error) {
      console.log("Error from URL:", error, "Description:", errorDescription);
      
      if (error === "MissingCSRF") {
        // Handle CSRF error specifically
        setError("Session security error (CSRF). Please try logging in again from the original page.");
        // Log more details about the error
        console.error("CSRF error details:", {
          error,
          errorDescription,
          clientUrl: window.location.href,
          returnUrl,
        });
      } else {
        // Handle other errors
        setError(`Login failed: ${errorDescription || error.replace(/([A-Z])/g, ' $1').trim()}`);
      }
    }
  }, [searchParams, returnUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Log current environment
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log("Login environment:", {
      isDevelopment,
      hostname,
      school: school.shortName,
      returnUrl,
    });

    // Validate email domain
    if (!email.endsWith(`@${school.emailDomain}`)) {
      setError(`Please enter a valid @${school.emailDomain} email address`);
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      // Prepare the callback URL
      let cleanedReturnUrl = returnUrl;
      
      // Force the callback URL to use the current origin in development
      if (isDevelopment && cleanedReturnUrl.includes('https://')) {
        // Strip the domain part and keep only the path
        cleanedReturnUrl = cleanedReturnUrl.replace(/^https?:\/\/[^/]+/, '');
        if (!cleanedReturnUrl.startsWith('/')) {
          cleanedReturnUrl = '/' + cleanedReturnUrl;
        }
        cleanedReturnUrl = window.location.origin + cleanedReturnUrl;
      }
      
      // In production, use the normal signIn flow
      await signIn('credentials', {
        email,
        password,
        callbackUrl: cleanedReturnUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[var(--color-primary-border)] p-8 shadow-md">
          <h2 className="font-new-spirit-medium-condensed text-3xl font-bold text-center mb-6 text-[var(--color-primary-text)]">
            Log in to Campusfy
          </h2>
          
          <p className="text-center mb-8 text-[#555555]">
            Enter your @{school.emailDomain} email and password
          </p>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-new-spirit-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                placeholder={`your.name@${school.emailDomain}`}
              />
              {!email.endsWith(`@${school.emailDomain}`) && email.length > 0 && (
                <p className="mt-1 text-sm text-red-600">
                  You must use your @{school.emailDomain} email address
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-new-spirit-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.endsWith(`@${school.emailDomain}`)}
              className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Logging in...
                </div>
              ) : (
                'Log in'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/auth/register?callbackUrl=${encodeURIComponent(returnUrl)}`}
                  className="text-[var(--color-primary)] hover:underline font-new-spirit-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
} 