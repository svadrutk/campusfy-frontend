"use client";

import { useState, useEffect, useRef, Suspense, useCallback, SetStateAction } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterSidebar } from "@/components/features/search";
import { PageSidebarContext } from "@/contexts/PageSidebarContext";
import { ClassSearchQuery } from "@/types/search";
import { useSearchStore } from "@/store/useSearchStore";
import { useTheme } from '@/contexts/theme/ThemeContext';
import { ClassSearch } from "@/components/features/search";
import SearchBar from "@/components/features/search/SearchBar";
import CourseReviewSection from "@/components/features/course/components/CourseReviewSection";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";

// Separate component that uses useSearchParams
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const decodedQuery = decodeURIComponent(query);
  const [isClient, setIsClient] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const preventFocusStealRef = useRef<boolean>(false);
  const isUrlUpdateRef = useRef<boolean>(false);
  const previousFiltersRef = useRef<ClassSearchQuery | null>(null);
  const [activeFilters, setActiveFilters] = useState<ClassSearchQuery | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const { school } = useTheme();
  const { setQuery, isSearchFocused } = useSearchStore();
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update handleSparkleClick function to use local loading state
  const handleSparkleClick = async () => {
    setIsLoading(true);
    // Add a small delay to ensure the loading state is visible
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push('/advisor');
  };

  // Function to parse filters from URL parameters
  const parseFiltersFromUrl = useCallback((params: URLSearchParams): ClassSearchQuery | null => {
    const filters: ClassSearchQuery = {};
    
    // Parse common university-agnostic fields
    const query = params.get('query');
    if (query) {
      filters.query = query;
    }
    
    // Parse credits parameters
    const creditsMin = params.get('credits_min');
    const creditsMax = params.get('credits_max');
    if (creditsMin || creditsMax) {
      filters.credits_min = creditsMin ? parseInt(creditsMin, 10) : undefined;
      filters.credits_max = creditsMax ? parseInt(creditsMax, 10) : undefined;
    }
    
    const topics = params.get('topics');
    if (topics) {
      filters.topics = topics.split(',').map(t => decodeURIComponent(t));
    }
    
    return filters;
  }, []);

  // Function to update URL with current filters
  const updateUrlWithFilters = useCallback((filters: ClassSearchQuery | null) => {
    console.log('updateUrlWithFilters called with:', filters);
    console.log('isUrlUpdateRef.current:', isUrlUpdateRef.current);
    
    // Skip if we're already updating the URL or if this is from URL parsing
    if (isUrlUpdateRef.current) {
      console.log('Skipping URL update - already updating');
      return;
    }

    isUrlUpdateRef.current = true;
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Get the operation for this filter to determine its type
          const operation = school?.filters?.operations?.[key];
          const isArrayField = operation?.type === 'array';
          
          // Special handling for credits
          if (key === 'credits' && typeof value === 'object') {
            const credits = value as { min?: number; max?: number };
            if (credits.min !== undefined) {
              params.set('credits_min', String(credits.min));
            }
            if (credits.max !== undefined) {
              params.set('credits_max', String(credits.max));
            }
            return;
          }
          
          if (Array.isArray(value)) {
            const encodedValues = value.map(v => encodeURIComponent(String(v)));
            const paramKey = isArrayField ? operation?.uiName?.toLowerCase().replace(/\s+/g, '_') || key : key;
            params.set(paramKey, encodedValues.join(','));
          } else if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                params.set(`${key}_${subKey}`, String(subValue));
              }
            });
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    console.log('Updating URL to:', newUrl);
    router.push(newUrl);
    
    // Reset the flag after a short delay
    setTimeout(() => {
      console.log('Resetting isUrlUpdateRef');
      isUrlUpdateRef.current = false;
    }, 100);
  }, [router, school]);

  // Handle filter changes
  const handleFilterChange = useCallback((value: SetStateAction<ClassSearchQuery | null>) => {
    console.log('handleFilterChange called with:', value);
    // Skip if filters haven't changed
    const filters = typeof value === 'function' ? value(previousFiltersRef.current) : value;
    
    if (JSON.stringify(filters) === JSON.stringify(previousFiltersRef.current)) {
      console.log('Filters unchanged, skipping update');
      return;
    }
    
    console.log('Updating filters from:', previousFiltersRef.current, 'to:', filters);
    previousFiltersRef.current = filters;
    setActiveFilters(filters);
  }, [setActiveFilters]);

  // Initialize client-side state
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    
    console.log('Initializing client-side state');
    setIsClient(true);
    hasInitializedRef.current = true;
    
    // Set preventFocusSteal to true after initial render
    const timer = setTimeout(() => {
      preventFocusStealRef.current = true;
    }, 500);
    
    // Check if we should auto-focus the search bar
    const shouldFocus = sessionStorage.getItem('shouldAutoFocusSearch');
    if (shouldFocus === 'true') {
      setShouldAutoFocus(true);
      sessionStorage.removeItem('shouldAutoFocusSearch');
    }
    
    // Parse filters from URL on initial load
    if (!isUrlUpdateRef.current) {
      console.log('Parsing filters from URL:', searchParams.toString());
      const filtersFromUrl = parseFiltersFromUrl(searchParams);
      if (filtersFromUrl && Object.keys(filtersFromUrl).length > 0) {
        console.log('Setting filters from URL:', filtersFromUrl);
        setActiveFilters(filtersFromUrl);
        
        // Only open the sidebar automatically if the user has explicitly requested it
        const shouldOpenSidebar = sessionStorage.getItem('openFilterSidebar');
        if (shouldOpenSidebar === 'true') {
          console.log('Opening filter sidebar from session storage');
          setIsFilterSidebarOpen(true);
          sessionStorage.removeItem('openFilterSidebar');
        }
      }

      if (decodedQuery) {
        console.log('Setting search query from URL:', decodedQuery);
        setQuery(decodedQuery);
      }
    }
    
    return () => clearTimeout(timer);
  }, [searchParams, setActiveFilters, setIsFilterSidebarOpen, decodedQuery, setQuery, parseFiltersFromUrl]);

  // Update URL when filters change
  useEffect(() => {
    if (!isClient || isUrlUpdateRef.current) {
      return;
    }

    console.log('Filter change effect triggered');
    console.log('isClient:', isClient);
    console.log('isUrlUpdateRef.current:', isUrlUpdateRef.current);
    console.log('activeFilters:', activeFilters);
    
    const timeoutId = setTimeout(() => {
      if (!activeFilters || Object.keys(activeFilters).length === 0) {
        console.log('Clearing URL - no active filters');
        isUrlUpdateRef.current = true;
        router.push('/search', { scroll: false });
        setTimeout(() => {
          isUrlUpdateRef.current = false;
        }, 100);
      } else {
        console.log('Updating URL with active filters:', activeFilters);
        updateUrlWithFilters(activeFilters);
      }
    }, 100);
    
    return () => {
      console.log('Cleaning up filter change effect');
      clearTimeout(timeoutId);
    };
  }, [activeFilters, isClient, updateUrlWithFilters, router]);

  // Don't render anything on the server
  if (!isClient) {
    return (
      <div className="min-h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white border-x border-b border-[var(--color-primary-border)]">
          <div className="h-12 w-64 bg-gray-200 rounded mb-12 animate-pulse"></div>
          <div className="w-full max-w-4xl flex items-center justify-between relative z-10">
            <div className="h-14 w-14 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="flex-1 mx-4 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-14 w-14 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
          <div className="w-full max-w-4xl h-64 bg-gray-200 rounded-xl mt-4 animate-pulse"></div>
        </div>
        <div className="h-16 bg-gray-100 animate-pulse"></div>
      </div>
    );
  }

  return (
    <PageSidebarContext.Provider value={{
      isFilterSidebarOpen,
      setIsFilterSidebarOpen,
      activeFilters,
      setActiveFilters: handleFilterChange
    }}>
      <div className="flex flex-col min-h-full">
        <div className="flex flex-1 relative">
          {/* Sidebar overlay for mobile */}
          <div 
            className={`sm:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-300 ${
              isFilterSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsFilterSidebarOpen(false)}
          />

          {/* Sidebar container - mobile overlay, desktop push */}
          <div 
            className={`fixed sm:static transition-all duration-300 h-[calc(100%-64px)] sm:h-full
              ${isFilterSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
              sm:translate-x-0
              w-80 
              ${isFilterSidebarOpen ? 'sm:w-80' : 'sm:w-0 sm:overflow-hidden'}`}
            style={{ 
              top: '64px',
              bottom: 0,
              zIndex: 50,
              visibility: isFilterSidebarOpen ? 'visible' : 'visible',
              pointerEvents: isFilterSidebarOpen ? 'auto' : 'none',
            }}
          >
            <Suspense fallback={<div className="p-4">Loading filters...</div>}>
              <FilterSidebar 
                isOpen={isFilterSidebarOpen} 
                onClose={() => {
                  console.log("Closing filter sidebar");
                  setIsFilterSidebarOpen(false);
                }} 
                onFilterChange={handleFilterChange}
                initialFilters={activeFilters}
                onInitialLoad={() => {
                  // Don't auto-open the sidebar on initial load
                  console.log("Filters loaded, not auto-opening sidebar");
                }}
              />
            </Suspense>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            <Suspense fallback={
              <div className="min-h-full flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-white border-x border-b border-[var(--color-primary-border)]">
                  <div className="h-12 w-64 bg-gray-200 rounded mb-12 animate-pulse"></div>
                  <div className="w-full max-w-4xl flex items-center justify-between relative z-10">
                    <div className="h-14 w-14 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="flex-1 mx-4 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div className="h-14 w-14 bg-gray-200 rounded-xl animate-pulse"></div>
                  </div>
                  <div className="w-full max-w-4xl h-64 bg-gray-200 rounded-xl mt-4 animate-pulse"></div>
                </div>
              </div>
            }>
              <div className="min-h-full grid grid-rows-[auto_1fr]">
                <div className="flex flex-col items-center px-4 pt-10 bg-white border-x border-b border-[var(--color-primary-border)]">
                  {/* Move button above header text */}
                  <motion.button
                    onClick={handleSparkleClick}
                    className="mb-8 px-4 py-2 bg-white text-black rounded-full font-new-spirit-medium text-sm flex items-center gap-2 transition-all duration-300 group mx-auto border border-[var(--color-primary)] hover:bg-gray-50 disabled:opacity-70 hover:cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    initial={{ opacity: 1 }}
                    animate={{ 
                      opacity: isLoading ? 0.7 : 1,
                      scale: isLoading ? 0.98 : 1
                    }}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span className="inline-block min-w-[4rem]">Loading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="inline-block min-w-[4rem]">
                          <span className="hidden sm:inline">Try ClassGPT, your new AI-powered course discovery tool</span>
                          <span className="inline sm:hidden">Try ClassGPT</span>
                        </span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>

                  {/* Header text */}
                  <div className="text-center mb-10">
                    <h1 className="text-4xl font-new-spirit-medium text-gray-900">
                      Discover your classes at <span style={{ color: 'var(--color-primary)' }} className="font-new-spirit-medium">{school?.name}</span>
                    </h1>
                  </div>
                  
                  {/* SearchBar */}
                  <div className="w-full max-w-4xl">
                    <SearchBar initialQuery={decodedQuery} autoFocus={shouldAutoFocus} />
                  </div>
                  
                  {/* Results Container - Takes remaining height */}
                  <div className="w-full flex justify-center">
                    <div className="w-full max-w-4xl relative grid grid-rows-1 h-[calc(100vh-20rem)] sm:h-[60vh] overflow-hidden">
                      <div className={`transition-all duration-500 ease-in-out row-start-1 col-start-1 h-full overflow-y-auto ${
                        isSearchFocused ? 'opacity-0 transform translate-y-8 pointer-events-none' : 'opacity-100 transform translate-y-0'
                      }`}>
                        <CourseReviewSection isSearchFocused={isSearchFocused} />
                      </div>
                      <div className={`row-start-1 col-start-1 h-full overflow-y-auto transition-all duration-500 ease-in-out ${
                        isSearchFocused ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-8 pointer-events-none'
                      }`}>
                        <ClassSearch
                          isSearchPage={true}
                          activeFilters={activeFilters}
                          onSearchResultsChange={() => {}}
                          onFilterChange={handleFilterChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </PageSidebarContext.Provider>
  );
}

// Main page component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <SearchContent />
      </motion.div>
    </Suspense>
  );
}