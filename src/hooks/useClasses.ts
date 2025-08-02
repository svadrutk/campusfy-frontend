import { useState, useEffect, useCallback } from 'react';
import { SearchParams } from '@/types/search';
import { fetchClasses, fetchClassByCode } from '@/utils/search';
import { ClassData } from '@/types/classes/classTypes';

/**
 * Interface for the return value of the useClasses hook
 * Provides access to class data, loading states, pagination controls,
 * and methods for searching and fetching class details
 */
interface UseClassesReturn {
  /** Array of class data objects */
  classes: ClassData[];
  /** Boolean indicating if data is currently being loaded */
  loading: boolean;
  /** Error object if a fetch operation failed, null otherwise */
  error: Error | null;
  /** Total number of classes matching the current search criteria */
  total: number;
  /** Current page number */
  page: number;
  /** Total number of available pages */
  totalPages: number;
  /** Function to fetch the next page of results */
  fetchNextPage: () => void;
  /** Function to fetch the previous page of results */
  fetchPreviousPage: () => void;
  /** Function to go to a specific page number */
  goToPage: (page: number) => void;
  /** Function to search classes with specified parameters */
  searchClasses: (params: SearchParams) => void;
  /** Function to fetch detailed information about a specific class */
  fetchClassDetails: (classCode: string) => Promise<ClassData>;
  /** Function to reset all search filters */
  resetFilters: () => void;
}

/**
 * Custom hook for fetching, searching, and paginating class data
 * 
 * Manages:
 * - Loading state and error handling
 * - Pagination (next/previous/specific page)
 * - Filtering and searching
 * - Fetching individual class details
 * 
 * @param initialFilters - Optional initial search parameters
 * @returns Object containing classes data, state, and utility functions
 */
export function useClasses(initialFilters?: SearchParams): UseClassesReturn {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [limit] = useState<number>(20);
  const [filters, setFilters] = useState<SearchParams | undefined>(initialFilters);

  /**
   * Fetches class data based on current filters and pagination
   * Updates state with the results or error information
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchClasses(filters, page, limit);
      setClasses(response.classes);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  // Fetch data when filters or pagination changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Increments the current page if not already at the last page
   */
  const fetchNextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prevPage => prevPage + 1);
    }
  }, [page, totalPages]);

  /**
   * Decrements the current page if not already at the first page
   */
  const fetchPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(prevPage => prevPage - 1);
    }
  }, [page]);

  /**
   * Navigates to a specific page number if within valid range
   * @param newPage - The page number to navigate to
   */
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  /**
   * Updates the search filters and resets to the first page
   * @param params - The search parameters to apply
   */
  const searchClasses = useCallback((params: SearchParams) => {
    setFilters(params);
    setPage(1); // Reset to first page when applying new filters
  }, []);

  /**
   * Resets all search filters and returns to the first page
   */
  const resetFilters = useCallback(() => {
    setFilters(undefined);
    setPage(1);
  }, []);

  /**
   * Fetches detailed information for a specific class by its code
   * @param classCode - The unique code identifying the class
   * @returns Promise resolving to the class data
   */
  const fetchClassDetails = useCallback(async (classCode: string): Promise<ClassData> => {
    try {
      return await fetchClassByCode(classCode);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to fetch class ${classCode}`));
      throw err;
    }
  }, []);

  return {
    classes,
    loading,
    error,
    total,
    page,
    totalPages,
    fetchNextPage,
    fetchPreviousPage,
    goToPage,
    searchClasses,
    fetchClassDetails,
    resetFilters
  };
} 