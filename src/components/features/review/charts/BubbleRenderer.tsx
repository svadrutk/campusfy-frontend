import React from 'react';
import { getBubbleSize, getFontSize, getFontWeight, getLetterSpacing, shouldShowPercentageInside, shouldWrapText } from '../renderers/BubbleSizer';

export type BubbleRendererProps = {
  _id: string;
  label: string;
  weight: number;
  color: string;
  containerWidth: number;
  elementCount: number;
};

export const BubbleRenderer: React.FC<BubbleRendererProps> = ({
  _id,
  label,
  weight,
  color,
  containerWidth,
  elementCount
}) => {
  const bubbleSize = getBubbleSize({ containerWidth, elementCount, weight, labelLength: label.length });
  const fontSize = getFontSize({ containerWidth, elementCount, weight, labelLength: label.length });
  const fontWeight = getFontWeight(weight);
  const letterSpacing = getLetterSpacing(weight);
  const showPercentageInside = shouldShowPercentageInside({ containerWidth, elementCount, weight, labelLength: label.length });
  const wrapText = shouldWrapText(label, bubbleSize);

  return (
    <div className="flex flex-col items-center mb-1">
      <div
        className="flex items-center justify-center shadow-sm transition-all hover:shadow-md border-2 rounded-lg shrink-0 hover:-translate-y-0.5"
        style={{
          backgroundColor: `${color}${weight > 0.7 ? '18' : '12'}`,
          borderColor: color,
          width: `${bubbleSize}px`,
          height: `${bubbleSize}px`,
          transition: 'all 0.25s ease-in-out',
          boxShadow: `0 2px 5px ${color}20`,
          transform: `scale(${0.9 + weight * 0.1})`,
          margin: '0 2px',
        }}
      >
        <div className="flex flex-col items-center justify-center p-1 text-center">
          <div 
            className="font-bold leading-tight tracking-wide w-full px-1"
            style={{ 
              fontSize: `${fontSize}px`,
              fontWeight,
              letterSpacing,
              color,
              textShadow: weight > 0.7 ? `0 0 1px ${color}20` : 'none',
              maxWidth: `${bubbleSize - 8}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: wrapText ? '0.95em' : 'inherit',
              whiteSpace: wrapText ? 'normal' : 'nowrap',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
          >
            {label}
          </div>
          {showPercentageInside && (
            <div 
              className="text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-full opacity-90" 
              style={{ 
                color: 'white',
                backgroundColor: color,
                fontSize: weight > 0.8 ? '10px' : '9px'
              }}
            >
              {Math.round(weight * 100)}%
            </div>
          )}
        </div>
      </div>
      
      {!showPercentageInside && (
        <div 
          className="text-xs font-medium mt-1 px-1.5 py-0.5 rounded-full opacity-90" 
          style={{ 
            color: 'white',
            backgroundColor: color,
            fontSize: weight > 0.8 ? '10px' : '9px'
          }}
        >
          {Math.round(weight * 100)}%
        </div>
      )}
    </div>
  );
}; 