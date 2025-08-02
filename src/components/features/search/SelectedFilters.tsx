import { motion, AnimatePresence } from "framer-motion";
import { Check, Tag, X } from "lucide-react";

interface SelectedFiltersProps {
  filters: string[];
  onRemoveFilter: (filter: string) => void;
  onClearAll: () => void;
  title?: string;
}

export default function SelectedFilters({
  filters,
  onRemoveFilter,
  onClearAll,
  title = "Selected Filters"
}: SelectedFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-4"
    >
      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center">
        <Tag size={14} className="mr-1" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {filters.map((filter, index) => (
            <motion.span
              key={`${filter}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { delay: 0.1 * index }
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-3 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-md text-xs font-new-spirit-medium flex items-center"
            >
              <div className="flex items-center">
                <Check size={10} className="mr-1 text-[var(--color-primary)]" />
                {filter}
              </div>
              <motion.button
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRemoveFilter(filter)}
                className="ml-1 hover:text-[var(--color-primary-hover)]"
              >
                <X size={12} />
              </motion.button>
            </motion.span>
          ))}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClearAll}
          className="px-3 py-1 text-[var(--color-primary)] text-xs font-new-spirit-medium hover:underline"
        >
          Clear Filters
        </motion.button>
      </div>
    </motion.div>
  );
} 