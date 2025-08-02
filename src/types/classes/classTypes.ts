/**
 * Core data types for class information
 */

/**
 * University-agnostic core class data
 * Contains only fields that are common across all universities
 */
export interface CoreClassData {
  class_code: string;
  course_name: string;
  course_desc: string;
  credits: string;
  requisites: string;
  
  // User ratings and feedback (common across all universities)
  gpa: number;
  grade_count: number;
  indexed_difficulty: number;
  indexed_fun: number;
  indexed_workload: number;
  review_count: number;
  overall_rating: number;
  reviews: Review[];
  
  // Vector embedding for semantic search
  vector_embedding?: number[] | string;
  
  // Search-related fields
  extracted_topics?: string;
  similarityScore?: number;
  keywordScore?: number;
  vectorScore?: number;
  combinedScore?: number;
}

/**
 * Extended data with university-specific fields
 * These fields are defined by the school configuration and should be accessed
 * through the appropriate school config's API field mappings
 */
export interface UniversitySpecificFields {
  [key: string]: unknown; // Allow for any university-specific fields defined in school configs
}

/**
 * Main class data interface - represents a course
 * Combines core data with university-specific fields
 */
export interface ClassData extends CoreClassData, UniversitySpecificFields {
  // The combined interface inherits all fields from both parents
  gradeData?: GradeData;
}

/**
 * Review data structure
 */
export interface Review {
  id: string;
  content: string;
  rating: number;
  date: string;
}

/**
 * Grade distribution data
 */
export interface GradeData {
  class_code: string;
  students: number;
  GPA: number;
  A: number;
  AB: number;
  B: number;
  BC: string;
  C: number;
  D: string;
  F: string;
  E?: string;
  a?: number;
  ab?: number;
  b?: number;
  bc?: string;
  c?: number;
  d?: string;
  f?: string;
  e?: string;
  gpa?: number;
}

/**
 * API response format for classes
 */
export interface ClassesResponse {
  classes: ClassData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Extended class data with additional properties for searching
 */
export interface ExtendedClassData extends ClassData {
  // Additional properties used during search operations
  original_embedding?: string;
  matchScore?: number;
  departmentMatchScore?: number;
  rankingScore?: number;
} 