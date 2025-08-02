import { z } from 'zod';

// Schema for instructor information
const InstructorSchema = z.object({
  name: z.string(),
  link: z.string().optional()
});

// Schema for time table entries
const TimeTableEntrySchema = z.object({
  days_times: z.string(),
  location: z.string().optional()
});

// Schema for individual sections
export const EnrollmentSectionSchema = z.object({
  classNumber: z.string(),
  sectionNumber: z.string(),
  instructor: InstructorSchema.optional(),
  timeTable: z.array(TimeTableEntrySchema),
  prerequisiteNote: z.string().optional(),
  enrollmentCap: z.number(),
  currentlyEnrolled: z.number(),
  waitlistCurrentSize: z.number()
});

// Schema for the totals
const TotalsSchema = z.object({
  currentlyEnrolled: z.number(),
  enrollmentCap: z.number(),
  waitlistCurrentSize: z.number()
});

// Schema for the complete enrollment data
export const EnrollmentDataSchema = z.object({
  sections: z.array(EnrollmentSectionSchema),
  totals: TotalsSchema,
  currentTerm: z.number(),
  availableTerms: z.array(z.object({
    value: z.number(),
    label: z.string()
  }))
});

// Type inference for TypeScript
export type EnrollmentSection = z.infer<typeof EnrollmentSectionSchema>;
export type EnrollmentData = z.infer<typeof EnrollmentDataSchema>;
export type Totals = {
  currentlyEnrolled: number;
  enrollmentCap: number;
  waitlistCurrentSize: number;
}; 