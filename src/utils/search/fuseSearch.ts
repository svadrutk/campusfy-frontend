/**
 * Fuse.js search utilities
 * 
 * This module contains functions for fuzzy searching using Fuse.js
 * with optimized performance for large datasets.
 */
import Fuse from 'fuse.js';
import { ClassData } from '@/types/classes/classTypes';
import { FuseCache } from '@/types/classes/searchTypes';

// Store Fuse.js instance with a reference to the data it was created with
let fuseCache: FuseCache<ClassData> | null = null;

// Add data version tracking
let currentDataVersion = 0;

// Configure Fuse.js options with optimized settings
const fuseOptions = {
  keys: [
    // Prioritize exact class_code matches
    { 
      name: 'class_code', 
      weight: 10,
      getFn: (obj: ClassData) => {
        const code = obj.class_code || '';
        // Return variations of the code for matching
        return [
          code, // Original code
          code.replace(/\s+/g, ''), // No spaces
          code.toLowerCase(), // Lowercase
          code.replace(/\s+/g, '').toLowerCase() // No spaces lowercase
        ];
      }
    },
    { name: 'course_name', weight: 1.5 },
    { name: 'course_desc', weight: 0.8 },
    // Add grade_count to prioritize popular courses, but with lower weight
    { name: 'grade_count', weight: 0.5 }
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
  useExtendedSearch: true,
  // Add cache optimization
  shouldSort: true,
  minMatchCharLength: 2,
  // Improve fuzzy matching
  distance: 100,
  findAllMatches: true,
  // Add tokenization options to better handle spaces
  tokenize: true,
  matchAllTokens: true
};

/**
 * Generate a more robust hash for the class data to detect changes
 * 
 * @param classes Array of class data
 * @returns A string hash representing the data
 */
const generateDataHash = (classes: ClassData[]): string => {
  if (!classes.length) return 'empty';
  
  // Create a hash based on the first and last items, total count, and data version
  const firstItem = classes[0];
  const lastItem = classes[classes.length - 1];
  
  return `${classes.length}-${firstItem.class_code}-${lastItem.class_code}-${currentDataVersion}`;
};

/**
 * Initialize Fuse with class data
 * 
 * @param classes Array of class data to initialize Fuse with
 */
export const initializeFuse = (classes: ClassData[]): Fuse<ClassData> => {
  const dataHash = generateDataHash(classes);
  
  // Only create a new instance if the data has changed
  if (!fuseCache || fuseCache.dataHash !== dataHash) {
    console.log('Initializing new Fuse.js instance');
    const instance = new Fuse(classes, fuseOptions);
    fuseCache = { instance, dataHash };
  }
  
  return fuseCache.instance;
};

/**
 * Increment the data version to force cache invalidation
 */
export const invalidateFuseCache = (): void => {
  currentDataVersion++;
  clearFuseCache();
};

/**
 * Clear the Fuse.js instance cache
 * Used when you want to force recreating the Fuse instance
 */
export const clearFuseCache = (): void => {
  console.log('Clearing Fuse.js instance cache');
  fuseCache = null;
};

/**
 * Get Fuse instance (initialize if needed)
 * 
 * @param classes Array of class data to initialize Fuse with if not already initialized
 * @returns Fuse instance
 */
export const getFuseInstance = (classes: ClassData[]): Fuse<ClassData> => {
  return initializeFuse(classes);
};

/**
 * Perform a fuzzy search using Fuse.js
 * 
 * @param classes Array of class data to search
 * @param query Search query string
 * @returns Array of matching classes
 */
export const performFuseSearch = (
  classes: ClassData[],
  query: string
): ClassData[] => {
  if (!query || query.length < 2) {
    console.log('Query too short for Fuse search');
    return [];
  }
  
  const fuse = getFuseInstance(classes);
  const results = fuse.search(query);
  
  // Extract just the items from the search results
  return results.map(result => result.item);
}; 