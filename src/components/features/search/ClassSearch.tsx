"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ClassSearchQuery } from "@/types/search";
import { ExtendedClassData } from "@/types/classes/classTypes";
import { useSearchStore } from '@/store/useSearchStore';
import { getOrLoadClassData, hasCachedData } from '@/utils/cacheUtils';
import { searchClassesAsync, fetchClassDetails, clearSearchCache } from '@/utils/search';
import { generateEmbedding } from "@/utils/vectorSearchUtils";
import { buildVectorIndex, searchVectorIndex } from "@/utils/vectorIndexUtils";
import { SchoolConfig, getSchoolFromHostname } from '@/config/themes';
import { applyRankingScores } from './RankingCalculator';
import { sortClasses } from './SortingManager';
import { convertToApiQuery } from '@/utils/helpers/formatters';
import { applyFilters } from '@/utils/search/searchFilters';
import SearchResults from './SearchResults';

interface ClassSearchProps {
  onSearchResultsChange?: (hasResults: boolean) => void;
  isSearchPage?: boolean;
  activeFilters?: ClassSearchQuery | null;
  onFilterChange?: (filters: ClassSearchQuery | null) => void;
  isAdvisorPage?: boolean;
}

// Update the type definition for class data
type SearchClassData = ExtendedClassData & {
  searchScore?: number;
  vectorScore?: number;
  rankingScore?: number;
};

