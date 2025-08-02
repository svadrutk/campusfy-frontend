/**
 * Core search functionality
 * 
 * This module contains the main search functions that integrate
 * the various search-related utilities.
 */
import { ClassData } from '@/types/classes/classTypes';
import { SearchParams, SearchResult } from '@/types/search';
import { SchoolConfig, schoolConfigs } from '@/config/themes';
import { convertToApiQuery } from '@/utils/helpers/formatters';
import { applyFilters } from './searchFilters';
import { performFuseSearch } from './fuseSearch';
import { normalizeSearchQuery } from '../departmentUtils';
import { cacheSearchResults, getCachedResults } from './searchCache';

/**
 * Get the default school configuration
 */
const getDefaultSchoolConfig = (): SchoolConfig => {
  return schoolConfigs.wisco;
};

/**
 * Generate a cache key for search results
 */
const generateSearchCacheKey = (
  query?: string,
  filters?: SearchParams,
  page: number = 1,
  limit: number = 20
): string => {
  return JSON.stringify({ query: query || '', filters, page, limit });
};

/**
 * Clear the search cache
 * 
 * @param query Optional query to clear specific cache entry
 */
export const clearSearchCache = (query?: string): void => {
  if (query) {
    // Clear specific cache entry
    const cacheKey = generateSearchCacheKey(query);
    localStorage.removeItem(cacheKey);
  } else {
    // Clear all search cache entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('search_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

/**
 * Check if a course exists by its code
 */
export const checkCourseExists = (
  classes: ClassData[],
  courseCode: string
): boolean => {
  return classes.some(cls => cls.class_code === courseCode);
};

/**
 * Paginate search results
 * 
 * @param results Array of classes to paginate
 * @param page Page number
 * @param limit Items per page
 * @returns Paginated results
 */
function _paginateResults(
  results: ClassData[],
  page: number,
  limit: number
): { 
  paginatedClasses: ClassData[],
  total: number,
  totalPages: number
} {
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  
  // If requesting a high limit (typically for client-side pagination)
  if (limit > 100) {
    return {
      paginatedClasses: results,
      total,
      totalPages: 1
    };
  }
  
  // Otherwise, apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedClasses = results.slice(start, end);
  
  return {
    paginatedClasses,
    total,
    totalPages
  };
}

/**
 * Find exact department matches for a query
 * 
 * @param classes Array of class data to search
 * @param searchQuery Search query string
 * @returns Array of matching classes or empty array if none found
 */
function _findDepartmentMatches(
  classes: ClassData[],
  searchQuery: string
): ClassData[] {
  if (!isValidSearchQuery(searchQuery)) {
    return [];
  }
  
  const upperCaseQuery = searchQuery.toUpperCase();
  const departmentMatches = classes.filter(c => 
    c.class_code.startsWith(upperCaseQuery)
  );
  
  if (departmentMatches.length > 0) {
    // Sort department matches by course number
    return departmentMatches.sort((a, b) => {
      // Extract course numbers and compare
      const aMatch = a.class_code.match(/\d+/);
      const bMatch = b.class_code.match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0]) : 0;
      const bNum = bMatch ? parseInt(bMatch[0]) : 0;
      return aNum - bNum;
    });
  }
  
  return [];
}

/**
 * Find exact class code matches for a query
 * 
 * @param classes Array of class data to search
 * @param searchQuery Search query string
 * @returns Array of matching classes or empty array if none found
 */
