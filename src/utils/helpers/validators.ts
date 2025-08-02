/**
 * Validation utilities for search and filters
 */
import { parseCreditsString } from './formatters';

/**
 * Checks if a class matches the credits filter
 * 
 * @param classCredits The credits string from the class
 * @param minCredits Minimum credits filter
 * @param maxCredits Maximum credits filter
 * @returns Whether the class matches the credits filter
 */
export function matchesCreditsFilter(
  classCredits: string,
  minCredits?: number,
  maxCredits?: number
): boolean {
  if (!classCredits) return false;
  
  const { min: classMinCredits, max: classMaxCredits } = parseCreditsString(classCredits);
  
  // If no credits filter is applied, return true
  if (minCredits === undefined && maxCredits === undefined) {
    return true;
  }
  
  // Check if the class credits overlap with the filter range
  if (minCredits !== undefined && maxCredits !== undefined) {
    // Check if there's any overlap between the ranges
    return !(classMaxCredits < minCredits || classMinCredits > maxCredits);
  }
  
  // Check only minimum credits
  if (minCredits !== undefined) {
    return classMaxCredits >= minCredits;
  }
  
  // Check only maximum credits
  if (maxCredits !== undefined) {
    return classMinCredits <= maxCredits;
  }
  
  return true;
}

/**
 * Check if the search query is valid (not empty and has minimum length)
 * 
 * @param query The search query string
 * @param minLength Minimum required length (default: 2)
 * @returns Whether the query is valid
 */
export function isValidSearchQuery(query: string | undefined, minLength: number = 2): boolean {
  return Boolean(query && query.length >= minLength);
}

/**
 * Validates class data array
 * 
 * @param classes Array of class data to validate
 * @returns Whether the class data is valid
 */
export function isValidClassData(classes: unknown): boolean {
  return Boolean(classes && Array.isArray(classes) && classes.length > 0);
} 