import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { FilterGroup } from "@/config/themes";

interface DropdownFilterGroupProps {
  group: FilterGroup;
  selectedFilters: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleFilter: (filter: string) => void;
}

export default function DropdownFilterGroup({
  group,
  selectedFilters,
  expanded,
  onToggleExpand,
  onToggleFilter
}: DropdownFilterGroupProps) {
  const hasSelectedFilters = selectedFilters.some(f => group.filters.includes(f));
  const selectedCount = selectedFilters.filter(f => group.filters.includes(f)).length;


  return (
    <motion.div 
      className="mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { delay: 0.1 }
      }}
    >
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onToggleExpand}
        className={`w-full flex justify-between items-center p-3 rounded-lg shadow-sm hover:bg-gray-50 transition-colors ${
          hasSelectedFilters
            ? 'bg-[var(--color-primary-light)] border-l-4 border-[var(--color-primary)]'
            : 'bg-white'
        }`}
      >
        <span className={`font-new-spirit-medium flex items-center ${hasSelectedFilters ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
          {hasSelectedFilters && <Check size={14} className="mr-1.5 text-[var(--color-primary)]" />}
          {group.title}
          {hasSelectedFilters && (
            <span className="ml-2 text-xs bg-[var(--color-primary)] text-white rounded-full px-2 py-0.5">
              {selectedCount}
            </span>
          )}
        </span>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={18} className={hasSelectedFilters ? 'text-[var(--color-primary)]' : 'text-gray-500'} />
        </motion.div>
      </motion.button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-white rounded-lg border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.filters.map((filter, index) => {
                  // Check if we should use abbreviation
                  const useAbbreviation = group.abbreviations && filter in group.abbreviations;
                  const displayText = useAbbreviation && group.abbreviations ? 
                                    group.abbreviations[filter] : filter;
                  
                  const isSelected = selectedFilters.includes(filter);
                  
                  console.log('Filter item:', {
                    filter,
                    isSelected,
                    displayText,
                    useAbbreviation
                  });

                  return (
                    <motion.button
                      key={`${filter}-${index}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onToggleFilter(filter)}
                      className={`p-2 rounded-lg text-sm font-new-spirit-medium text-left flex items-center ${
                        isSelected
                          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-4 h-4 mr-2 rounded flex items-center justify-center ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'border border-gray-300'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                      <span className="truncate">{displayText}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 