import { motion } from "framer-motion";

interface TopicSuggestionsProps {
  suggestions: string[];
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
}

export default function TopicSuggestions({ 
  suggestions, 
  selectedTopics, 
  onToggleTopic 
}: TopicSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-4"
    >
      <div className="flex flex-wrap gap-2">
        {suggestions
          .filter(topic => !selectedTopics.includes(topic))
          .map((topic, index) => (
            <motion.div
              key={topic}
              initial={{ opacity: 0, y: 5 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: 0.1 + (index * 0.05) }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggleTopic(topic)}
              className="px-3 py-1 border border-[var(--color-primary-border)] rounded-md text-sm font-new-spirit-medium transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
            >
              {topic}
            </motion.div>
          ))}
      </div>
    </motion.div>
  );
} 