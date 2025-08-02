/**
 * Search Integration Examples
 * 
 * This file contains example implementations that demonstrate
 * how to use the refactored search system in various scenarios.
 * 
 * Note: This file is for demonstration purposes only and is not intended
 * to be imported directly by the application. Instead, use the specific
 * functions from the search module as needed in your components.
 */
import { searchClasses, searchClassesAsync, clearSearchCache } from './searchCore';
import { fetchClasses } from './searchAPI';
import { ClassData } from '@/types/classes/classTypes';
import { SearchParams } from '@/types/search';

/**
 * Example: Perform a basic search with the refactored system
 * 
 * @param classes Array of class data to search
 * @param query Search query string
 * @returns Search results
 */
export const exampleBasicSearch = (classes: ClassData[], query: string) => {
  console.log(`Performing basic search for "${query}"`);
  
  // Use the core search function with default pagination
  const results = searchClasses(classes, query);
  
  console.log(`Found ${results.total} results (showing page ${results.page} of ${results.totalPages})`);
  return results;
};

/**
 * Example: Search with filters
 * 
 * @param classes Array of class data
 * @param query Search query
 * @param filters Search filters to apply
 * @returns Filtered search results
 */
export const exampleFilteredSearch = (
  classes: ClassData[],
  query: string,
  filters: SearchParams
) => {
  console.log(`Performing filtered search for "${query}" with filters:`, filters);
  
  // Perform the search with filters
  const results = searchClasses(classes, query, filters);
  
  console.log(`Found ${results.total} results after applying filters`);
  return results;
};

/**
 * Example: Search with pagination
 * 
 * @param classes Array of class data
 * @param query Search query
 * @param page Page number
 * @param limit Items per page
 * @returns Paginated search results
 */
export const examplePaginatedSearch = (
  classes: ClassData[],
  query: string,
  page: number = 1,
  limit: number = 20
) => {
  console.log(`Performing paginated search for "${query}" (page ${page}, limit ${limit})`);
  
  // Perform the search with pagination
  const results = searchClasses(classes, query, undefined, page, limit);
  
  console.log(`Showing ${results.classes.length} of ${results.total} total results`);
  console.log(`Page ${results.page} of ${results.totalPages}`);
  
  return results;
};

/**
 * Example: Asynchronous search
 * 
 * @param classes Array of class data
 * @param query Search query
 * @param filters Optional filters
 * @returns Promise with search results
 */
export const exampleAsyncSearch = async (
  classes: ClassData[],
  query: string,
  filters?: SearchParams
) => {
  console.log(`Performing async search for "${query}"`);
  
  try {
    // Perform the search asynchronously
    const results = await searchClassesAsync(classes, query, filters);
    
    console.log(`Async search complete: Found ${results.total} results`);
    return results;
  } catch (error) {
    console.error('Error in async search:', error);
    throw error;
  }
};

/**
 * Example: Fetch and search pipeline
 * 
 * @param query Search query
 * @param filters Optional filters
 * @returns Promise with search results
 */
export const exampleFetchAndSearch = async (
  query: string,
  filters?: SearchParams
) => {
  console.log(`Fetching classes and then searching for "${query}"`);
  
  try {
    // Fetch the classes first
    const classesResponse = await fetchClasses();
    
    if (!classesResponse.classes || classesResponse.classes.length === 0) {
      console.error('No classes returned from API');
      return {
        classes: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
    
    // Then perform the search on the fetched data
    const results = await searchClassesAsync(
      classesResponse.classes,
      query,
      filters
    );
    
    console.log(`Fetch and search complete: Found ${results.total} results`);
    return results;
  } catch (error) {
    console.error('Error in fetch and search:', error);
    throw error;
  }
};

/**
 * Example: Clear cache and refresh search
 * 
 * @param classes Array of class data
 * @param query Search query to clear from cache
 * @returns Fresh search results
 */
export const exampleClearCacheAndRefresh = (
  classes: ClassData[],
  query: string
) => {
  console.log(`Clearing cache for "${query}" and refreshing search`);
  
  // Clear the cache for this query
  clearSearchCache(query);
  
  // Perform a fresh search
  const results = searchClasses(classes, query);
  
  console.log(`Fresh search complete: Found ${results.total} results`);
  return results;
};

/**
 * Example: Implement department-first search logic
 * 
 * This example demonstrates how the new system prioritizes department matches
 * (e.g., "COMP SCI" will show Computer Science courses first)
 */
export const exampleDepartmentSearch = (
  classes: ClassData[],
  departmentCode: string
) => {
  console.log(`Searching for department: "${departmentCode}"`);
  
  // Perform the search, which will automatically prioritize department matches
  const results = searchClasses(classes, departmentCode);
  
  // Log the first few results to show department prioritization
  console.log(`Department search results (showing first 5):`);
  results.classes.slice(0, 5).forEach((classItem: ClassData, index: number) => {
    console.log(`${index + 1}. ${classItem.class_code}: ${classItem.course_name}`);
  });
  
  return results;
};

/**
 * Example: React component usage
 * 
 * This is a code example showing how to use the search system in a React component
 */
export const ReactComponentExample = `
import { useState, useEffect } from 'react';
import { searchClassesAsync, fetchClasses } from '@/utils/search';
import { ClassData } from '@/types/classes/classTypes';
import { SearchParams } from '@/types/search';

const SearchComponent = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [searchResults, setSearchResults] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchParams>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Fetch classes on component mount
  useEffect(() => {
    const getClasses = async () => {
      try {
        setLoading(true);
        const response = await fetchClasses();
        if (response && response.classes) {
          setClasses(response.classes);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getClasses();
  }, []);
  
  // Perform search when query, filters, or page changes
  useEffect(() => {
    const performSearch = async () => {
      if (!classes.length) return;
      
      try {
        setLoading(true);
        const results = await searchClassesAsync(classes, query, filters, page);
        
        setSearchResults(results.classes);
        setTotalPages(results.totalPages);
      } catch (error) {
        console.error('Error searching classes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    performSearch();
  }, [query, filters, page, classes]);
  
  // Component render logic...
};
`; 