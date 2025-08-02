-- Function to increment reviews_left count for a user
CREATE OR REPLACE FUNCTION public.increment_reviews_left()
RETURNS trigger AS $$
BEGIN
  -- Update the user's reviews_left count in their respective schema
  IF TG_TABLE_SCHEMA = 'wisco' THEN
    UPDATE wisco.users
    SET reviews_left = reviews_left + 1
    WHERE user_id = NEW.user_id;
  ELSIF TG_TABLE_SCHEMA = 'utah' THEN
    UPDATE utah.users
    SET reviews_left = reviews_left + 1
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both schemas
DROP TRIGGER IF EXISTS increment_wisco_reviews_left ON wisco.reviews;
CREATE TRIGGER increment_wisco_reviews_left
  AFTER INSERT ON wisco.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reviews_left();

DROP TRIGGER IF EXISTS increment_utah_reviews_left ON utah.reviews;
CREATE TRIGGER increment_utah_reviews_left
  AFTER INSERT ON utah.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reviews_left();

-- Add comment explaining what this function does
COMMENT ON FUNCTION public.increment_reviews_left() IS 'Automatically increments the reviews_left count for a user when they submit a new review'; 