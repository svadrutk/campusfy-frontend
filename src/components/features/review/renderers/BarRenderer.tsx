import { memo } from "react";
import { getBarHeight } from "../utils/RatingCalculator";
import { getColorFromRating } from "../utils/ColorManager";

interface BarRendererProps {
  value: number;
  isInverted?: boolean;
}

const BarRenderer = memo(({ value, isInverted = false }: BarRendererProps) => {
  return (
    <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full"
        style={{ 
          width: `${getBarHeight(value)}%`, 
          backgroundColor: getColorFromRating(value, isInverted) 
        }}
      />
    </div>
  );
});

BarRenderer.displayName = 'BarRenderer';

export default BarRenderer; 