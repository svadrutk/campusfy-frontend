# Campusfy University Data Architecture

This document explains how the Campusfy codebase handles university-specific data while maintaining a common core structure.

## Overview

Campusfy supports multiple universities, each with their own specific data needs. Our architecture separates university-agnostic "core" data from university-specific data to make it easier to add support for new universities.

## Key Concepts

### University-Agnostic Core Data

The following fields are considered university-agnostic and are part of the `CoreClassData` interface:

- `class_code`: Course code (e.g., "CS 101")
- `course_name`: Full name of the course
- `course_desc`: Course description
- `credits`: Credit hours (as a string, may include ranges like "3-5")
- `requisites`: Prerequisites or co-requisites
- `gpa`: Average GPA for the course
- `grade_count`: Number of grades recorded
- `indexed_difficulty/fun/workload`: Normalized ratings
- `review_count`: Number of reviews
- `overall_rating`: Overall course rating
- `reviews`: Array of student reviews
- `vector_embedding`: For semantic search

### University-Specific Fields

University-specific fields are in the `UniversitySpecificFields` interface and can include:

- `course_level`: The level of the course (varies by university)
- `course_breadth`: Academic breadth category
- `grad_req`: Whether it's required for graduation
- `gen_ed`: General education requirement
- `honors`: Honors designation
- `foreign_lang`: Foreign language requirement
- `ethnic`: Ethnic studies requirement
- And other university-specific fields

## Working with Class Data

### 1. Accessing Data Fields

Always use the helper functions in `src/utils/helpers/dataHandlers.ts` when accessing university-specific fields:

```typescript
// GOOD: Using helper functions
import { getUniversityField, hasUniversityField } from '@/utils/helpers/dataHandlers';

// Check if a field exists
if (hasUniversityField(classData, 'honors', schoolConfig)) {
  // Access the field with proper context
  const honorsValue = getUniversityField(classData, 'honors', schoolConfig);
  // ...
}

// BAD: Direct access to university-specific fields
if (classData.honors) { // Don't do this!
  // ...
}
```

### 2. Extracting Core Data

To get only the university-agnostic fields:

```typescript
import { extractCoreClassData } from '@/utils/helpers/dataHandlers';

const coreData = extractCoreClassData(classData);
// coreData now contains only the university-agnostic fields
```

### 3. University Adapters

For components that need to access multiple university-specific fields:

```typescript
import { createUniversityAdapter } from '@/utils/helpers/dataHandlers';

// Create an adapter with the current university context
const getField = createUniversityAdapter(schoolConfig);

// Then use it throughout your component
const honorsValue = getField(classData, 'honors');
const genEdValue = getField(classData, 'gen_ed');
```

## School Configuration

University-specific field mappings, operations, and handlers are defined in `src/config/themes.ts`. Each university has:

1. **API Field Mappings**: Map UI field names to database field names
2. **Filter Operations**: Define how to filter data by specific fields
3. **Filter Handlers**: Convert between UI filter values and API parameters

## Adding a New University

To add support for a new university:

1. Create a new school configuration in `src/config/themes.ts`
2. Define the university-specific filter groups
3. Add API field mappings for any university-specific fields
4. Define filter operations for university-specific filtering
5. Implement any custom filter handlers needed

## Best Practices

1. **Never hardcode university names** in utility functions
2. Always pass the `SchoolConfig` to functions that need university context
3. Use the data handler utilities when accessing university-specific fields
4. When adding new fields, consider if they are truly university-agnostic or university-specific
5. Keep university-specific logic in the university configuration, not in utility functions

## Example: Handling University-Specific Filters

```typescript
// Using school config for filters
import { convertToApiQuery } from '@/utils/helpers/formatters';
import { applyFilters } from '@/utils/search/searchFilters';

// Convert UI filters to API parameters using school-specific mappings
const apiQuery = convertToApiQuery(searchParams, schoolConfig);

// Apply filters with school context
const filteredResults = applyFilters(classes, apiQuery, schoolConfig);
``` 