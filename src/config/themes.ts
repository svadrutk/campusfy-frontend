/**
 * Main configuration file that exports all theme and filter-related configurations
 * 
 * This file centralizes theme and filter configurations and provides utility functions
 * for creating filter operations, handlers, and determining themes based on hostnames.
 */

import { ThemeColors, schoolThemes, domainThemes } from './themeConfigs';
import { SchoolConfig, FilterGroup, FilterHandler, ApiFieldMapping, FilterOperation } from './filterConfigs';
import { commonFilterHandlers } from './filterHandlers';

// Re-export types and configurations
export type { ThemeColors, SchoolConfig, FilterGroup, FilterHandler, ApiFieldMapping, FilterOperation };
export { schoolThemes, domainThemes, commonFilterHandlers };

/**
 * Creates a filter operation for handling array-type filters
 * 
 * @param uiName - Display name for the filter in the UI
 * @param apiName - Field name in the database/API
 * @param type - Type of array values ('string' or 'number')
 * @returns A FilterOperation object configured for array comparison
 */
const createArrayOperation = (
  uiName: string,
  apiName: string,
  type: 'string' | 'number' = 'string'
): FilterOperation => ({
  uiName,
  apiName,
  type: 'array',
  apply: (item: Record<string, unknown>, value: unknown) => {
    if (!Array.isArray(value)) return false;
    const fieldValue = item[apiName];
    
    // Handle both array and single value field values
    const fieldValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    
    return value.some(v => {
      if (type === 'number') {
        // Convert both the filter value and field value to numbers for comparison
        const filterNum = Number(v);
        return fieldValues.some(fv => Number(fv) === filterNum);
      }
      return fieldValues.includes(String(v));
    });
  }
});

/**
 * Creates a filter operation for handling boolean filters
 * 
 * @param uiName - Display name for the filter in the UI
 * @param apiName - Field name in the database/API
 * @returns A FilterOperation object configured for boolean comparison
 */
const createBooleanOperation = (
  uiName: string,
  apiName: string
): FilterOperation => ({
  uiName,
  apiName,
  type: 'boolean',
  apply: (item: Record<string, unknown>, value: unknown) => {
    if (typeof value !== 'boolean') return false;
    const fieldValue = item[apiName];
    return fieldValue === value;
  }
});

/**
 * Creates a special filter operation for the "No Prerequisites" filter
 * Checks if a course has no prerequisites by examining the requisites field
 * 
 * @returns A FilterOperation object for the No Prerequisites filter
 */
const createNoPrerequisitesOperation = (): FilterOperation => ({
  uiName: "No Prerequisites",
  apiName: "requisites",
  type: "boolean",
  apply: (item: Record<string, unknown>, value: unknown) => {
    if (value === true) {
      return !item.requisites || (typeof item.requisites === 'string' && item.requisites.trim() === '');
    }
    return true;
  }
});

