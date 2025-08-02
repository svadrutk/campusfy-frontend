"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Filter } from "lucide-react";
import { ClassSearchQuery } from "@/types/search";
import { useTheme } from "@/contexts/theme/ThemeContext";
import { motion } from "framer-motion";
import {
  getDropdownFilters,
  getTopicFilters,
  convertFiltersToSearchParams,
  convertSearchParamsToFilters
} from "@/utils/filterUtils";
import { 
  TopicSearch, 
  TopicSuggestions, 
  ExperienceFilters, 
  SelectedFilters,
  DropdownFilterGroup,
  FeedbackButton
} from ".";

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange?: (filters: ClassSearchQuery) => void;
  onInitialLoad?: (hasFilters: boolean) => void;
  initialFilters?: ClassSearchQuery | null;
  urlParams?: URLSearchParams;
}

// Topic suggestions
const topicSuggestions = ["algorithms", "neuroscience"];
  
// Experience filters
const experienceFilters = ["Easy", "Light Workload", "Fun", "High GPA"];

export default function FilterSidebar({ 
  isOpen: _isOpen,
  onClose,
  onFilterChange,
  onInitialLoad,
  initialFilters,
  urlParams
}: FilterSidebarProps) {
  const { school } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Get the filter groups for the current school
  const filterGroups = useMemo(() => {
    return school.filters.groups;
  }, [school.filters.groups]);
  
  // Get current filters from initialFilters
  const selectedFilters = useMemo(() => {
    if (!initialFilters) return [];
    return convertSearchParamsToFilters(initialFilters, school, experienceFilters);
  }, [initialFilters, school]);

  // Initialize filters from URL params
  useEffect(() => {
    if (urlParams) {
      const searchParams = parseUrlParams(urlParams);
      const filters = convertSearchParamsToFilters(searchParams, school, experienceFilters);
      if (onInitialLoad) {
        onInitialLoad(filters.length > 0);
      }
    }
  }, [urlParams, school, onInitialLoad]);
  
  const toggleDropdown = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleFilter = useCallback((filter: string) => {
    if (!onFilterChange) return;

    console.log('Toggling filter:', filter);
    console.log('Current selected filters:', selectedFilters);

    const isFilterSelected = selectedFilters.includes(filter);
    const newFilters = isFilterSelected
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter];
    
    console.log('New filters after toggle:', newFilters);
    
    const searchParams = convertFiltersToSearchParams(newFilters, school, experienceFilters);
    console.log('Converted search params:', searchParams);
    
    onFilterChange(searchParams);
  }, [selectedFilters, onFilterChange, school]);

  // Memoize topic filters
  const topicFilters = useMemo(() => 
    getTopicFilters(selectedFilters, filterGroups, experienceFilters), 
    [selectedFilters, filterGroups]
  );
  
  // Memoize dropdown filters
  const dropdownFilters = useMemo(() => 
    getDropdownFilters(selectedFilters, filterGroups), 
    [selectedFilters, filterGroups]
  );

  // Function to add a new topic
  const addTopic = useCallback((topic: string) => {
    if (!onFilterChange || !topic || selectedFilters.includes(topic)) return;
    
    const newFilters = [...selectedFilters, topic];
    const searchParams = convertFiltersToSearchParams(newFilters, school, experienceFilters);
    onFilterChange(searchParams);
  }, [selectedFilters, onFilterChange, school]);

  // Function to remove a topic
  const removeTopic = useCallback((topic: string) => {
    if (!onFilterChange) return;
    
    const newFilters = selectedFilters.filter(f => f !== topic);
    const searchParams = convertFiltersToSearchParams(newFilters, school, experienceFilters);
    onFilterChange(searchParams);
  }, [selectedFilters, onFilterChange, school]);

  // Function to clear all dropdown filters
  const clearDropdownFilters = useCallback(() => {
    if (!onFilterChange) return;
    
    const newFilters = selectedFilters.filter(filter =>
      !getDropdownFilters([filter], filterGroups).includes(filter)
    );
    
    const searchParams = convertFiltersToSearchParams(newFilters, school, experienceFilters);
    onFilterChange(searchParams);
  }, [selectedFilters, onFilterChange, filterGroups, school]);

  return (
    <div
      className="h-full w-80 bg-[#f8f9fc] border-r border-[var(--color-primary-border)] flex flex-col"
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
        maxHeight: 'calc(100vh - 64px)'
      }}
      role="region"
      aria-label="Filters"
    >
      {/* Header with more pronounced mobile close button */}
      <motion.div
        initial={{ opacity: 0.8, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 flex justify-between items-center sticky top-0 z-10 bg-[#f8f9fc] p-4 border-b border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Filter className="mr-2" size={20} />
          Filters
        </h2>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="hidden sm:block p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X size={22} className="text-gray-600" />
        </motion.button>
      </motion.div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 pb-16">
        {/* Topic Search Component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <TopicSearch 
            selectedTopics={topicFilters} 
            onAddTopic={addTopic} 
            onRemoveTopic={removeTopic} 
          />
        </motion.div>

        {/* Topic Suggestions Component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <TopicSuggestions 
            suggestions={topicSuggestions}
            selectedTopics={topicFilters}
            onToggleTopic={toggleFilter}
          />
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3 }}
          className="border-b border-gray-500 my-4"
        />

        {/* Experience Filters Component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <ExperienceFilters 
            filters={experienceFilters}
            selectedFilters={selectedFilters}
            onToggleFilter={toggleFilter}
          />
        </motion.div>

        {/* Selected Dropdown Filters Component */}
        {dropdownFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-4"
          >
            <SelectedFilters
              filters={dropdownFilters}
              onRemoveFilter={toggleFilter}
              onClearAll={clearDropdownFilters}
              title="Selected Filters"
            />
          </motion.div>
        )}

        {/* Filter Groups */}
        <div>
          {filterGroups.map((group) => (
            <DropdownFilterGroup
              key={group.key}
              group={group}
              selectedFilters={selectedFilters}
              onToggleFilter={toggleFilter}
              expanded={expandedSections[group.key]}
              onToggleExpand={() => toggleDropdown(group.key)}
            />
          ))}
        </div>

        {/* Feedback Button - Mobile only (scrollable) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 sm:hidden"
        >
          <FeedbackButton />
        </motion.div>
      </div>
        
      {/* Feedback Button - Desktop only (sticky) */}
      <div className="hidden sm:block flex-shrink-0 sticky bottom-0 left-0 right-0 py-3 px-4 bg-[#f8f9fc] border-t border-gray-200 z-10">
        <FeedbackButton />
      </div>
        
      {/* Mobile close button at bottom for easier access */}
      <div className="sm:hidden flex-shrink-0 sticky bottom-0 left-0 right-0 py-3 px-4 bg-[#f8f9fc] border-t border-gray-200 z-10">
        <button
          onClick={onClose}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg flex items-center justify-center font-medium shadow-md"
        >
          <X size={16} className="mr-2" />
          Close Filters
        </button>
      </div>
    </div>
  );
}

// Function to parse filters from URL parameters
function parseUrlParams(params: URLSearchParams): ClassSearchQuery {
  const query: ClassSearchQuery = {};
  
  // Parse common fields
  const queryValue = params.get('query');
  if (queryValue) query.query = queryValue;
  
  // Parse credits range
  const creditsMin = params.get('credits_min');
  const creditsMax = params.get('credits_max');
  if (creditsMin || creditsMax) {
    query.credits_min = creditsMin ? parseInt(creditsMin, 10) : undefined;
    query.credits_max = creditsMax ? parseInt(creditsMax, 10) : undefined;
  }
  
  // Parse array fields
  const topics = params.get('topics');
  if (topics) query.topics = topics.split(',').map(t => decodeURIComponent(t));
  
  return query;
}