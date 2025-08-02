/**
 * Search module
 * 
 * This module exports all search-related utilities.
 */
import { searchClasses, searchClassesAsync, checkCourseExists, clearSearchCache } from './searchCore';
import { 
  applyFilters,
} from './searchFilters';
import { initializeFuse, clearFuseCache } from './fuseSearch';
import { ClassData } from '@/types/classes/classTypes';
import { SearchParams, SearchResult } from '@/types/search';
import { SchoolConfig } from '@/config/themes';
import { fetchClassDetails, fetchClasses, fetchClassByCode } from './searchAPI';

/**
 * Search for classes with optional filters
 * 
 * @param classes Array of class data to search
 * @param query Search query string
 * @param filters Optional search filters
 * @param page Page number
 * @param limit Number of results per page
 * @param school University configuration
 * @returns Search results
 */
export function search(
  classes: ClassData[],
  query?: string,
  filters?: SearchParams,
  page: number = 1,
  limit: number = 20,
  school?: SchoolConfig
): SearchResult {
  return searchClasses(classes, query, filters, page, limit, school);
}

/**
 * Search for classes asynchronously
 * 
 * @param classes Array of class data to search
 * @param query Search query string
 * @param filters Optional search filters
 * @param page Page number
 * @param limit Number of results per page
 * @param school University configuration
 * @returns Promise resolving to search results
 */
export function searchAsync(
  classes: ClassData[],
  query?: string,
  filters?: SearchParams,
  page: number = 1,
  limit: number = 20,
  school?: SchoolConfig
): Promise<SearchResult> {
  return searchClassesAsync(classes, query, filters, page, limit, school);
}

// Re-export other useful search functions
export { 
  applyFilters,
  initializeFuse,
  clearFuseCache,
  checkCourseExists,
  clearSearchCache,
  fetchClassDetails,
  fetchClasses,
  fetchClassByCode,
  searchClasses,
  searchClassesAsync
};