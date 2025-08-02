"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/contexts/theme/ThemeContext";
import { signIn } from "next-auth/react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { school } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [_registrationComplete, _setRegistrationComplete] = useState(false);
  const [_successMessage, _setSuccessMessage] = useState("");

  // Initialize Supabase client with school context
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    }
  });

  const validateEmail = (email: string) => {
    // Only allow school-specific emails
    return email.endsWith(`@${school.emailDomain}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log("Starting registration process with:", {
      email,
      school: school.shortName,
      emailDomain: school.emailDomain,
      schema: school.shortName.toLowerCase()
    });

    // Validate school email
    if (!validateEmail(email)) {
      console.log("Email validation failed:", {
        email,
        expectedDomain: school.emailDomain
      });
      setError(`Please enter a valid @${school.emailDomain} email address`);
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      console.log("Password validation failed: passwords do not match");
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Prepare the callback URL
      let cleanedReturnUrl = callbackUrl;
      
      // Force the callback URL to use the current origin in development
      if (process.env.NODE_ENV === 'development' && cleanedReturnUrl.includes('https://')) {
        // Strip the domain part and keep only the path
        cleanedReturnUrl = cleanedReturnUrl.replace(/^https?:\/\/[^/]+/, '');
        if (!cleanedReturnUrl.startsWith('/')) {
          cleanedReturnUrl = '/' + cleanedReturnUrl;
        }
        cleanedReturnUrl = window.location.origin + cleanedReturnUrl;
      }

      console.log("Initializing Supabase signup with:", {
        email,
        redirectUrl: `${window.location.origin}/auth/login?callbackUrl=${encodeURIComponent(cleanedReturnUrl)}`,
        schema: school.shortName.toLowerCase()
      });

      // Register the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login?callbackUrl=${encodeURIComponent(cleanedReturnUrl)}`,
        },
      });

      console.log("Supabase signup response:", {
        success: !!authData,
        hasError: !!signUpError,
        error: signUpError ? {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name
        } : null,
        user: authData?.user ? {
          id: authData.user.id,
          email: authData.user.email,
          emailConfirmed: authData.user.email_confirmed_at,
          confirmationSent: authData.user.confirmation_sent_at
        } : null
      });

      if (signUpError) {
        console.error("Signup error details:", {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name,
          stack: signUpError.stack
        });
        
        if (signUpError.message.includes("User already registered")) {
          setError("An account with this email already exists. Please log in instead.");
        } else {
          setError(signUpError.message || "Failed to create account");
        }
        setIsLoading(false);
        return;
      }

      if (!authData?.user) {
        console.error("No user data returned from signup");
        setError("Failed to create account. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log("Registration successful, signing in user");
      
      // Sign in the user automatically after successful registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.error("Auto sign-in failed:", signInResult.error);
        // If auto sign-in fails, redirect to login page
        router.push(`/auth/login?registered=true&callbackUrl=${encodeURIComponent(cleanedReturnUrl)}`);
      } else {
        // If sign-in successful, redirect to the callback URL
        router.push(cleanedReturnUrl);
      }
    } catch (err) {
      console.error("Unexpected registration error:", {
        error: err,
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined
      });
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (_registrationComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-[var(--color-primary-border)] p-8 shadow-md text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            
            <h2 className="font-new-spirit-medium-condensed text-3xl font-bold text-center mb-4 text-[var(--color-primary-text)]">
              Check your email
            </h2>
            
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a confirmation link to <span className="font-new-spirit-medium">{email}</span>
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Please check your {school.shortName} email inbox and click the confirmation link to activate your account.
              If you don&apos;t see the email, check your spam folder.
            </p>
            
            <Link 
              href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="block w-full bg-[var(--color-primary)] text-white py-3 px-4 rounded-xl font-new-spirit-medium transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-border)] focus:ring-offset-2 text-center"
            >
              Go to login
            </Link>
            
            <button 
              onClick={() => router.push(`/auth/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="mt-4 text-[var(--color-primary)] hover:underline font-new-spirit-medium"
            >
              I&apos;ll confirm later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-[var(--color-primary-border)] p-8 shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Create your account</h1>
            <p className="text-gray-600">
              Join Campusfy to access course reviews and more
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {_successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {_successMessage}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-new-spirit-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    placeholder={`your.name@${school.emailDomain}`}
                  />
                  {!email.endsWith(`@${school.emailDomain}`) && email.length > 0 && (
                    <p className="mt-1 text-sm text-red-600">
                      You must use your @{school.emailDomain} email address
                    </p>
                  )}
                </div>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    placeholder="Create a secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="mt-1 text-sm text-red-600">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-new-spirit-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !validateEmail(email) || password.length < 6 || password !== confirmPassword}
                className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} 
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Loading...
          </h2>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegisterContent />
    </Suspense>
  );
} 