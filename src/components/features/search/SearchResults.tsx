import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExtendedClassData } from '@/types/classes/classTypes';
import { SchoolConfig } from '@/config/themes';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface SearchResultsProps {
  results: ExtendedClassData[];
  isLoading: boolean;
  error: Error | null;
  schoolConfig: SchoolConfig | null;
  onClassClick: (classCode: string) => void;
  onGpaSort: () => void;
  gpaSortDirection: 'desc' | null;
}

const CLASSES_PER_PAGE = 10;

export default function SearchResults({
  results,
  isLoading,
  error,
  schoolConfig,
  onClassClick,
  onGpaSort,
  gpaSortDirection
}: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedClasses, setDisplayedClasses] = useState<ExtendedClassData[]>([]);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.ceil(results.length / CLASSES_PER_PAGE) || 1;

  // Reset to first page when results change
  useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  // Update displayed classes when page or results change
  useEffect(() => {
    const startIndex = (currentPage - 1) * CLASSES_PER_PAGE;
    const endIndex = startIndex + CLASSES_PER_PAGE;
    const validEndIndex = Math.min(endIndex, results.length);
    const validStartIndex = Math.min(startIndex, results.length);
    setDisplayedClasses(results.slice(validStartIndex, validEndIndex));
  }, [currentPage, results]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const getGpaColor = (gpa: number | undefined): string => {
    if (!gpa || gpa === -1) return "text-gray-500";
    if (gpa >= 3.7) return "text-emerald-600";
    if (gpa >= 3.0) return "text-green-600";
    if (gpa >= 2.0) return "text-amber-600";
    if (gpa >= 1.0) return "text-orange-600";
    return "text-red-600";
  };

  const formatClassCode = (classCode: string): string => {
    if (schoolConfig?.shortName === 'Utah') {
      return classCode.replace(/([A-Za-z]+)(\d+)/, '$1 $2');
    }
    return classCode;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-white font-['New_Spirit'] grid grid-rows-[auto_auto_1fr] overflow-hidden">
        {/* Header */}
        <div className="bg-white px-6 py-2.5 border-b border-gray-200">
          <div className="flex justify-center items-center">
            <h3 className="font-new-spirit-medium text-base text-gray-600">
              Loading courses...
            </h3>
          </div>
        </div>

        {/* Column Headers */}
        <div className="bg-white px-4 sm:px-6 py-2 border-b border-gray-200 grid grid-cols-12 gap-4">
          <div className="col-span-4 sm:col-span-3 font-new-spirit-medium text-sm text-gray-500">
            code
          </div>
          <div className="col-span-5 font-new-spirit-medium text-sm text-gray-500 text-left sm:text-center">
            name
          </div>
          <div className="col-span-3 sm:col-span-2 font-new-spirit-medium text-sm text-gray-500 text-right sm:text-center">
            gpa
          </div>
          <div className="hidden sm:block col-span-2 font-new-spirit-medium text-sm text-gray-500 text-right">
            prerequisites
          </div>
        </div>

        {/* Loading State */}
        <div className="flex justify-center items-center">
          <div className="w-7 h-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-gray-500 text-lg">Loading class data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center">
        <p className="text-red-500 text-lg">{error.message || 'An error occurred'}</p>
        <p className="text-gray-500 text-base mt-3">
          Please try again or check your connection.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center">
        <p className="text-gray-500">No courses found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white font-['New_Spirit'] grid grid-rows-[auto_auto_1fr] overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-2.5 border-b border-gray-200">
        <div className="flex justify-center items-center">
          <h3 className="font-new-spirit-medium text-base text-gray-600">
            {results.length} courses found
          </h3>
        </div>
      </div>

      {/* Column Headers */}
      <div className="bg-white px-4 sm:px-6 py-2 border-b border-gray-200 grid grid-cols-12 gap-4">
        <div className="col-span-4 sm:col-span-3 font-new-spirit-medium text-sm text-gray-500">
          code
        </div>
        <div className="col-span-5 font-new-spirit-medium text-sm text-gray-500 text-left sm:text-center">
          name
        </div>
        <div 
          className="col-span-3 sm:col-span-2 font-new-spirit-medium text-sm text-gray-500 text-right sm:text-center cursor-pointer hover:text-gray-700 flex items-center justify-end sm:justify-center gap-1"
          onClick={onGpaSort}
        >
          gpa
          <ChevronDown 
            className={`w-3 h-3 transition-transform duration-200 ease-in-out ${
              gpaSortDirection === 'desc' ? 'text-[var(--color-primary)]' : 'text-gray-400'
            }`}
          />
        </div>
        <div className="hidden sm:block col-span-2 font-new-spirit-medium text-sm text-gray-500 text-right">
          prerequisites
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-rows-[1fr_auto] overflow-hidden">
        <div 
          ref={scrollableContainerRef} 
          className="overflow-y-auto px-4 min-h-0"
        >
          <div className="py-3">
            <AnimatePresence>
              {displayedClasses.map((classItem, index) => (
                <motion.div 
                  key={`${classItem.class_code}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="mb-2 last:mb-0"
                >
                  <Link 
                    href={`/class/${encodeURIComponent(classItem.class_code as string)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onClassClick(classItem.class_code as string)}
                    className="block bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="font-new-spirit-medium font-bold text-lg text-gray-900">
                            {formatClassCode(classItem.class_code as string)}
                          </div>
                          <div className={`font-bold font-new-spirit-medium text-lg ${getGpaColor(
                            classItem.gradeData?.GPA !== undefined ? Number(classItem.gradeData.GPA) : 
                            (typeof classItem.gpa === 'number' ? classItem.gpa : undefined)
                          )}`}>
                            {(classItem.gradeData?.GPA === -1 || classItem.gpa === -1) 
                              ? "N/A" 
                              : (classItem.gradeData?.GPA !== undefined ? Number(classItem.gradeData.GPA).toFixed(1) : 
                                 typeof classItem.gpa === 'number' ? classItem.gpa.toFixed(1) : "N/A")}
                            <span className="text-xs font-new-spirit-medium text-gray-500 ml-1">GPA</span>
                          </div>
                        </div>
                        <div className="text-base font-new-spirit-medium text-gray-700">
                          {classItem.course_name as string}
                        </div>
                        {Boolean(classItem.requisites) && (
                          <div className="text-sm font-new-spirit-medium text-gray-500">
                            Prerequisites required
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid px-6 py-4 grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="font-new-spirit-medium font-bold text-lg text-gray-900">
                          {formatClassCode(classItem.class_code as string)}
                        </div>
                      </div>
                      <div className="col-span-5">
                        <div className="text-base font-new-spirit-medium text-gray-700 text-center">
                          {classItem.course_name as string}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className={`font-bold font-new-spirit-medium text-lg text-center ${getGpaColor(
                          classItem.gradeData?.GPA !== undefined ? Number(classItem.gradeData.GPA) : 
                          (typeof classItem.gpa === 'number' ? classItem.gpa : undefined)
                        )}`}>
                          {(classItem.gradeData?.GPA === -1 || classItem.gpa === -1) 
                            ? "N/A" 
                            : (classItem.gradeData?.GPA !== undefined ? Number(classItem.gradeData.GPA).toFixed(1) : 
                               typeof classItem.gpa === 'number' ? classItem.gpa.toFixed(1) : "N/A")}
                          <span className="text-xs font-new-spirit-medium text-gray-500 ml-1">GPA</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-base font-new-spirit-medium text-gray-600 text-right">
                          {classItem.requisites ? "yes" : "no"}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-2.5 bg-white border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 w-full font-new-spirit-medium">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                Prev
              </button>
              
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 