function _findExactMatches(
  classes: ClassData[],
  searchQuery: string
): ClassData[] {
  if (!isValidSearchQuery(searchQuery)) {
    return [];
  }
  
  const upperQuery = searchQuery.toUpperCase();
  const lowerQuery = searchQuery.toLowerCase();
  const noSpaceQuery = searchQuery.replace(/\s+/g, '');
  
  // Try exact matches with all variations
  const exactMatches = classes.filter(c => {
    const code = c.class_code;
    const noSpaceCode = code.replace(/\s+/g, '');
    
    return (
      code === upperQuery ||
      code === searchQuery ||
      noSpaceCode === noSpaceQuery ||
      code.toLowerCase() === lowerQuery
    );
  });
  
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Try prefix matches (e.g., "MATH" should match "MATH 240")
  const prefixMatches = classes.filter(c => {
    const code = c.class_code;
    const noSpaceCode = code.replace(/\s+/g, '');
    
    return (
      code.startsWith(upperQuery) ||
      code.startsWith(searchQuery) ||
      noSpaceCode.startsWith(noSpaceQuery) ||
      code.toLowerCase().startsWith(lowerQuery)
    );
  });
  
  if (prefixMatches.length > 0) {
    // Sort prefix matches by course number
    return prefixMatches.sort((a, b) => {
      const aNum = parseInt(a.class_code.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.class_code.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
  }
  
  return [];
}

/**
 * Perform a fuzzy search and de-duplicate results
 * 
 * @param classes Array of class data to search
 * @param searchQuery Search query string
 * @returns Array of de-duplicated search results
 */
function _performFuzzySearch(
  classes: ClassData[],
  searchQuery: string
): ClassData[] {
  if (!isValidSearchQuery(searchQuery)) {
    return [];
  }
  
  // Use the fuseSearch module to perform fuzzy search
  return performFuseSearch(classes, searchQuery);
}

/**
 * Checks if a search query is valid
 * 
 * @param query Search query to validate
 * @returns True if query is valid
 */
function isValidSearchQuery(query: string | undefined): query is string {
  return typeof query === 'string' && query.trim().length > 0;
}

/**
 * Search classes with optional filters
 * 
 * This function searches through an array of classes using a
 * combination of text search and filter criteria.
 * 
 * @param classes Array of class data to search
 * @param query Optional search query string
 * @param filters Optional search filters
 * @param page Page number
 * @param limit Number of results per page
 * @param school University configuration
 * @returns Search results
 */
export const searchClasses = (
  classes: ClassData[],
  query?: string,
  filters?: SearchParams,
  page: number = 1,
  limit: number = 20,
  school?: SchoolConfig
): SearchResult => {
  // Generate a cache key based on the search parameters
  const cacheKey = generateSearchCacheKey(query, filters, page, limit);
  
  // Check if we have cached results for this search
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    return cachedResults;
  }
  
  let searchResults: ClassData[] = [];
  if (!query || query.length < 2) {
    // If no valid query, use all classes sorted by grade_count
    searchResults = classes.sort((a, b) => {
      const gradeCountDiff = (b.grade_count || 0) - (a.grade_count || 0);
      if (gradeCountDiff !== 0) return gradeCountDiff;
      return a.class_code.localeCompare(b.class_code);
    });
  } else {
    // First try exact matches
    const exactMatches = _findExactMatches(classes, query);
    if (exactMatches.length > 0) {
      searchResults = exactMatches;
    } else {
      // If no exact matches, try fuzzy search
      const normalizedQuery = normalizeSearchQuery(query);
      const fuseResults = performFuseSearch(classes, normalizedQuery || query);
      
      // Sort fuzzy results by score and grade_count
      searchResults = fuseResults.sort((a, b) => {
        // First sort by grade_count
        const gradeCountDiff = (b.grade_count || 0) - (a.grade_count || 0);
        if (gradeCountDiff !== 0) return gradeCountDiff;
        
        // Then by class code for stability
        return a.class_code.localeCompare(b.class_code);
      });
    }
  }
  
  // Apply additional filters if provided
  if (filters && Object.keys(filters).length > 0) {
    // Convert UI filters to API query parameters
    const apiQuery = convertToApiQuery(filters, school);
    
    // Apply filters with the school configuration
    searchResults = applyFilters(searchResults, apiQuery, school || getDefaultSchoolConfig());
  }
  
  // Calculate total values for pagination
  const total = searchResults.length;
  const totalPages = Math.ceil(total / limit) || 1;
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, total);
  const paginatedResults = searchResults.slice(startIndex, endIndex);
  
  // Create the result object
  const result: SearchResult = {
    classes: paginatedResults,
    total,
    page,
    limit,
    totalPages
  };
  
  // Cache the results for future searches
  cacheSearchResults(cacheKey, result);
  
  return result;
};

/**
 * Search classes asynchronously
 * 
 * This function is similar to searchClasses but runs asynchronously,
 * allowing for background processing without blocking the UI.
 * 
 * @param classes Array of class data to search
 * @param query Search query string
 * @param filters Optional search filters
 * @param page Page number
 * @param limit Number of results per page
 * @param school University configuration
 * @returns Promise resolving to search results
 */
export const searchClassesAsync = async (
  classes: ClassData[],
  query?: string,
  filters?: SearchParams,
  page: number = 1,
  limit: number = 20,
  school?: SchoolConfig
): Promise<SearchResult> => {
  return new Promise<SearchResult>((resolve) => {
    // Use setTimeout to make it asynchronous
    setTimeout(() => {
      const results = searchClasses(classes, query, filters, page, limit, school);
      resolve(results);
    }, 0);
  });
};

/**
 * Converts SearchResult to ClassesResponse format
 * 
 * @param result Search result object
 * @returns Response format for API
 */
export function toClassesResponse(result: SearchResult): { 
  classes: ClassData[]; 
  total: number; 
  page: number; 
  limit: number; 
  totalPages: number; 
} {
  return {
    classes: result.classes,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages
  };
} 