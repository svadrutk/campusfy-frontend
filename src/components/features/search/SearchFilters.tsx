import { useState, useEffect } from 'react';
import { ClassSearchQuery } from '@/types/search';
import { SchoolConfig } from '@/config/themes';
import { applyFilters } from '@/utils/search/searchFilters';
import { convertToApiQuery } from '@/utils/helpers/formatters';
import { ExtendedClassData } from '@/types/classes/classTypes';

interface SearchFiltersProps {
  activeFilters: ClassSearchQuery | null;
  onFilterChange: (filters: ClassSearchQuery | null) => void;
  schoolConfig: SchoolConfig | null;
  classes: ExtendedClassData[];
}

export default function SearchFilters({
  activeFilters,
  onFilterChange,
  schoolConfig,
  classes
}: SearchFiltersProps) {
  const [filteredResults, setFilteredResults] = useState<ExtendedClassData[]>([]);

  // Apply filters when they change
  useEffect(() => {
    if (!activeFilters || !schoolConfig) {
      setFilteredResults(classes);
      return;
    }

    const { topics: _topics, experience_filters: _exp, ...otherFilters } = activeFilters;
    if (Object.keys(otherFilters).length > 0) {
      const apiQuery = convertToApiQuery(otherFilters, schoolConfig);
      const filtered = applyFilters(classes, apiQuery, schoolConfig);
      setFilteredResults(filtered);
    } else {
      setFilteredResults(classes);
    }
  }, [activeFilters, classes, schoolConfig]);

  const handleExperienceFilterChange = (filter: string, checked: boolean) => {
    if (!activeFilters) return;

    const newFilters = { ...activeFilters };
    const currentFilters = newFilters.experience_filters || [];

    if (checked) {
      newFilters.experience_filters = [...currentFilters, filter];
    } else {
      newFilters.experience_filters = currentFilters.filter(f => f !== filter);
    }

    onFilterChange(newFilters);
  };

  const handleTopicFilterChange = (topics: string[]) => {
    if (!activeFilters) return;

    const newFilters = { ...activeFilters };
    newFilters.topics = topics;
    onFilterChange(newFilters);
  };

  return (
    <div className="w-full max-w-xs bg-white rounded-lg shadow-lg p-4">
      <h3 className="font-new-spirit-medium text-lg text-gray-900 mb-4">Filters</h3>
      
      {/* Experience Filters */}
      <div className="mb-6">
        <h4 className="font-new-spirit-medium text-sm text-gray-700 mb-2">Experience</h4>
        <div className="space-y-2">
          {['Easy', 'Light Workload', 'Fun', 'High GPA'].map(filter => (
            <label key={filter} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={activeFilters?.experience_filters?.includes(filter) || false}
                onChange={(e) => handleExperienceFilterChange(filter, e.target.checked)}
                className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm text-gray-700">{filter}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Topic Filters */}
      <div>
        <h4 className="font-new-spirit-medium text-sm text-gray-700 mb-2">Topics</h4>
        <div className="space-y-2">
          {['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology'].map(topic => (
            <label key={topic} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={activeFilters?.topics?.includes(topic) || false}
                onChange={(e) => {
                  const currentTopics = activeFilters?.topics || [];
                  const newTopics = e.target.checked
                    ? [...currentTopics, topic]
                    : currentTopics.filter(t => t !== topic);
                  handleTopicFilterChange(newTopics);
                }}
                className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm text-gray-700">{topic}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {filteredResults.length} of {classes.length} courses
        </p>
      </div>
    </div>
  );
} 