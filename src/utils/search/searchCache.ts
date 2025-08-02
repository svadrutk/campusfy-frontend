/**
 * Search caching utilities
 * 
 * Functions for caching and retrieving search results.
 */
import { SearchResult } from '@/types/classes/searchTypes';

// Cache storage
type SearchCache = Record<string, { results: SearchResult; timestamp: number }>;

// Maximum number of cache entries
const MAX_CACHE_ENTRIES = 50;

// Maximum cache size in bytes (4 MB)
const MAX_CACHE_SIZE = 4 * 1024 * 1024;

// Add cache freshness check
const CACHE_FRESHNESS_THRESHOLD = 24 * 60 * 60 * 1000; // 1 day

/**
 * Check if cached results are fresh enough to use
 */
function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_FRESHNESS_THRESHOLD;
}

/**
 * Get cached search results by key
 * 
 * @param key Cache key
 * @returns Cached search results or undefined
 */
export function getCachedResults(key: string): SearchResult | undefined {
  try {
    const cacheString = localStorage.getItem('searchCache');
    if (!cacheString) return undefined;
    
    const cache: SearchCache = JSON.parse(cacheString);
    const cachedData = cache[key];
    
    if (!cachedData) return undefined;
    
    // Check if cache is fresh
    if (!isCacheFresh(cachedData.timestamp)) {
      // Remove stale cache entry
      delete cache[key];
      localStorage.setItem('searchCache', JSON.stringify(cache));
      return undefined;
    }
    
    return cachedData.results;
  } catch (error) {
    console.error('Error reading from search cache:', error);
    return undefined;
  }
}

/**
 * Calculate the size of a string in bytes
 * 
 * @param str String to measure
 * @returns Size in bytes
 */
function getStringSizeInBytes(str: string): number {
  // Use TextEncoder to get accurate byte length for UTF-8 strings
  return new TextEncoder().encode(str).length;
}

/**
 * Cache search results with a key
 * 
 * @param key Cache key
 * @param results Search results to cache
 */
export function cacheSearchResults(key: string, results: SearchResult): void {
  try {
    // Don't cache empty results
    if (!results || !results.classes || results.classes.length === 0) {
      return;
    }
    
    // Try to get the existing cache
    const cacheString = localStorage.getItem('searchCache');
    let cache: SearchCache = {};
    
    try {
      if (cacheString) {
        cache = JSON.parse(cacheString);
      }
    } catch (e) {
      // If we can't parse the cache, start with a new one
      console.error('Cache corrupted, creating new cache:', e);
      cache = {};
    }
    
    // Store the new results with timestamp
    cache[key] = {
      results,
      timestamp: Date.now()
    };
    
    // Calculate the size of the new cache
    const newCacheString = JSON.stringify(cache);
    const cacheSize = getStringSizeInBytes(newCacheString);
    
    // If cache is too large, start pruning entries
    if (cacheSize > MAX_CACHE_SIZE) {
      const keys = Object.keys(cache);
      
      // First approach: limit number of entries
      if (keys.length > MAX_CACHE_ENTRIES) {
        // Remove oldest entries (25% of max)
        const keysToRemove = keys.slice(0, Math.floor(MAX_CACHE_ENTRIES * 0.25));
        keysToRemove.forEach(k => delete cache[k]);
      }
      
      // If it's still too big, be more aggressive - keep only newest entries
      let updatedCacheString = JSON.stringify(cache);
      let updatedSize = getStringSizeInBytes(updatedCacheString);
      
      if (updatedSize > MAX_CACHE_SIZE) {
        // Sort keys by timestamp (newest first)
        const sortedKeys = Object.keys(cache).sort((a, b) => 
          cache[b].timestamp - cache[a].timestamp
        );
        
        // Remove entries until cache size is acceptable
        while (updatedSize > MAX_CACHE_SIZE * 0.7 && sortedKeys.length > 0) {
          const keyToRemove = sortedKeys.pop();
          if (keyToRemove) {
            delete cache[keyToRemove];
            updatedCacheString = JSON.stringify(cache);
            updatedSize = getStringSizeInBytes(updatedCacheString);
          }
        }
      }
    }
    
    // Store the updated cache
    try {
      localStorage.setItem('searchCache', JSON.stringify(cache));
    } catch (storageError) {
      console.error('Storage error, clearing cache and trying again:', storageError);
      
      // If we still can't store it, clear the cache completely and try once more
      clearCache();
      
      // Only store the current result
      const singleItemCache = { [key]: { results, timestamp: Date.now() } };
      try {
        localStorage.setItem('searchCache', JSON.stringify(singleItemCache));
      } catch (finalError) {
        console.error('Unable to write to cache even after clearing:', finalError);
      }
    }
  } catch (error) {
    console.error('Error writing to search cache:', error);
  }
}

/**
 * Clear all search cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem('searchCache');
  } catch (error) {
    console.error('Error clearing search cache:', error);
  }
}

/**
 * Clear the search cache
 */
export const clearSearchCache = (): void => {
  // Clear search cache from localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('searchCache');
  }
}; 