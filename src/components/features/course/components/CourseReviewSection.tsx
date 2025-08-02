"use client";

import { useQuery } from "@tanstack/react-query";
import CourseReviewCard from "./CourseReviewCard";
import supabase from "@/lib/supabase";
import { useState, useEffect } from 'react';
import { getSchoolFromHostname } from "@/config/themes";
import { databaseConfigs } from "@/config/database";

type CourseReviewSectionProps = {
  isSearchFocused: boolean;
};

// Types for our database tables - only includes university-agnostic fields
type ClassData = {
  class_code: string;
  course_name: string;
  course_desc: string;
  credits: string;
  requisites: string;
  gpa: number;
  grade_count: number;
  indexed_difficulty: number;
  indexed_fun: number;
  indexed_workload: number;
  review_count: number;
  overall_rating: number;
  vector_embedding?: string;
  extracted_topics?: string;
  gradeData?: GradeData;
  // University-specific fields are handled dynamically using a Record type
  [key: string]: string | number | boolean | null | undefined | GradeData;
};

type GradeData = {
  class_code: string;
  students: number;
  GPA: number;
  A: number;
  AB: number;
  B: number;
  BC: string;
  C: number;
  D: string;
  F: string;
};

type ReviewData = {
  class_code: string;
  class_review: string;
  timestamp: string;
  user_id: string;
};

type ClassWithGrades = ClassData & {
  gradeData?: GradeData;
  latestReview: string;
};

// Function to fetch specific CS courses and their grades
const fetchCsCoursesWithGrades = async (schema: string = 'wisco'): Promise<ClassWithGrades[]> => {
  // Get school-specific target courses from database config
  const dbConfig = databaseConfigs[schema];
  
  if (!dbConfig) {
    console.error('No database configuration found for schema:', schema);
    throw new Error('Invalid school configuration');
  }

  // Use school-specific featured courses
  const targetCourses = dbConfig.featuredCourses || ["COMP SCI 220", "MUSIC 113", "CHEM 103"];
  
  // Fetch the specific classes
  const { data: classesData, error: classesError } = await supabase
    .schema(schema)
    .from(dbConfig.tables.classes)
    .select('*')
    .in('class_code', targetCourses);

  if (classesError) {
    console.error('Error fetching classes:', classesError);
    throw new Error('Failed to fetch courses. Please try again.');
  }

  if (!classesData || classesData.length === 0) {
    return [];
  }

  // Get class codes to fetch grade data
  const classCodes = classesData.map((c: ClassData) => c.class_code);

  // Fetch grade data for the classes
  const { data: gradesData, error: gradesError } = await supabase
    .schema(schema)
    .from(dbConfig.tables.grades)
    .select('*')
    .in('class_code', classCodes);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
    // Continue without grade data
  }

  // Fetch reviews for the classes
  const { data: reviewsData, error: reviewsError } = await supabase
    .schema(schema)
    .from('reviews')
    .select('class_code, class_review, timestamp, user_id')
    .in('class_code', classCodes)
    .order('timestamp', { ascending: false });

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    // Continue without reviews
  }

  // Combine class data with grade data and latest review
  const combinedResults = classesData.map((classItem: ClassData) => {
    const gradeInfo = gradesData?.find((g: GradeData) => g.class_code === classItem.class_code);
    const latestReview = reviewsData?.find((r: ReviewData) => r.class_code === classItem.class_code);
    return {
      ...classItem,
      gradeData: gradeInfo,
      latestReview: latestReview?.class_review || "No reviews available for this course."
    };
  });

  return combinedResults;
};

// Fallback data in case the API fails - will be replaced with school-specific data
const getFallbackCourses = (schema: string): ClassWithGrades[] => {
  const dbConfig = databaseConfigs[schema];
  if (!dbConfig) return [];

  return dbConfig.featuredCourses.map((courseCode: string) => ({
    class_code: courseCode,
    course_name: `${courseCode} Course`,
    course_desc: "A featured course at your school.",
    credits: "3",
    requisites: "None",
    gpa: 3.5,
    grade_count: 0,
    indexed_difficulty: 3,
    indexed_fun: 3,
    indexed_workload: 3,
    review_count: 0,
    overall_rating: 3.5,
    gradeData: {
      class_code: courseCode,
      students: 0,
      GPA: 3.5,
      A: 0,
      AB: 0,
      B: 0,
      BC: "0",
      C: 0,
      D: "0",
      F: "0"
    },
    latestReview: "This is a featured course at your school. Be the first to review it!"
  }));
};

export default function CourseReviewSection({ isSearchFocused }: CourseReviewSectionProps) {
  const [schema, setSchema] = useState("wisco");
  
  // Determine the schema based on the hostname
  useEffect(() => {
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    setSchema(school.shortName.toLowerCase());
  }, []);

  // Use React Query to fetch the course data
  const { data: fetchedCourses = [], isLoading, error } = useQuery({
    queryKey: ['featured-courses', schema],
    queryFn: () => fetchCsCoursesWithGrades(schema),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Use fetched courses or fallback if there's an error or no data
  const courses = fetchedCourses.length > 0 ? fetchedCourses : 
                 (error || isLoading) ? [] : getFallbackCourses(schema);

  // If we're loading, show a loading spinner
  if (isLoading) {
    return (
      <div className={`w-full max-w-4xl mt-12 flex justify-center ${isSearchFocused ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If there's an error and no fallback data, show an error message
  if (error && courses.length === 0) {
    return (
      <div className={`w-full max-w-4xl mt-12 text-center ${isSearchFocused ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <p className="text-red-500">Failed to load course data. Please try again later.</p>
      </div>
    );
  }

  // If no courses found, show a message
  if (courses.length === 0) {
    return (
      <div className={`w-full max-w-4xl mt-12 text-center ${isSearchFocused ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <p className="text-gray-500">No course data available.</p>
      </div>
    );
  }

  // Map the courses to review cards
  return (
    <div className={`w-full max-w-4xl mt-12 transition-all duration-500 ease-in-out ${isSearchFocused ? 'opacity-0 transform translate-y-8 pointer-events-none' : 'opacity-100 transform translate-y-0'}`}>
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        {courses.map((course: ClassWithGrades, index: number) => (
          <CourseReviewCard
            key={course.class_code}
            gpa={course.gradeData?.GPA?.toFixed(2) || "3.5"}
            courseCode={course.class_code}
            courseName={course.course_name}
            rating={course.overall_rating || 3.5}
            review={course.latestReview}
            author={`${schema.toUpperCase()} student`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeOut",
              delay: index * 0.1 // Stagger the animations
            }}
          />
        ))}
      </div>
    </div>
  );
} 