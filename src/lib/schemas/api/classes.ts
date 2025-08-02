import { z } from "zod";

/**
 * Schema for GET request parameters in the classes API
 * Validates and transforms query parameters
 */
export const GetRequestSchema = z.object({
  class_code: z.string().optional(),
  query: z.string().optional(),
  page: z.string().optional().transform(val => parseInt(val || '1')),
  limit: z.string().optional().transform(val => parseInt(val || '20')),
  count_only: z.string().optional().transform(val => val === 'true'),
});

/**
 * Schema for POST request body in the classes API
 * Validates filter parameters and pagination
 */
export const PostRequestSchema = z.object({
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().optional().default(20),
  boolean_attributes: z.array(z.string()).optional(),
  credits: z.array(z.number()).length(2).optional(),
}).passthrough(); // Allow other fields for flexible filters

// Type exports for TypeScript
export type ClassesGetRequest = z.infer<typeof GetRequestSchema>;
export type ClassesPostRequest = z.infer<typeof PostRequestSchema>; 