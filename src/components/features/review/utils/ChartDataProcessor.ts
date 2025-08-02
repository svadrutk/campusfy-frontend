import { GradeData } from '../types';

// Define grade systems for different schools
export const GRADE_SYSTEMS = {
  wisco: ["A", "AB", "B", "BC", "C", "D", "F"],
  utah: ["A", "B", "C", "D", "E"],
  default: ["A", "AB", "B", "BC", "C", "D", "F"]
};

export class ChartDataProcessor {
  private grades: GradeData[];
  private totalStudents: number;
  private schoolTheme: string;

  constructor(grades: GradeData[], totalStudents: number, schoolTheme: string) {
    this.grades = grades;
    this.totalStudents = totalStudents;
    this.schoolTheme = schoolTheme;
  }

  public getGradeSystem(): string[] {
    return GRADE_SYSTEMS[this.schoolTheme as keyof typeof GRADE_SYSTEMS] || GRADE_SYSTEMS.default;
  }

  public adaptGrades(): GradeData[] {
    const gradeSystem = this.getGradeSystem();
    const visibleGrades = this.grades.filter(g => gradeSystem.includes(g.grade));
    
    return gradeSystem.map(grade => {
      const match = visibleGrades.find(g => g.grade === grade);
      return match || { grade, percentage: 0 };
    });
  }

  public calculateStudentCount(percentage: number): number {
    return Math.round((percentage / 100) * this.totalStudents);
  }

  public calculateBOrBetterPercentage(): number {
    const adaptedGrades = this.adaptGrades();
    const bOrBetterGrades = this.schoolTheme === 'utah' 
      ? ["A", "B"]
      : ["A", "AB", "B"];
      
    return adaptedGrades
      .filter(g => bOrBetterGrades.includes(g.grade))
      .reduce((sum, g) => sum + g.percentage, 0);
  }
} 