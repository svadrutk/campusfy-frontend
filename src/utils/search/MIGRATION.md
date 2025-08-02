# Search System Migration Guide

This guide will help you migrate from the old search system (`enhancedSearchUtils.ts`) to the new modular search system.

## Overview of Changes

The search system has been completely refactored to improve:

- **Modularity**: Functions are organized into logical modules
- **Performance**: Optimized algorithms and caching
- **Maintainability**: Better typing, comments, and function organization
- **Testability**: Pure functions with clear inputs and outputs

## Directory Structure

The new search system is organized as follows:

```
src/utils/
├── search/
│   ├── index.ts             # Main entry point that exports all functions
│   ├── searchAPI.ts         # API interaction functions
│   ├── searchCache.ts       # Caching utilities
│   ├── searchCore.ts        # Core search functionality
│   ├── searchFilters.ts     # Filter utilities
│   ├── searchSort.ts        # Sorting utilities
│   ├── fuseSearch.ts        # Fuse.js integration
│   └── searchIntegration.ts # Examples of usage (for reference only)
├── helpers/
│   ├── formatters.ts        # Data formatting utilities
│   └── validators.ts        # Validation utilities
└── departmentUtils.ts       # Department-related utilities
```

## Migration Steps

### Step 1: Import from the new module

Replace:

```typescript
import { searchClasses, searchClassesAsync } from '@/utils/enhancedSearchUtils';
```

With:

```typescript
import { searchClasses, searchClassesAsync } from '@/utils/search';
```

### Step 2: Update function calls

The core search functions maintain the same signature, so most function calls should work without changes:

```typescript
// Old
const results = searchClasses(classes, query, filters, page, limit);

// New - works the same way
const results = searchClasses(classes, query, filters, page, limit);
```

### Step 3: Update cache-related code

If you were directly manipulating the search cache, use the new cache utilities:

```typescript
// Old
searchResultsCache.clear();

// New
import { clearQueryCache } from '@/utils/search';
clearQueryCache();

// Or more specifically for a query
clearQueryCache('COMP SCI');
```

### Step 4: Update filter-related code

Replace direct filter application with the new filter functions:

```typescript
// Old
const filtered = applyFilters(classes, filters);

// New
import { applyFilters } from '@/utils/search';
const filtered = applyFilters(classes, filters);
```

### Step 5: Update Fuse.js interactions

If you were directly using Fuse.js, use the new Fuse.js utilities:

```typescript
// Old
const fuse = new Fuse(classes, fuseOptions);
const results = fuse.search(query);

// New
import { initializeFuse, performFuseSearch } from '@/utils/search';
const fuse = initializeFuse(classes);
const results = performFuseSearch(classes, query);
```

## Key Improvements

### Department prioritization

The new system automatically prioritizes department matches. For example, searching for "COMP SCI" will show Computer Science courses first, sorted by course number.

### Improved caching

The cache system has been improved to handle more edge cases and provide better performance. It now generates cache keys based on the normalized query and filters.

### Better error handling

The new system includes comprehensive error handling and graceful fallbacks to ensure the application remains stable even when encountering issues.

### Type safety

All functions now have proper TypeScript types, improving type safety and developer experience.

## Examples

See the `searchIntegration.ts` file for complete examples of how to use the new search system in various scenarios.

## Common Issues During Migration

### Issue: Search results are different

The new search system prioritizes exact department matches more strongly. If you notice differences in search results, this is likely due to the improved prioritization algorithm.

### Issue: Cache invalidation

If you encounter issues with stale results, try clearing the cache:

```typescript
import { clearQueryCache } from '@/utils/search';
clearQueryCache();
```

### Issue: Missing functions

If you were using internal helper functions from the old system, look for their equivalents in the various modules of the new system. Most functionality has been preserved but may have been moved to a different module.

## Need Help?

If you encounter any issues during migration, please refer to the detailed documentation in each module or reach out to the team for assistance. 