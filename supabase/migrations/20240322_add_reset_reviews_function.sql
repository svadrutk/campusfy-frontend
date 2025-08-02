-- Function to reset reviews_left count to 0 for all users in a schema
CREATE OR REPLACE FUNCTION public.reset_reviews_left(target_schema text)
RETURNS void AS $$
BEGIN
  -- Validate schema parameter
  IF target_schema NOT IN ('wisco', 'utah') THEN
    RAISE EXCEPTION 'Invalid schema. Must be either "wisco" or "utah"';
  END IF;

  -- Execute dynamic SQL to update the correct schema
  EXECUTE format('
    UPDATE %I.users 
    SET reviews_left = 0
    WHERE reviews_left > 0', target_schema);

  -- Log the operation
  RAISE NOTICE 'Reset reviews_left to 0 for all users in schema %', target_schema;
END;
$$ LANGUAGE plpgsql;

-- Function to reset reviews_left count for all users in both schemas
CREATE OR REPLACE FUNCTION public.reset_all_reviews_left()
RETURNS void AS $$
BEGIN
  -- Reset Wisconsin users
  PERFORM public.reset_reviews_left('wisco');
  
  -- Reset Utah users
  PERFORM public.reset_reviews_left('utah');
  
  RAISE NOTICE 'Reset reviews_left to 0 for all users in both schemas';
END;
$$ LANGUAGE plpgsql;

-- Add comments explaining what these functions do
COMMENT ON FUNCTION public.reset_reviews_left(text) IS 'Resets reviews_left count to 0 for all users in the specified schema';
COMMENT ON FUNCTION public.reset_all_reviews_left() IS 'Resets reviews_left count to 0 for all users in both wisco and utah schemas';

-- Example usage:
-- To reset one schema: SELECT public.reset_reviews_left('wisco');
-- To reset both schemas: SELECT public.reset_all_reviews_left(); 