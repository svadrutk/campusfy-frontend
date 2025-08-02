"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import supabase from "@/lib/supabase";
import { useEffect, useState, memo, useRef } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { GradeDistributionChart, RatingsBar, GradingElementsChart } from "@/components/features/review";
import { EnrollmentTable } from "@/components/features/course";
import { ReviewsSection } from "@/components/features/review";
import ClassAttributeBadges from "@/components/features/course/badges/ClassAttributeBadges";
import { getSchoolFromHostname } from "@/config/themes";
import { databaseConfigs } from "@/config/database";
import { ClassData } from "@/types/classes/classTypes";
import Script from 'next/script';

// Define types for local use that don't conflict with imported ClassData
type ReviewData = {
  papers: boolean;
  projects: boolean;
  exams: boolean;
  quizzes: boolean;
  presentations: boolean;
  regular_homework: boolean;
  att_required: boolean;
};

type GradeData = {
  class_code: string;
  students: number;
  gpa?: number;
  GPA?: number;
  a?: number;
  A?: number;
  ab?: number;
  AB?: number;
  b?: number;
  B?: number;
  bc?: number;
  BC?: number;
  c?: number;
  C?: number;
  d?: number;
  D?: number;
  f?: number;
  F?: number;
};

// Extract description component to prevent re-renders
const CourseDescription = memo(({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (contentRef.current) {
      const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight;
      setShouldShowExpand(isOverflowing);
    }
  }, [description]);

  return (
    <div className="relative">
      <div 
        ref={contentRef}
        className={`relative overflow-hidden transition-all duration-300 ease-in-out ${!isExpanded ? "max-h-24" : ""}`}
      >
        <p className="text-gray-700 font-inter">
          {description}
        </p>
        {!isExpanded && shouldShowExpand && (
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
        )}
      </div>
      {shouldShowExpand && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-medium mt-1 flex items-center mx-auto transition-all duration-200"
        >
          {isExpanded ? (
            <>Hide full description <ChevronUpIcon className="w-4 h-4 ml-1" /></>
          ) : (
            <>Read full description <ChevronDownIcon className="w-4 h-4 ml-1" /></>
          )}
        </button>
      )}
    </div>
  );
});
CourseDescription.displayName = 'CourseDescription';

