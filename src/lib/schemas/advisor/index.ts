import { z } from "zod";

/**
 * Base schema for AI advisor response structure
 */
export const baseResponseSchema = z.object({
  filters: z.record(z.unknown()),
  followUpQuestion: z.string().min(1).max(200),
});

/**
 * Schema for AI advisor request validation
 */
export const advisorRequestSchema = z.object({
  prompt: z.string().min(1).max(500),
  school: z.string().min(1),
});

/**
 * Schema for experience filter values
 */
export const experienceFilterSchema = z.array(
  z.enum(["Easy", "Light Workload", "Fun", "High GPA"])
);

/**
 * Type for topics filter values
 */
export const topicsFilterSchema = z.array(z.string());

// Type exports for TypeScript
export type AdvisorResponse = z.infer<typeof baseResponseSchema>;
export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;
export type ExperienceFilter = z.infer<typeof experienceFilterSchema>;
export type TopicsFilter = z.infer<typeof topicsFilterSchema>; 