// Utility functions for creating filter handlers
const createMappingHandler = (
  key: string,
  apiKey: string,
  logPrefix: string = ''
): FilterHandler => ({
  toParams: (filters: string[], mappings?: Record<string, Record<string, number>>) => {
    if (logPrefix) {
      console.log(`${logPrefix} handler toParams called:`, {
        receivedFilters: filters,
        hasMappings: mappings ? true : false,
        availableMappings: mappings?.[key] ? Object.keys(mappings[key]) : [],
        mappingValues: mappings?.[key] ? Object.values(mappings[key]) : []
      });
    }
    
    if (!mappings?.[key]) {
      if (logPrefix) console.log(`No ${key} mappings available`);
      return {};
    }
    
    const mappedValues = filters
      .map(f => {
        const value = mappings[key][f];
        if (logPrefix) {
          console.log(`Mapping ${key} filter:`, {
            filter: f,
            mappedValue: value,
            isValidMapping: value !== undefined
          });
        }
        return value;
      })
      .filter((val): val is number => {
        const isValid = val !== undefined;
        if (logPrefix) {
          console.log(`Filtering mapped value:`, {
            value: val,
            isValid
          });
        }
        return isValid;
      });
    
    if (logPrefix) {
      console.log(`Final ${key} mapped values:`, {
        values: mappedValues,
        willReturnParams: mappedValues.length > 0
      });
    }
    
    return mappedValues.length > 0 ? { [apiKey]: mappedValues } : {};
  },
  toFilters: (params: Record<string, unknown>, mappings?: Record<string, Record<string, number>>) => {
    if (logPrefix) {
      console.log(`${logPrefix} handler toFilters called:`, {
        params,
        hasMappings: mappings ? true : false,
        hasValidParams: Array.isArray(params[apiKey])
      });
    }
    
    if (!mappings?.[key] || !Array.isArray(params[apiKey])) {
      if (logPrefix) {
        console.log(`Invalid params or mappings for ${key} toFilters`, {
          hasMappings: !!mappings?.[key],
          paramType: typeof params[apiKey],
          isArray: Array.isArray(params[apiKey])
        });
      }
      return [];
    }
    
    const reverseMap = Object.fromEntries(
      Object.entries(mappings[key]).map(([k, v]) => [v, k])
    );
    
    if (logPrefix) {
      console.log(`${key} reverse mapping:`, reverseMap);
    }
    
    const result = (params[apiKey] as unknown[])
      .map(value => {
        const filter = typeof value === 'number' ? reverseMap[value] : value;
        if (logPrefix) {
          console.log(`Mapping ${key} param to filter:`, {
            value,
            mappedFilter: filter,
            isValidMapping: typeof filter === 'string'
          });
        }
        return filter;
      })
      .filter((value): value is string => {
        const isValid = typeof value === 'string';
        if (logPrefix) {
          console.log(`Filtering mapped filter:`, {
            value,
            isValid
          });
        }
        return isValid;
      });
    
    if (logPrefix) {
      console.log(`Final ${key} filters:`, result);
    }
    
    return result;
  }
});

const createDirectHandler = (key: string, apiKey: string): FilterHandler => ({
  toParams: (filters: string[]) => {
    return filters.length > 0 ? { [apiKey]: filters } : {};
  },
  toFilters: (params: Record<string, unknown>) => {
    if (!params[apiKey] || !Array.isArray(params[apiKey])) return [];
    return (params[apiKey] as unknown[])
      .filter((value): value is string => typeof value === 'string');
  }
});

const createCreditsHandler = (): FilterHandler => ({
  toParams: (filters: string[]) => {
    console.log('Credits handler toParams called:', { receivedFilters: filters });
    
    const creditsFilters = filters.filter(f => /^\d+ Credits?$|^5\+ Credits$/.test(f));
    if (creditsFilters.length === 0) return {};
    
    const result: { credits_min?: number; credits_max?: number } = {};
    
    creditsFilters.forEach(f => {
      if (f === "5+ Credits") {
        result.credits_min = 5;
      } else {
        const credits = parseInt(f, 10);
        if (!isNaN(credits)) {
          result.credits_min = credits;
          result.credits_max = credits;
        }
      }
    });
    
    return result;
  },
  toFilters: (params: Record<string, unknown>) => {
    console.log('Credits handler toFilters called:', { params });
    
    const filters: string[] = [];
    
    if (typeof params.credits_min === 'number' && typeof params.credits_max === 'number') {
      if (params.credits_min === params.credits_max) {
        if (params.credits_min >= 5) {
          filters.push('5+ Credits');
        } else {
          filters.push(`${params.credits_min} Credits`);
        }
      } else if (params.credits_min >= 5) {
        filters.push('5+ Credits');
      } else {
        filters.push(`${params.credits_min} Credits`);
      }
    }
    
    return filters;
  }
});