// Extract prerequisites component to prevent re-renders
const Prerequisites = memo(({ requisites }: { requisites: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="flex-1 font-inter">
      <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${!isExpanded && requisites.length > 100 ? "max-h-[120px]" : "max-h-[500px]"}`}>
        <div className="text-gray-700 text-lg pr-2 custom-scrollbar">
          {requisites}
        </div>
        {!isExpanded && requisites.length > 100 && (
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
        )}
      </div>
      
      {requisites.length > 100 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-medium mt-2 flex items-center text-sm"
        >
          {isExpanded ? (
            <>Show less <ChevronUpIcon className="w-4 h-4 ml-1" /></>
          ) : (
            <>Show more <ChevronDownIcon className="w-4 h-4 ml-1" /></>
          )}
        </button>
      )}
    </div>
  );
});
Prerequisites.displayName = 'Prerequisites';

// Add loading skeletons for each section
const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export default function ClassPage() {
  const { code: classCode = "" } = useParams<{ code: string }>();
  const [schema, setSchema] = useState("wisco");
  
  // Determine the schema based on the hostname
  useEffect(() => {
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    setSchema(school.shortName.toLowerCase());
  }, []);
  
  // Decode the URL-encoded class code
  const decodedClassCode = decodeURIComponent(classCode);

  // Separate data fetching for each component
  const { 
    data: classData, 
    isLoading: isLoadingClass,
    error: classError 
  } = useQuery({
    queryKey: ['class', decodedClassCode, schema],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema(schema)
        .from('classes_undergrad')
        .select('*')
        .eq('class_code', decodedClassCode)
        .single();
      
      if (error) throw error;
      
      // Ensure the data conforms to the ClassData type by adding any missing required fields
      return {
        ...data,
        // Add empty reviews array if it doesn't exist to match ClassData type
        reviews: data.reviews || []
      } as ClassData;
    },
    enabled: !!schema,
  });

  // Separate query for reviews data
  const { 
    data: reviewsData, 
    isLoading: isLoadingReviews 
  } = useQuery({
    queryKey: ['reviews', decodedClassCode, schema],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema(schema)
        .from('reviews')
        .select('papers, projects, exams, quizzes, presentations, regular_homework, att_required')
        .eq('class_code', decodedClassCode);
      
      if (error) throw error;
      return data as ReviewData[];
    },
    enabled: !!schema && !!classData,
  });

  // Separate query for grade data
  const { 
    data: gradeData, 
    isLoading: isLoadingGrades 
  } = useQuery({
    queryKey: ['grades', decodedClassCode, schema],
    queryFn: async () => {
      // Get the correct grades table name from the database config
      const dbConfig = databaseConfigs[schema] || databaseConfigs.wisco;
      const gradesTable = dbConfig.tables.grades;
      
      console.log(`Fetching grades from schema: ${schema}, table: ${gradesTable}, class: ${decodedClassCode}`);
      
      const { data, error: gradeError } = await supabase
        .schema(schema)
        .from(gradesTable)
        .select('*')
        .eq('class_code', decodedClassCode)
        .single();

      if (gradeError) {
        console.error(`Error fetching grades for ${decodedClassCode}:`, gradeError);
        throw gradeError;
      }

      console.log(`Grade data for ${decodedClassCode}:`, data);
      return data;
    },
    enabled: !!schema && !!classData,
  });

  if (classError) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-new-spirit-medium-condensed text-red-500 mb-4">Error Loading Class Data</h1>
        <p className="font-inter">We couldn&apos;t find information for this class. Please try again later.</p>
      </div>
    );
  }

  // Calculate grading element weights from reviews
  const calculateGradingWeights = () => {
    if (!reviewsData || reviewsData.length === 0) return {
      exams: 0,
      projects: 0,
      papers: 0,
      quizzes: 0,
      presentations: 0,
      regular_homework: 0,
      att_required: 0
    };
    
    const total = reviewsData.length;
    const counts = reviewsData.reduce((acc, review) => {
      return {
        exams: acc.exams + (review.exams ? 1 : 0),
        projects: acc.projects + (review.projects ? 1 : 0),
        papers: acc.papers + (review.papers ? 1 : 0),
        quizzes: acc.quizzes + (review.quizzes ? 1 : 0),
        presentations: acc.presentations + (review.presentations ? 1 : 0),
        regular_homework: acc.regular_homework + (review.regular_homework ? 1 : 0),
        att_required: acc.att_required + (review.att_required ? 1 : 0)
      };
    }, { 
      exams: 0, 
      projects: 0, 
      papers: 0, 
      quizzes: 0,
      presentations: 0,
      regular_homework: 0,
      att_required: 0
    });
    
    return {
      exams: counts.exams / total,
      projects: counts.projects / total,
      papers: counts.papers / total,
      quizzes: counts.quizzes / total,
      presentations: counts.presentations / total,
      regular_homework: counts.regular_homework / total,
      att_required: counts.att_required / total
    };
  };

  const gradingWeights = calculateGradingWeights();
  
  // Format grade data for display
  const formatGradeData = () => {
    if (!gradeData) {
      console.log('No grade data available');
      return null;
    }
    
    console.log('Formatting grade data:', gradeData);
    
    // Helper function to safely get grade percentage
    const getGradePercentage = (upperCase: keyof GradeData, lowerCase: keyof GradeData) => {
      // Check if the grade property exists and is not null/undefined
      const value = gradeData[upperCase] !== undefined ? gradeData[upperCase] : gradeData[lowerCase];
      // Only use default values if the property doesn't exist at all
      return value !== undefined ? Number(value) : null;
    };
    
    // Default data to use when no actual data is available at all
    const defaultData = {
      average: 3.0,
      students: 5937,
      grades: schema === 'utah' 
        ? [
            { grade: "A", percentage: 44.0 },
            { grade: "B", percentage: 29.6 },
            { grade: "C", percentage: 18.2 },
            { grade: "D", percentage: 5.7 },
            { grade: "E", percentage: 2.5 }
          ]
        : [
            { grade: "A", percentage: 44.0 },
            { grade: "AB", percentage: 29.6 },
            { grade: "B", percentage: 18.2 },
            { grade: "BC", percentage: 3.7 },
            { grade: "C", percentage: 2.0 },
            { grade: "D", percentage: 1.3 },
            { grade: "F", percentage: 1.1 }
          ]
    };
    
    // Check for grade properties in gradeData (accounting for both upper and lowercase keys)
    const gradeKeys = Object.keys(gradeData);
    
    // Different grade properties to check based on school
    const gradeProperties = schema === 'utah'
      ? ['A', 'a', 'B', 'b', 'C', 'c', 'D', 'd', 'E', 'e']
      : ['A', 'a', 'AB', 'ab', 'B', 'b', 'BC', 'bc', 'C', 'c', 'D', 'd', 'F', 'f'];
    
    const hasGradeData = gradeKeys.some(key => gradeProperties.includes(key));
    
    console.log('Has grade data:', hasGradeData);
    console.log('Grade keys found:', gradeKeys);
    console.log('Schema:', schema);
    
    // If we don't have grade data at all, return default placeholder data
    if (!hasGradeData) {
      console.log('Using default grade data');
      return defaultData;
    }
    
    // Format the grade values as percentages with real data - handle Utah vs Wisconsin grading differently
    if (schema === 'utah') {
      const formattedData = {
        average: Number(gradeData.GPA || gradeData.gpa) || 3.0,
        students: gradeData.students || 5937,
        grades: [
          { grade: "A", percentage: getGradePercentage('A' as keyof GradeData, 'a' as keyof GradeData) ?? 0 },
          { grade: "B", percentage: getGradePercentage('B' as keyof GradeData, 'b' as keyof GradeData) ?? 0 },
          { grade: "C", percentage: getGradePercentage('C' as keyof GradeData, 'c' as keyof GradeData) ?? 0 },
          { grade: "D", percentage: getGradePercentage('D' as keyof GradeData, 'd' as keyof GradeData) ?? 0 },
          { grade: "E", percentage: getGradePercentage('E' as keyof GradeData, 'e' as keyof GradeData) ?? 0 }
        ]
      };
      
      console.log('Formatted Utah grade data:', formattedData);
      return formattedData;
    } else {
      // Wisconsin and other schools with AB/BC grades
      const formattedData = {
        average: Number(gradeData.GPA || gradeData.gpa) || 3.0,
        students: gradeData.students || 5937,
        grades: [
          { grade: "A", percentage: getGradePercentage('A' as keyof GradeData, 'a' as keyof GradeData) ?? 0 },
          { grade: "AB", percentage: getGradePercentage('AB' as keyof GradeData, 'ab' as keyof GradeData) ?? 0 },
          { grade: "B", percentage: getGradePercentage('B' as keyof GradeData, 'b' as keyof GradeData) ?? 0 },
          { grade: "BC", percentage: getGradePercentage('BC' as keyof GradeData, 'bc' as keyof GradeData) ?? 0 },
          { grade: "C", percentage: getGradePercentage('C' as keyof GradeData, 'c' as keyof GradeData) ?? 0 },
          { grade: "D", percentage: getGradePercentage('D' as keyof GradeData, 'd' as keyof GradeData) ?? 0 },
          { grade: "F", percentage: getGradePercentage('F' as keyof GradeData, 'f' as keyof GradeData) ?? 0 }
        ]
      };
      
      console.log('Formatted Wisconsin grade data:', formattedData);
      return formattedData;
    }
  };

  const gradeDistributionData = formatGradeData();
  
  // Add structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": classData?.course_name || decodedClassCode,
    "description": classData?.description,
    "courseCode": decodedClassCode,
    "provider": {
      "@type": "Organization",
      "name": "Campusfy",
      "url": "https://campusfy.app"
    }
  };

  return (
    <>
      <Script
        id="course-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="flex-1 flex flex-col bg-white font-inter">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center px-4 py-8">
            {!classData && isLoadingClass ? (
              <div className="w-full max-w-7xl space-y-8">
                <div className="text-center mb-8">
                  <LoadingSkeleton className="mx-auto w-64 mb-4" />
                  <LoadingSkeleton className="mx-auto w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 h-[220px]">
                      <LoadingSkeleton className="h-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : classData ? (
              <div className="w-full max-w-7xl">
                {/* Course Title and Description */}
                <div className="text-center mb-8">
                  <h1 className="text-7xl font-new-spirit-medium-condensed font-bold text-[var(--color-primary-text)] mb-2">
                    {classData.class_code}
                  </h1>
                  <h2 className="text-2xl font-new-spirit-medium-condensed text-gray-700 mb-4">
                    {classData.course_name}
                  </h2>
                  
                  {/* Add ClassAttributeBadges component here */}
                  <ClassAttributeBadges classData={classData} />
                  
                  <div className="max-w-3xl mx-auto">
                    {classData.course_desc ? (
                      <CourseDescription description={classData.course_desc} />
                    ) : (
                      <p className="text-gray-500 font-inter">No description available.</p>
                    )}
                  </div>
                </div>
                
                {/* Course Metrics, Prerequisites, and Grading Elements Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Prerequisites */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[220px]">
                    <h3 className="text-xl font-new-spirit-medium px-5 py-3 bg-gradient-to-r from-[var(--color-primary-border)] to-white border-b border-gray-200">Prerequisites</h3>
                    <div className="p-4 flex-1 overflow-auto">
                      {classData.requisites ? (
                        <div 
                          className="prose max-w-none text-gray-700 font-inter text-sm" 
                          dangerouslySetInnerHTML={{ __html: classData.requisites }}
                        />
                      ) : (
                        <p className="text-gray-500 font-inter">No prerequisites listed.</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Course Ratings */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[220px]">
                    <h3 className="text-xl font-new-spirit-medium px-5 py-3 bg-gradient-to-r from-[var(--color-primary-border)] to-white border-b border-gray-200">Course Ratings</h3>
                    <div className="flex-1 flex items-center justify-center p-4">
                      <RatingsBar 
                        workload={classData.indexed_workload || 0} 
                        fun={classData.indexed_fun || 0} 
                        difficulty={classData.indexed_difficulty || 0} 
                      />
                    </div>
                  </div>
                  
                  {/* Grading Elements */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[220px]">
                    <h3 className="text-xl font-new-spirit-medium px-5 py-3 bg-gradient-to-r from-[var(--color-primary-border)] to-white border-b border-gray-200">Grading Elements</h3>
                    <div className="p-4 flex-1 overflow-auto">
                      {isLoadingReviews ? (
                        <LoadingSkeleton className="h-full" />
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <GradingElementsChart 
                            weights={gradingWeights}
                            reviewCount={reviewsData?.length}
                            className="flex-1" 
                            onViewComments={() => {
                              const reviewsSection = document.getElementById('student-reviews');
                              if (reviewsSection) {
                                reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Grade Distribution and Course Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Enrollment Table */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                    <h3 className="text-xl font-new-spirit-medium px-5 py-3 bg-gradient-to-r from-[var(--color-primary-border)] to-white border-b border-gray-200">Current Enrollment</h3>
                    <div className="px-4 py-3 flex-1 overflow-auto">
                      <EnrollmentTable 
                        classCode={classData.class_code} 
                        school={schema}
                        term={1262}
                      />
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                    <h3 className="text-xl font-new-spirit-medium px-6 py-4 bg-gradient-to-r from-[var(--color-primary-border)] to-white border-b border-gray-200">Grade Distribution</h3>
                    <div className="p-6 flex-1">
                      {isLoadingGrades ? (
                        <LoadingSkeleton className="h-64" />
                      ) : !gradeData || !gradeDistributionData?.grades ? (
                        <div className="h-full flex flex-col items-center justify-center">
                          <p className="text-gray-500 font-inter">No grade distribution data available.</p>
                          <p className="text-gray-400 font-inter text-sm mt-2">Schema: {schema}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex-1">
                          <GradeDistributionChart 
                            grades={gradeDistributionData.grades} 
                            _averageGPA={gradeDistributionData.average}
                            totalStudents={gradeDistributionData.students}
                            schoolTheme={schema}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Reviews Section */}
                <ReviewsSection classCode={decodedClassCode} schema={schema} />
                
                {/* Review Sources Blurb for Wisconsin */}
                {schema === 'wisco' && (
                  <div className="text-center text-sm text-gray-500 mt-4 font-inter">
                    Some reviews were sourced from Madclasses. Thanks guys!
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-2xl font-new-spirit-medium-condensed text-gray-500">Class not found</h1>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 