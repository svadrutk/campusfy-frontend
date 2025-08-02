import { z } from "zod";

/**
 * Base schema for review form fields
 */
export const reviewFormBaseSchema = z.object({
  course_rating: z.number().min(1, "Course rating is required").max(5),
  fun_rating: z.number().min(1, "Fun rating is required").max(5),
  difficulty_rating: z.number().min(1, "Difficulty rating is required").max(5),
  workload_rating: z.number().min(1, "Workload rating is required").max(5),
  class_review: z.string().min(10, "Please provide a more detailed review (minimum 10 characters)"),
  professor_name: z.string().nullable().optional(),
  professor_rating: z.number().nullable().optional(),
  professor_review: z.string().nullable().optional(),
  presentations: z.boolean().default(false),
  papers: z.boolean().default(false),
  projects: z.boolean().default(false),
  exams: z.boolean().default(false),
  quizzes: z.boolean().default(false),
  regular_homework: z.boolean().default(false),
  att_required: z.boolean().default(false),
  review_tag: z.string().nullable().optional(),
  csrfToken: z.string().optional(),
});

/**
 * Schema for class review form validation with refinements
 * Validates ratings, review content, and handles conditional validation
 */
export const reviewFormSchema = reviewFormBaseSchema.refine(
  (data) => {
    // If professor_name is provided, professor_rating must also be provided
    if (data.professor_name && !data.professor_rating) {
      return false;
    }
    return true;
  },
  {
    message: "Professor rating is required when professor name is provided",
    path: ["professor_rating"]
  }
);

/**
 * Schema for review form API request
 * Extends the base schema with class identification fields
 * Uses the field names expected by the API
 */
export const reviewApiRequestSchema = reviewFormBaseSchema.extend({
  class_code: z.string().min(1, "Class code is required"),
  schema: z.string().min(1, "Database schema is required"),
  user_id: z.string().optional(), // Will be derived from session
  email: z.string().email().optional(), // Will be derived from session
}).refine(
  (data) => {
    // If professor_name is provided, professor_rating must also be provided
    if (data.professor_name && !data.professor_rating) {
      return false;
    }
    return true;
  },
  {
    message: "Professor rating is required when professor name is provided",
    path: ["professor_rating"]
  }
);

// Type exports for TypeScript
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
export type ReviewApiRequest = z.infer<typeof reviewApiRequestSchema>; 