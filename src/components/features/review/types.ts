export type GradeData = {
  grade: string;
  percentage: number;
};

export type GradeDistributionChartProps = {
  grades: GradeData[];
  _averageGPA?: number;
  totalStudents?: number;
  schoolTheme?: string;
}; 