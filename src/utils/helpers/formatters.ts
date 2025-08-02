/**
 * Data formatting and transformation utilities
 */
import { SearchParams } from '@/types/search';
import { ClassSearchQuery } from '@/types/classes/searchTypes';
import { SchoolConfig, FilterOperation } from '@/config/themes';
import { CreditsFilter } from '@/types/search';

/**
 * Converts UI search parameters to API query parameters using university-specific field mappings
 * 
 * @param params Search parameters from the UI
 * @param school University configuration
 * @returns Formatted query parameters for the API
 */
export function convertToApiQuery(params: SearchParams, school?: SchoolConfig): ClassSearchQuery {
  if (process.env.NODE_ENV === 'development') {
    console.log('Converting to API query:', params);
  }
  
  const query: ClassSearchQuery = {};
  const apiFields = school?.filters?.apiFields || {};
  const operations = school?.filters?.operations || {};
  const mappings = school?.filters?.mappings || {};
  const handlers = school?.filters?.handlers || {};
  
  // Handle credits filter (needs special processing)
  if (params.credits && typeof params.credits === 'object' && !Array.isArray(params.credits)) {
    const credits = params.credits as CreditsFilter;
    if (credits.min !== undefined) query.credits_min = credits.min;
    if (credits.max !== undefined) query.credits_max = credits.max;
  }
  
  // Process each parameter
  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined or null values
    if (value === undefined || value === null) return;
    
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) return;
    
    // Skip credits as it's handled separately
    if (key === 'credits') return;
    
    // Check if there's a handler for this filter
    const handler = handlers[key];
    if (handler) {
      // Use the handler to convert the filter
      const handlerParams = handler.toParams(value as string[], mappings as Record<string, Record<string, number>>);
      Object.assign(query, handlerParams);
      return;
    }
    
    // Get the field mapping if it exists
    const mapping = apiFields[key];
    
    // Process the value based on its type
    let processedValue = value;
    
    // Handle array fields
    const isArrayField = Array.isArray(value);
    if (isArrayField) {
      processedValue = typeof value === 'string' ? (value as string).split(',').map((v: string) => v.trim()) : value;
    }
    
    // Apply mapping if available
    if (mappings[key] && Array.isArray(processedValue)) {
      const mapping = mappings[key] as Record<string, number>;
      processedValue = processedValue.map(v => mapping[v] ?? v);
    }
    
    // Apply transformation if available
    let transformedValue = mapping?.transform ? mapping.transform(processedValue) : processedValue;
    
    // Handle operations if they exist
    const operation = operations[key];
    if (operation) {
      const op = operation as FilterOperation;
      if (op.apiName) {
        // Apply any operation-specific transformations
        if (op.type === 'array' && !Array.isArray(transformedValue)) {
          transformedValue = [transformedValue];
        }
        
        // Handle array fields in operations
        if (Array.isArray(transformedValue)) {
          processedValue = typeof transformedValue === 'string' ? (transformedValue as string).split(',').map((v: string) => v.trim()) : transformedValue;
        }
        
        // Apply mapping if available (except for breadth)
        if (mappings[key] && Array.isArray(processedValue)) {
          const mapping = mappings[key] as Record<string, number>;
          processedValue = processedValue.map(v => mapping[v] ?? v);
        }
        
        if (processedValue !== null && processedValue !== undefined) {
          (query as Record<string, unknown>)[op.apiName] = processedValue;
        }
      }
    } else if (mapping?.apiField) {
      // Use the API field mapping if no operation exists
      (query as Record<string, unknown>)[mapping.apiField] = transformedValue;
    } else {
      // Use the original key if no mapping exists
      (query as Record<string, unknown>)[key] = transformedValue;
    }
  });
  
  // Add topics (using the combined topics field)
  if (params.topics && (params.topics as string[]).length > 0) {
    query.topics = params.topics as string[];
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Final API query:', JSON.stringify(query));
  }
  
  return query;
}

/**
 * Parses a credits string that might contain a range (e.g., "1-3")
 * 
 * @param creditsStr The credits string from the database
 * @returns An object with min and max credit values
 */
export function parseCreditsString(creditsStr: string): { min: number, max: number } {
  // Check if the credits string contains a range (e.g., "1-3")
  if (creditsStr.includes('-')) {
    const [minStr, maxStr] = creditsStr.split('-');
    return {
      min: parseInt(minStr.trim()),
      max: parseInt(maxStr.trim())
    };
  }
  
  // If it's a single value
  const creditValue = parseInt(creditsStr.trim());
  return {
    min: creditValue,
    max: creditValue
  };
}

/**
 * Function to parse vector embedding from string format
 * 
 * @param vectorString The vector embedding string from the database
 * @returns Parsed vector embedding or null if parsing fails
 */
export function parseVectorEmbedding(vectorString: string | number[] | null | undefined): number[] | null {
  if (!vectorString) return null;
  
  try {
    // If it's already an array, return it
    if (Array.isArray(vectorString)) {
      return vectorString as number[];
    }
    
    // Try to parse JSON string
    if (typeof vectorString === 'string') {
      // Remove brackets and split by commas
      const values = vectorString
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(val => parseFloat(val.trim()));
      
      // Check if all values are valid numbers
      if (values.every(val => !isNaN(val))) {
        return values;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing vector embedding:', error);
    return null;
  }
}

/**
 * Format class code by adding a space between letters and numbers for Utah
 * 
 * @param classCode The class code to format
 * @param school The school identifier
 * @returns Formatted class code
 */
export const formatClassCode = (classCode: string, school: string | null): string => {
  // For Utah, ensure there's a space between department and course number
  if (school?.toLowerCase() === 'utah') {
    // Look for a pattern of letters followed directly by numbers
    return classCode.replace(/([A-Za-z]+)(\d+)/, '$1 $2');
  }
  return classCode;
}; 