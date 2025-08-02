-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.increment_counter(integer);

-- Create a generic increment function that can be used for any numeric column
CREATE OR REPLACE FUNCTION public.increment_counter(
  val integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(val, 0) + 1;
END;
$$;

-- Add comment explaining what this function does
COMMENT ON FUNCTION public.increment_counter IS 'Safely increments a counter value, handling NULL values'; 