-- Add search indexes for improved search performance
-- This file should be executed against the database to create the necessary indexes

-- Index for class_code (most frequently searched field)
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON wisco.classes_undergrad (class_code);

-- Index for course_name (second most frequently searched field)
CREATE INDEX IF NOT EXISTS idx_classes_course_name ON wisco.classes_undergrad (course_name);

-- Index for course_desc (less frequently searched but still important)
CREATE INDEX IF NOT EXISTS idx_classes_course_desc ON wisco.classes_undergrad (course_desc);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_classes_filters ON wisco.classes_undergrad (course_level, course_breadth, gen_ed, ethnic);

-- Index for foreign keys to improve join performance
CREATE INDEX IF NOT EXISTS idx_grades_class_code ON wisco.grades-test (class_code);

-- Create a GIN index for full text search (if PostgreSQL supports it)
-- This requires the pg_trgm extension to be enabled
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_classes_full_text ON wisco.classes_undergrad 
--   USING GIN ((class_code || ' ' || course_name || ' ' || course_desc) gin_trgm_ops);

-- Note: The GIN index is commented out as it requires the pg_trgm extension
-- and administrative privileges to enable it. If you have these privileges,
-- you can uncomment and run these commands.