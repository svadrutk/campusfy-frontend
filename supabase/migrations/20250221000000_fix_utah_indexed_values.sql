-- Drop existing trigger
DROP TRIGGER IF EXISTS update_utah_class_indexed_values ON utah.reviews;

-- Recreate the trigger with the correct table name
CREATE TRIGGER update_utah_class_indexed_values
  AFTER INSERT OR UPDATE OR DELETE ON utah.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_indexed_values();

-- Backfill indexed values for all Utah classes
UPDATE utah.classes_undergrad2 c
SET 
  indexed_difficulty = (
    SELECT 
      0.2 * COALESCE(c.preliminary_difficulty, 0) + 
      0.8 * COALESCE(AVG(r.difficulty_rating), COALESCE(c.preliminary_difficulty, 0))
    FROM utah.classes_undergrad2 c2
    LEFT JOIN utah.reviews r ON r.class_code = c2.class_code
    WHERE c2.class_code = c.class_code
    GROUP BY c2.preliminary_difficulty
  ),
  indexed_fun = (
    SELECT 
      0.2 * COALESCE(c.preliminary_fun, 0) + 
      0.8 * COALESCE(AVG(r.fun_rating), COALESCE(c.preliminary_fun, 0))
    FROM utah.classes_undergrad2 c2
    LEFT JOIN utah.reviews r ON r.class_code = c2.class_code
    WHERE c2.class_code = c.class_code
    GROUP BY c2.preliminary_fun
  ),
  indexed_workload = (
    SELECT 
      0.2 * COALESCE(c.preliminary_workload, 0) + 
      0.8 * COALESCE(AVG(r.workload_rating), COALESCE(c.preliminary_workload, 0))
    FROM utah.classes_undergrad2 c2
    LEFT JOIN utah.reviews r ON r.class_code = c2.class_code
    WHERE c2.class_code = c.class_code
    GROUP BY c2.preliminary_workload
  ),
  review_count = (
    SELECT COUNT(*)
    FROM utah.reviews
    WHERE class_code = c.class_code
  ),
  overall_rating = (
    SELECT AVG(course_rating)
    FROM utah.reviews
    WHERE class_code = c.class_code
  ); 