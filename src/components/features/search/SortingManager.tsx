import { ExtendedClassData } from '@/types/classes/classTypes';

export type SortDirection = 'asc' | 'desc' | null;

interface SortingOptions {
  direction: SortDirection;
  field: 'gpa' | 'rankingScore' | 'grade_count';
}

export const sortClasses = (
  classes: ExtendedClassData[],
  options: SortingOptions
): ExtendedClassData[] => {
  const sortedClasses = [...classes];

  switch (options.field) {
    case 'gpa':
      sortedClasses.sort((a, b) => {
        const gpaA = a.gradeData?.GPA !== undefined ? Number(a.gradeData.GPA) : 
                    (typeof a.gpa === 'number' ? a.gpa : -1);
        const gpaB = b.gradeData?.GPA !== undefined ? Number(b.gradeData.GPA) : 
                    (typeof b.gpa === 'number' ? b.gpa : -1);
        
        return options.direction === 'desc' ? gpaB - gpaA : gpaA - gpaB;
      });
      break;

    case 'rankingScore':
      sortedClasses.sort((a, b) => {
        const scoreA = typeof a.rankingScore === 'number' ? a.rankingScore : 0;
        const scoreB = typeof b.rankingScore === 'number' ? b.rankingScore : 0;
        return options.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
      break;

    case 'grade_count':
      sortedClasses.sort((a, b) => {
        const countA = Number(a.grade_count) || 0;
        const countB = Number(b.grade_count) || 0;
        return options.direction === 'desc' ? countB - countA : countA - countB;
      });
      break;
  }

  return sortedClasses;
};

export const toggleSortDirection = (current: SortDirection): SortDirection => {
  if (current === null) return 'desc';
  if (current === 'desc') return 'asc';
  return null;
};

export const getSortIcon = (direction: SortDirection): string => {
  switch (direction) {
    case 'asc':
      return '↑';
    case 'desc':
      return '↓';
    default:
      return '↕';
  }
}; 