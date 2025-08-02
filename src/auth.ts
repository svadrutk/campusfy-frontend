import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import { getSchoolFromHostname } from "@/config/themes";
import { credentialsSchema } from "@/lib/schemas/auth/core";

/**
 * Environment variables for Supabase authentication
 */
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * User Authentication and Data Synchronization:
 * 
 * This application uses two user tables working together:
 * 1. Supabase Auth (auth.users) - Handles authentication, password management, email verification
 * 2. Custom Users (wisco.users) - Stores application-specific user data
 * 
 * Synchronization is handled in three ways:
 * - Database triggers automatically sync changes from auth.users to wisco.users
 * - The registration page has a fallback to create wisco.users entries directly
 * - The auth flow below verifies and creates wisco.users entries if needed
 * 
 * The session contains both IDs:
 * - session.user.id: The Supabase Auth user ID
 * - session.user.custom_user_id: The ID from the wisco.users table
 */

// Log environment variables status (without exposing values)
console.log("Auth configuration:", {
  supabaseUrlConfigured: !!supabaseUrl,
  supabaseKeyConfigured: !!supabaseKey,
  nodeEnv: process.env.NODE_ENV,
});

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables for Supabase authentication");
}

/**
 * Gets the appropriate database schema based on the hostname in the request
 * This allows multi-tenancy with school-specific databases
 * 
 * @param {Request} req - The incoming request object
 * @returns {string} The database schema name for the school
 */
const getSchemaForRequest = (req: Request) => {
  const hostname = req.headers.get("host") || "";
  const school = getSchoolFromHostname(hostname);
  
  // Return the schema based on the school's shortName
  return school.shortName.toLowerCase();
};

