import { motion } from "framer-motion";
import { Check, Tag } from "lucide-react";

interface ExperienceFiltersProps {
  filters: string[];
  selectedFilters: string[];
  onToggleFilter: (filter: string) => void;
}

export default function ExperienceFilters({
  filters,
  selectedFilters,
  onToggleFilter
}: ExperienceFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-4"
    >
      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center">
        <Tag size={14} className="mr-1" />
        Course Experience
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {filters.map((filter, index) => (
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: { delay: 0.4 + (index * 0.05) }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onToggleFilter(filter)}
            className={`px-3 py-2 rounded-md text-sm font-new-spirit-medium transition-colors flex items-center cursor-pointer ${
              selectedFilters.includes(filter)
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary-border)]'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {selectedFilters.includes(filter) && (
              <Check size={14} className="mr-2 text-[var(--color-primary)]" />
            )}
            {filter}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
} 