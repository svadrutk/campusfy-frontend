import { CreditsFilter } from '@/types/search';

/**
 * Converts a credits string from the database to a CreditsFilter object
 * 
 * Handles parsing course credit values in various formats:
 * - Single value: "3" -> { min: 3, max: 3 }
 * - Range: "2-4" -> { min: 2, max: 4 }
 * - Empty/undefined -> { min: 0, max: 0 }
 * 
 * @param creditsStr - The credits string to parse from database
 * @returns A CreditsFilter object with min and max credit values
 */
export function parseCreditsString(creditsStr: string): CreditsFilter {
  if (!creditsStr) {
    return { min: 0, max: 0 };
  }

  if (creditsStr.includes('-')) {
    const [minStr, maxStr] = creditsStr.split('-');
    return {
      min: parseInt(minStr.trim()),
      max: parseInt(maxStr.trim())
    };
  }

  const creditValue = parseInt(creditsStr.trim());
  return {
    min: creditValue,
    max: creditValue
  };
}

/**
 * Converts UI credits format to a CreditsFilter object
 * 
 * Processes an array of credit options selected in the UI:
 * - Handles specific values: "1 Credit", "2 Credits", etc.
 * - Handles special case: "5+ Credits" sets min to 5
 * - Determines the overall min and max across all selected options
 * 
 * @param uiCredits - Array of credit strings from the UI (e.g., ["1 Credit", "5+ Credits"])
 * @returns A CreditsFilter object representing the combined range
 */
export function convertUIToCredits(uiCredits: string[]): CreditsFilter {
  let min = Infinity, max = -Infinity;
  
  uiCredits.forEach(f => {
    if (f === "5+ Credits") {
      min = Math.min(min, 5);
      max = Math.max(max, 5);
    } else {
      const value = parseInt(f.split(" ")[0]);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  });

  return { min, max };
}

/**
 * Converts a CreditsFilter object to UI format strings
 * 
 * Generates an array of credit option strings for display in the UI:
 * - Special case: If min is 5, returns just ["5+ Credits"]
 * - Otherwise generates strings like "1 Credit", "2 Credits", etc.
 * - Handles pluralization correctly: "1 Credit" vs "2 Credits"
 * - Adds "5+ Credits" if max is 5 or greater
 * 
 * @param credits - The CreditsFilter object to convert
 * @returns Array of formatted credit strings for UI display
 */
export function convertCreditsToUI(credits: CreditsFilter): string[] {
  if (credits.min === 5) return ["5+ Credits"];
  
  const result: string[] = [];
  for (let i = credits.min; i <= Math.min(credits.max, 4); i++) {
    result.push(`${i} Credit${i !== 1 ? 's' : ''}`);
  }
  if (credits.max >= 5) result.push("5+ Credits");
  
  return result;
}

/**
 * Checks if a class's credits match the specified credits filter
 * 
 * Determines whether a class with specific credit value or range
 * falls within the specified min/max credit filter:
 * - Handles class credits as a range (e.g., "2-4") or single value
 * - Returns true if there's any overlap between class credits and filter range
 * - Returns true if no filter is applied (undefined min/max)
 * 
 * @param classCredits - The credits string for the class from the database
 * @param minCredits - Optional minimum credits for filtering
 * @param maxCredits - Optional maximum credits for filtering
 * @returns Boolean indicating if the class matches the filter
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