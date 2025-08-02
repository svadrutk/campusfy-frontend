/**
 * Department mapping and search normalization utilities
 * This module provides utilities for handling department codes, abbreviations,
 * and normalizing search queries related to academic departments and courses.
 */

/**
 * Department mappings for common abbreviations to their official codes
 * Provides a dictionary of department name variations to their standardized format
 * Used to normalize searches and improve the search experience
 */
export const departmentMappings: Record<string, string> = {
  'CS': 'COMP SCI',
  'COMPSCI': 'COMP SCI',
  'COMPUTER SCIENCE': 'COMP SCI',
  'POPULATION HEALTH': 'POP HLTH',
  'POPHEALTH': 'POP HLTH',
  'ACCOUNTING': 'ACCT I S',
  'ACCT': 'ACCT I S',
  'ACCTIS': 'ACCT I S',
  'ACCT IS': 'ACCT I S',
  'ACCOUNTING AND INFORMATION SYSTEMS': 'ACCT I S',
  'ACCOUNTING INFO SYS': 'ACCT I S',
  'ACCOUNTING INFORMATION SYSTEMS': 'ACCT I S',
  'RISK MANAGEMENT': 'R M I',
  'RMI': 'R M I',
  'RISK': 'R M I',
  'EPD': 'E P D',
  'ENGINEERING PROFESSIONAL DEVELOPMENT': 'E P D',
  'MHR': 'M H R',
  'MANAGEMENT AND HUMAN RESOURCES': 'M H R',
  // Add more mappings as needed
};

/**
 * Normalizes a search query by:
 * 1. Mapping known department abbreviations to their official codes
 * 2. Normalizing whitespace in course codes (e.g., "RMI300" -> "R M I 300")
 * 
 * The normalization process handles various input formats, including:
 * - Department abbreviations ("CS" -> "COMP SCI")
 * - Department codes with course numbers ("CS300" -> "COMP SCI 300")
 * - Department names without proper spacing ("COMPSCI" -> "COMP SCI")
 * 
 * @param query - The original search query from the user
 * @returns The normalized search query in standardized format
 */
export function normalizeSearchQuery(query: string): string {
  if (!query) return '';
  
  const upperQuery = query.toUpperCase();
  
  // Extract course number if present (e.g., "ACCOUNTING 300" -> "300")
  const courseNumberMatch = upperQuery.match(/\s*(\d+)\s*$/);
  const hasCourseNumber = !!courseNumberMatch;
  const courseNumber = hasCourseNumber ? courseNumberMatch![1] : '';
  const deptPart = hasCourseNumber 
    ? upperQuery.substring(0, upperQuery.length - courseNumber.length).trim() 
    : upperQuery;
  
  // Check for exact matches in our mapping
  if (departmentMappings[deptPart]) {
    return hasCourseNumber 
      ? `${departmentMappings[deptPart]} ${courseNumber}`
      : departmentMappings[deptPart];
  }
  
  // Try to match abbreviated departments without spaces
  // For example, match "EPD" to "E P D" even if direct mapping fails
  for (const [abbr, fullName] of Object.entries(departmentMappings)) {
    // Remove spaces from both for comparison
    const noSpaceAbbr = abbr.replace(/\s+/g, '');
    if (noSpaceAbbr === deptPart) {
      return hasCourseNumber 
        ? `${fullName} ${courseNumber}`
        : fullName;
    }
  }
  
  // Add space between department code and course number if missing
  const courseCodePattern = /([A-Z]+)(\d+)/;
  const codeMatch = upperQuery.match(courseCodePattern);
  if (codeMatch) {
    return codeMatch[1] + ' ' + codeMatch[2];
  }
  
  // If no special cases matched, return the original query
  return query;
}

/**
 * Normalizes whitespace in course codes
 * Ensures proper spacing between department codes and course numbers
 * 
 * For example:
 * - "RMI300" -> "RMI 300"
 * - "COMPSCI400" -> "COMPSCI 400"
 * 
 * @param query - The original query to normalize
 * @returns The query with normalized whitespace between department and course number
 */
export function normalizeWhitespace(query: string): string {
  if (!query) return '';
  
  // This regex pattern identifies department codes that might be missing spaces
  // It looks for uppercase letters followed by numbers
  return query.replace(/([A-Z]+)(\d+)/g, '$1 $2');
}

/**
 * Expands a search query to include variations with and without spaces
 * Creates an array of alternative search terms to improve search results
 * 
 * This is particularly useful for fuzzy matching course codes where
 * users might input variations like "RMI300", "RMI 300", or "R M I 300"
 * 
 * @param query - The original search query
 * @returns An array of query variations to search for, including the original
 */
export function expandSearchQuery(query: string): string[] {
  if (!query) return [];
  
  // Get the normalized query
  const normalizedQuery = normalizeSearchQuery(query);
  
  // Start with the normalized query (highest priority) and original query
  const variations = new Set<string>([normalizedQuery]);
  
  // Add original query if different from normalized
  if (normalizedQuery !== query) {
    variations.add(query);
  }
  
  // Extract department code and course number (if present)
  const parts = normalizedQuery.split(' ');
  const lastPart = parts[parts.length - 1];
  const hasCourseNumber = /^\d+$/.test(lastPart);
  
  if (hasCourseNumber && parts.length >= 2) {
    const courseNum = lastPart;
    const deptCode = parts.slice(0, parts.length - 1).join(' ');
    
    // Add variation with no space between dept and number
    variations.add(`${deptCode}${courseNum}`);
    
    // For department codes with spaces, also try without spaces
    if (deptCode.includes(' ')) {
      const noSpaceDept = deptCode.replace(/\s+/g, '');
      variations.add(`${noSpaceDept} ${courseNum}`);
      variations.add(`${noSpaceDept}${courseNum}`);
      
      // Add additional variations with different case formats
      variations.add(`${noSpaceDept.toLowerCase()} ${courseNum}`);
      variations.add(`${noSpaceDept.toLowerCase()}${courseNum}`);
    }
    
    // Check if there's a mapping for this department
    for (const [abbr, fullName] of Object.entries(departmentMappings)) {
      if (fullName === deptCode) {
        // Add variations with the abbreviation
        variations.add(`${abbr} ${courseNum}`);
        variations.add(`${abbr}${courseNum}`);
        
        // Add lowercase variations
        variations.add(`${abbr.toLowerCase()} ${courseNum}`);
        variations.add(`${abbr.toLowerCase()}${courseNum}`);
      }
    }
  } else {
    // No course number, just add department variations
    for (const [abbr, fullName] of Object.entries(departmentMappings)) {
      if (fullName === normalizedQuery) {
        variations.add(abbr);
        variations.add(abbr.toLowerCase());
      }
      
      // Also check for the reverse mapping (abbreviation to full name)
      if (abbr === normalizedQuery) {
        variations.add(fullName);
        
        // Add version without spaces
        if (fullName.includes(' ')) {
          variations.add(fullName.replace(/\s+/g, ''));
        }
      }
    }
    
    // If the query is a department code with spaces, add version without spaces
    if (normalizedQuery.includes(' ')) {
      variations.add(normalizedQuery.replace(/\s+/g, ''));
    }
  }
  
  return Array.from(variations);
} 