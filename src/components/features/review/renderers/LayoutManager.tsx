import React, { useEffect, useState } from 'react';

export type LayoutManagerProps = {
  children: (containerWidth: number) => React.ReactNode;
  className?: string;
};

export const LayoutManager: React.FC<LayoutManagerProps> = ({ children, className = '' }) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef) return;
    
    const updateWidth = () => {
      setContainerWidth(containerRef.offsetWidth);
    };
    
    // Update on mount
    updateWidth();
    
    // Also update on resize
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef);
    
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      observer.disconnect();
    };
  }, [containerRef]);

  return (
    <div 
      ref={setContainerRef}
      className={`w-full h-full flex flex-col ${className} font-inter`}
    >
      <div className="flex-grow flex flex-wrap justify-center items-start gap-3 p-3 max-h-[180px] overflow-y-auto custom-scrollbar">
        {children(containerWidth)}
      </div>
    </div>
  );
}; 