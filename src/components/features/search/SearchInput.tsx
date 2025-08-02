import { useState, useEffect, useRef } from 'react';
import { useSearchStore } from '@/store/useSearchStore';
import { useDebounce } from '@/hooks/useDebounce';
import { clearFuseCache } from '@/utils/search';

interface SearchInputProps {
  initialQuery?: string;
  autoFocus?: boolean;
  onSearchChange?: (query: string) => void;
}

export default function SearchInput({ 
  initialQuery = "", 
  autoFocus = false,
  onSearchChange
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  
  // Use debounce hook to delay updating the search query
  const debouncedInputValue = useDebounce(inputValue, 800);
  
  // Get search state from Zustand store
  const { setQuery: updateSearchQuery } = useSearchStore();

  // Initialize input value from initialQuery
  useEffect(() => {
    if (initialQuery) {
      setInputValue(initialQuery);
      updateSearchQuery(initialQuery);
    }
  }, [initialQuery, updateSearchQuery]);

  // Effect to update search store when debounced input changes
  useEffect(() => {
    // If there's a previous query that's now being cleared, clear that from cache
    if (debouncedInputValue === "" && lastSearchQueryRef.current) {
      clearFuseCache();
    }
    
    // Update the search store with the debounced value
    updateSearchQuery(debouncedInputValue);
    
    // Call the onSearchChange callback if provided
    if (onSearchChange) {
      onSearchChange(debouncedInputValue);
    }
    
    // Keep track of the last query for cache clearing
    lastSearchQueryRef.current = debouncedInputValue;
  }, [debouncedInputValue, updateSearchQuery, onSearchChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  return (
    <input
      ref={searchInputRef}
      type="text"
      value={inputValue}
      onChange={handleSearchChange}
      placeholder="Search for classes..."
      autoFocus={autoFocus}
      className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-primary)] text-lg"
    />
  );
} 