// Create Wisconsin-specific gen_ed handler that handles ethnic studies special case
const createWiscoGenEdHandler = (): FilterHandler => ({
  toParams: (filters: string[], mappings?: Record<string, Record<string, number>>) => {
    if (!mappings) return {};
    
    // Special case for ethnic studies
    const hasEthnicStudies = filters.includes('Ethnic Studies');
    const otherFilters = filters.filter(f => f !== 'Ethnic Studies');
    
    const params: Record<string, unknown> = {};
    
    // Handle non-ethnic studies filters
    if (otherFilters.length > 0) {
      const genEdValues = otherFilters.map(f => mappings.gen_ed[f]);
      params.gen_ed = genEdValues;
    }
    
    // Handle ethnic studies separately
    if (hasEthnicStudies) {
      params.ethnic = true;
    }
    
    return params;
  },
  toFilters: (params: Record<string, unknown>, mappings?: Record<string, Record<string, number>>) => {
    if (!mappings) return [];
    
    const filters: string[] = [];
    
    // Handle gen_ed filters
    if (params.gen_ed && Array.isArray(params.gen_ed)) {
      const genEdValues = params.gen_ed as number[];
      const reverseMapping = Object.entries(mappings.gen_ed).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
      }, {} as Record<number, string>);
      
      genEdValues.forEach(value => {
        if (value in reverseMapping) {
          filters.push(reverseMapping[value]);
        }
      });
    }
    
    // Handle ethnic studies
    if (params.ethnic === true) {
      filters.push('Ethnic Studies');
    }
    
    return filters;
  }
});

// Common filter groups that can be reused
const wiscoFilterGroups: FilterGroup[] = [
  {
    title: "Breadth",
    key: "breadth",
    description: "Courses that satisfy the university's breadth requirements, which ensure students receive a well-rounded education across different areas of study.",
    filters: ["Biological Science", "Humanities", "Literature", "Natural Science", "Physical Science", "Social Science"],
    attributeDescriptions: {
      "Biological Science": "Courses that study living organisms and their interactions with the environment",
      "Humanities": "Courses that explore human culture, history, and artistic expression",
      "Literature": "Courses that focus on reading and analyzing written works",
      "Natural Science": "Courses that study the natural world through observation and experimentation",
      "Physical Science": "Courses that study non-living systems and physical phenomena",
      "Social Science": "Courses that study human society and social relationships"
    },
    abbreviations: {
      "Biological Science": "Bio Sci",
      "Natural Science": "Nat Sci",
      "Physical Science": "Phys Sci",
      "Social Science": "Soc Sci"
    }
  },
  {
    title: "General Education",
    key: "gen_ed",
    description: "Core requirements that develop essential skills in communication, quantitative reasoning, and cultural understanding.",
    filters: ["Comm A", "Comm B", "QR-A", "QR-B", "Ethnic Studies"],
    attributeDescriptions: {
      "Comm A": "First-level communication courses focusing on basic writing and speaking skills",
      "Comm B": "Second-level communication courses focusing on advanced writing and speaking skills",
      "QR-A": "First-level quantitative reasoning courses focusing on basic mathematical and statistical concepts",
      "QR-B": "Second-level quantitative reasoning courses focusing on advanced mathematical and statistical concepts",
      "Ethnic Studies": "Courses that examine the experiences and contributions of ethnic groups in the United States"
    }
  },
  {
    title: "Level",
    key: "level",
    description: "The academic level of the course, indicating the expected background knowledge and complexity.",
    filters: ["Elementary", "Intermediate", "Advanced"],
    attributeDescriptions: {
      "Elementary": "Introductory courses suitable for first-year students with no prior knowledge",
      "Intermediate": "Courses that require some background knowledge or prerequisites",
      "Advanced": "Upper-level courses that require significant background knowledge and prerequisites"
    }
  },
  {
    title: "Credits",
    key: "credits",
    description: "The number of credit hours awarded for completing the course.",
    filters: ["1 Credit", "2 Credits", "3 Credits", "4 Credits", "5+ Credits"],
    attributeDescriptions: {
      "1 Credit": "Short courses or labs that meet for fewer hours per week",
      "2 Credits": "Courses that meet for about 2-3 hours per week",
      "3 Credits": "Standard courses that meet for about 3-4 hours per week",
      "4 Credits": "Intensive courses that meet for about 4-5 hours per week",
      "5+ Credits": "Very intensive courses that meet for 5 or more hours per week"
    }
  },
  {
    title: "Honors",
    key: "honors",
    description: "Special course sections designed for high-achieving students seeking additional academic challenge.",
    filters: ["Honors only", "Accelerated honors", "Honors optional"],
    attributeDescriptions: {
      "Honors only": "Courses restricted to students in the honors program",
      "Accelerated honors": "Fast-paced honors courses that cover material more quickly",
      "Honors optional": "Regular courses that offer optional honors components"
    }
  },
  {
    title: "Foreign Language",
    key: "foreign_lang",
    description: "Language courses organized by proficiency level, from beginner to advanced.",
    filters: ["1st semester", "2nd semester", "3rd semester", "4th semester", "5th semester"],
    attributeDescriptions: {
      "1st semester": "Beginner-level language courses for students with no prior experience",
      "2nd semester": "Second-semester language courses continuing from 1st semester",
      "3rd semester": "Intermediate-level language courses",
      "4th semester": "Advanced-intermediate language courses",
      "5th semester": "Advanced language courses"
    }
  }
];

