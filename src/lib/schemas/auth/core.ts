import { z } from "zod";

/**
 * Schema for basic login credentials
 * Used for authenticating users with NextAuth
 */
export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * Schema for user information
 * Used for user profile and session data
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  custom_user_id: z.string().optional(),
  auth_id: z.string().optional(),
  verification_status: z.enum(['verified', 'pending']).optional()
});

// Type exports for TypeScript
export type Credentials = z.infer<typeof credentialsSchema>;
export type User = z.infer<typeof userSchema>; 