export default function ClassSearch({ 
  onSearchResultsChange,
  isSearchPage = false,
  activeFilters = null,
  onFilterChange = () => {},
  isAdvisorPage = false
}: ClassSearchProps) {
  const [isClient, setIsClient] = useState(false);
  const [_hasEverHadResults, setHasEverHadResults] = useState(false);
  const [gpaSortDirection, setGpaSortDirection] = useState<'desc' | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [sortedResults, setSortedResults] = useState<SearchClassData[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const vectorIndexBuiltRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get search query from Zustand store
  const searchStore = useSearchStore();
  const searchQuery = isSearchPage ? searchStore.query : "";
  const isSearchFocused = isSearchPage ? searchStore.isSearchFocused : false;
  const safeSearchQuery = searchQuery || "";

  // Memoize the activeFilters to prevent unnecessary re-renders
  const memoizedActiveFilters = useMemo(() => activeFilters, [activeFilters]);

  // Memoize the visibility check
  const shouldShow = useMemo(() => {
    if (isSearchPage || isAdvisorPage) return true;
    return isSearchFocused;
  }, [isSearchPage, isAdvisorPage, isSearchFocused]);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    
    // Set school config based on hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const school = getSchoolFromHostname(hostname);
      setSchoolConfig(school);
    }
    
    return () => {
      clearSearchCache();
    };
  }, []);

  // Handle GPA sorting
  const handleGpaSort = () => {
    // Clear experience filters if they exist
    if (memoizedActiveFilters?.experience_filters && Array.isArray(memoizedActiveFilters.experience_filters) && memoizedActiveFilters.experience_filters.length > 0) {
      const newFilters = { ...memoizedActiveFilters };
      delete newFilters.experience_filters;
      onFilterChange(newFilters);
    }

    // Toggle between descending and no sort
    setGpaSortDirection(current => current === 'desc' ? null : 'desc');
  };

  // Effect to load and process class data
  useEffect(() => {
    const loadClassData = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if we have cached data to determine loading strategy
        const hasCached = await hasCachedData();
        
        // Get or load class data - use background mode if cache exists
        // This allows immediate UI rendering with cached data while refreshing in background
        const classData = await getOrLoadClassData(
          undefined, // no progress callback needed for background refresh
          undefined, // no abort signal
          hasCached   // use background mode if cache exists
        );
        let filteredResults = classData;
        const expFilters = memoizedActiveFilters?.experience_filters;

        // Build vector index if not already built
        if (!vectorIndexBuiltRef.current) {
          buildVectorIndex(filteredResults);
          vectorIndexBuiltRef.current = true;
        }
        
        // If search is active, apply it to ALL classes first
        if (safeSearchQuery && safeSearchQuery.length >= 2) {
          const searchResults = await searchClassesAsync(
            classData,
            safeSearchQuery,
            { ...memoizedActiveFilters, experience_filters: undefined },
            1,
            10000,
            schoolConfig || undefined
          );
          filteredResults = searchResults.classes;
        } else {
          // Apply topic-based filtering first if needed
          const topics = memoizedActiveFilters?.topics;
          if (topics && Array.isArray(topics) && topics.length > 0) {
            const formattedTopicText = `Class covers ${topics.join(', ')}`;
            const topicEmbedding = await generateEmbedding(formattedTopicText);
            if (topicEmbedding) {
              const semanticResults = searchVectorIndex(topicEmbedding, 1000, 0.75);
              const vectorScores = new Map(
                semanticResults.map(result => [result.class_code, result.vectorScore || 0])
              );
              
              filteredResults = filteredResults.map(classItem => ({
                ...classItem,
                vectorScore: vectorScores.get(classItem.class_code) || 0
              }));
              
              filteredResults = filteredResults.filter(classItem => 
                vectorScores.has(classItem.class_code)
              );
              
              filteredResults.sort((a, b) => (b.vectorScore || 0) - (a.vectorScore || 0));
            }
          }

          // Then apply experience filters if there's no search query
          if (expFilters && Array.isArray(expFilters) && expFilters.length > 0) {
            filteredResults = filteredResults.filter(classItem => {
              const difficulty = Number(classItem.indexed_difficulty);
              const workload = Number(classItem.indexed_workload);
              const fun = Number(classItem.indexed_fun);
              const gpaValue = classItem.gradeData?.GPA ? Number(classItem.gradeData.GPA) : 
                              (typeof classItem.gpa === 'number' ? classItem.gpa : 0);

              for (const filter of expFilters) {
                switch (filter) {
                  case 'Easy':
                    if (isNaN(difficulty) || difficulty > 3) return false;
                    break;
                  case 'Light Workload':
                    if (isNaN(workload) || workload > 3) return false;
                    break;
                  case 'Fun':
                    if (isNaN(fun) || fun < 3) return false;
                    break;
                  case 'High GPA':
                    if (isNaN(gpaValue) || gpaValue < 3.0) return false;
                    break;
                }
              }
              return true;
            });
          }
        }
        
        // Apply any remaining filters
        if (memoizedActiveFilters && schoolConfig) {
          const { topics: _topics, experience_filters: _exp, ...otherFilters } = memoizedActiveFilters;
          if (Object.keys(otherFilters).length > 0) {
            const apiQuery = convertToApiQuery(otherFilters, schoolConfig);
            filteredResults = applyFilters(filteredResults, apiQuery, schoolConfig);
          }
        }

        // Calculate ranking scores
        filteredResults = applyRankingScores(filteredResults, {
          hasTopics: Boolean(memoizedActiveFilters?.topics && Array.isArray(memoizedActiveFilters.topics) && memoizedActiveFilters.topics.length > 0),
          hasSearch: Boolean(safeSearchQuery && safeSearchQuery.length >= 2),
          experienceFilters: Array.isArray(expFilters) && expFilters.every(f => typeof f === 'string') ? expFilters as string[] : undefined
        });

        // Apply sorting
        if (gpaSortDirection) {
          filteredResults = sortClasses(filteredResults, {
            direction: gpaSortDirection,
            field: 'gpa'
          });
        } else {
          filteredResults = sortClasses(filteredResults, {
            direction: 'desc',
            field: 'rankingScore'
          });
        }
        
        // Update states
        setSortedResults(filteredResults);
        
        if (onSearchResultsChange) {
          onSearchResultsChange(filteredResults.length > 0);
        }
        
        if (filteredResults.length > 0) {
          setHasEverHadResults(true);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading class data:', error);
        setError(error instanceof Error ? error : new Error('Unknown error loading class data'));
        setIsLoading(false);
        
        if (onSearchResultsChange) {
          onSearchResultsChange(false);
        }
      }
    };
    
    loadClassData();
  }, [isClient, safeSearchQuery, memoizedActiveFilters, schoolConfig, onSearchResultsChange, gpaSortDirection]);

  // Handle class card click
  const handleClassClick = async (classCode: string) => {
    try {
      await fetchClassDetails(classCode);
    } catch (error) {
      console.error(`Error fetching details for ${classCode}:`, error);
    }
  };

  // On non-search pages, only show when focused
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <SearchResults
        results={sortedResults}
        isLoading={isLoading}
        error={error}
        schoolConfig={schoolConfig}
        onClassClick={handleClassClick}
        onGpaSort={handleGpaSort}
        gpaSortDirection={gpaSortDirection}
      />
    </div>
  );
}