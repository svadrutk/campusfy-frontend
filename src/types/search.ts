import { ClassData } from './classes/classTypes';

// Core filter interfaces
export interface CreditsFilter {
  min: number;
  max: number;
}

// Search parameters interface
export interface SearchParams {
  query?: string;
  credits?: CreditsFilter;
  no_prerequisites?: boolean;
  topics?: string[];
  [key: string]: string | number | boolean | string[] | number[] | CreditsFilter | undefined;
}

// Class search query interface
export interface ClassSearchQuery {
  query?: string;
  topics?: string[];
  credits_min?: number;
  credits_max?: number;
  no_prerequisites?: boolean;
  experience_filters?: string[];
  [key: string]: string | string[] | number | number[] | boolean | undefined;
}

// Search result interface
export interface SearchResult {
  classes: ClassData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 