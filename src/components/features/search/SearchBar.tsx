"use client";

import { Filter, Search, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ClassSearch } from "@/components/features/search";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePageSidebar } from "@/contexts/PageSidebarContext";
import { useSearchStore } from "@/store/useSearchStore";
import { motion, AnimatePresence } from "framer-motion";
import { clearFuseCache } from "@/utils/search";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "next-auth/react";
import { getSchoolFromHostname } from "@/config/themes";

interface SearchBarProps {
  initialQuery?: string;
  autoFocus?: boolean;
}

export default function SearchBar({ initialQuery = "", autoFocus = false }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const preventFocusStealRef = useRef<boolean>(false);
  const currentPathnameRef = useRef<string>(pathname);
  const lastSearchQueryRef = useRef<string>("");
  
  // Use local state for the input value
  const [inputValue, setInputValue] = useState("");
  
  // Use debounce hook to delay updating the search query
  const debouncedInputValue = useDebounce(inputValue, 800);
  
  // Get search state from Zustand store
  const { 
    setQuery: updateSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    isTransitioning,
    setIsTransitioning,
    resetSearch
  } = useSearchStore();
  
  const isSearchPage = pathname === '/search';
  const { isFilterSidebarOpen, setIsFilterSidebarOpen } = usePageSidebar();

  const [isLoading, setIsLoading] = useState(false);

  // Initialize client-side state - run only once on mount
  useEffect(() => {
    setIsClient(true);
    
    // Set initialLoadComplete to true after a short delay to prevent flashing
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
      // Set preventFocusSteal to true after initial render
      preventFocusStealRef.current = true;
    }, 500);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array means this runs once on mount

  // Initialize input value from initialQuery - separate effect
  useEffect(() => {
    if (!isClient) return;
    
    if (initialQuery) {
      // Set the initial query directly without normalization to preserve exact format
      setInputValue(initialQuery);
      updateSearchQuery(initialQuery);
    }
  }, [isClient, initialQuery, updateSearchQuery]);

  // Update the pathname ref whenever pathname changes
  useEffect(() => {
    currentPathnameRef.current = pathname;
    console.log("Pathname changed to:", pathname);
    console.log("isSearchPage updated to:", pathname === '/search');
    
    // Reset transition state when pathname changes to /search
    if (pathname === '/search' && isTransitioning) {
      console.log("Navigation to /search complete, resetting transition state");
      setIsTransitioning(false);
    }
  }, [pathname, isTransitioning, setIsTransitioning]);

  // Update URL when search query changes (only on search page)
  useEffect(() => {
    if (!isClient || !isSearchPage) return;
    
    const currentQueryParam = searchParams.get('query') || '';
    // Use the debounced value instead of raw input value
    if (debouncedInputValue !== currentQueryParam) {
      const url = debouncedInputValue.trim() !== ''
        ? `/search?query=${encodeURIComponent(debouncedInputValue)}`
        : '/search';
      
      // Use replace instead of push to avoid adding to history stack
      router.replace(url, { scroll: false });
    }
  }, [debouncedInputValue, isSearchPage, isClient, router, searchParams]);

  // Focus the search input when navigating to the search page
  useEffect(() => {
    if (!isClient || !isSearchPage || !searchInputRef.current) return;
    
    // Remove auto-focus behavior
    if (isTransitioning) {
      console.log("Navigation to search page complete");
    }
  }, [isSearchPage, isClient, isTransitioning]);

  // Handle clicks outside the search input to close the search
  useEffect(() => {
    if (!isClient || isSearchPage) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchFocused &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.search-results-container')
      ) {
        // Don't close if clicking inside the search results
        if (!(event.target as Element).closest('.search-results')) {
          setIsSearchFocused(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchFocused, isSearchPage, isClient, setIsSearchFocused]);

  // Effect to update search store when debounced input changes
  useEffect(() => {
    // If there's a previous query that's now being cleared, clear that from cache
    if (debouncedInputValue === "" && lastSearchQueryRef.current) {
      clearFuseCache();
    }
    
    // Update the search store with the debounced value, preserving spaces
    updateSearchQuery(debouncedInputValue);
    
    // Keep track of the last query for cache clearing
    lastSearchQueryRef.current = debouncedInputValue;
  }, [debouncedInputValue, updateSearchQuery]);

  const handleFocus = () => {
    setIsSearchFocused(true);
    
    // Use the current pathname from the ref to ensure it's up-to-date
    const currentIsSearchPage = currentPathnameRef.current === '/search';
    
    // Additional check: if the URL contains '/search', consider it a search page
    const urlContainsSearch = typeof window !== 'undefined' && 
                             window.location.pathname.includes('/search');
    
    // Navigate to search page when focused, but only if we're not already on the search page
    // and not already transitioning
    if (!currentIsSearchPage && !urlContainsSearch && isClient && !isTransitioning) {
      setIsTransitioning(true);
      
      console.log("Searchbar focused, navigating to /search");
      
      // Navigate to search page immediately without delay
      router.push('/search');
    }
  };

  // Handle filter button click
  const handleFilterClick = () => {
    // Add debugging to understand the issue
    console.log("Filter button clicked");
    console.log("Current pathname:", currentPathnameRef.current);
    console.log("isSearchPage:", currentPathnameRef.current === '/search');
    
    // Set search focus state to true when filter is clicked
    setIsSearchFocused(true);
    
    // Use the current pathname from the ref to ensure it's up-to-date
    const currentIsSearchPage = currentPathnameRef.current === '/search';
    
    // Additional check: if the URL contains '/search', consider it a search page
    // This helps in cases where the pathname state hasn't updated yet
    const urlContainsSearch = typeof window !== 'undefined' && 
                             window.location.pathname.includes('/search');
    
    if (!currentIsSearchPage && !urlContainsSearch) {
      // If not on search page, navigate to search page and open filter sidebar
      if (typeof window !== 'undefined') {
        // Set a flag in sessionStorage to indicate that the filter sidebar should be opened
        sessionStorage.setItem('openFilterSidebar', 'true');
        
        // Log for debugging
        console.log("Setting openFilterSidebar flag and navigating to /search");
        
        // Use router.push with a callback to ensure navigation completes
        router.push('/search');
      }
    } else {
      // If already on search page, just toggle the filter sidebar
      console.log("Already on search page, toggling filter sidebar");
      setIsFilterSidebarOpen(!isFilterSidebarOpen);
    }
  };

  // Simple search input change handler - debouncing is handled by the useDebounce hook
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only process trusted events (actual user input)
    if (!e.isTrusted && preventFocusStealRef.current) return;
    
    // Get the new value directly from the event, preserving all characters including spaces
    const newValue = e.target.value;
    
    // Update the local state immediately for responsive UI, preserving spaces
    setInputValue(newValue);
    // The useDebounce hook will handle the debouncing
  };

  // Add a reset button for debugging
  const handleReset = () => {
    console.log("Manually resetting search");
    
    // Store the previous query value before clearing it
    const _previousQuery = inputValue;
    
    // Clear the input and reset search state
    setInputValue("");
    resetSearch();
    
    // Clear the query from cache to prevent using stale results
    clearFuseCache();
  };

  // Update handleSparkleClick to include loading state
  const handleSparkleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    if (session) {
      // If user is logged in, redirect to advisor page with smooth transition
      setIsTransitioning(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push('/advisor');
    } else {
      // If user is not logged in, redirect to register with callback URL
      const hostname = window.location.hostname;
      const school = getSchoolFromHostname(hostname);
      const isDev = process.env.NODE_ENV === 'development';
      const protocol = isDev ? 'http' : 'https';
      const domain = isDev ? `${school.subdomainPrefix}.localhost:3000` : school.domain;
      
      // Create the return URL using the correct domain
      const returnUrl = `${protocol}://${domain}/advisor`;
      const encodedReturnUrl = encodeURIComponent(returnUrl);
      
      // Create the register URL with the correct subdomain
      const registerUrl = `${protocol}://${domain}/auth/register?callbackUrl=${encodedReturnUrl}`;
      router.push(registerUrl);
    }
  };

  // Animation variants
  const containerVariants = {
    home: { 
      scale: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeInOut" }
    },
    search: { 
      scale: 1.05, 
      y: -10,
      transition: { duration: 0.4, ease: "easeInOut" }
    }
  };

  const buttonVariants = {
    home: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    search: { 
      opacity: 0.9, 
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  const searchResultsVariants = {
    hidden: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.2, ease: "easeInOut" }
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut", delay: 0.1 }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  // If not client-side yet, render a placeholder
  if (!isClient) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="w-full max-w-4xl flex items-center justify-between relative z-10 px-2">
            <div className="shadow-lg rounded-xl overflow-hidden mr-5">
              <div className="bg-[var(--color-primary-text)] p-5 rounded-xl"></div>
            </div>
            <div className="relative flex-1 shadow-xl rounded-xl overflow-hidden border-2 border-[var(--color-primary-border)]">
              <div className="w-full h-full py-6 px-6"></div>
            </div>
            <div className="shadow-lg rounded-xl overflow-hidden ml-5">
              <div className="bg-[var(--color-primary-text)] p-5 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <motion.div
        key={`searchbar-${isSearchPage ? 'search' : 'home'}`}
        className="w-full max-w-4xl"
        variants={containerVariants}
        initial={isTransitioning ? "home" : isSearchPage ? "search" : "home"}
        animate={isSearchPage ? "search" : "home"}
      >
        {/* Search Bar Container - Added flex-col for mobile */}
        <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between relative z-10 px-2 gap-3 sm:gap-0">
          {/* Filter Button - Hide on mobile, show on desktop */}
          <motion.div
            className="hidden sm:block w-auto shadow-lg rounded-xl sm:mr-5"
            variants={buttonVariants}
          >
            <button
              onClick={handleFilterClick}
              className="w-full bg-[var(--color-primary-text)] p-5 hover:bg-[#333333] hover:cursor-pointer transition-all duration-300 rounded-xl relative group"
            >
              <Filter size={26} color="white" className="transition-transform duration-300 group-hover:rotate-12 mx-auto" />
              <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
            </button>
          </motion.div>
          
          {/* Search Input - Full width on mobile */}
          <motion.div
            className="w-full relative rounded-xl overflow-hidden border-2 border-[var(--color-primary-border)] transition-all duration-300 ease-in-out focus-within:ring-2 focus-within:ring-[var(--color-primary-light)] focus-within:border-[var(--color-primary)]"
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={handleSearchChange}
              placeholder="Find courses..."
              className="w-full h-full py-6 px-6 border-0 focus:ring-0 focus:outline-none font-sans text-xl text-[var(--color-primary-text)] rounded-xl transition-all duration-300"
              onFocus={(e) => {
                if (!e.isTrusted && preventFocusStealRef.current) return;
                handleFocus();
              }}
              autoFocus={autoFocus}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-5">
              {/* Mobile Filter Button */}
              <div className="sm:hidden flex items-center">
                <button
                  onClick={handleFilterClick}
                  className="p-2 rounded-md border border-[var(--color-primary)] text-black hover:bg-gray-50 transition-colors flex items-center gap-1"
                  aria-label="Filters"
                >
                  <Filter size={18} className="text-[var(--color-primary)]" />
                </button>
              </div>
              
              {/* Search icon and clear button - only on desktop */}
              {inputValue.length > 0 ? (
                <div className="hidden sm:flex items-center">
                  <button 
                    onClick={handleReset}
                    className="mr-3 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                    aria-label="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <Search className="text-[var(--color-primary)]" size={22} />
                </div>
              ) : (
                <Search className="hidden sm:block text-gray-400" size={22} />
              )}
            </div>
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-light)] transition-transform duration-300 origin-left ${inputValue.length > 0 ? 'scale-x-100' : 'scale-x-0'}`}
            />
          </motion.div>

          {/* Action Buttons - Full width on mobile */}
          <motion.div
            className="w-full sm:w-auto rounded-xl sm:ml-5"
            variants={buttonVariants}
          >
            <button 
              className="w-full bg-[var(--color-primary-text)] p-5 hover:bg-[#333333] hover:cursor-pointer transition-all duration-300 rounded-xl relative group disabled:opacity-70"
              onClick={handleSparkleClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin mx-auto" />
              ) : (
                <Sparkles size={26} color="#FFD700" className="transition-all duration-300 group-hover:scale-110 mx-auto" />
              )}
              <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
            </button>
          </motion.div>
        </div>

        {/* Search Results Container - Only show on home page, not on search page */}
        <AnimatePresence>
          {!isSearchPage && isClient && isSearchFocused && initialLoadComplete && (
            <motion.div
              className="w-full max-w-4xl search-results-container"
              variants={searchResultsVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ClassSearch
                key="home-search"
                onSearchResultsChange={() => {}}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 