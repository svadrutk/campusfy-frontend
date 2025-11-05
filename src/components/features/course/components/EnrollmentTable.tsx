'use client';

import React, { useState, useEffect } from 'react';
import { AcademicCapIcon, UserGroupIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { getAvailableTerms } from '@/lib/termCodes';
import type { EnrollmentData } from '@/lib/schemas/enrollment';
import { fetchWithAbort } from '@/utils/requestUtils';
import { formatClassCode } from '@/utils/helpers/formatters';

// Get available terms
const AVAILABLE_TERMS = getAvailableTerms();

// Get current term code dynamically
const getCurrentTermForDefault = () => {
  return AVAILABLE_TERMS[0]?.value || 1262; // Fall back to first available term or a reasonable default
};

interface EnrollmentTableProps {
  classCode: string;
  term?: number;
  school: string;
}

export default function EnrollmentTable({ classCode, term, school }: EnrollmentTableProps) {
  const [selectedTerm, setSelectedTerm] = useState<number>(term || getCurrentTermForDefault());
  const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null);

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [cleanupFn]);

  // Get status badge and color based on enrollment
  const getEnrollmentStatus = (current: number, enrollmentCap: number, waitlist: number) => {
    const percentage = enrollmentCap > 0 ? (current / enrollmentCap) * 100 : 0;
    
    if (waitlist > 0) {
      return {
        label: 'Waitlist',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        lightColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200'
      };
    } 
    
    if (current >= enrollmentCap) {
      return {
        label: 'Closed',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        lightColor: 'bg-red-100',
        borderColor: 'border-red-200'
      };
    }
    
    if (percentage >= 80) {
      return {
        label: 'Filling',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        lightColor: 'bg-amber-100',
        borderColor: 'border-amber-200'
      };
    }
    
    return {
      label: 'Open',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      lightColor: 'bg-emerald-100',
      borderColor: 'border-emerald-200'
    };
  };

  // Use React Query to fetch enrollment data
  const { data: enrollmentData, isLoading, error } = useQuery<EnrollmentData>({
    queryKey: ['enrollment', school, classCode, selectedTerm],
    queryFn: async () => {
      if (!classCode) throw new Error('Class code is required');
      if (!school) throw new Error('School is required');
      
      // Format class code appropriately for the API
      const formattedClassCode = formatClassCode(classCode, school);
      
      const url = `/api/enrollment?school=${encodeURIComponent(school)}&class_code=${encodeURIComponent(formattedClassCode)}&term=${selectedTerm}`;
      const { promise, cleanup } = fetchWithAbort(url, {
        referrerPolicy: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      // Store cleanup function
      setCleanupFn(() => cleanup);
      
      const response = await promise;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch enrollment data');
      }
      
      const data = await response.json();
      
      console.log("API response currentlyEnrolled values:", 
        data.sections.map((s: { sectionNumber: string; currentlyEnrolled: number; enrollmentCap: number }) => 
          `Section ${s.sectionNumber}: ${s.currentlyEnrolled}/${s.enrollmentCap}`
        )
      );

      // Log final response
      console.log('Final API response:', {
        sections: data.sections,
        totals: data.totals
      });

      return data;
    },
    enabled: !!classCode && !!school, // Only run the query when both classCode and school are available
  });

  // Handle term change
  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTerm = parseInt(e.target.value, 10);
    setSelectedTerm(newTerm);
  };

  // Generate Google Maps link
  const getMapLink = (location: string, room: string) => {
    if (!location || !room || location === 'N/A' || room === 'N/A') return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location} ${room} UW Madison`)}`;
  };

  // Format meeting days more nicely
  const formatMeetingDays = (days_times: string) => {
    if (!days_times || days_times === 'N/A') return 'TBA';
    
    // Extract just the days part (before the space)
    const days = days_times.split(' ')[0];
    
    // Convert abbreviations like "MWF" to "Mon, Wed, Fri"
    const dayMap: Record<string, string> = {
      'M': 'Mon',
      'T': 'Tue',
      'W': 'Wed',
      'R': 'Thu',
      'F': 'Fri',
      'S': 'Sat',
      'U': 'Sun'
    };
    
    return days.split('').map(day => dayMap[day] || day).join(', ');
  };

  // Extract time from days_times string
  const extractTime = (days_times: string) => {
    if (!days_times || days_times === 'N/A') return 'TBA';
    const parts = days_times.split(' ');
    return parts.slice(1).join(' ');
  };

  return (
    <div className="w-full font-sans">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-5 h-5 text-[var(--color-primary)]" />
          <label htmlFor="termSelector" className="mr-2 text-sm font-medium">Term:</label>
          <select 
            id="termSelector"
            value={selectedTerm}
            onChange={handleTermChange}
            className="p-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            {AVAILABLE_TERMS.map(term => (
              <option key={term.value} value={term.value}>
                {term.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin h-8 w-8 border-3 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error || !enrollmentData ? (
        <div className="p-6 text-center text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <UserGroupIcon className="w-8 h-8 text-gray-400" />
            <p className="font-medium text-sm">Class not offered next semester</p>
            <p className="text-xs text-gray-500">Try selecting a different term</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md overflow-y-auto">
          <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left border-b border-gray-200 text-sm font-semibold text-gray-700 w-[15%]">Section</th>
                  <th className="px-4 py-2.5 text-left border-b border-gray-200 text-sm font-semibold text-gray-700 w-[20%]">Teacher</th>
                  <th className="px-4 py-2.5 text-left border-b border-gray-200 text-sm font-semibold text-gray-700 w-[25%]">Time</th>
                  <th className="px-4 py-2.5 text-left border-b border-gray-200 text-sm font-semibold text-gray-700 w-[25%]">Location</th>
                  <th className="px-4 py-2.5 text-right border-b border-gray-200 text-sm font-semibold text-gray-700 w-[15%]">Enrollment</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.sections.map((section, index) => {
                  const currentlyEnrolled = Number(section.currentlyEnrolled);
                  const enrollmentCap = Number(section.enrollmentCap);
                  const waitlistSize = Number(section.waitlistCurrentSize);
                  const fillPercentage = enrollmentCap > 0 ? Math.min(100, Math.round((currentlyEnrolled / enrollmentCap) * 100)) : 0;
                  
                  const status = getEnrollmentStatus(currentlyEnrolled, enrollmentCap, waitlistSize);
                  
                  const timeTable = section.timeTable[0];
                  const location = timeTable?.location;
                  const isOnline = location?.toLowerCase() === 'online';
                  const mapLink = location && !isOnline ? getMapLink(location, '') : null;
                    
                  return (
                    <tr 
                      key={`section-${section.sectionNumber || index}`} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 cursor-default`}
                      style={{ borderLeft: `3px solid ${status.color.replace('bg-', 'var(--')}` }}
                    >
                      <td className="px-4 py-2.5 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{section.sectionNumber || `Section ${index + 1}`}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center w-fit ${status.lightColor} ${status.textColor}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-2.5 text-sm">
                        <span className="font-medium">{section.instructor?.name || 'TBA'}</span>
                      </td>
                      
                      <td className="px-4 py-2.5 text-sm">
                        {timeTable?.days_times ? (
                          <div>
                            <div className="font-medium">
                              {formatMeetingDays(timeTable.days_times)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {extractTime(timeTable.days_times)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">TBA</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-2.5 text-sm">
                        {isOnline ? (
                          <span className="font-medium text-indigo-700">ONLINE</span>
                        ) : (location ? (
                          <div>
                            <div className="font-medium">
                              {location}
                            </div>
                            {mapLink && (
                              <a 
                                href={mapLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              >
                                <MapPinIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">TBA</span>
                        ))}
                      </td>
                      
                      <td className="px-4 py-2.5 text-sm text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="font-medium">
                            {currentlyEnrolled}/{enrollmentCap}
                          </div>
                          {waitlistSize > 0 && (
                            <div className="text-xs text-yellow-600">
                              Waitlist: {waitlistSize}
                            </div>
                          )}
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${status.color}`}
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {enrollmentData.sections.length > 0 && (
                <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 font-semibold text-right text-sm">Total:</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {(() => {
                          const totalEnrolled = Number(enrollmentData.totals.currentlyEnrolled);
                          const totalCapacity = Number(enrollmentData.totals.enrollmentCap);
                          const totalWaitlist = Number(enrollmentData.totals.waitlistCurrentSize);
                          const fillPercentage = totalCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100)) : 0;
                          const status = getEnrollmentStatus(totalEnrolled, totalCapacity, totalWaitlist);
                          
                          return (
                            <>
                              <span className={`${status.textColor} font-medium`}>
                                {totalEnrolled}/{totalCapacity}
                              </span>
                              
                              {/* Total progress bar */}
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${status.color}`} 
                                  style={{ width: `${fillPercentage}%` }}
                                ></div>
                              </div>
                              
                              {totalWaitlist > 0 && (
                                <span className="text-xs text-yellow-600">
                                  Waitlist: {totalWaitlist}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

    </div>
  );
} 