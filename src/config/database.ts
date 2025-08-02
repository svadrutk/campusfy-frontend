/**
 * Database configuration interfaces and settings for different schools
 * Defines the database schemas, tables, API endpoints, and featured courses
 * for each supported educational institution
 */

/**
 * Interface defining the database configuration for a school
 * Contains schema name, table names, API endpoints, and featured courses
 */
export interface DatabaseConfig {
  /** Database schema name for the school */
  schema: string;
  /** Table names for different data types */
  tables: {
    /** Table containing class/course information */
    classes: string;
    /** Table containing grade distribution data */
    grades: string;
    /** Table containing user-submitted reviews */
    reviews: string;
    /** Table containing user account information */
    users: string;
  };
  /** External API endpoints for integration */
  apiEndpoints: {
    /** Endpoint for enrollment/registration data */
    enrollment: string;
    /** Endpoint for course search */
    search: string;
  };
  /** List of featured course codes to highlight for this school */
  featuredCourses: string[];
}

/**
 * Database configurations for all supported schools
 * Each school has its own schema, tables, API endpoints, and featured courses
 */
export const databaseConfigs: Record<string, DatabaseConfig> = {
  wisco: {
    schema: 'wisco',
    tables: {
      classes: 'classes_undergrad2',
      grades: 'grades-test',
      reviews: 'reviews',
      users: 'users'
    },
    apiEndpoints: {
      enrollment: 'https://enroll.wisc.edu/api/search/v1',
      search: 'https://enroll.wisc.edu/api/search/v1'
    },
    featuredCourses: ["COMP SCI 220", "MUSIC 113", "CHEM 103"]
  },
  utah: {
    schema: 'utah',
    tables: {
      classes: 'classes_undergrad2',
      grades: 'grades',
      reviews: 'reviews',
      users: 'users'
    },
    apiEndpoints: {
      enrollment: 'https://enroll.utah.edu/api/search/v1',
      search: 'https://enroll.utah.edu/api/search/v1'
    },
    featuredCourses: ["CS1410", "MUSC1010", "CHEM1210"]
  },
  michigan: {
    schema: 'michigan',
    tables: {
      classes: 'classes',
      grades: 'grades',
      reviews: 'reviews',
      users: 'users'
    },
    apiEndpoints: {
      enrollment: 'https://enroll.umich.edu/api/search/v1',
      search: 'https://enroll.umich.edu/api/search/v1'
    },
    featuredCourses: ["EECS 280", "MUSICOL 345", "CHEM 210"]
  },
  osu: {
    schema: 'osu',
    tables: {
      classes: 'classes',
      grades: 'grades',
      reviews: 'reviews',
      users: 'users'
    },
    apiEndpoints: {
      enrollment: 'https://enroll.osu.edu/api/search/v1',
      search: 'https://enroll.osu.edu/api/search/v1'
    },
    featuredCourses: ["CSE 2221", "MUSIC 2251", "CHEM 1210"]
  }
}; 