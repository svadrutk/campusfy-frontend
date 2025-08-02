export type BubbleSizerProps = {
  containerWidth: number;
  elementCount: number;
  weight: number;
  labelLength?: number;
};

export const getBubbleSize = ({ containerWidth, elementCount, weight, labelLength = 5 }: BubbleSizerProps): number => {
  // Improved sizing calculation with better differentiation
  let baseSize;
  if (containerWidth < 300) {
    // Very small containers
    baseSize = containerWidth / (elementCount <= 3 ? 2.5 : 3.5);
  } else if (elementCount <= 2) {
    // For 1-2 elements, make them larger
    baseSize = Math.min(100, containerWidth / 3);
  } else if (elementCount <= 3) {
    // For 3 elements, medium-large size
    baseSize = Math.min(85, containerWidth / 3.5);
  } else if (elementCount <= 5) {
    // For 4-5 elements, medium size
    baseSize = Math.min(70, containerWidth / 4.5);
  } else {
    // For 6+ elements, smaller size
    baseSize = Math.min(60, containerWidth / 5.5);
  }
  
  // Adjust base size for longer text
  if (labelLength > 5) {
    baseSize = baseSize * 1.1;
  }
  
  // More dramatic scaling based on weight
  const minSize = baseSize * 0.65;
  const sizeRange = baseSize - minSize;
  
  // Apply exponential scaling to emphasize weight differences
  const scaleFactor = Math.pow(weight, 1.2);
  return Math.max(50, minSize + scaleFactor * sizeRange);
};

export const getFontSize = ({ containerWidth, elementCount, weight, labelLength = 5 }: BubbleSizerProps): number => {
  const bubbleSize = getBubbleSize({ containerWidth, elementCount, weight, labelLength });
  
  // Base font size on both bubble size and label length
  let sizeFactor = 0.18;
  
  // Adjust based on text length
  if (labelLength >= 5) {
    sizeFactor = 0.16;
  }
  if (labelLength >= 6) {
    sizeFactor = 0.14;
  }
  
  // Calculate the font size
  let fontSize = Math.max(9, Math.min(16, bubbleSize * sizeFactor));
  
  // Scale down font size for specific long labels
  if (labelLength > 4 && bubbleSize < 65) {
    fontSize = Math.max(9, fontSize * 0.85);
  }
  
  return fontSize;
};

export const getFontWeight = (weight: number): number => {
  if (weight > 0.8) return 700; // bold
  if (weight > 0.5) return 600; // semibold
  return 500; // medium
};

export const getLetterSpacing = (weight: number): string => {
  if (weight > 0.7) return '0.05em';
  return '0.02em';
};

export const shouldShowPercentageInside = ({ containerWidth, elementCount, weight, labelLength = 5 }: BubbleSizerProps): boolean => {
  const bubbleSize = getBubbleSize({ containerWidth, elementCount, weight, labelLength });
  return bubbleSize >= 65;
};

export const shouldWrapText = (label: string, bubbleSize: number): boolean => {
  return label.length > 4 && bubbleSize < 70;
}; 