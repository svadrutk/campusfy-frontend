/**
 * Search sorting utilities
 * 
 * Functions for sorting and ranking search results.
 */
import { ClassData } from '@/types/classes/classTypes';

/**
 * Department mapping for common abbreviations
 */
const DEPARTMENT_MAP: Record<string, string[]> = {
  'cs': ['comp sci', 'computer science'],
  'compsci': ['comp sci', 'computer science'],
  'econ': ['economics'],
  'psych': ['psychology'],
  'math': ['mathematics'],
  'bio': ['biology'],
  'chem': ['chemistry'],
  'phys': ['physics'],
  'poli sci': ['political science'],
  'polisci': ['political science'],
  'comm arts': ['com arts', 'communication arts']
};

/**
 * Sort results by default criteria (grade count)
 * 
 * @param classes Array of class data to sort
 * @returns Sorted array of class data
 */
export const sortByDefault = (classes: ClassData[]): ClassData[] => {
  return [...classes].sort((a, b) => {
    // Use grade_count as the primary sorting criteria (descending order)
    if (b.grade_count !== a.grade_count) {
      return Number(b.grade_count) - Number(a.grade_count);
    }
    // If grade_count is the same, sort alphabetically by class_code as a fallback
    return a.class_code.localeCompare(b.class_code);
  });
};

/**
 * Sort results by department match to prioritize exact department matches
 * 
 * @param classes Array of class data to sort
 * @param searchQuery The search query string
 * @returns Sorted array of class data
 */
export const sortByDepartmentMatch = (
  classes: ClassData[],
  searchQuery: string
): ClassData[] => {
  if (!searchQuery || searchQuery.length < 2) {
    return sortByDefault(classes);
  }
  
  const upperCaseQuery = searchQuery.toUpperCase();
  
  return [...classes].sort((a, b) => {
    // Check for exact department matches first
    const aStartsWithQuery = a.class_code.startsWith(upperCaseQuery);
    const bStartsWithQuery = b.class_code.startsWith(upperCaseQuery);
    
    // Exact department matches get highest priority
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;
    
    // If both are exact department matches, sort by course number
    if (aStartsWithQuery && bStartsWithQuery) {
      // Extract course numbers and compare
      const aMatch = a.class_code.match(/\d+/);
      const bMatch = b.class_code.match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0]) : 0;
      const bNum = bMatch ? parseInt(bMatch[0]) : 0;
      return aNum - bNum;
    }
    
    // If neither are exact department matches, maintain existing order
    return 0;
  });
};

/**
 * Sort search results by combined criteria including department matches,
 * keyword matches, and grade count
 * 
 * @param classes Array of class data to sort
 * @param searchQuery The search query string
 * @returns Sorted array of class data
 */
export const sortSearchResults = (
  classes: ClassData[],
  searchQuery: string
): ClassData[] => {
  if (!searchQuery || searchQuery.length < 2) {
    return sortByDefault(classes);
  }
  
  const upperCaseQuery = searchQuery.toUpperCase();
  const lowerCaseQuery = searchQuery.toLowerCase();
  
  // First prioritize department matches (e.g., if searching for "COMP SCI", prioritize COMP SCI courses)
  const searchWords = lowerCaseQuery.split(/\s+/);
  const departmentSearch = searchWords.length >= 2 ? searchWords.slice(0, 2).join(' ') : lowerCaseQuery;
  
  // Get possible department matches based on the search query
  const possibleDepartments = [departmentSearch];
  if (DEPARTMENT_MAP[departmentSearch]) {
    possibleDepartments.push(...DEPARTMENT_MAP[departmentSearch]);
  }
  
  return [...classes].sort((a, b) => {
    // Check if either course code starts with the search query (exact department match)
    const aStartsWithQuery = a.class_code.startsWith(upperCaseQuery);
    const bStartsWithQuery = b.class_code.startsWith(upperCaseQuery);
    
    // Exact department matches get highest priority
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;
    
    // If both are exact department matches, sort by course number
    if (aStartsWithQuery && bStartsWithQuery) {
      // Extract course numbers and compare
      const aMatch = a.class_code.match(/\d+/);
      const bMatch = b.class_code.match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0]) : 0;
      const bNum = bMatch ? parseInt(bMatch[0]) : 0;
      return aNum - bNum;
    }
    
    // Check if class code contains any of the department search terms at the beginning
    const aHasDepartmentMatch = possibleDepartments.some(dept => 
      a.class_code.toLowerCase().startsWith(dept)
    );
    const bHasDepartmentMatch = possibleDepartments.some(dept => 
      b.class_code.toLowerCase().startsWith(dept)
    );
    
    // Department matches get top priority
    if (aHasDepartmentMatch && !bHasDepartmentMatch) return -1;
    if (!aHasDepartmentMatch && bHasDepartmentMatch) return 1;
    
    // Check for exact matches for the entire query (case insensitive)
    const aIsExactMatch = a.class_code.toLowerCase() === lowerCaseQuery;
    const bIsExactMatch = b.class_code.toLowerCase() === lowerCaseQuery;
    
    // Prioritize exact matches
    if (aIsExactMatch && !bIsExactMatch) return -1;
    if (!aIsExactMatch && bIsExactMatch) return 1;
    
    // Fall back to grade count (popularity) as a tiebreaker
    return (b.grade_count || 0) - (a.grade_count || 0);
  });
}; 