"use client";

import { create } from 'zustand';
import { ClassSearchQuery } from '@/types/search';

interface SearchState {
  // Search query state
  query: string;
  setQuery: (query: string) => void;
  
  // Search focus state
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  
  // Search transition state
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  
  // Filter state
  filters: ClassSearchQuery;
  setFilters: (filters: ClassSearchQuery) => void;
  
  // Reset function
  resetSearch: () => void;
}

// Create the store with initial state
const initialState = {
  query: '',
  isSearchFocused: false,
  isTransitioning: false,
  filters: {},
};

// Create a simple in-memory store without persistence
export const useSearchStore = create<SearchState>()((set) => ({
  // Search query state
  query: initialState.query,
  setQuery: (query: string) => {
    set((state) => {
      if (state.query === query) return state;
      return { query };
    });
  },
  
  // Search focus state
  isSearchFocused: initialState.isSearchFocused,
  setIsSearchFocused: (focused: boolean) => {
    set((state) => {
      if (state.isSearchFocused === focused) return state;
      return { isSearchFocused: focused };
    });
  },
  
  // Search transition state
  isTransitioning: initialState.isTransitioning,
  setIsTransitioning: (transitioning: boolean) => {
    set((state) => {
      if (state.isTransitioning === transitioning) return state;
      return { isTransitioning: transitioning };
    });
  },

  // Filter state
  filters: initialState.filters,
  setFilters: (filters: ClassSearchQuery) => {
    set((state) => {
      if (JSON.stringify(state.filters) === JSON.stringify(filters)) return state;
      return { filters };
    });
  },
  
  // Reset function
  resetSearch: () => {
    set(initialState);
  },
})); 