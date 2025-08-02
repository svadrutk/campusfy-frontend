"use client";

import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Star, MessageSquare, Calendar, ChevronDown, ChevronUp, PlusCircle, User, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import supabase from "@/lib/supabase";
import { RatingsBar, ReviewForm } from "@/components/features/review";
import { getSchoolFromHostname } from '@/config/themes';
import { useRouter } from "next/navigation";

// Full review type that matches the database structure
type FullReviewData = {
  review_id: string;
  user_id: string;
  class_code: string;
  timestamp: string;
  email: string;
  course_rating: number;
  fun_rating: number;
  difficulty_rating: number;
  workload_rating: number;
  class_review: string;
  professor_name: string;
  professor_rating: number;
  professor_review: string;
  presentations: boolean;
  papers: boolean;
  projects: boolean;
  exams: boolean;
  quizzes: boolean;
  regular_homework: boolean;
  att_required: boolean;
  review_tag: string;
};

// Course attribute pill component
const AttributePill = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`px-1 sm:px-2 py-1 ${active 
    ? "bg-blue-50 text-blue-700 border border-blue-200" 
    : "bg-gray-50 text-gray-400 border border-gray-100"} 
    rounded-full text-xs font-medium flex items-center justify-center transition-colors`}>
    {label}
  </div>
);

