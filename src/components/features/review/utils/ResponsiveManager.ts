import type { RefObject, Dispatch, SetStateAction } from 'react';

export class ResponsiveManager {
  private containerRef: RefObject<HTMLDivElement>;
  private setContainerSize: Dispatch<SetStateAction<{ width: number; height: number }>>;
  private minWidth: number;
  private minHeight: number;

  constructor(
    containerRef: RefObject<HTMLDivElement>,
    setContainerSize: Dispatch<SetStateAction<{ width: number; height: number }>>,
    minWidth: number = 300,
    minHeight: number = 300
  ) {
    this.containerRef = containerRef;
    this.setContainerSize = setContainerSize;
    this.minWidth = minWidth;
    this.minHeight = minHeight;
  }

  public setupResizeObserver(): () => void {
    if (!this.containerRef.current) return () => {};

    const chartElement = this.containerRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries[0]) return;
      
      const { width, height } = entries[0].contentRect;
      this.setContainerSize({ 
        width: Math.max(width, this.minWidth), 
        height: Math.max(height, this.minHeight) 
      });
    });
    
    resizeObserver.observe(chartElement);
    
    return () => {
      resizeObserver.unobserve(chartElement);
    };
  }

  public setupIOSAdjustments(): () => void {
    if (!this.containerRef.current) return () => {};

    const currentChartRef = this.containerRef.current;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                 !(window as {MSStream?: unknown}).MSStream;
    
    if (isIOS) {
      currentChartRef.classList.add('ios-chart');
    }
    
    return () => {
      if (isIOS) {
        currentChartRef.classList.remove('ios-chart');
      }
    };
  }

  public isSmallScreen(width: number): boolean {
    return width < 400;
  }
} 