// Utah-specific filter groups
const utahFilterGroups: FilterGroup[] = [
  {
    title: "Quantitative",
    key: "quantitative",
    description: "Courses that develop quantitative and analytical reasoning skills.",
    filters: ["QL", "QI"],
    attributeDescriptions: {
      "QL": "Quantitative Literacy courses focusing on basic mathematical concepts and data analysis",
      "QI": "Quantitative Intensive courses focusing on advanced mathematical applications and statistical analysis"
    }
  },
  {
    title: "Humanities",
    key: "humanities",
    description: "Courses that explore human culture, history, and society.",
    filters: ["HF", "DV", "AI", "DI"],
    attributeDescriptions: {
      "HF": "Humanities Foundation courses covering literature, philosophy, and cultural studies",
      "DV": "Diversity courses exploring different cultural perspectives and social justice",
      "AI": "American Institutions requirement covering US history and government",
      "DI": "Disciplinary Inquiry in humanities focusing on critical analysis and interpretation"
    }
  },
  {
    title: "Science",
    key: "science",
    description: "Courses in natural, physical, and behavioral sciences.",
    filters: ["BF", "AS", "PS", "LS"],
    attributeDescriptions: {
      "BF": "Social/Behavioral Science Foundation covering psychology, sociology, and anthropology",
      "AS": "Applied Science courses focusing on practical applications of scientific principles",
      "PS": "Physical Science courses covering physics, chemistry, and astronomy",
      "LS": "Life Science courses covering biology, ecology, and genetics"
    }
  },
  {
    title: "Writing/Language",
    key: "writing_language",
    description: "Courses focusing on writing, communication, and language skills.",
    filters: ["WR1", "WR2", "CW", "IR", "LR"],
    attributeDescriptions: {
      "WR1": "Writing Requirement 1 focusing on basic academic writing and composition",
      "WR2": "Writing Requirement 2 focusing on advanced writing in specific disciplines",
      "CW": "Communication/Writing requirement emphasizing effective written and oral communication",
      "IR": "International Requirement exploring global perspectives and cross-cultural understanding",
      "LR": "Language Requirement focusing on foreign language proficiency and cultural competence"
    }
  },
  {
    title: "Credits",
    key: "credits",
    description: "The number of credit hours awarded for completing the course.",
    filters: ["1 Credit", "2 Credits", "3 Credits", "4 Credits", "5+ Credits"],
    attributeDescriptions: {
      "1 Credit": "Short courses or labs that meet for fewer hours per week, typically 1-2 hours",
      "2 Credits": "Courses that meet for about 2-3 hours per week, often labs or workshops",
      "3 Credits": "Standard courses that meet for about 3-4 hours per week, typical for most classes",
      "4 Credits": "Intensive courses that meet for about 4-5 hours per week, often with additional lab time",
      "5+ Credits": "Very intensive courses that meet for 5 or more hours per week, typically advanced or research-based"
    }
  },
  {
    title: "Extra",
    key: "extra",
    description: "Additional course attributes and special programs.",
    filters: ["FF", "HON", "SUST"],
    attributeDescriptions: {
      "FF": "Fine Arts Foundation courses covering visual arts, music, theater, and dance",
      "HON": "Honors courses offering enhanced academic challenge and smaller class sizes",
      "SUST": "Sustainability focused courses addressing environmental and social sustainability"
    }
  }
];

