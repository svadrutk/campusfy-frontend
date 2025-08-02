import { ClassSearchQuery } from '@/types/search';
import { SchoolConfig } from '@/config/themes';
import { convertUIToCredits, convertCreditsToUI } from './credits';



/**
 * Unified filter state management system
 */
export interface FilterState {
  selectedFilters: string[];
  searchParams: ClassSearchQuery;
}

/**
 * Creates a new filter state with the given filters
 */
export function createFilterState(
  filters: string[],
  school: SchoolConfig,
  experienceFilters: string[]
): FilterState {
  const searchParams = convertFiltersToSearchParams(filters, school, experienceFilters);
  return {
    selectedFilters: filters,
    searchParams
  };
}

/**
 * Updates the filter state with new filters
 */
export function updateFilterState(
  currentState: FilterState,
  newFilters: string[],
  school: SchoolConfig,
  experienceFilters: string[]
): FilterState {
  return createFilterState(newFilters, school, experienceFilters);
}

/**
 * Converts URL search params to filter state
 */
export function urlParamsToFilterState(
  params: URLSearchParams,
  school: SchoolConfig,
  experienceFilters: string[]
): FilterState {
  const searchParams = parseUrlParams(params);
  const selectedFilters = convertSearchParamsToFilters(searchParams, school, experienceFilters);
  return {
    selectedFilters,
    searchParams
  };
}

/**
 * Parses URL parameters into a search query
 */
function parseUrlParams(params: URLSearchParams): ClassSearchQuery {
  const query: ClassSearchQuery = {};
  
  // Parse common fields
  const queryValue = params.get('query');
  if (queryValue) query.query = queryValue;
  
  // Parse credits range
  const creditsMin = params.get('credits_min');
  const creditsMax = params.get('credits_max');
  if (creditsMin || creditsMax) {
    query.credits_min = creditsMin ? parseInt(creditsMin, 10) : undefined;
    query.credits_max = creditsMax ? parseInt(creditsMax, 10) : undefined;
  }
  
  // Parse array fields
  const topics = params.get('topics');
  if (topics) query.topics = topics.split(',').map(t => decodeURIComponent(t));
  
  return query;
}

/**
 * Convert selected filters to search params
 */
export function convertFiltersToSearchParams(
  selectedFilters: string[],
  school: SchoolConfig,
  experienceFilters: string[]
): ClassSearchQuery {
  const searchParams: ClassSearchQuery = {};
  
  // Handle experience filters
  const selectedExperience = selectedFilters.filter(f => experienceFilters.includes(f));
  console.log('Converting filters to search params:', {
    selectedFilters,
    experienceFilters,
    selectedExperience
  });
  
  if (selectedExperience.length > 0) {
    searchParams.experience_filters = selectedExperience;
  }
  
  // Handle topics (any filter that's not in dropdown filters or experience filters)
  const allDropdownFilters = school.filters.groups.flatMap(group => group.filters);
  const topics = selectedFilters.filter(f => 
    !allDropdownFilters.includes(f) && 
    !experienceFilters.includes(f)
  );
  if (topics.length > 0) {
    searchParams.topics = topics;
  }
  
  // Handle dropdown filters
  school.filters.groups.forEach(group => {
    const selectedInGroup = selectedFilters.filter(f => 
      typeof f === 'string' && group.filters.includes(f)
    );
    if (selectedInGroup.length > 0) {
      // Special handling for credits
      if (group.key === 'credits') {
        const creditsFilter = convertUIToCredits(selectedInGroup);
        searchParams.credits_min = creditsFilter.min;
        searchParams.credits_max = creditsFilter.max;
        return;
      }
      
      // For other filter groups, ensure we don't overwrite existing values
      const existingValue = searchParams[group.key] as string[] | undefined;
      if (Array.isArray(existingValue)) {
        // If there's an existing array, merge with new values
        searchParams[group.key] = [...new Set([...existingValue, ...selectedInGroup])] as string[];
      } else {
        // If no existing value, set the new array
        searchParams[group.key] = selectedInGroup;
      }
    }
  });

  console.log('Final search params:', searchParams);
  
  return searchParams;
}

/**
 * Convert search params to selected filters
 */
export function convertSearchParamsToFilters(
  searchParams: ClassSearchQuery,
  school: SchoolConfig,
  experienceFilters: string[]
): string[] {
  const filters: string[] = [];
  
  console.log('Converting search params to filters:', {
    searchParams,
    experienceFilters
  });
  
  // Add experience filters
  if (searchParams.experience_filters) {
    const validExperience = Array.isArray(searchParams.experience_filters)
      ? searchParams.experience_filters
          .filter((f): f is string => typeof f === 'string')
          .filter(f => experienceFilters.includes(f))
      : [];
    console.log('Valid experience filters:', validExperience);
    filters.push(...validExperience);
  }
  
  // Add topics
  if (searchParams.topics) {
    const topics = Array.isArray(searchParams.topics)
      ? searchParams.topics.filter((f): f is string => typeof f === 'string')
      : typeof searchParams.topics === 'string' ? [searchParams.topics] : [];
    filters.push(...topics);
  }
  
  // Add dropdown filters from school config
  school.filters.groups.forEach(group => {
    // Special handling for credits
    if (group.key === 'credits') {
      if (searchParams.credits_min !== undefined || searchParams.credits_max !== undefined) {
        const creditsFilters = convertCreditsToUI({
          min: searchParams.credits_min ?? 1,
          max: searchParams.credits_max ?? 5
        });
        filters.push(...creditsFilters);
        return;
      }
    }

    const selectedInGroup = searchParams[group.key];
    if (Array.isArray(selectedInGroup)) {
      const validFilters = selectedInGroup
        .filter((f): f is string => typeof f === 'string')
        .filter(f => group.filters.includes(f));
      filters.push(...validFilters);
    }
  });

  console.log('Converting search params to filters:', {
    searchParams,
    filters
  });
  
  return filters;
}

/**
 * Get all dropdown filters
 */
export function getDropdownFilters(
  selectedFilters: string[],
  filterGroups: SchoolConfig['filters']['groups']
): string[] {
  const allDropdownFilters = filterGroups.flatMap(group => group.filters);
  return selectedFilters.filter(filter => allDropdownFilters.includes(filter));
}

/**
 * Get all topic filters
 */
export function getTopicFilters(
  selectedFilters: string[],
  filterGroups: SchoolConfig['filters']['groups'],
  experienceFilters: string[]
): string[] {
  const allDropdownFilters = filterGroups.flatMap(group => group.filters);
  return selectedFilters.filter(filter =>
    !allDropdownFilters.includes(filter) && 
    !experienceFilters.includes(filter)
  );
} 