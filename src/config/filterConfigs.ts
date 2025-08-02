/**
 * Filter-related configurations and types
 * 
 * This file defines interfaces and types for the search and filtering system.
 * It includes configurations for filter groups, handlers, operations, and
 * school-specific settings used throughout the application.
 */

import { ThemeColors } from './themeConfigs';

/**
 * Represents a group of related filters in the UI
 * Used to organize filters into logical categories for display
 */
export interface FilterGroup {
  /** Display title for the filter group */
  title: string;
  /** Unique identifier for the filter group */
  key: string;
  /** Optional description text for the filter group */
  description?: string;
  /** Array of filter values that belong to this group */
  filters: string[];
  /** Optional descriptions for individual filter attributes */
  attributeDescriptions?: Record<string, string>;
  /** Optional abbreviations for filter values */
  abbreviations?: Record<string, string>;
}

/**
 * Handler for converting between UI filter values and API parameters
 * Provides bidirectional transformation between filter UI state and API requests
 */
export type FilterHandler = {
  /** 
   * Converts UI filter values to API request parameters
   * @param filters - Array of selected filter values from UI
   * @param mappings - Optional mappings between UI values and API values
   * @param groups - Optional filter groups for additional context
   * @returns Record of API parameters to include in requests
   */
  toParams: (filters: string[], mappings?: Record<string, Record<string, number>>, groups?: FilterGroup[]) => Record<string, unknown>;
  
  /**
   * Converts API parameters back to UI filter values
   * @param params - API parameters from a request
   * @param mappings - Optional mappings between API values and UI values
   * @returns Array of UI filter values
   */
  toFilters: (params: Record<string, unknown>, mappings?: Record<string, Record<string, number>>) => string[];
};

/**
 * Mapping between UI field names and API field names
 * Used to transform field names for API requests and responses
 */
export interface ApiFieldMapping {
  /** Field name used in the UI */
  uiField: string;
  /** Corresponding field name used in the API */
  apiField: string;
  /** Optional transformation function for field values */
  transform?: (value: unknown) => unknown;
}

/**
 * Defines how a filter operation works when applied to data
 * Includes filtering logic, field name mappings, and value transformations
 */
export interface FilterOperation {
  /** Display name for the filter in the UI */
  uiName: string;
  /** Field name in the database/API */
  apiName: string;
  /** Type of filter determining how values are handled */
  type: 'boolean' | 'array' | 'range' | 'string';
  /** Optional function to transform values before filtering */
  transform?: (value: unknown) => unknown;
  /** 
   * Function that determines if an item matches the filter criteria
   * @param item - The data item to check
   * @param value - The filter value to match against
   * @returns Boolean indicating if the item matches the filter
   */
  apply: (item: Record<string, unknown>, value: unknown) => boolean;
}

/**
 * Comprehensive configuration for a school/university
 * Includes identification, styling, and filtering settings
 */
export type SchoolConfig = {
  /** Full name of the school */
  name: string;
  /** Short name/code for the school */
  shortName: string;
  /** Primary domain for the school */
  domain: string;
  /** Email domain for the school (used for verification) */
  emailDomain: string;
  /** Subdomain prefix used in multi-tenant setup */
  subdomainPrefix: string;
  /** Optional logo path */
  logo?: string;
  /** Theme colors for the school */
  colors: ThemeColors;
  /** Filter-related configurations */
  filters: {
    /** Groups of filters for this school */
    groups: FilterGroup[];
    /** 
     * Optional mappings for converting between UI and API values
     * Maps filter categories to value conversion dictionaries
     */
    mappings?: {
      gen_ed?: Record<string, number>;
      level?: Record<string, number>;
      honors?: Record<string, number>;
      foreign_lang?: Record<string, number>;
      [key: string]: Record<string, number> | undefined;
    };
    /** Custom handlers for school-specific filters */
    handlers?: Record<string, FilterHandler>;
    /** API field mappings */
    apiFields?: Record<string, ApiFieldMapping>;
    /** Filter operations */
    operations?: Record<string, FilterOperation>;
  };
}; 