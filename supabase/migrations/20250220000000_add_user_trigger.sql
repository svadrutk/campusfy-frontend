-- Set up database triggers for user synchronization between auth.users and wisco/utah.users
-- This should be run on the Supabase database to create the necessary triggers

-- For complete functionality, add the auth_id column to your users tables if they don't exist
ALTER TABLE wisco.users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wisco.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

ALTER TABLE utah.users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE utah.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Create indexes to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_wisco_users_auth_id ON wisco.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_wisco_users_email ON wisco.users(email);
CREATE INDEX IF NOT EXISTS idx_utah_users_auth_id ON utah.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_utah_users_email ON utah.users(email);

-- Create a trigger function that syncs auth.users to wisco/utah.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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
        verification_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
        last_visit = NOW()
      WHERE auth_id = NEW.id;
      
      RAISE NOTICE 'Updated Wisc user with email % and auth_id %', NEW.email, NEW.id;
    ELSIF NEW.email LIKE '%@utah.edu' THEN
      UPDATE utah.users
      SET
        email = NEW.email,
        verification_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
        last_visit = NOW()
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

-- Create triggers to execute the function on INSERT, UPDATE, and DELETE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_changes();

-- Additionally, if you need to sync existing users, you can run this function:
CREATE OR REPLACE FUNCTION public.sync_existing_users() RETURNS void AS $$
DECLARE 
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, email_confirmed_at, created_at, updated_at 
    FROM auth.users
  LOOP
    -- Check if user exists in wisco.users
    IF auth_user.email LIKE '%@wisc.edu' THEN
      IF NOT EXISTS (SELECT 1 FROM wisco.users WHERE email = auth_user.email) THEN
        -- Insert the user if they don't exist
        INSERT INTO wisco.users (
          auth_id,
          email,
          first_visit,
          verification_status,
          reviews_left
        ) VALUES (
          auth_user.id,
          auth_user.email,
          NOW(),
          CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
          5
        );
        RAISE NOTICE 'Created Wisc user with email %', auth_user.email;
      ELSE
        -- Update the existing user
        UPDATE wisco.users
        SET 
          auth_id = auth_user.id,
          verification_status = CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
          last_visit = NOW()
        WHERE email = auth_user.email;
        RAISE NOTICE 'Updated Wisc user with email %', auth_user.email;
      END IF;
    ELSIF auth_user.email LIKE '%@utah.edu' THEN
      IF NOT EXISTS (SELECT 1 FROM utah.users WHERE email = auth_user.email) THEN
        -- Insert the user if they don't exist
        INSERT INTO utah.users (
          auth_id,
          email,
          first_visit,
          verification_status,
          reviews_left
        ) VALUES (
          auth_user.id,
          auth_user.email,
          NOW(),
          CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
          5
        );
        RAISE NOTICE 'Created Utah user with email %', auth_user.email;
      ELSE
        -- Update the existing user
        UPDATE utah.users
        SET 
          auth_id = auth_user.id,
          verification_status = CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
          last_visit= NOW()
        WHERE email = auth_user.email;
        RAISE NOTICE 'Updated Utah user with email %', auth_user.email;
      END IF;
    ELSE
      RAISE NOTICE 'User email % does not match any supported domains', auth_user.email;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To run the initial synchronization, execute:
-- SELECT public.sync_existing_users();

-- Create comments explaining what these functions do
COMMENT ON FUNCTION public.handle_auth_user_changes() IS 'Syncs changes from auth.users to wisco/utah.users automatically via triggers';
COMMENT ON FUNCTION public.sync_existing_users() IS 'Synchronizes existing users from auth.users to wisco/utah.users based on email domain';

-- Create function to update indexed values for both schemas
CREATE OR REPLACE FUNCTION public.update_class_indexed_values()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update the indexed values in classes_undergrad table based on which schema triggered this
  IF TG_TABLE_SCHEMA = 'wisco' THEN
    -- Update wisco classes
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
    
    RAISE NOTICE 'Updated indexed values for Wisc class %', NEW.class_code;
  ELSIF TG_TABLE_SCHEMA = 'utah' THEN
    -- Update utah classes
    UPDATE utah.classes_undergrad2
    SET 
      indexed_difficulty = (
        SELECT 
          0.2 * COALESCE(c.preliminary_difficulty, 0) + 
          0.8 * COALESCE(AVG(r.difficulty_rating), COALESCE(c.preliminary_difficulty, 0))
        FROM utah.classes_undergrad2 c
        LEFT JOIN utah.reviews r ON r.class_code = c.class_code
        WHERE c.class_code = NEW.class_code
        GROUP BY c.preliminary_difficulty
      ),
      indexed_fun = (
        SELECT 
          0.2 * COALESCE(c.preliminary_fun, 0) + 
          0.8 * COALESCE(AVG(r.fun_rating), COALESCE(c.preliminary_fun, 0))
        FROM utah.classes_undergrad2 c
        LEFT JOIN utah.reviews r ON r.class_code = c.class_code
        WHERE c.class_code = NEW.class_code
        GROUP BY c.preliminary_fun
      ),
      indexed_workload = (
        SELECT 
          0.2 * COALESCE(c.preliminary_workload, 0) + 
          0.8 * COALESCE(AVG(r.workload_rating), COALESCE(c.preliminary_workload, 0))
        FROM utah.classes_undergrad2 c
        LEFT JOIN utah.reviews r ON r.class_code = c.class_code
        WHERE c.class_code = NEW.class_code
        GROUP BY c.preliminary_workload
      ),
      review_count = (
        SELECT COUNT(*)
        FROM utah.reviews
        WHERE class_code = NEW.class_code
      ),
      overall_rating = (
        SELECT AVG(course_rating)
        FROM utah.reviews
        WHERE class_code = NEW.class_code
      )
    WHERE class_code = NEW.class_code;
    
    RAISE NOTICE 'Updated indexed values for Utah class %', NEW.class_code;
  ELSE
    RAISE NOTICE 'Trigger called from unsupported schema: %', TG_TABLE_SCHEMA;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for both schemas
DROP TRIGGER IF EXISTS update_wisco_class_indexed_values ON wisco.reviews;
CREATE TRIGGER update_wisco_class_indexed_values
  AFTER INSERT OR UPDATE OR DELETE ON wisco.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_indexed_values();

DROP TRIGGER IF EXISTS update_utah_class_indexed_values ON utah.reviews;
CREATE TRIGGER update_utah_class_indexed_values
  AFTER INSERT OR UPDATE OR DELETE ON utah.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_indexed_values();

-- Add comment explaining the function
COMMENT ON FUNCTION public.update_class_indexed_values() IS 'Updates indexed values (difficulty, fun, workload) for classes in both wisco and utah schemas when reviews are modified'; 