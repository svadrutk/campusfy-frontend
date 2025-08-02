/**
 * Search-related types
 */
import { ClassData } from './classTypes';

/**
 * Search query parameters for class searching
 * Contains both university-agnostic and university-specific fields
 */
export interface ClassSearchQuery {
  // Common search parameters (university-agnostic)
  query?: string;
  credits_min?: number;
  credits_max?: number;
  topics?: string[];
  
  // University-specific fields
  // These will vary by university and should be accessed through school config
  [key: string]: string[] | number[] | boolean | string | number | undefined;
}

/**
 * Search parameters that can be passed from UI components
 */
export type { SearchParams } from '../search';

/**
 * Search result type returned by search functions
 */
export interface SearchResult {
  classes: ClassData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fuse.js search result interface
 */
export interface FuseSearchResult<T> {
  item: T;
  score?: number;
  refIndex: number;
}

// Import Fuse properly to avoid circular dependencies
import type Fuse from 'fuse.js';

/**
 * Fuse.js cache structure
 */
export interface FuseCache<T = unknown> {
  instance: Fuse<T>; // Using generic type parameter for Fuse
  dataHash: string;
} 