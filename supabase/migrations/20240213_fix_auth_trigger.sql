-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_changes() CASCADE;

-- Create the new trigger function with proper security definer
CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert new user into the appropriate table based on email domain
    IF NEW.email LIKE '%@wisc.edu' THEN
      INSERT INTO wisco.users (
        auth_id,
        email,
        first_visit,
        reviews_left,
        verification_status
      ) VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        5, -- Default number of reviews
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END
      )
      ON CONFLICT (email) DO UPDATE SET
        auth_id = EXCLUDED.auth_id,
        verification_status = EXCLUDED.verification_status;
      
      RAISE NOTICE 'Created Wisc user with email % and auth_id %', NEW.email, NEW.id;
    ELSIF NEW.email LIKE '%@utah.edu' THEN
      INSERT INTO utah.users (
        auth_id,
        email,
        first_visit,
        reviews_left,
        verification_status
      ) VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        5, -- Default number of reviews
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END
      )
      ON CONFLICT (email) DO UPDATE SET
        auth_id = EXCLUDED.auth_id,
        verification_status = EXCLUDED.verification_status;
      
      RAISE NOTICE 'Created Utah user with email % and auth_id %', NEW.email, NEW.id;
    ELSE
      RAISE NOTICE 'User email % does not match any supported domains', NEW.email;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update the existing user in the appropriate table based on email domain
    IF NEW.email LIKE '%@wisc.edu' THEN
      UPDATE wisco.users
      SET
        email = NEW.email,
        verification_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END
      WHERE auth_id = NEW.id;
      
      RAISE NOTICE 'Updated Wisc user with email % and auth_id %', NEW.email, NEW.id;
    ELSIF NEW.email LIKE '%@utah.edu' THEN
      UPDATE utah.users
      SET
        email = NEW.email,
        verification_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END
      WHERE auth_id = NEW.id;
      
      RAISE NOTICE 'Updated Utah user with email % and auth_id %', NEW.email, NEW.id;
    ELSE
      RAISE NOTICE 'User email % does not match any supported domains', NEW.email;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete user from both tables to ensure cleanup
    DELETE FROM wisco.users WHERE auth_id = OLD.id;
    DELETE FROM utah.users WHERE auth_id = OLD.id;
    
    RAISE NOTICE 'Deleted user with auth_id % from all schemas', OLD.id;
    RETURN OLD;
  END IF;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_changes(); 