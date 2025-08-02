import { z } from "zod";

/**
 * Schema for basic authentication credentials validation
 * Used for login validation
 */
export const AuthCredentialsSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  csrfToken: z.string().min(1, { message: "CSRF token is required" }),
  callbackUrl: z.string().optional(), // Allow any string format for callbackUrl - can be relative path
  json: z.literal("true").optional(),
});

/**
 * Schema for sign-up form validation
 * Extends the basic auth credentials with additional fields
 */
export const SignUpSchema = AuthCredentialsSchema.extend({
  name: z.string().min(1, { message: "Name is required" }).optional(),
  confirm: z.string(),
}).refine(data => data.password === data.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

// Type exports for TypeScript
export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;
export type SignUpCredentials = z.infer<typeof SignUpSchema>; 