// Define mappings for Wisconsin
const wiscoMappings = {
  gen_ed: {
    "Comm A": 1,
    "Comm B": 2,
    "QR-A": 3,
    "QR-B": 4,
    "Ethnic Studies": 5
  },
  level: {
    "Elementary": 1,
    "Intermediate": 2,
    "Advanced": 3
  },
  honors: {
    "Honors only": 1,
    "Accelerated honors": 2,
    "Honors optional": 3
  },
  foreign_lang: {
    "1st semester": 1,
    "2nd semester": 2,
    "3rd semester": 3,
    "4th semester": 4,
    "5th semester": 5
  }
};

// Wisconsin API field mappings
const wiscoApiFields: Record<string, ApiFieldMapping> = {
  course_breadth: {
    uiField: "breadth",
    apiField: "course_breadth",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values;
      }
      if (typeof values === 'string') {
        return values.split(',').map(v => v.trim());
      }
      return values;
    }
  },
  gen_ed: {
    uiField: "gen_ed",
    apiField: "gen_ed",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.map(val => typeof val === 'string' ? parseInt(val, 10) : val);
      }
      return values;
    }
  },
  ethnic: {
    uiField: "ethnic",
    apiField: "ethnic",
  },
  level: {
    uiField: "level",
    apiField: "course_level",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.map(val => typeof val === 'string' ? parseInt(val, 10) : val);
      }
      return values;
    }
  },
  credits: {
    uiField: "credits",
    apiField: "credits",
    transform: (value: unknown) => {
      console.log('Credits transform called with:', value);
      
      if (value && typeof value === 'object') {
        // Handle both formats: {min, max} and {credits_min, credits_max}
        const credits = value as { min?: number; max?: number; credits_min?: number; credits_max?: number };
        
        // Extract values, preferring direct credits_min/credits_max
        const min = credits.credits_min ?? credits.min;
        const max = credits.credits_max ?? credits.max;
        
        console.log('Transforming credits:', { min, max });
        
        // Return direct min/max parameters without nesting
        const result: Record<string, number | undefined> = {};
        if (min !== undefined) result.credits_min = min;
        if (max !== undefined) result.credits_max = max;
        return result;
      }
      return value;
    }
  },
  honors: {
    uiField: "honors",
    apiField: "honors",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.map(val => typeof val === 'string' ? parseInt(val, 10) : val);
      }
      return values;
    }
  },
  foreignLang: {
    uiField: "foreign_lang",
    apiField: "foreign_lang",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.map(val => typeof val === 'string' ? parseInt(val, 10) : val);
      }
      return values;
    }
  }
};

// Wisconsin filter operations
const wiscoFilterOperations: Record<string, FilterOperation> = {
  breadth: {
    uiName: "Breadth",
    apiName: "course_breadth",
    type: "array",
    apply: (item: Record<string, unknown>, value: unknown) => {
      if (!Array.isArray(value)) return false;
      const breadth = item.course_breadth as string;
      return value.includes(breadth);
    }
  },
  gen_ed: createArrayOperation("General Education", "gen_ed", "number"),
  ethnic: createBooleanOperation("Ethnic Studies", "ethnic"),
  level: createArrayOperation("Level", "course_level", "number"),
  credits: {
    uiName: "Credits",
    apiName: "credits",
    type: "range",
    apply: (item: Record<string, unknown>, value: unknown) => {
      if (!value || typeof value !== 'object') return false;
      
      const filter = value as { credits_min?: number; credits_max?: number };
      if (typeof item.credits !== 'string') return false;
      
      let min = 0, max = 0;
      
      if (item.credits.includes('-')) {
        const [minStr, maxStr] = item.credits.split('-');
        min = parseInt(minStr.trim(), 10);
        max = parseInt(maxStr.trim(), 10);
      } else {
        min = max = parseInt(item.credits.trim(), 10);
      }
      
      const matchesMin = filter.credits_min === undefined || min >= filter.credits_min;
      const matchesMax = filter.credits_max === undefined || max <= filter.credits_max;
      
      return matchesMin && matchesMax;
    }
  },
  honors: createArrayOperation("Honors", "honors", "number"),
  foreignLang: createArrayOperation("Foreign Language", "foreign_lang", "number"),
  noPrerequisites: createNoPrerequisitesOperation()
};

