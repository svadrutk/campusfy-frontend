/**
 * Theme-related configurations and types
 * 
 * This file defines color themes for different schools/universities
 * and exports theme configuration types and objects used throughout
 * the application for consistent styling.
 */

/**
 * Theme colors interface
 * Defines a set of consistent color variables used for UI theming
 */
export type ThemeColors = {
  /** Primary brand color */
  primary: string;
  /** Darker shade of primary for hover states */
  primaryHover: string;
  /** Lighter shade of primary for backgrounds */
  primaryLight: string;
  /** Border color derived from primary (usually with transparency) */
  primaryBorder: string;
  /** Main text color */
  primaryText: string;
};

/**
 * Theme configurations for supported schools
 * Each school has its own branded color palette
 */
export const schoolThemes: Record<string, ThemeColors> = {
  wisco: {
    primary: "#C5050C",
    primaryHover: "#A50000",
    primaryLight: "#F5F5F5",
    primaryBorder: "#C5050C20", // 20% opacity
    primaryText: "#222222",
  },
  utah: {
    primary: "#BE0000",
    primaryHover: "#9A0000",
    primaryLight: "#F5F5F5",
    primaryBorder: "#BE000020", // 20% opacity
    primaryText: "#222222",
  },
  michigan: {
    primary: "#00274C",
    primaryHover: "#001F3F",
    primaryLight: "#F5F5F5",
    primaryBorder: "#00274C20", // 20% opacity
    primaryText: "#222222",
  },
  osu: {
    primary: "#BB0000",
    primaryHover: "#990000",
    primaryLight: "#F5F5F5",
    primaryBorder: "#BB000020", // 20% opacity
    primaryText: "#222222",
  },
};

/**
 * Legacy theme mapping by domain
 * Maintained for backward compatibility with existing code
 * that references themes by domain rather than school code
 */
export const domainThemes: Record<string, ThemeColors> = {
  ...schoolThemes,
  default: schoolThemes.wisco
}; 