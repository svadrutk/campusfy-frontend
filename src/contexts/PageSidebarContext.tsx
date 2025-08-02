"use client";

import { createContext, useContext, Dispatch, SetStateAction } from "react";
import { ClassSearchQuery } from "@/types/search";

// Create a context to manage the sidebar state and filters at the page level
export const PageSidebarContext = createContext<{
  isFilterSidebarOpen: boolean;
  setIsFilterSidebarOpen: Dispatch<SetStateAction<boolean>>;
  activeFilters: ClassSearchQuery | null;
  setActiveFilters: Dispatch<SetStateAction<ClassSearchQuery | null>>;
}>({
  isFilterSidebarOpen: false,
  setIsFilterSidebarOpen: () => {},
  activeFilters: null,
  setActiveFilters: () => {},
});

export const usePageSidebar = () => useContext(PageSidebarContext); 