// Create a utility function for boolean attributes that checks if the column is true
const createBooleanArrayOperation = (uiName: string, apiName: string): FilterOperation => ({
  uiName,
  apiName,
  type: "array",
  apply: (item: Record<string, unknown>, value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) return true;
    
    // Check if any of the specified attributes are true in their respective columns
    return value.some(attr => {
      const columnValue = item[attr];
      return columnValue === true || columnValue === 1;
    });
  }
});

// Utah filter operations
const utahFilterOperations: Record<string, FilterOperation> = {
  quantitative: createBooleanArrayOperation("Quantitative", "boolean_attributes"),
  humanities: createBooleanArrayOperation("Humanities", "boolean_attributes"),
  science: createBooleanArrayOperation("Science", "boolean_attributes"),
  writing_language: createBooleanArrayOperation("Writing/Language", "boolean_attributes"),
  credits: {
    uiName: "Credits",
    apiName: "credits",
    type: "range",
    apply: (item: Record<string, unknown>, value: unknown) => {
      if (!Array.isArray(value) || value.length !== 2) return false;
      const [min, max] = value;
      const itemMin = item.min_credits as number;
      const itemMax = item.max_credits as number;
      return itemMin >= min && itemMax <= max;
    }
  },
  extra: createBooleanArrayOperation("Extra", "boolean_attributes"),
  noPrerequisites: createNoPrerequisitesOperation()
};

// Update Utah mappings to use 1 for true values to satisfy type system
const utahMappings = {
  quantitative: { "QL": 1, "QI": 1 },
  humanities: { "HF": 1, "DV": 1, "AI": 1, "DI": 1 },
  science: { "BF": 1, "AS": 1, "PS": 1, "LS": 1 },
  writing_language: { "WR1": 1, "WR2": 1, "CW": 1, "IR": 1, "LR": 1 },
  extra: { "FF": 1, "HON": 1, "SUST": 1 }
};

// Update Utah API field mappings to handle boolean columns
const utahApiFields: Record<string, ApiFieldMapping> = {
  quantitative: {
    uiField: "quantitative",
    apiField: "QL, QI",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.filter(v => ["QL", "QI"].includes(v as string));
      }
      return [];
    }
  },
  humanities: {
    uiField: "humanities",
    apiField: "HF, DV, AI, DI",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.filter(v => ["HF", "DV", "AI", "DI"].includes(v as string));
      }
      return [];
    }
  },
  science: {
    uiField: "science",
    apiField: "BF, AS, PS, LS",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.filter(v => ["BF", "AS", "PS", "LS"].includes(v as string));
      }
      return [];
    }
  },
  writing_language: {
    uiField: "writing_language",
    apiField: "WR1, WR2, CW, IR, LR",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.filter(v => ["WR1", "WR2", "CW", "IR", "LR"].includes(v as string));
      }
      return [];
    }
  },
  extra: {
    uiField: "extra",
    apiField: "FF, HON, SUST",
    transform: (values: unknown) => {
      if (Array.isArray(values)) {
        return values.filter(v => ["FF", "HON", "SUST"].includes(v as string));
      }
      return [];
    }
  }
};