// Enhanced Review Card Component
const ReviewCard = memo(({ review }: { review: FullReviewData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (contentRef.current) {
      // Check if content exceeds the max height
      const isOverflowing = contentRef.current.scrollHeight > 240;
      setShouldShowExpand(isOverflowing);
    }
  }, [review.class_review, review.professor_review]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header Section with User & Date */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mr-3">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="font-medium text-gray-800">Anonymous Student</div>
            <div className="text-xs text-gray-500 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(review.timestamp)}
            </div>
          </div>
        </div>
        
        {/* Rating - responsive sizing */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={`header-${star}`} className="relative">
                <Star
                  className="w-6 h-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 stroke-[1.5] stroke-gray-900 fill-transparent absolute inset-0"
                />
                <Star
                  className={`w-6 h-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 stroke-[1.5] stroke-transparent relative z-10 transition-colors duration-150 ${
                    star <= review.course_rating ? "fill-[#FFD700]" : "fill-transparent"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 pb-6">
        {/* Rating Visualizations Row */}
        <div className="flex flex-col lg:flex-row mb-6 gap-6">
          {/* Course Rating with Radar Chart */}
          <div className="flex-1 mb-4 lg:mb-0">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-new-spirit-medium text-[var(--color-primary-text)]">
                Course Rating
              </h4>
            </div>
            <div className="h-28 sm:h-36">
              <RatingsBar
                workload={review.workload_rating || 0}
                fun={review.fun_rating || 0}
                difficulty={review.difficulty_rating || 0}
              />
            </div>
          </div>

          {/* Course Attributes */}
          <div className="flex-1">
            <h4 className="text-lg font-new-spirit-medium text-[var(--color-primary-text)] mb-3">
              Course Elements
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1 sm:gap-2">
              <AttributePill label="Presentations" active={review.presentations} />
              <AttributePill label="Papers" active={review.papers} />
              <AttributePill label="Projects" active={review.projects} />
              <AttributePill label="Exams" active={review.exams} />
              <AttributePill label="Quizzes" active={review.quizzes} />
              <AttributePill label="Regular HW" active={review.regular_homework} />
              <AttributePill label="Attendance Req." active={review.att_required} />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div 
          ref={contentRef}
          className={`transition-all duration-300 ${!isExpanded ? "max-h-[240px] overflow-hidden relative" : ""}`}
        >
          {/* Course Review */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-2">
              Course Comments:
            </h4>
            <p className="text-gray-700 whitespace-pre-line">
              &ldquo;{review.class_review}&rdquo;
            </p>
            {!isExpanded && shouldShowExpand && (
              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent"></div>
            )}
          </div>

          {/* Professor Review (if available) */}
          {review.professor_name && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                <h4 className="text-md font-medium text-gray-700">
                  Professor: {review.professor_name}
                </h4>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={`prof-${star}`} className="relative">
                      {/* Background star (always black outline) */}
                      <Star
                        className="w-4 h-4 stroke-[1.5] stroke-gray-900 fill-transparent absolute inset-0"
                      />
                      {/* Foreground star (red fill when selected) */}
                      <Star
                        className={`w-4 h-4 stroke-[1.5] stroke-transparent relative z-10 transition-colors duration-150 ${
                          star <= review.professor_rating ? "fill-[#FFD700]" : "fill-transparent"
                        }`}
                      />
                    </div>
                  ))}
                  <span className="text-gray-500 text-xs ml-2">({review.professor_rating}/5)</span>
                </div>
              </div>
              {review.professor_review && (
                <p className="text-gray-700 whitespace-pre-line">
                  &ldquo;{review.professor_review}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {shouldShowExpand && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 mb-1 text-blue-600 hover:text-blue-800 font-medium flex items-center text-sm transition-colors"
          >
            {isExpanded ? (
              <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
            ) : (
              <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
});
ReviewCard.displayName = 'ReviewCard';

type ReviewsSectionProps = {
  classCode: string;
  schema: string;
};

export default function ReviewsSection({ classCode, schema }: ReviewsSectionProps) {
  const [sortOrder, setSortOrder] = useState<'best' | 'worst' | 'recent'>('recent');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  
  // Fetch reviews data
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['full-reviews', classCode, schema],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema(schema)
        .from('reviews')
        .select('*')
        .eq('class_code', classCode);
      
      if (error) throw error;
      return data as FullReviewData[];
    },
    enabled: !!schema && !!classCode,
  });

  // Check if the current user has already submitted a review
  const { data: hasSubmittedReview } = useQuery({
    queryKey: ['has-submitted-review', classCode, schema, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;
      
      const { data, error } = await supabase
        .schema(schema)
        .from('reviews')
        .select('review_id')
        .eq('class_code', classCode)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!schema && !!classCode && !!session?.user?.id,
  });

  // Sort reviews based on the selected sort order
  const sortedReviews = useMemo(() => {
    if (!reviewsData) return [];
    
    return [...reviewsData].sort((a, b) => {
      if (sortOrder === 'recent') {
        // Sort by timestamp (most recent first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortOrder === 'best') {
        return b.course_rating - a.course_rating; // Highest ratings first
      } else {
        return a.course_rating - b.course_rating; // Lowest ratings first
      }
    });
  }, [reviewsData, sortOrder]);

  // Handle review button click
  const handleReviewButtonClick = useCallback(() => {
    if (!session) {
      const hostname = window.location.hostname;
      const school = getSchoolFromHostname(hostname);
      const isDev = process.env.NODE_ENV === 'development';
      const protocol = isDev ? 'http' : 'https';
      const domain = isDev ? `${school.subdomainPrefix}.localhost:3000` : school.domain;
      
      // Log information about the current environment
      console.log("Review login redirect environment:", {
        hostname,
        isDev,
        protocol,
        domain,
        currentPath: window.location.pathname,
        school: school.shortName
      });
      
      // Create the return URL using the correct domain
      const currentPath = `/class/${encodeURIComponent(classCode)}`;
      const returnUrl = `${protocol}://${domain}${currentPath}`;
      
      // Encode the returnUrl for use as a query parameter
      const encodedReturnUrl = encodeURIComponent(returnUrl);
      
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      
      // Create the register URL with the correct subdomain
      const registerUrl = `${protocol}://${domain}/auth/register?callbackUrl=${encodedReturnUrl}&t=${timestamp}`;
      
      // Use router.push for client-side navigation
      router.push(registerUrl);
      return;
    }
    
    if (hasSubmittedReview) {
      setSuccessMessage("You have already submitted a review for this class. You can only submit one review per class.");
      // Auto-dismiss after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      return;
    }
    
    setShowReviewForm(true);
  }, [session, classCode, hasSubmittedReview, router]);

  // Handle successful review submission
  const handleReviewSuccess = useCallback(() => {
    setShowReviewForm(false);
    setSuccessMessage("Your review has been submitted successfully! Thank you for your feedback.");
    // Refetch reviews to update the list
    refetch();
    // Auto-dismiss success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div id="student-reviews" className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
      {/* Success message */}
      {successMessage && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-100 flex items-center">
          <CheckCircle className="text-green-600 w-5 h-5 mr-2" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}
      
      {/* Header with sort options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 bg-gradient-to-r from-[var(--color-primary-border)] to-white px-6 py-4 gap-4">
        <h3 className="text-2xl font-new-spirit-medium text-[var(--color-primary-text)] text-center sm:text-left sm:font-new-spirit-medium">Student Reviews</h3>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
          <button 
            onClick={handleReviewButtonClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium rounded-lg shadow-sm hover:bg-[var(--color-primary)] hover:text-white transition-colors hover:cursor-pointer mx-auto sm:mx-0"
          >
            <PlusCircle className="w-4 h-4" />
            Add Review
          </button> 
          
          {reviewsData && reviewsData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex overflow-hidden max-w-full overflow-x-auto w-full sm:w-auto mx-auto sm:mx-0">
              <button 
                onClick={() => setSortOrder('recent')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap flex-1 sm:flex-auto ${sortOrder === 'recent' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Recent
              </button>
              <button 
                onClick={() => setSortOrder('best')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap flex-1 sm:flex-auto ${sortOrder === 'best' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Best 
              </button>
              <button 
                onClick={() => setSortOrder('worst')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap flex-1 sm:flex-auto ${sortOrder === 'worst' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Worst 
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Reviews or empty state */}
      {reviewsData && reviewsData.length > 0 ? (
        <div className="p-6">
          <div className="space-y-8">
            {sortedReviews.map((review) => (
              <ReviewCard key={review.review_id} review={review} />
            ))}
          </div>
          
          {/* Footer with Add Review button */}
          <div className="mt-8 pt-4 flex justify-center">
            <button 
              onClick={handleReviewButtonClick}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:scale-105 hover:cursor-pointer hover:shadow-md hover:shadow-black/20 transition-all duration-300"
            >
              <PlusCircle className="w-5 h-5" />
              Add Your Review
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 px-6">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-2xl font-new-spirit-medium text-gray-600 mb-3">No Reviews Yet</h4>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Be the first to share your experience with this class and help other students.</p>
          <button 
            onClick={handleReviewButtonClick}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:scale-105 hover:cursor-pointer transition-all mx-auto duration-300"
          >
            <PlusCircle className="w-5 h-5" />
            Add Your Review
          </button>
        </div>
      )}
      
      {/* Review form modal */}
      {showReviewForm && (
        <ReviewForm 
          classCode={classCode}
          schema={schema}
          onSuccess={handleReviewSuccess}
          onClose={() => setShowReviewForm(false)}
        />
      )}
    </div>
  );
} 