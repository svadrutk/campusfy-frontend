/**
 * Utility functions for calculating rating-related values
 */

export const getBarHeight = (value: number): number => {
  return Math.max(10, (value / 5) * 100);
};

export const normalizeRating = (value: number): number => {
  return (value - 1) / 4;
};

export const adjustRatingForInversion = (normalizedValue: number, isInverted: boolean): number => {
  return isInverted ? 1 - normalizedValue : normalizedValue;
}; 