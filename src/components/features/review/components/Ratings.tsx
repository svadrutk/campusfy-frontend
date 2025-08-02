import { memo } from "react";
import { getColorFromRating } from "../utils/ColorManager";
import { getWorkloadLabel, getFunLabel, getDifficultyLabel } from "../utils/LabelManager";
import BarRenderer from "../renderers/BarRenderer";

type RatingsBarProps = {
  workload: number;
  fun: number;
  difficulty: number;
  className?: string;
};

/**
 * An improved component that displays course ratings with visual indicators
 */
const RatingsBar = memo(({
  workload,
  fun,
  difficulty,
  className = ""
}: RatingsBarProps) => {
  return (
    <div className={`w-full h-full flex flex-1 justify-center items-center ${className} font-inter`}>
      <div className="w-full flex justify-between items-stretch gap-4 px-1">
        {/* Fun Card */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-4xl font-bold font-new-spirit-medium" style={{ color: getColorFromRating(fun) }}>
            {fun.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-gray-600 mb-1 font-new-spirit-medium">Fun</span>
          <span className="text-xs text-gray-500 mb-2 font-new-spirit-medium">{getFunLabel(fun)}</span>
          <BarRenderer value={fun} />
        </div>

        {/* Workload Card */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-4xl font-bold font-new-spirit-medium" style={{ color: getColorFromRating(workload, true) }}>
            {workload.toFixed(1)}
          </span>
          <span className="text-sm font-medium font-new-spirit-medium text-gray-600 mb-1">Workload</span>
          <span className="text-xs font-new-spirit-medium text-gray-500 mb-2">{getWorkloadLabel(workload)}</span>
          <BarRenderer value={workload} isInverted />
        </div>

        {/* Difficulty Card */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-4xl font-bold font-new-spirit-medium" style={{ color: getColorFromRating(difficulty, true) }}>
            {difficulty.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-gray-600 mb-1 font-new-spirit-medium">Difficulty</span>
          <span className="text-xs text-gray-500 mb-2 font-new-spirit-medium">{getDifficultyLabel(difficulty)}</span>
          <BarRenderer value={difficulty} isInverted />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.workload === nextProps.workload &&
    prevProps.fun === nextProps.fun &&
    prevProps.difficulty === nextProps.difficulty &&
    prevProps.className === nextProps.className
  );
});

RatingsBar.displayName = 'RatingsBar';

export default RatingsBar; 