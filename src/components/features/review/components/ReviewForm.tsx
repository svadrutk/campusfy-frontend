"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon, CheckIcon, XCircleIcon, InfoIcon } from "lucide-react";
import { Star } from "lucide-react";
import supabase from "@/lib/supabase";
import { useSession, getCsrfToken } from "next-auth/react";
import { reviewFormSchema, type ReviewFormValues } from "@/lib/schemas/forms/review";

// Define ReviewForm props
type ReviewFormProps = {
  classCode: string;
  schema: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function ReviewForm({ classCode, schema, onSuccess, onClose }: ReviewFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [selectedElementsCount, setSelectedElementsCount] = useState(0);

  // Fetch CSRF token on component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        setCsrfToken(token);
      } catch (error) {
        console.error("Error fetching CSRF token:", error);
        setSubmitError("Error setting up form security. Please try again later.");
      }
    };
    
    fetchCsrfToken();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      course_rating: 0,
      fun_rating: 0,
      difficulty_rating: 0,
      workload_rating: 0,
      professor_rating: 0,
      presentations: false,
      papers: false,
      projects: false,
      exams: false,
      quizzes: false,
      regular_homework: false,
      att_required: false,
      csrfToken: csrfToken || '',
    },
  });

  // Update the CSRF token in form when it's fetched
  useEffect(() => {
    if (csrfToken) {
      setValue('csrfToken', csrfToken);
    }
  }, [csrfToken, setValue]);

  const courseRating = watch("course_rating");
  const funRating = watch("fun_rating");
  const difficultyRating = watch("difficulty_rating");
  const workloadRating = watch("workload_rating");
  const professorRating = watch("professor_rating");

  // Watch all course elements to track number selected
  const presentations = watch("presentations");
  const papers = watch("papers");
  const projects = watch("projects");
  const exams = watch("exams");
  const quizzes = watch("quizzes");
  const regular_homework = watch("regular_homework");
  const att_required = watch("att_required");

  // Update count of selected elements when any change
  useEffect(() => {
    const count = [
      presentations, 
      papers, 
      projects, 
      exams, 
      quizzes, 
      regular_homework, 
      att_required
    ].filter(Boolean).length;
    
    setSelectedElementsCount(count);
  }, [presentations, papers, projects, exams, quizzes, regular_homework, att_required]);

  // Set star rating
  const handleRatingChange = (field: keyof ReviewFormValues, value: number) => {
    setValue(field, value, { shouldValidate: true });
  };

  // Create star rating input
  const StarRatingInput = ({ 
    field, 
    value, 
    label 
  }: { 
    field: keyof ReviewFormValues, 
    value: number, 
    label: string 
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={`${field}-${star}`}
            type="button"
            onClick={() => handleRatingChange(field, star)}
            className="p-1 mr-1 focus:outline-none relative w-10 h-10 flex items-center justify-center"
          >
            {/* Background star (always black outline) */}
            <Star
              className="w-7 h-7 stroke-[1.5] stroke-gray-900 fill-transparent absolute inset-0 m-0.5"
            />
            {/* Foreground star (red fill when selected) */}
            <Star
              className={`w-7 h-7 stroke-[1.5] stroke-transparent absolute inset-0 m-0.5 z-10 transition-colors duration-150 ${
                star <= value
                  ? "fill-[var(--color-primary)]"
                  : "fill-transparent"
              }`}
            />
          </button>
        ))}
        {errors[field] && (
          <span className="ml-2 text-red-500 text-xs">{errors[field]?.message as string}</span>
        )}
      </div>
    </div>
  );

  // Toggle input for course elements
  const ToggleInput = ({ 
    field, 
    label 
  }: { 
    field: keyof ReviewFormValues, 
    label: string 
  }) => {
    const value = watch(field) as boolean;
    
    // Handle toggle with selection limit
    const handleToggle = () => {
      // If already selected, allow deselecting
      if (value) {
        setValue(field, false, { shouldValidate: true });
        return;
      }
      
      // If not selected but already have 2 elements, don't allow selection
      if (selectedElementsCount >= 2) {
        return;
      }
      
      // Otherwise allow selection
      setValue(field, true, { shouldValidate: true });
    };
    
    // Determine if the option should be disabled
    const isDisabled = !value && selectedElementsCount >= 2;
    
    return (
      <div className={`flex items-center mb-3 ${isDisabled ? 'opacity-50' : 'opacity-100'}`}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isDisabled}
          className={`w-5 h-5 rounded border ${
            value 
              ? "bg-[var(--color-primary)] border-[var(--color-primary)]" 
              : "bg-white border-gray-300"
          } flex items-center justify-center mr-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {value && <CheckIcon className="w-3.5 h-3.5 text-white" />}
        </button>
        <label 
          className={`text-sm text-gray-700 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
          onClick={isDisabled ? undefined : handleToggle}
        >
          {label}
        </label>
      </div>
    );
  };

  const onSubmit = async (data: ReviewFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Log session details for debugging (without exposing sensitive info)
      console.log("Session details for review submission:", {
        sessionExists: !!session,
        userExists: !!session?.user,
        userId: session?.user?.id || "missing",
        userEmail: session?.user?.email || "missing",
      });
    
      if (!session?.user?.email) {
        throw new Error("You must be logged in with a valid email address to submit a review");
      }
      
      if (!csrfToken) {
        throw new Error("Security token is missing. Please refresh the page and try again.");
      }
      
      // Check for existing review using email address
      const { data: existingReviews, error: checkError } = await supabase
        .schema(schema)
        .from("reviews")
        .select("review_id")
        .eq("email", session.user.email)
        .eq("class_code", classCode);
        
      if (checkError) {
        throw new Error("Error checking for existing review: " + checkError.message);
      }
      
      if (existingReviews && existingReviews.length > 0) {
        throw new Error("You have already submitted a review for this class. You can only submit one review per class.");
      }

      // Fetch the actual user_id from the users table using email
      const { data: userData, error: userError } = await supabase
        .schema(schema)
        .from("users")
        .select("user_id")
        .eq("email", session.user.email)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        throw new Error("Could not find your user account. Please ensure you've signed up and are using the correct email address.");
      }

      if (!userData) {
        throw new Error("Your user account was not found. Please check that you're using the correct email address.");
      }
      
      // Create the review object using the user_id from the users table
      const reviewData = {
        user_id: userData.user_id,
        email: session.user.email || "",
        class_code: classCode,
        schema: schema,
        course_rating: data.course_rating,
        fun_rating: data.fun_rating,
        difficulty_rating: data.difficulty_rating,
        workload_rating: data.workload_rating,
        class_review: data.class_review,
        professor_name: data.professor_name || null,
        professor_rating: data.professor_rating || null,
        professor_review: data.professor_review || null,
        presentations: data.presentations,
        papers: data.papers,
        projects: data.projects,
        exams: data.exams,
        quizzes: data.quizzes,
        regular_homework: data.regular_homework,
        att_required: data.att_required,
        review_tag: data.review_tag || null,
        timestamp: new Date().toISOString(),
        csrfToken: csrfToken,
      };
      
      // Log the complete review data for debugging
      console.log("Review data being submitted:", {
        ...reviewData,
        // Include data types for debugging foreign key constraints
        user_id_type: typeof reviewData.user_id,
        user_id_value: reviewData.user_id,
        email: reviewData.email,
        class_code_type: typeof reviewData.class_code,
        class_code_length: reviewData.class_code.length,
        schema_type: typeof reviewData.schema,
        timestamp_type: typeof reviewData.timestamp,
      });
      
      // Create a secure submission via API route 
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(reviewData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from API:", errorData);
        throw new Error(errorData.message || "Error submitting review");
      }
      
      // Success
      reset();
      onSuccess();
    } catch (error) {
      console.error("Review submission error:", error);
      setSubmitError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-new-spirit-medium text-[var(--color-primary-text)]">
            Submit Course Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <XCircleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md flex items-start">
            <InfoIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <p>Your review will help other students make informed decisions about this class. Please be honest and constructive.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register("csrfToken")} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Ratings</h3>
                
                {/* Enhanced overall course rating */}
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <label className="block text-base font-semibold text-gray-800 mb-2">
                    Overall Course Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={`course_rating-${star}`}
                        type="button"
                        onClick={() => handleRatingChange("course_rating", star)}
                        className="p-1 mr-1 focus:outline-none relative w-12 h-12 flex items-center justify-center"
                      >
                        {/* Background star (always black outline) */}
                        <Star
                          className="w-9 h-9 stroke-[1.5] stroke-gray-900 fill-transparent absolute inset-0 m-auto"
                        />
                        {/* Foreground star (red fill when selected) */}
                        <Star
                          className={`w-9 h-9 stroke-[1.5] stroke-transparent absolute inset-0 m-auto z-10 transition-colors duration-150 ${
                            star <= courseRating
                              ? "fill-[var(--color-primary)]"
                              : "fill-transparent"
                          }`}
                        />
                      </button>
                    ))}
                    {errors.course_rating && (
                      <span className="ml-2 text-red-500 text-sm font-medium">{errors.course_rating.message as string}</span>
                    )}
                  </div>
                </div>
                
                <StarRatingInput field="fun_rating" value={funRating} label="Fun Rating" />
                <StarRatingInput field="difficulty_rating" value={difficultyRating} label="Difficulty Rating" />
                <StarRatingInput field="workload_rating" value={workloadRating} label="Workload Rating" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Elements</h3>
                <p className="text-sm text-gray-600 mb-2">Select the 2 most important elements of this class, grade-wise. <span className="text-[var(--color-primary)] font-medium">(Choose only 2)</span></p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-3">{selectedElementsCount}/2 elements selected</div>
                  <ToggleInput field="presentations" label="Presentations" />
                  <ToggleInput field="papers" label="Papers" />
                  <ToggleInput field="projects" label="Projects" />
                  <ToggleInput field="exams" label="Exams" />
                  <ToggleInput field="quizzes" label="Quizzes" />
                  <ToggleInput field="regular_homework" label="Regular Homework" />
                  <ToggleInput field="att_required" label="Attendance Required" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Review
              </label>
              <textarea
                {...register("class_review")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[100px] focus:ring-blue-500 focus:border-blue-500"
                placeholder="Share your experience with this class..."
              />
              {errors.class_review && (
                <span className="text-red-500 text-xs">{errors.class_review.message}</span>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Professor Information (Optional)</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professor Name
                </label>
                <input
                  type="text"
                  {...register("professor_name")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Professor's name (optional)"
                />
              </div>
              
              {watch("professor_name") && (
                <>
                  <StarRatingInput 
                    field="professor_rating" 
                    value={professorRating || 0} 
                    label="Professor Rating (Required)" 
                  />
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Professor Review (Optional)
                    </label>
                    <textarea
                      {...register("professor_review")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[80px] focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Share your thoughts about this professor..."
                    />
                  </div>
                </>
              )}
            </div>

            

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !csrfToken}
                className="px-6 py-2 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:scale-105 hover:cursor-pointer transition-all duration-300 transition-colors disabled:opacity-70 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 