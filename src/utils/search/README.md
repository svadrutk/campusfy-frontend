# Search System

This directory contains a modular search system for finding courses in the application.

## Features

- Fast, efficient course searching
- Department-first prioritization (e.g., searching for "COMP SCI" will show Computer Science courses first)
- Full text search capabilities powered by Fuse.js
- Filter support (by department, breadth, credits, etc.)
- Pagination support
- Query expansion for department abbreviations
- Caching for improved performance
- Async support for non-blocking UIs

## Architecture

The search system is divided into several modules:

### Core Modules

- **searchCore.ts**: Main search functionality and integration of all modules
- **searchAPI.ts**: API interaction functions for fetching class data
- **searchCache.ts**: Caching utilities for storing and retrieving search results
- **searchFilters.ts**: Functions for filtering search results
- **searchSort.ts**: Functions for sorting search results
- **fuseSearch.ts**: Integration with Fuse.js for fuzzy search capabilities
- **index.ts**: Entry point that exports all public functions

### Support Files

- **searchIntegration.ts**: Example implementations (for reference only)
- **MIGRATION.md**: Guide for migrating from the previous search system

## How It Works

1. The system first checks for cached results
2. If no cache hit, it performs a series of searches in this order:
   - Exact department matches (highest priority)
   - Exact class code matches
   - Fuzzy search using Fuse.js
3. Results are filtered based on user-selected filters
4. Results are sorted with department matches prioritized
5. The sorted results are cached for future use
6. Pagination is applied to return only the requested page of results

## Basic Usage

```typescript
import { searchClasses, searchClassesAsync } from '@/utils/search';

// Synchronous search
const results = searchClasses(
  classes,       // Array of class data
  'COMP SCI',    // Search query
  { breadth: ['N'] }, // Optional filters
  1,             // Page (default: 1)
  20             // Limit (default: 20)
);

// Asynchronous search (non-blocking)
const asyncResults = await searchClassesAsync(
  classes,       // Array of class data
  'COMP SCI',    // Search query
  { breadth: ['N'] }, // Optional filters
  1,             // Page (default: 1)
  20             // Limit (default: 20)
);
```

## API Reference

For detailed API documentation, see the JSDoc comments in each module file.

## Extending the Search System

To add new search capabilities:

1. Implement the functionality in the appropriate module
2. Export any public functions from the module
3. Add exports to the main `index.ts` file

## Performance Considerations

- The search system uses caching to avoid redundant searches
- For large datasets, prefer `searchClassesAsync` to avoid blocking the UI
- The system optimizes for department matches to provide the most relevant results first

## Troubleshooting

- If search results seem outdated, try clearing the cache with `clearQueryCache()`
- For performance issues, check if you're processing an unnecessarily large dataset
- If fuzzy search isn't finding expected results, check the Fuse.js options in `fuseSearch.ts` 