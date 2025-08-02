import { ExtendedClassData } from '@/types/classes/classTypes';

// Helper normalization functions
const normalizeGradeCount = (count: number): number => {
  if (count <= 0) return 0;
  // Linear scale, assuming max grade count is 10000
  return count;
};

const normalizeSearchScore = (score: number | undefined): number => {
  if (typeof score !== 'number') return 0;
  return score;
};

const normalizeVectorScore = (score: number | undefined): number => {
  if (typeof score !== 'number') return 0;
  // Vector scores are already normalized by cosine similarity
  return score;
};

const normalizeFunWorkloadDifficulty = (value: number | string | undefined): number => {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed / 5;
  }
  if (typeof value !== 'number' || value < 0) return 0;
  return value / 5;
};

const normalizeGPA = (gpa: number | undefined): number => {
  if (typeof gpa !== 'number' || gpa < 0) return 0;
  return gpa / 4;
};

// Helper function to calculate experience score
const calculateExperienceScore = (classItem: ExtendedClassData, filters: string[]): number => {
  const activeScores: number[] = [];

  // Calculate each requested experience score
  if (filters.includes('Fun')) {
    activeScores.push(normalizeFunWorkloadDifficulty(classItem.indexed_fun));
  }
  if (filters.includes('Light Workload')) {
    activeScores.push(1 - normalizeFunWorkloadDifficulty(classItem.indexed_workload));
  }
  if (filters.includes('Easy')) {
    activeScores.push(1 - normalizeFunWorkloadDifficulty(classItem.indexed_difficulty));
  }
  if (filters.includes('High GPA')) {
    const gpaValue = classItem.gradeData?.GPA ? Number(classItem.gradeData.GPA) : 
                    (typeof classItem.gpa === 'number' ? classItem.gpa : 0);
    activeScores.push(normalizeGPA(gpaValue));
  }

  return activeScores.length > 0 ? activeScores.reduce((a, b) => a + b, 0) / activeScores.length : 0;
};

interface RankingOptions {
  hasTopics: boolean;
  hasSearch: boolean;
  experienceFilters?: string[];
}

export const calculateRankingScore = (
  classItem: ExtendedClassData & { searchScore?: number; vectorScore?: number },
  options: RankingOptions
): number => {
  // Calculate base score components
  const gradeScore = normalizeGradeCount(Number(classItem.grade_count) || 0);
  const searchScore = options.hasSearch ? normalizeSearchScore(classItem.searchScore) : 0;
  const vectorScore = options.hasTopics ? normalizeVectorScore(classItem.vectorScore) : 0;

  // If search is active, prioritize search results
  if (options.hasSearch) {
    return 0.10 * gradeScore + 0.90 * searchScore;
  }

  // If only topics are active
  if (options.hasTopics && !options.experienceFilters?.length) {
    return vectorScore;
  }

  // If only experience filters are active
  if (!options.hasTopics && options.experienceFilters?.length) {
    return 0.50 * gradeScore + 0.50 * calculateExperienceScore(classItem, options.experienceFilters);
  }

  // If both topics and experience filters are active
  if (options.hasTopics && options.experienceFilters?.length) {
    const experienceScore = calculateExperienceScore(classItem, options.experienceFilters);
    return 0.10 * gradeScore + 0.70 * vectorScore + 0.20 * experienceScore;
  }

  // Default: sort by grade count
  return gradeScore;
};

export const applyRankingScores = (
  classes: (ExtendedClassData & { searchScore?: number; vectorScore?: number })[],
  options: RankingOptions
): (ExtendedClassData & { searchScore?: number; vectorScore?: number; rankingScore: number })[] => {
  return classes.map(classItem => ({
    ...classItem,
    rankingScore: calculateRankingScore(classItem, options)
  }));
}; 