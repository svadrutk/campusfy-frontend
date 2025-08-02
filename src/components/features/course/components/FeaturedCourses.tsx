"use client";

import CourseReviewCard from './CourseReviewCard';
import { motion } from "framer-motion";

const FEATURED_COURSES = [
  "ANTHRO 104",
  "COMP SCI 220",
  "ENGL 100",
  "MATH 234",
  "CHEM 103",
  "PSYCH 202"
];

type FeaturedCoursesProps = {
  isSearchFocused: boolean;
};

export default function FeaturedCourses({ isSearchFocused }: FeaturedCoursesProps) {
  return (
    <motion.div 
      className={`w-full max-w-4xl mt-12 transition-all duration-500 ease-in-out ${
        isSearchFocused ? 'opacity-0 transform translate-y-8 pointer-events-none' : 'opacity-100 transform translate-y-0'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isSearchFocused ? 0 : 1, y: isSearchFocused ? 20 : 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <h2 className="text-4xl font-new-spirit-medium-condensed text-center mb-8 text-[var(--color-primary-text)]">
        Featured Courses
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURED_COURSES.map((courseCode) => (
          <CourseReviewCard 
            key={courseCode}
            courseCode={courseCode}
          />
        ))}
      </div>
    </motion.div>
  );
} 