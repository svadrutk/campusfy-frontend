/**
 * Search filtering utilities
 * 
 * Functions for applying filters to search results.
 */
import { ClassData } from '@/types/classes/classTypes';
import { ClassSearchQuery } from '@/types/classes/searchTypes';
import { SchoolConfig, schoolConfigs } from '@/config/themes';
import { hasUniversityField, getUniversityField } from '../helpers/dataHandlers';
import { matchesCreditsFilter } from '../helpers/validators';

// Type-safe access to ClassData properties
type ClassDataKey = keyof ClassData;

// Type for filter operations that can be safely used with ClassData
type FilterFunction = (classItem: ClassData, value: unknown) => boolean;

/**
 * Apply filters to search results with optimized performance
 * 
 * This improved version handles university-specific fields and supports
 * both the core fields and university-specific fields from the SchoolConfig.
 * 
 * @param classes Array of class data to filter
 * @param filters Filters to apply
 * @param school University configuration
 * @returns Filtered array of class data
 */
export const applyFilters = (
  classes: ClassData[], 
  filters: ClassSearchQuery, 
  school?: SchoolConfig
): ClassData[] => {
  // Early return if no filters
  if (!filters || Object.keys(filters).length === 0) {
    return classes;
  }
  
  // If no school config is provided, use a default one
  const schoolConfig = school || schoolConfigs.wisco;
  
  // Get filter operations from school config
  const filterOperations = schoolConfig.filters.operations || {};
  
  // Prepare active filters and their corresponding operations
  const activeFilters: Record<string, { 
    value: unknown, 
    operation: FilterFunction | undefined,
    isUniversitySpecific: boolean
  }> = {};
  
  // Determine which fields are core vs university-specific for this school
  const coreFields = new Set<string>([
    'class_code', 'course_name', 'course_desc', 'credits', 'requisites',
    'gpa', 'grade_count', 'indexed_difficulty', 'indexed_fun', 'indexed_workload',
    'review_count', 'overall_rating', 'experience_filters', 'credits_min', 'credits_max'
  ]);
  
  // Determine which filters are active and set up filter operations
  Object.entries(filters).forEach(([filterName, filterValue]) => {
    // Skip undefined or null filters
    if (filterValue === undefined || filterValue === null) return;
    
    // Skip empty array filters
    if (Array.isArray(filterValue) && filterValue.length === 0) return;
    
    // Add to active filters with corresponding operation from school config
    const operation = filterOperations[filterName];
    
    // Determine if this is a university-specific filter
    const isUniversitySpecific = !coreFields.has(filterName);
    
    activeFilters[filterName] = {
      value: filterValue,
      operation: operation ? 
        ((item: ClassData, value: unknown) => {
          // Type conversion needed for operation.apply
          const itemAsRecord = Object.entries(item).reduce((acc, [key, val]) => {
            acc[key] = val;
            return acc;
          }, {} as Record<string, unknown>);
          
          return operation.apply(itemAsRecord, value);
        }) : 
        undefined,
      isUniversitySpecific
    };
  });
  
  const activeFilterCount = Object.keys(activeFilters).length;
  
  // If no active filters, return all classes
  if (activeFilterCount === 0) {
    return classes;
  }
  
  // For optimizing common single filter cases
  if (activeFilterCount === 1) {
    const [filterName, filterInfo] = Object.entries(activeFilters)[0];
    const filterValue = filterInfo.value;
    const operation = filterInfo.operation;
    const isUniversitySpecific = filterInfo.isUniversitySpecific;
    
    // Special case for experience filters
    if (filterName === 'experience_filters' && Array.isArray(filterValue)) {
      return classes.filter(classItem => {
        const experienceFilters = filterValue as string[];
        
        console.log('Processing experience filters:', {
          filterValue,
          classItem: {
            name: classItem.course_name,
            difficulty: classItem.indexed_difficulty,
            workload: classItem.indexed_workload,
            fun: classItem.indexed_fun,
            gpa: classItem.gradeData?.GPA || classItem.gpa
          }
        });

        // Cache numeric conversions
        const difficulty = Number(classItem.indexed_difficulty);
        const workload = Number(classItem.indexed_workload);
        const fun = Number(classItem.indexed_fun);
        const gpaValue = classItem.gradeData?.GPA ? Number(classItem.gradeData.GPA) : 
                        (typeof classItem.gpa === 'number' ? classItem.gpa : 0);

        console.log('Evaluating experience filters for class:', {
          classItem: classItem.course_name,
          difficulty,
          workload,
          fun,
          gpaValue,
          experienceFilters
        });

        for (const filter of experienceFilters) {
          let filterPasses = false;
          
          switch (filter) {
            case 'Easy':
              filterPasses = !isNaN(difficulty) && difficulty <= 3;
              console.log('Easy filter check:', { difficulty, filterPasses });
              break;
            case 'Light Workload':
              filterPasses = !isNaN(workload) && workload <= 3;
              console.log('Light Workload filter check:', { workload, filterPasses });
              break;
            case 'Fun':
              filterPasses = !isNaN(fun) && fun >= 3;
              console.log('Fun filter check:', { fun, filterPasses });
              break;
            case 'High GPA':
              filterPasses = !isNaN(gpaValue) && gpaValue >= 3.0;
              console.log('High GPA filter check:', { gpaValue, filterPasses });
              break;
          }

          // If this filter doesn't pass, mark it as failed but continue checking others
          if (!filterPasses) {
            console.log('Filter failed:', filter);
            return false; // Still return false if any experience filter fails
          }
        }

        console.log('All experience filters passed for class:', classItem.course_name);
        return true; // All filters passed
      });
    }
    
    // If there's a custom operation for this filter, use it
    if (operation) {
      return classes.filter(classItem => operation(classItem, filterValue));
    }
    
    // For university-specific fields, use the handler
    if (isUniversitySpecific) {
      return classes.filter(classItem => {
        // Special case for boolean columns (QL, QI, etc.)
        if (filterName === 'boolean_attributes') {
          if (Array.isArray(filterValue)) {
            // Check if any of the specified attributes are true in their respective columns
            return filterValue.some(attr => {
              const columnValue = classItem[attr as keyof ClassData];
              return columnValue === true || columnValue === 1;
            });
          }
          return false;
        }
        
        // If the class doesn't have this field, it doesn't match
        if (!hasUniversityField(classItem, filterName, schoolConfig)) return false;
        
        const fieldValue = getUniversityField(classItem, filterName, schoolConfig);
        
        if (Array.isArray(filterValue) && filterValue.length === 1) {
          // Single value in array for university-specific field
          return fieldValue === filterValue[0];
        } else if (Array.isArray(filterValue)) {
          // Array of values for university-specific field
          const valueSet = new Set(filterValue);
          return valueSet.has(fieldValue);
        } else {
          // Boolean or simple value for university-specific field
          return fieldValue === filterValue;
        }
      });
    }
    
    // For core fields, use direct access
    if (Array.isArray(filterValue) && filterValue.length === 1) {
      // Special case for single value in array
      const singleValue = filterValue[0];
      // Use type assertion within a safe context
      return classes.filter(classItem => {
        const key = filterName as ClassDataKey;
        return classItem[key] === singleValue;
      });
    } else if (Array.isArray(filterValue)) {
      // Multiple values in array (create a Set for faster lookups)
      const valueSet = new Set(filterValue);
      // Use type assertion within a safe context
      return classes.filter(classItem => {
        const key = filterName as ClassDataKey;
        return valueSet.has(classItem[key]);
      });
    } else {
      // Boolean or other simple value
      // Use type assertion within a safe context
      return classes.filter(classItem => {
        const key = filterName as ClassDataKey;
        return classItem[key] === filterValue;
      });
    }
  }
  
  // For multiple filter types, apply them all in sequence
  const filteredClasses = classes.filter(classItem => {
    // Check each active filter
    for (const [filterName, filterInfo] of Object.entries(activeFilters)) {
      const filterValue = filterInfo.value;
      const operation = filterInfo.operation;
      const isUniversitySpecific = filterInfo.isUniversitySpecific;
      
      // Special handling for experience filters when combined with other filters
      if (filterName === 'experience_filters' && Array.isArray(filterValue)) {
        const experienceFilters = filterValue as string[];
        const difficulty = Number(classItem.indexed_difficulty);
        const workload = Number(classItem.indexed_workload);
        const fun = Number(classItem.indexed_fun);
        const gpaValue = classItem.gradeData?.GPA ? Number(classItem.gradeData.GPA) : 
                        (typeof classItem.gpa === 'number' ? classItem.gpa : 0);

        let allExperienceFiltersPass = true;
        for (const filter of experienceFilters) {
          let filterPasses = false;
          switch (filter) {
            case 'Easy':
              filterPasses = !isNaN(difficulty) && difficulty <= 3;
              break;
            case 'Light Workload':
              filterPasses = !isNaN(workload) && workload <= 3;
              break;
            case 'Fun':
              filterPasses = !isNaN(fun) && fun >= 3;
              break;
            case 'High GPA':
              filterPasses = !isNaN(gpaValue) && gpaValue >= 3.0;
              break;
          }
          if (!filterPasses) {
            allExperienceFiltersPass = false;
            break;
          }
        }
        if (!allExperienceFiltersPass) return false;
        continue;
      }
      
      // If there's a custom operation for this filter, use it
      if (operation) {
        const passes = operation(classItem, filterValue);
        if (!passes) return false;
        continue;
      }
      
      // Handle special case for credits which uses min/max range
      if (filterName === 'credits_min' || filterName === 'credits_max') {
        const minCredits = filterName === 'credits_min' ? filterValue as number : undefined;
        const maxCredits = filterName === 'credits_max' ? filterValue as number : undefined;
        
        // Check if this is Utah (has min_credits and max_credits columns)
        if ('min_credits' in classItem && 'max_credits' in classItem) {
          const classMinCredits = classItem.min_credits as number;
          const classMaxCredits = classItem.max_credits as number;
          
          // Check if the class's credit range overlaps with the filter range
          if (minCredits !== undefined && classMaxCredits < minCredits) return false;
          if (maxCredits !== undefined && classMinCredits > maxCredits) return false;
        } else {
          // Wisconsin format: use the string-based credits field
          const passes = matchesCreditsFilter(
            classItem.credits,
            minCredits,
            maxCredits
          );
          if (!passes) return false;
        }
        
        continue;
      }
      
      // Handle special case for no_prerequisites
      if (filterName === 'no_prerequisites' && filterValue === true) {
        const passes = !classItem.requisites || classItem.requisites.trim() === '';
        if (!passes) return false;
        continue;
      }
      
      // For university-specific fields, use the handler
      if (isUniversitySpecific) {
        // Special case for boolean columns (QL, QI, etc.)
        if (filterName === 'boolean_attributes') {
          if (Array.isArray(filterValue)) {
            // Check if any of the specified attributes are true in their respective columns
            return filterValue.some(attr => {
              const columnValue = classItem[attr as keyof ClassData];
              return columnValue === true || columnValue === 1;
            });
          }
          return false;
        }
        
        // If the class doesn't have this field, it doesn't match
        if (!hasUniversityField(classItem, filterName, schoolConfig)) return false;
        
        const fieldValue = getUniversityField(classItem, filterName, schoolConfig);
        
        if (Array.isArray(filterValue) && filterValue.length === 1) {
          // Single value in array for university-specific field
          return fieldValue === filterValue[0];
        } else if (Array.isArray(filterValue)) {
          // Array of values for university-specific field
          const valueSet = new Set(filterValue);
          return valueSet.has(fieldValue);
        } else {
          // Boolean or simple value for university-specific field
          return fieldValue === filterValue;
        }
      }
      
      // Default handling for array values on core fields
      if (Array.isArray(filterValue)) {
        const valueSet = new Set(filterValue);
        // Type-safe access to class properties
        try {
          const key = filterName as ClassDataKey;
          const passes = valueSet.has(classItem[key]);
          if (!passes) return false;
        } catch {
          // If property doesn't exist, consider it a filter miss
          return false;
        }
        continue;
      }
      
      // Default handling for simple values (boolean, string, number, etc.)
      try {
        const key = filterName as ClassDataKey;
        const passes = classItem[key] === filterValue;
        if (!passes) return false;
      } catch {
        // If property doesn't exist, consider it a filter miss
        return false;
      }
    }
    
    // If all filters pass, include the class
    return true;
  });

  return filteredClasses;
}; 