// Define themes for different schools
export const schoolConfigs: Record<string, SchoolConfig> = {
  // Wisconsin configuration
  wisco: {
    name: "UW-Madison",
    shortName: "wisco",
    domain: "wisc.campusfy.app",
    emailDomain: "wisc.edu",
    subdomainPrefix: "wisc",
    colors: schoolThemes.wisco,
    filters: {
      groups: wiscoFilterGroups,
      mappings: wiscoMappings,
      apiFields: wiscoApiFields,
      operations: wiscoFilterOperations,
      handlers: {
        breadth: createDirectHandler('breadth', 'course_breadth'),
        gen_ed: createWiscoGenEdHandler(),
        level: createMappingHandler('level', 'level'),
        credits: createCreditsHandler(),
        honors: createMappingHandler('honors', 'honors'),
        foreign_lang: createMappingHandler('foreign_lang', 'foreign_lang', 'Foreign lang')
      }
    }
  },
  // Utah configuration
  utah: {
    name: "Utah",
    shortName: "Utah",
    domain: "utah.campusfy.app",
    emailDomain: "utah.edu",
    subdomainPrefix: "utah",
    colors: schoolThemes.utah,
    filters: {
      groups: utahFilterGroups,
      mappings: utahMappings,
      apiFields: utahApiFields,
      operations: utahFilterOperations,
      handlers: {
        quantitative: createDirectHandler('quantitative', 'boolean_attributes'),
        humanities: createDirectHandler('humanities', 'boolean_attributes'),
        science: createDirectHandler('science', 'boolean_attributes'),
        writing_language: createDirectHandler('writing_language', 'boolean_attributes'),
        credits: {
          toParams: (filters: string[]) => {
            // Convert UI credit filters to min/max range
            const creditRanges: Record<string, [number, number]> = {
              "1 Credit": [1, 1],
              "2 Credits": [2, 2],
              "3 Credits": [3, 3],
              "4 Credits": [4, 4],
              "5+ Credits": [5, 10] // Assuming max of 10 credits
            };
            
            const selectedRanges = filters.map(f => creditRanges[f]).filter(Boolean);
            if (selectedRanges.length === 0) return {};
            
            // Find the min and max across all selected ranges
            const min = Math.min(...selectedRanges.map(([min]) => min));
            const max = Math.max(...selectedRanges.map(([_, max]) => max));
            
            return { credits: [min, max] };
          },
          toFilters: (params: Record<string, unknown>) => {
            if (!params.credits || !Array.isArray(params.credits) || params.credits.length !== 2) {
              return [];
            }
            
            const [min, max] = params.credits as [number, number];
            const filters: string[] = [];
            
            if (min <= 1 && max >= 1) filters.push("1 Credit");
            if (min <= 2 && max >= 2) filters.push("2 Credits");
            if (min <= 3 && max >= 3) filters.push("3 Credits");
            if (min <= 4 && max >= 4) filters.push("4 Credits");
            if (min >= 5) filters.push("5+ Credits");
            
            return filters;
          }
        },
        extra: createDirectHandler('extra', 'boolean_attributes')
      }
    }
  },
  // Michigan configuration (keeping for compatibility)
  michigan: {
    name: "University of Michigan",
    shortName: "Michigan",
    domain: "michigan.campusfy.app",
    emailDomain: "umich.edu",
    subdomainPrefix: "michigan",
    colors: schoolThemes.michigan,
    filters: {
      groups: wiscoFilterGroups, // Using Wisconsin filters as default for now
      apiFields: wiscoApiFields, // Using Wisconsin API mappings as default
      operations: wiscoFilterOperations, // Using Wisconsin filter operations as default
      handlers: {
        ...commonFilterHandlers
      }
    }
  },
  // OSU configuration (keeping for compatibility)
  osu: {
    name: "Ohio State University",
    shortName: "OSU",
    domain: "osu.campusfy.app",
    emailDomain: "osu.edu",
    subdomainPrefix: "osu",
    colors: schoolThemes.osu,
    filters: {
      groups: wiscoFilterGroups, // Using Wisconsin filters as default for now
      apiFields: wiscoApiFields, // Using Wisconsin API mappings as default
      operations: wiscoFilterOperations, // Using Wisconsin filter operations as default
      handlers: {
        ...commonFilterHandlers
      }
    }
  },
};

/**
 * Gets the school configuration based on the hostname
 * Used for multi-tenancy to determine which school's settings to apply
 * 
 * @param hostname - The hostname from the request (e.g., "wisc.campusfy.app")
 * @returns The school configuration object for the matching school
 */
export function getSchoolFromHostname(hostname: string): SchoolConfig {
  // Extract subdomain from hostname
  const subdomain = hostname.split('.')[0];
  
  // Return school config for subdomain or default config
  return schoolConfigs[subdomain] || schoolConfigs.wisco;
}

/**
 * Gets the theme colors based on the hostname
 * Convenience function to directly access theme settings for a hostname
 * 
 * @param hostname - The hostname from the request
 * @returns The theme colors for the matching school
 */
export function getThemeFromHostname(hostname: string): ThemeColors {
  return getSchoolFromHostname(hostname).colors;
} 