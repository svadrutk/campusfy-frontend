/**
 * Search API interaction utilities
 * 
 * Functions for interacting with the API for class data retrieval.
 */
import { ClassData, ClassesResponse } from '@/types/classes/classTypes';
import { SearchParams } from '@/types/search';
import { getClassByCode, getAllClasses, searchClasses } from '../cacheUtils';
import { convertToApiQuery } from '../helpers/formatters';
import { SchoolConfig, schoolConfigs, getSchoolFromHostname } from '@/config/themes';
import { fetchWithAbort } from '../requestUtils';

/**
 * Get the default school configuration based on the current hostname
 */
const getDefaultSchoolConfig = (): SchoolConfig => {
  if (typeof window !== 'undefined') {
    // Get the current hostname in the browser
    const hostname = window.location.hostname;
    return getSchoolFromHostname(hostname);
  }
  // Fallback to wisco only if we can't determine the school
  console.warn('Unable to determine school from hostname, falling back to default');
  return schoolConfigs.wisco;
};

/**
 * Fetch class details by class code
 * 
 * @param classCode The class code to fetch details for
 * @returns Promise with class details
 */
export const fetchClassDetails = async (classCode: string): Promise<ClassData> => {
  try {
    // First try to get from cache
    const cachedClass = await getClassByCode(classCode);
    
    if (cachedClass) {
      return cachedClass;
    }
    
    // If not in cache, fetch from API
    const { promise, cleanup } = fetchWithAbort(`/api/classes/${classCode}`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      referrerPolicy: 'same-origin'
    });

    // Store cleanup function to be called when component unmounts
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup);
    }
    
    const response = await promise;
    
    if (!response.ok) {
      throw new Error(`Failed to fetch class details for ${classCode}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching class details for ${classCode}:`, error);
    throw error;
  }
};

/**
 * Fetch classes from the API based on search parameters
 * 
 * @param params Search parameters (optional)
 * @param page Page number for pagination
 * @param limit Number of items per page
 * @returns Promise with the search results
 */
export async function fetchClasses(
  params?: SearchParams,
  page: number = 1,
  limit: number = 20
): Promise<ClassesResponse> {
  try {
    // Always try to get from cache first
    const allClasses = await getAllClasses();
    
    if (allClasses) {
      // Use cached data for all searches
      let filteredClasses = allClasses;
      
      // Apply filters if provided
      if (params && Object.keys(params).length > 0) {
        filteredClasses = await searchClasses(allClasses, params);
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedClasses = filteredClasses.slice(startIndex, endIndex);
      
      return {
        classes: paginatedClasses,
        total: filteredClasses.length,
        page,
        limit,
        totalPages: Math.ceil(filteredClasses.length / limit)
      };
    }
    
    // Only fetch from API if cache is empty
    console.warn('Cache empty, falling back to API call');
    const apiQuery = params ? convertToApiQuery(params, getDefaultSchoolConfig()) : {};
    const queryWithPagination = {
      ...apiQuery,
      page,
      limit
    };
    
    const { promise, cleanup } = fetchWithAbort('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      referrerPolicy: 'same-origin',
      body: JSON.stringify(queryWithPagination)
    });

    // Store cleanup function to be called when component unmounts
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup);
    }
    
    const response = await promise;
    
    if (!response.ok) {
      throw new Error('Failed to search classes');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    throw error;
  }
}

/**
 * Fetch a specific class by its code
 * 
 * @param classCode The class code to fetch
 * @returns Promise with the class data
 */
export async function fetchClassByCode(classCode: string): Promise<ClassData> {
  try {
    const { promise, cleanup } = fetchWithAbort(`/api/classes/${classCode}`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      referrerPolicy: 'same-origin'
    });

    // Store cleanup function to be called when component unmounts
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup);
    }
    
    const response = await promise;
    
    if (!response.ok) {
      throw new Error(`Failed to fetch class ${classCode}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch class ${classCode}:`, error);
    throw error;
  }
} 