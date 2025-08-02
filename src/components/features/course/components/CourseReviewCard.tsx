"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import supabase from "@/lib/supabase";
import { motion, TargetAndTransition, Transition } from "framer-motion";

type CourseReviewCardProps = {
  courseCode: string;
  schema?: string;
  // Optional props for when data is passed directly
  gpa?: string;
  courseName?: string;
  rating?: number;
  review?: string;
  author?: string;
  // Animation props
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  transition?: Transition;
};

export default function CourseReviewCard({
  courseCode,
  schema = "wisco",
  gpa: propGpa,
  courseName: propCourseName,
  rating: propRating,
  review: propReview,
  author: propAuthor,
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 0.5, ease: "easeOut" }
}: CourseReviewCardProps) {
  // Only fetch data if props are not provided
  const { data: classData } = useQuery({
    queryKey: ['class', courseCode, schema],
    queryFn: async () => {
      // Skip fetch if all props are provided
      if (propGpa && propCourseName && propRating !== undefined) {
        return null;
      }

      // Fetch class info from classes_undergrad
      const { data: classInfo, error: classError } = await supabase
        .schema(schema)
        .from('classes_undergrad')
        .select('*')
        .eq('class_code', courseCode)
        .single();

      if (classError) {
        console.error('Error fetching class info:', classError);
        throw classError;
      }

      // Fetch grade data from grades-test
      const { data: gradeData, error: gradeError } = await supabase
        .schema(schema)
        .from('grades-test')
        .select('*')
        .eq('class_code', courseCode)
        .single();

      if (gradeError) {
        console.error('Error fetching grade data:', gradeError);
      }

      // Combine all data
      return {
        ...classInfo,
        gradeData: gradeData || null
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !(propGpa && propCourseName && propRating !== undefined) // Only run query if props are not provided
  });

  // Use props if provided, otherwise use fetched data
  const gpa = propGpa || classData?.gradeData?.GPA || classData?.gradeData?.gpa || classData?.gpa || "N/A";
  const rating = propRating ?? 3.5; // Use provided rating or default to 3.5, no longer calculating from GPA
  const courseName = propCourseName || classData?.course_name;
  const review = propReview || classData?.course_desc || "No description available";
  const author = propAuthor || "Anonymous";
  
  // Don't render if we have no data at all
  if (!courseName && !classData) {
    return null;
  }

  // Render stars based on rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add all stars (we'll use CSS to control the filled state)
    for (let i = 0; i < 5; i++) {
      const isFilled = i < fullStars || (i === fullStars && hasHalfStar);
      stars.push(
        <div key={`star-${i}`} className="relative">
          {/* Background star (always black outline) */}
          <Star
            className="h-5 w-5 stroke-[1.5] stroke-gray-900 fill-transparent absolute inset-0"
          />
          {/* Foreground star (red fill when selected) */}
          <Star
            className={`h-5 w-5 stroke-[1.5] stroke-transparent relative z-10 transition-colors duration-150 ${
              isFilled ? 'fill-[#FFD700]' : 'fill-transparent'
            }`}
          />
        </div>
      );
    }
    
    return (
      <div className="flex gap-0.5">
        {stars}
      </div>
    );
  };

  // Format course code to separate the department and number
  const formatCourseCode = (code: string) => {
    const parts = code.split(' ');
    if (parts.length >= 2) {
      return (
        <>
          <span className="font-new-spirit-medium-condensed">{parts.slice(0, parts.length - 1).join(' ')}</span>{' '}
          <span className="font-new-spirit-medium-condensed">{parts[parts.length - 1]}</span>
        </>
      );
    }
    return <span className="font-new-spirit-medium-condensed">{code}</span>;
  };

  // Format course name to handle long titles
  const formatCourseName = (name: string) => {
    if (!name) return "Course name not available";
    if (name.length > 25) {
      return name.substring(0, 25) + '...';
    }
    return name;
  };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
    >
      <Link 
        href={`/class/${encodeURIComponent(courseCode)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col h-[280px] bg-white rounded-lg border border-gray-100 p-6 hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 overflow-hidden"
      >
        {/* Header section with GPA and course info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-5xl font-new-spirit-medium-condensed font-bold text-[var(--color-primary)] tracking-tight">
              {typeof gpa === 'number' ? gpa.toFixed(2) : gpa}
            </span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">GPA</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-new-spirit-medium-condensed font-bold text-gray-900 tracking-tight">
              {formatCourseCode(courseCode)}
            </div>
            <div className="font-new-spirit-medium-condensed text-sm text-gray-600 truncate max-w-[125px] mt-1" 
                 title={courseName}>
              {formatCourseName(courseName || "")}
            </div>
          </div>
        </div>

        {/* Rating stars */}
        <div className="flex mb-6 scale-110 origin-left">
          {renderStars()}
        </div>
        
        {/* Course description/review */}
        <div className="flex-grow">
          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
            {review}
          </p>
          {author && (
            <p className="text-xs text-gray-500 mt-3 font-medium">
              — {author}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
} 