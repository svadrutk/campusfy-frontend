/**
 * Manages the generation of descriptive labels for ratings
 */

export const getWorkloadLabel = (value: number): string => {
  if (value <= 2) return "Light";
  if (value <= 3.5) return "Moderate";
  return "Heavy";
};

export const getFunLabel = (value: number): string => {
  if (value <= 2) return "Boring";
  if (value <= 3.5) return "Enjoyable";
  return "Exciting";
};

export const getDifficultyLabel = (value: number): string => {
  if (value <= 2) return "Easy";
  if (value <= 3.5) return "Moderate";
  return "Challenging";
}; 