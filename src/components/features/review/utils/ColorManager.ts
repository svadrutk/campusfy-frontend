/**
 * Manages color calculations for rating visualizations
 */

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const COLORS = {
  red: { r: 0xd6, g: 0x30, b: 0x24 },     // #d63024
  yellow: { r: 0xd6, g: 0xaf, b: 0x24 },  // #d6af24
  green: { r: 0x24, g: 0xd6, b: 0x59 }    // #24d659
};

const interpolateColor = (color1: RGBColor, color2: RGBColor, ratio: number): RGBColor => {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * ratio),
    g: Math.round(color1.g + (color2.g - color1.g) * ratio),
    b: Math.round(color1.b + (color2.b - color1.b) * ratio)
  };
};

export const getColorFromRating = (value: number, isInverted: boolean = false): string => {
  const normalizedValue = (value - 1) / 4;
  const adjustedValue = isInverted ? 1 - normalizedValue : normalizedValue;
  
  let color: RGBColor;
  
  if (adjustedValue < 0.5) {
    const ratio = adjustedValue * 2;
    color = interpolateColor(COLORS.red, COLORS.yellow, ratio);
  } else {
    const ratio = (adjustedValue - 0.5) * 2;
    color = interpolateColor(COLORS.yellow, COLORS.green, ratio);
  }
  
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}; 