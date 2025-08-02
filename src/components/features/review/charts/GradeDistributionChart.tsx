import { useRef, useState, useEffect, memo, useMemo, useCallback } from "react";
import { ChartDataProcessor } from '../utils/ChartDataProcessor';
import { D3Renderer } from '../renderers/D3Renderer';
import { ResponsiveManager } from '../utils/ResponsiveManager';
import { ThemeManager } from '../utils/ThemeManager';

export type GradeData = {
  grade: string;
  percentage: number;
};

type GradeDistributionChartProps = {
  grades: GradeData[];
  _averageGPA?: number;
  totalStudents?: number;
  schoolTheme?: string;
};

/**
 * A D3-based vertical bar chart component for displaying grade distributions
 */
const GradeDistributionChart = memo(({
  grades,
  _averageGPA = 3.0,
  totalStudents = 5937,
  schoolTheme = "wisco"
}: GradeDistributionChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rendererRef = useRef<D3Renderer | null>(null);
  
  // Initialize managers with useMemo
  const responsiveManager = useMemo(() => 
    new ResponsiveManager(chartRef as React.RefObject<HTMLDivElement>, setContainerSize),
    []
  );
  
  const themeManager = useMemo(() => 
    new ThemeManager(schoolTheme),
    [schoolTheme]
  );
  
  const dataProcessor = useMemo(() => 
    new ChartDataProcessor(grades, totalStudents, schoolTheme),
    [grades, totalStudents, schoolTheme]
  );

  // Memoize the render function
  const renderChart = useCallback(() => {
    if (!chartRef.current || !grades.length || containerSize.width === 0 || containerSize.height === 0) return;
    
    const adaptedGrades = dataProcessor.adaptGrades();
    const isSmallScreen = responsiveManager.isSmallScreen(containerSize.width);
    
    // Only create a new renderer if we don't have one or if the screen size category changed
    if (!rendererRef.current || 
        rendererRef.current.getIsSmallScreen() !== isSmallScreen) {
      rendererRef.current = new D3Renderer(
        chartRef.current,
        containerSize.width,
        containerSize.height,
        themeManager.getPrimaryColor(),
        themeManager.getPrimaryHoverColor(),
        isSmallScreen
      );
    }
    
    rendererRef.current.renderChart(adaptedGrades, _averageGPA);
  }, [containerSize, dataProcessor, responsiveManager, themeManager, grades, _averageGPA]);
  
  // Set up resize observer and iOS adjustments
  useEffect(() => {
    const cleanupResizeObserver = responsiveManager.setupResizeObserver();
    const cleanupIOSAdjustments = responsiveManager.setupIOSAdjustments();
    
    return () => {
      cleanupResizeObserver();
      cleanupIOSAdjustments();
      rendererRef.current = null;
    };
  }, [responsiveManager]);
  
  // Render chart when container size or data changes
  useEffect(() => {
    renderChart();
  }, [renderChart]);
  
  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '300px',
        position: 'relative'
      }} 
    />
  );
});

GradeDistributionChart.displayName = 'GradeDistributionChart';

export default GradeDistributionChart; 