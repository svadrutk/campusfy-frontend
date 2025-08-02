/**
 * Data handling utilities for university-specific class data
 */
import { ClassData, CoreClassData, UniversitySpecificFields } from '@/types/classes/classTypes';
import { SchoolConfig } from '@/config/themes';

/**
 * Extract only the core (university-agnostic) fields from a ClassData object
 * 
 * @param classData The full class data object
 * @returns A new object containing only the core fields
 */
export function extractCoreClassData(classData: ClassData): CoreClassData {
  const {
    class_code,
    course_name,
    course_desc,
    credits,
    requisites,
    gpa,
    grade_count,
    indexed_difficulty,
    indexed_fun,
    indexed_workload,
    review_count,
    overall_rating,
    reviews,
    vector_embedding,
    extracted_topics,
    similarityScore,
    keywordScore,
    vectorScore,
    combinedScore
  } = classData;

  return {
    class_code,
    course_name,
    course_desc,
    credits,
    requisites,
    gpa,
    grade_count,
    indexed_difficulty,
    indexed_fun,
    indexed_workload,
    review_count,
    overall_rating,
    reviews: [...reviews], // Create a shallow copy of the reviews array
    vector_embedding,
    extracted_topics,
    similarityScore,
    keywordScore,
    vectorScore,
    combinedScore
  };
}

/**
 * Extract only the university-specific fields from a ClassData object
 * 
 * @param classData The full class data object
 * @param schoolConfig Optional school configuration for context
 * @returns A new object containing only the university-specific fields
 */
export function extractUniversitySpecificFields(
  classData: ClassData,
  schoolConfig?: SchoolConfig
): UniversitySpecificFields {
  const specificFields: UniversitySpecificFields = {};
  
  // If we have a school config, use its API field mappings to determine which fields to extract
  if (schoolConfig?.filters?.apiFields) {
    // Extract fields based on API field mappings
    Object.values(schoolConfig.filters.apiFields).forEach(mapping => {
      if (mapping.uiField in classData) {
        specificFields[mapping.uiField] = classData[mapping.uiField as keyof ClassData];
      }
    });
  }
  
  // Copy any additional custom fields not explicitly listed above
  for (const key in classData) {
    if (!Object.prototype.hasOwnProperty.call(specificFields, key) && 
        !Object.prototype.hasOwnProperty.call(extractCoreClassData(classData), key) &&
        key !== 'gradeData') {
      specificFields[key] = classData[key];
    }
  }
  
  return specificFields;
}

/**
 * Get university-specific field value with appropriate fallbacks
 * 
 * @param classData The class data object
 * @param fieldName The university-specific field name to access
 * @param schoolConfig Optional school configuration for context
 * @param defaultValue Default value to return if field not found
 * @returns The field value or default value
 */
export function getUniversityField<T>(
  classData: ClassData,
  fieldName: string, 
  schoolConfig?: SchoolConfig,
  defaultValue?: T
): T | undefined {
  // First try to get the field directly from the class data
  if (fieldName in classData) {
    return classData[fieldName as keyof ClassData] as unknown as T;
  }
  
  // If we have a school config, check for any mapped field names
  if (schoolConfig?.filters?.apiFields) {
    // First check if this is a UI field that maps to an API field
    const uiMapping = Object.values(schoolConfig.filters.apiFields)
      .find(m => m.uiField === fieldName);
    
    if (uiMapping && uiMapping.uiField in classData) {
      return classData[uiMapping.uiField as keyof ClassData] as unknown as T;
    }
    
    // Then check if this is an API field that maps to a UI field
    const apiMapping = Object.values(schoolConfig.filters.apiFields)
      .find(m => m.apiField === fieldName);
    
    if (apiMapping && apiMapping.uiField in classData) {
      return classData[apiMapping.uiField as keyof ClassData] as unknown as T;
    }
  }
  
  // Return the default value if nothing found
  return defaultValue;
}

/**
 * Create a simple adapter that automatically applies university context
 * 
 * @param schoolConfig The school configuration to use for field access
 * @returns An adapter function for getting university fields
 */
export function createUniversityAdapter(schoolConfig: SchoolConfig) {
  return function<T>(classData: ClassData, fieldName: string, defaultValue?: T): T | undefined {
    return getUniversityField<T>(classData, fieldName, schoolConfig, defaultValue);
  };
}

/**
 * Check if a class data object has a specific university-specific field
 * 
 * @param classData The class data object
 * @param fieldName The field name to check
 * @param schoolConfig Optional school configuration for context
 * @returns True if the field exists and has a non-null/undefined value
 */
export function hasUniversityField(
  classData: ClassData,
  fieldName: string,
  schoolConfig?: SchoolConfig
): boolean {
  // First check if the field exists directly
  if (fieldName in classData && classData[fieldName as keyof ClassData] != null) {
    return true;
  }
  
  // If we have a school config, check for any mapped field names
  if (schoolConfig?.filters?.apiFields) {
    // First check if this is a UI field that maps to an API field
    const uiMapping = Object.values(schoolConfig.filters.apiFields)
      .find(m => m.uiField === fieldName);
    
    if (uiMapping && uiMapping.uiField in classData && classData[uiMapping.uiField as keyof ClassData] != null) {
      return true;
    }
    
    // Then check if this is an API field that maps to a UI field
    const apiMapping = Object.values(schoolConfig.filters.apiFields)
      .find(m => m.apiField === fieldName);
    
    if (apiMapping && apiMapping.uiField in classData && classData[apiMapping.uiField as keyof ClassData] != null) {
      return true;
    }
  }
  
  return false;
} 