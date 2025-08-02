'use client';

import { useState, useCallback, SetStateAction, useRef, useEffect } from 'react';
import { useSearchStore } from '@/store/useSearchStore';
import { useTheme } from '@/contexts/theme/ThemeContext';
import { FilterSidebar } from '@/components/features/search';
import { ClassSearch } from '@/components/features/search';
import { PageSidebarContext } from '@/contexts/PageSidebarContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassSearchQuery } from '@/types/search';
import { ArrowRight, Filter } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { incrementAIMetric } from '@/lib/ai-chat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  filters?: ClassSearchQuery;
}

interface AIResponse {
  filters: {
    topics?: string[];
    experience?: string[];
    [key: string]: string[] | undefined;
  };
  followUpQuestion: string;
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ClassSearchQuery | null>(null);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const setFilters = useSearchStore(state => state.setFilters);
  const resetSearch = useSearchStore(state => state.resetSearch);
  const { colors, school } = useTheme();
  const { data: session } = useSession();
  
  // Add ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Clear search store when component mounts
  useEffect(() => {
    resetSearch();
  }, [resetSearch]);

  // Reset autoFocus after navigation
  useEffect(() => {
    if (shouldAutoFocus) {
      setShouldAutoFocus(false);
    }
  }, [shouldAutoFocus]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFilterChange = useCallback((value: SetStateAction<ClassSearchQuery | null>) => {
    console.log('handleFilterChange called with:', value);
    const newFilters = typeof value === 'function' ? value(activeFilters) : value;
    
    // Only update if we have valid filters
    if (newFilters) {
      // For experience filters, use the new filters directly instead of merging
      const mergedFilters = {
        ...newFilters,
        experience_filters: newFilters.experience_filters || []
      };

      setActiveFilters(mergedFilters);
      setFilters(mergedFilters);
      // Open the sidebar when filters are updated
      setIsFilterSidebarOpen(true);
      
      // Update the last assistant message to include the new filters
      setMessages(prev => {
        const lastAssistantIndex = [...prev].reverse().findIndex(m => m.role === 'assistant');
        if (lastAssistantIndex === -1) return prev;
        
        const newMessages = [...prev];
        const realIndex = prev.length - 1 - lastAssistantIndex;
        newMessages[realIndex] = {
          ...newMessages[realIndex],
          filters: mergedFilters
        };
        return newMessages;
      });
    } else {
      // If filters are null, reset both states
      setActiveFilters(null);
      setFilters({});
    }
  }, [setFilters, activeFilters]);

  const handleSubmit = async (e: React.FormEvent, directQuery?: string) => {
    e.preventDefault();
    const queryToUse = directQuery || input.trim();
    if (!queryToUse || isLoading) return;

    setInput('');
    
    // Add user message with current filter state
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: queryToUse,
      filters: activeFilters || undefined
    }]);
    
    setIsLoading(true);

    try {
      // Track message metric if user is logged in
      if (session?.user?.email) {
        // If this is the first message, increment chat count
        if (messages.length === 0) {
          await incrementAIMetric(
            session.user.email,
            school.shortName.toLowerCase(),
            'chat'
          );
        }
        // Increment message count for every message
        await incrementAIMetric(
          session.user.email,
          school.shortName.toLowerCase(),
          'message'
        );
      }

      const response = await fetch('/api/advisor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: queryToUse,
          school: school.shortName.toLowerCase()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      // Convert AI response filters to ClassSearchQuery format
      const searchQuery: ClassSearchQuery = {};
      
      // Start with current filters if they exist
      if (activeFilters) {
        Object.assign(searchQuery, activeFilters);
      }
      
      // Process all filter types from the AI response
      Object.entries(data.filters).forEach(([key, value]) => {
        if (!value) return;
        
        // Ensure value is always an array
        const filterArray = Array.isArray(value) ? value : [value];
        
        // Map the filter key to the appropriate searchQuery key
        switch (key) {
          case 'topics':
            // Merge new topics with existing ones, removing duplicates
            const existingTopics = searchQuery.topics || [];
            searchQuery.topics = Array.from(new Set([...existingTopics, ...filterArray]));
            break;
          case 'experience':
            // Merge new experience filters with existing ones, removing duplicates
            const existingExperience = searchQuery.experience_filters || [];
            searchQuery.experience_filters = Array.from(new Set([...existingExperience, ...filterArray]));
            break;
          default:
            // For school-specific filters, validate against the school config
            const filterGroup = school.filters.groups.find((group: { key: string; filters: string[] }) => group.key === key);
            if (filterGroup) {
              // Only include values that are valid for this filter group
              const validValues = filterArray.filter(value => filterGroup.filters.includes(value));
              if (validValues.length > 0) {
                searchQuery[key] = validValues;
              }
            }
        }
      });

      // Log only essential information for debugging
      console.log('Converting AI response to search query:', {
        originalFilters: data.filters,
        convertedQuery: searchQuery,
        school: school.name
      });

      // Add assistant message with new filters
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.followUpQuestion,
        filters: searchQuery
      }]);

      // Update both states
      handleFilterChange(searchQuery);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Render messages with filter state indicators
  const renderMessage = (message: Message, index: number) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-semibold">AI</span>
        </div>
      )}
      <div
        className={`px-4 py-3 rounded-2xl ${
          message.role === 'user' 
            ? 'bg-[var(--color-primary)] text-white rounded-br-md' 
            : 'bg-[var(--color-primary-light)] border border-[var(--color-primary-border)] rounded-bl-md'
        } max-w-[85%]`}
        style={{
          backgroundColor: message.role === 'user' ? colors.primary : colors.primaryLight,
          borderColor: message.role === 'user' ? 'transparent' : colors.primaryBorder,
        }}
      >
        <div className="text-[15px] leading-relaxed">{message.content}</div>
        {message.filters && message.role === 'assistant' && Object.keys(message.filters).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600 space-y-1">
            {Array.isArray(message.filters.topics) && message.filters.topics.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Topics:</span>
                <span>{message.filters.topics.join(', ')}</span>
              </div>
            )}
            {Array.isArray(message.filters.experience_filters) && message.filters.experience_filters.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Experience:</span>
                <span>{message.filters.experience_filters.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-600 text-sm font-semibold">U</span>
        </div>
      )}
    </motion.div>
  );

  return (
    <PageSidebarContext.Provider value={{
      isFilterSidebarOpen,
      setIsFilterSidebarOpen,
      activeFilters,
      setActiveFilters: handleFilterChange
    }}>
      <motion.div 
        className="flex flex-col min-h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="flex flex-1 relative">
          {/* Sidebar overlay for mobile */}
          <div 
            className={`sm:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-300 ${
              isFilterSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsFilterSidebarOpen(false)}
          />
          
          {/* Sidebar container - mobile overlay, desktop push */}
          <div 
            className={`fixed sm:static transition-all duration-300 h-[calc(100%-64px)] sm:h-auto
              ${isFilterSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
              sm:translate-x-0
              w-80 
              sm:w-80`}
            style={{ 
              top: '64px',
              bottom: 0,
              zIndex: 50,
              visibility: 'visible',
              pointerEvents: 'auto',
            }}
          >
            <FilterSidebar 
              isOpen={isFilterSidebarOpen} 
              onClose={() => setIsFilterSidebarOpen(false)} 
              onFilterChange={handleFilterChange}
              initialFilters={activeFilters}
              onInitialLoad={(hasFilters) => {
                if (hasFilters && typeof window !== 'undefined') {
                  const isMobile = window.innerWidth < 640;
                  if (!isMobile) {
                    setIsFilterSidebarOpen(false);
                  }
                }
              }}
            />
          </div>

          {/* Main content */}
          <div className="flex-1">
            <div className="min-h-full flex flex-col items-center px-4 pt-4 sm:pt-8 bg-white border-x border-b border-[var(--color-primary-border)]">
              {/* Main content area with horizontal split */}
              <div className="w-full max-w-7xl flex flex-col sm:flex-row gap-6 h-full justify-center">
                {/* Center - ClassSearch */}
                <div className="w-full sm:w-[60vh] min-w-0 flex flex-col order-2 sm:order-1 h-[calc(100vh-80px)] sm:h-[80vh]">
                  <ClassSearch 
                    isSearchPage={true}
                    activeFilters={activeFilters}
                    onSearchResultsChange={() => {}}
                    isAdvisorPage={true}
                  />
                </div>

                {/* Right side - Chat and Input */}
                <div className="w-full sm:w-[60vh] flex flex-col min-w-0 order-1 sm:order-2 h-[calc(100vh-80px)] sm:h-[80vh] mb-4 sm:mb-0">
                  {/* Consolidated Action/Input Area */}
                  <div className="bg-white rounded-xl border border-[var(--color-primary-border)] p-4 h-full flex flex-col">
                    {/* Messages display */}
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex flex-col justify-end"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgb(209 213 219) transparent'
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {messages.length === 0 ? (
                          <motion.div
                            key="initial"
                            initial={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center flex flex-col items-center justify-center flex-1"
                          >
                            <h1 className="text-5xl font-bold font-new-spirit-medium-condensed text-gray-900">
                              ClassGPT
                            </h1>
                            <p className="text-xl text-gray-600 mt-4">
                              next-gen course search, powered by AI.
                            </p>
                            <div className="flex flex-col gap-2 mt-8">
                              {[
                                "easy, 2 credit literature courses",
                                "intro computer science classes"
                              ].map((query, index) => (
                                <motion.button
                                  key={index}
                                  onClick={async () => {
                                    const fakeEvent = {
                                      preventDefault: () => {},
                                    } as React.FormEvent;
                                    await handleSubmit(fakeEvent, query);
                                  }}
                                  className="px-4 py-2 rounded-full border transition-colors hover:bg-gray-50 whitespace-nowrap"
                                  style={{
                                    borderColor: colors.primaryBorder,
                                  }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  {query}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                      <div className="flex-grow" />
                      {messages.map((message, index) => renderMessage(message, index))}
                      {isLoading && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div 
                            className="max-w-[80%] px-6 py-4 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary-border)]"
                            style={{
                              backgroundColor: colors.primaryLight,
                              borderColor: colors.primaryBorder,
                            }}
                          >
                            <div className="flex gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {/* Mobile-only scroll note */}
                      {messages.length > 0 && !isLoading && (
                        <div className="sm:hidden text-center text-sm text-gray-500 mt-4 mb-2">
                          Scroll down to see matching classes{' '}
                          <span className="inline-block animate-bounce">↓</span>
                        </div>
                        
                      )}
                    </div>

                    {/* Input area */}
                    <div className="flex items-center mt-4 sticky bottom-0 bg-white pt-2 border-t border-gray-100">
                      {/* Search Input Container */}
                      <div className="flex-1 relative flex items-center">
                        {/* Filter Button - Mobile Only */}
                        <button
                          onClick={() => setIsFilterSidebarOpen(true)}
                          className="sm:hidden absolute left-3 p-2 rounded-lg transition-colors hover:bg-gray-100 z-10"
                        >
                          <Filter className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask me anything..."
                          disabled={isLoading}
                          className="w-full h-12 pl-12 sm:pl-4 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-primary)] text-lg"
                          style={{
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primaryBorder,
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmit(e);
                            }
                          }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {/* Submit Button */}
                          <button 
                            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                            disabled={isLoading}
                            className="p-2 rounded-lg transition-colors flex items-center justify-center hover:cursor-pointer"
                            style={{
                              backgroundColor: colors.primary,
                              color: 'white',
                              opacity: isLoading ? 0.7 : 1,
                            }}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </PageSidebarContext.Provider>
  );
} 