/**
 * NextAuth configuration and exported authentication functions
 * Provides authentication handlers, auth middleware, and signIn/signOut methods
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      /**
       * Authenticates a user with email/password credentials
       * Also handles synchronization between auth.users and custom users table
       * 
       * @param {Object} credentials - The user's login credentials
       * @param {Request} req - The incoming request
       * @returns {Object|null} User object if authentication successful, null otherwise
       */
      async authorize(credentials, req) {
        try {
          // Log the request for debugging
          console.log("Auth request received:", {
            host: req.headers.get("host"),
            origin: req.headers.get("origin"),
            method: req.method,
          });

          // Validate credentials
          const validatedCredentials = credentialsSchema.parse(credentials);
          
          // Get the appropriate schema based on the request
          const schema = getSchemaForRequest(req);
          
          // Initialize Supabase client with the correct schema
          const supabase = createClient(supabaseUrl, supabaseKey, {
            db: {
              schema: schema,
            },
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          });

          // Add timeout to prevent hanging requests
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase auth request timed out')), 10000)
          );

          // Authenticate with Supabase with timeout
          const authPromise = supabase.auth.signInWithPassword({
            email: validatedCredentials.email,
            password: validatedCredentials.password,
          });

          type SupabaseAuthResponse = {
            data: { 
              user: { 
                id: string; 
                email: string;
                email_confirmed_at: string | null;
              } | null 
            };
            error: { message: string; status: number; name: string } | null;
          };

          const result = await Promise.race([authPromise, timeoutPromise]) as SupabaseAuthResponse | Error;

          if (result instanceof Error) {
            console.error("Auth request timed out:", result.message);
            return null;
          }

          const { data, error } = result;

          if (error) {
            console.error("Supabase auth error:", {
              message: error.message,
              status: error.status,
              name: error.name,
            });
            return null;
          }

          if (!data.user) {
            console.error("No user data returned from Supabase");
            return null;
          }

          // Verify the user exists in our custom users table
          const { data: customUser, error: customUserError } = await supabase
            .from('users')
            .select('user_id, email, auth_id, verification_status')
            .eq('email', data.user.email)
            .single();

          if (customUserError) {
            console.error("Error fetching user from custom table:", customUserError);
            
            // If the user doesn't exist in the custom table, try to create it
            if (customUserError.code === 'PGRST116') { // Not found
              console.log("User exists in auth but not in custom table, attempting to create");
              
              const { data: newCustomUser, error: insertError } = await supabase
                .from('users')
                .insert({
                  auth_id: data.user.id,
                  email: data.user.email,
                  first_visit: new Date().toISOString(),
                  reviews_left: 5,
                  verification_status: data.user.email_confirmed_at ? 'verified' : 'pending',
                })
                .select()
                .single();
              
              if (insertError) {
                console.error("Failed to create user in custom table:", insertError);
                return null;
              }
              
              console.log("Successfully created user in custom table:", newCustomUser);
              
              // Return the user with both IDs
              return {
                id: data.user.id, // Keep auth.users ID as primary for NextAuth
                email: data.user.email,
                name: data.user.email?.split('@')[0] || null,
                custom_user_id: newCustomUser.user_id, // Add the wisco.users ID
              };
            }
            
            return null;
          }

          // Return the user with both IDs
          return {
            id: data.user.id, // Keep auth.users ID as primary for NextAuth
            email: data.user.email,
            name: data.user.email?.split('@')[0] || null,
            custom_user_id: customUser.user_id, // Add the wisco.users ID
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseKey,
  }),
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/register",
    error: "/auth/error", // Use a dedicated error page
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    /**
     * Callback to customize session data
     * Adds user IDs to the session object
     * 
     * @param {Object} params - The session parameters
     * @returns {Object} The modified session object
     */
    async session({ session, user, token }) {
      // Add user ID to the session
      if (session.user) {
        session.user.id = token?.sub || user?.id || "";
        
        // Add the custom user ID to the session if available
        if (token?.custom_user_id && typeof token.custom_user_id === 'string') {
          session.user.custom_user_id = token.custom_user_id;
        }
      }
      return session;
    },
    /**
     * Callback to customize JWT token content
     * Adds user data to the token for persistence between requests
     * 
     * @param {Object} params - The token parameters
     * @returns {Object} The modified token
     */
    async jwt({ token, user }) {
      // Add user data to the token
      if (user) {
        token.id = user.id;
        
        // Add the custom user ID to the token if available
        if (user.custom_user_id && typeof user.custom_user_id === 'string') {
          token.custom_user_id = user.custom_user_id;
        }
      }
      return token;
    },
    /**
     * Callback to handle redirect URLs
     * Maintains correct subdomain structure for multi-tenancy
     * 
     * @param {Object} params - The redirect parameters
     * @returns {string} The final redirect URL
     */
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect called:", { url, baseUrl, NODE_ENV: process.env.NODE_ENV });
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      const productionDomain = 'campusfy.app';
      
      try {
        // Parse the URL to handle it properly
        const parsedUrl = new URL(url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`);
        
        // Get the current hostname from the URL
        const currentHostname = parsedUrl.hostname;
        console.log("Current hostname:", currentHostname);
        
        // If we're in development and the hostname is campusfy.app, we need to preserve the original subdomain
        if (isDevelopment && currentHostname === productionDomain) {
          // Extract the subdomain from the original URL if it exists
          const originalUrl = new URL(url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`);
          const originalHostname = originalUrl.hostname;
          if (originalHostname.includes('localhost')) {
            const subdomain = originalHostname.split('.')[0];
            const devUrl = new URL(parsedUrl.pathname + parsedUrl.search, `http://${subdomain}.localhost:3000`);
            console.log(`Development redirect to: ${devUrl.toString()}`);
            return devUrl.toString();
          }
        }
        
        // Get the school from the current hostname
        const school = getSchoolFromHostname(currentHostname);
        const subdomain = school.subdomainPrefix;
        console.log("School and subdomain:", { school: school.shortName, subdomain });
        
        if (isDevelopment) {
          // In development, maintain the subdomain structure with localhost
          const devUrl = new URL(parsedUrl.pathname + parsedUrl.search, `http://${subdomain}.localhost:3000`);
          console.log(`Development redirect to: ${devUrl.toString()}`);
          return devUrl.toString();
        }
        
        // Handle production redirects
        if (!parsedUrl.hostname.includes(productionDomain)) {
          // Construct the URL with the appropriate subdomain
          const newUrl = new URL(parsedUrl.pathname + parsedUrl.search, `https://${subdomain}.${productionDomain}`);
          console.log(`Redirecting to: ${newUrl.toString()}`);
          return newUrl.toString();
        }
        
        // If it's already on the correct domain and subdomain, leave it as is
        if (parsedUrl.hostname.startsWith(`${subdomain}.`)) {
          return url;
        }
        
        // If we get here, we need to add the subdomain
        const finalUrl = new URL(parsedUrl.pathname + parsedUrl.search, `https://${subdomain}.${productionDomain}`);
        return finalUrl.toString();
      } catch (error) {
        console.error("Error handling redirect:", error);
        // Fallback to the default behavior
        return url;
      }
    },
    /**
     * Callback triggered when a user signs in
     * Can be used for additional validation or logging
     * 
     * @param {Object} params - The sign in parameters
     * @returns {boolean} Whether to allow the sign in
     */
    async signIn({ user: _, account: __, profile: ___, email: ____, credentials: _____ }) {
      // This callback is called after the user is authenticated
      // We can use it to add additional checks or handle specific errors
      return true; // Allow sign in
    },
  },
}); 