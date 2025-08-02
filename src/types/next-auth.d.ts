import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      custom_user_id?: string; // ID from the wisco.users table
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    custom_user_id?: string; // ID from the wisco.users table
  }
}

// Extend JWT token type
declare module "next-auth/jwt" {
  interface JWT {
    custom_user_id?: string; // ID from the wisco.users table
  }
} 