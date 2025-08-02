-- Create function to update indexed values
CREATE OR REPLACE FUNCTION wisco.update_class_indexed_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the indexed values in classes_undergrad table
  UPDATE wisco.classes_undergrad
  SET 
    indexed_difficulty = (
      SELECT 
        0.2 * COALESCE(c.preliminary_difficulty, 0) + 
        0.8 * COALESCE(AVG(r.difficulty_rating), COALESCE(c.preliminary_difficulty, 0))
      FROM wisco.classes_undergrad c
      LEFT JOIN wisco.reviews r ON r.class_code = c.class_code
      WHERE c.class_code = NEW.class_code
      GROUP BY c.preliminary_difficulty
    ),
    indexed_fun = (
      SELECT 
        0.2 * COALESCE(c.preliminary_fun, 0) + 
        0.8 * COALESCE(AVG(r.fun_rating), COALESCE(c.preliminary_fun, 0))
      FROM wisco.classes_undergrad c
      LEFT JOIN wisco.reviews r ON r.class_code = c.class_code
      WHERE c.class_code = NEW.class_code
      GROUP BY c.preliminary_fun
    ),
    indexed_workload = (
      SELECT 
        0.2 * COALESCE(c.preliminary_workload, 0) + 
        0.8 * COALESCE(AVG(r.workload_rating), COALESCE(c.preliminary_workload, 0))
      FROM wisco.classes_undergrad c
      LEFT JOIN wisco.reviews r ON r.class_code = c.class_code
      WHERE c.class_code = NEW.class_code
      GROUP BY c.preliminary_workload
    ),
    review_count = (
      SELECT COUNT(*)
      FROM wisco.reviews
      WHERE class_code = NEW.class_code
    ),
    overall_rating = (
      SELECT AVG(course_rating)
      FROM wisco.reviews
      WHERE class_code = NEW.class_code
    )
  WHERE class_code = NEW.class_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after insert on reviews
DROP TRIGGER IF EXISTS update_class_indexed_values_trigger ON wisco.reviews;
CREATE TRIGGER update_class_indexed_values_trigger
  AFTER INSERT OR UPDATE
  ON wisco.reviews
  FOR EACH ROW
  EXECUTE FUNCTION wisco.update_class_indexed_values();

-- Backfill existing classes with indexed values
UPDATE wisco.classes_undergrad c
SET
  indexed_difficulty = (
    0.2 * COALESCE(c.preliminary_difficulty, 0) + 
    0.8 * COALESCE(subquery.avg_difficulty, COALESCE(c.preliminary_difficulty, 0))
  ),
  indexed_fun = (
    0.2 * COALESCE(c.preliminary_fun, 0) + 
    0.8 * COALESCE(subquery.avg_fun, COALESCE(c.preliminary_fun, 0))
  ),
  indexed_workload = (
    0.2 * COALESCE(c.preliminary_workload, 0) + 
    0.8 * COALESCE(subquery.avg_workload, COALESCE(c.preliminary_workload, 0))
  ),
  review_count = COALESCE(subquery.review_count, 0),
  overall_rating = subquery.avg_rating
FROM (
  SELECT 
    class_code,
    AVG(difficulty_rating) as avg_difficulty,
    AVG(fun_rating) as avg_fun,
    AVG(workload_rating) as avg_workload,
    COUNT(*) as review_count,
    AVG(course_rating) as avg_rating
  FROM wisco.reviews
  GROUP BY class_code
) as subquery
WHERE c.class_code = subquery.class_code; 