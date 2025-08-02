import { useState, KeyboardEvent, ChangeEvent } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TopicSearchProps {
  selectedTopics: string[];
  onAddTopic: (topic: string) => void;
  onRemoveTopic: (topic: string) => void;
}

export default function TopicSearch({ 
  selectedTopics, 
  onAddTopic, 
  onRemoveTopic 
}: TopicSearchProps) {
  const [inputValue, setInputValue] = useState<string>('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Add topic when comma is typed
    if (e.target.value.trim() && e.target.value.endsWith(',')) {
      const newTopic = e.target.value.slice(0, -1).trim();
      if (newTopic) {
        onAddTopic(newTopic);
        setInputValue(''); // Clear input after adding topic
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add topic when Enter is pressed
    if (e.key === 'Enter' && inputValue.trim()) {
      onAddTopic(inputValue.trim());
      setInputValue(''); // Clear input after adding topic
      e.preventDefault();
    }
    
    // Remove last topic when Backspace is pressed and input is empty
    if (e.key === 'Backspace' && inputValue === '' && selectedTopics.length > 0) {
      onRemoveTopic(selectedTopics[selectedTopics.length - 1]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-4"
    >
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 pl-10 border border-gray-300 rounded-md bg-white">
          {/* Topic Chips - Show only the first 3, with a +X more indicator */}
          <AnimatePresence>
            {selectedTopics.slice(0, 3).map((topic, index) => (
              <motion.div
                key={`topic-${topic}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center bg-[#000053] text-white px-2 py-0.5 rounded-md text-xs"
              >
                <span>{topic}</span>
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemoveTopic(topic)}
                  className="ml-1 hover:text-gray-200 focus:outline-none"
                  aria-label={`Remove ${topic} topic`}
                >
                  <X size={10} />
                </motion.button>
              </motion.div>
            ))}
            
            {/* Show +X more indicator if there are more than 3 topics */}
            {selectedTopics.length > 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-xs"
              >
                +{selectedTopics.length - 3} more
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Input Field */}
          <input
            type="text"
            placeholder={selectedTopics.length > 0 ? "Add another topic..." : "Add custom topic..."}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[80px] border-0 p-0 text-sm focus:ring-0 focus:outline-none"
            aria-label="Add topic"
          />
        </div>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
      </div>
      
      {/* Show all selected topics below the search bar if there are more than 3 */}
      {selectedTopics.length > 3 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedTopics.map((topic, index) => (
            <div
              key={`topic-full-${topic}-${index}`}
              className="flex items-center bg-[#000053] text-white px-2 py-0.5 rounded-md text-xs"
            >
              <span>{topic}</span>
              <button
                onClick={() => onRemoveTopic(topic)}
                className="ml-1 hover:text-gray-200 focus:outline-none"
                aria-label={`Remove ${topic} topic`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
} 