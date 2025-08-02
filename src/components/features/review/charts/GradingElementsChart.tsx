import React from 'react';
import { LayoutManager } from '../renderers/LayoutManager';
import { BubbleRenderer } from './BubbleRenderer';

export type GradingWeights = {
  exams: number;
  projects: number;
  papers: number;
  quizzes: number;
  presentations: number;
  regular_homework: number;
  att_required: number;
};

type GradingElementsChartProps = {
  weights: GradingWeights;
  reviewCount?: number;
  className?: string;
  onViewComments?: () => void;
  reviewsElementId?: string;
};

const colorMap = {
  exams: "#E76F51",
  projects: "#2A9D8F",
  papers: "#E9C46A",
  quizzes: "#F4A261",
  presentations: "#264653",
  regular_homework: "#48CAE4",
  att_required: "#9D4EDD"
};

/**
 * A component for displaying course grading elements as a word cloud
 */
const GradingElementsChart: React.FC<GradingElementsChartProps> = ({
  weights,
  reviewCount,
  className = '',
  onViewComments,
  reviewsElementId = 'student-reviews'
}) => {
  const safeWeights = {
    exams: isNaN(weights.exams) ? 0 : weights.exams,
    projects: isNaN(weights.projects) ? 0 : weights.projects,
    papers: isNaN(weights.papers) ? 0 : weights.papers,
    quizzes: isNaN(weights.quizzes) ? 0 : weights.quizzes,
    presentations: isNaN(weights.presentations) ? 0 : weights.presentations,
    regular_homework: isNaN(weights.regular_homework) ? 0 : weights.regular_homework,
    att_required: isNaN(weights.att_required) ? 0 : weights.att_required
  };

  const gradingElements = [
    { id: "exams", label: "EXAMS", weight: safeWeights.exams, color: colorMap.exams },
    { id: "projects", label: "PROJ.", weight: safeWeights.projects, color: colorMap.projects },
    { id: "papers", label: "PAPERS", weight: safeWeights.papers, color: colorMap.papers },
    { id: "quizzes", label: "QUIZ", weight: safeWeights.quizzes, color: colorMap.quizzes },
    { id: "presentations", label: "PRESENT", weight: safeWeights.presentations, color: colorMap.presentations },
    { id: "regular_homework", label: "HW", weight: safeWeights.regular_homework, color: colorMap.regular_homework },
    { id: "att_required", label: "ATT.", weight: safeWeights.att_required, color: colorMap.att_required }
  ].filter(element => element.weight > 0)
   .sort((a, b) => b.weight - a.weight);

  const scrollToReviews = () => {
    if (onViewComments) {
      onViewComments();
    }
    setTimeout(() => {
      const reviewsElement = document.getElementById(reviewsElementId);
      if (reviewsElement) {
        reviewsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <LayoutManager className={className}>
      {(containerWidth) => (
        <>
          {gradingElements.length > 0 ? (
            gradingElements.map((element) => (
              <BubbleRenderer
                key={element.id}
                _id={element.id}
                label={element.label}
                weight={element.weight}
                color={element.color}
                containerWidth={containerWidth}
                elementCount={gradingElements.length}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-4 space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-700 font-medium font-inter text-sm text-center">
                  No grading information available
                </p>
                <p className="text-gray-500 text-xs text-center mt-1">
                  Be the first to add information about how this course is graded
                </p>
              </div>
              <button
                onClick={scrollToReviews}
                className="px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all hover:shadow-md hover:translate-y-[-2px] active:translate-y-0 flex items-center gap-1"
              >
                Write a Review
              </button>
            </div>
          )}
          
          {reviewCount !== undefined && reviewCount > 0 && (
            <div className="pt-2 flex justify-between items-center text-xs gap-10">
              <p className="text-gray-500 font-inter">
                Based on {reviewCount} student {reviewCount === 1 ? 'review' : 'reviews'}
              </p>
              <button 
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium font-inter"
                onClick={scrollToReviews}
              >
                [View Comments]
              </button>
            </div>
          )}
        </>
      )}
    </LayoutManager>
  );
};

export default GradingElementsChart; 