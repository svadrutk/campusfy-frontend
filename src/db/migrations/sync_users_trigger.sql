-- Set up database triggers for user synchronization between auth.users and wisco.users
-- This should be run on the Supabase database to create the necessary triggers

-- For complete functionality, add the auth_id column to your users table if it doesn't exist
ALTER TABLE wisco.users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wisco.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Create an index to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON wisco.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON wisco.users(email);

-- Create a trigger function that syncs auth.users to wisco.users
CREATE OR REPLACE FUNCTION wisco.handle_auth_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert new user into wisco.users table
    INSERT INTO wisco.users (
      auth_id,
      email,
      first_visit,
      last_visit,
      reviews_left,
      verification_status,
      is_signed_up
    ) VALUES (
      NEW.id,
      NEW.email,
      NOW(),
      NOW(),
      5, -- Default number of reviews
      CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
      TRUE
    )
    ON CONFLICT (email) DO UPDATE SET
      auth_id = EXCLUDED.auth_id,
      verification_status = EXCLUDED.verification_status;
    
    RAISE NOTICE 'Created user with email % and auth_id %', NEW.email, NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update the existing user in the wisco.users table
    UPDATE wisco.users
    SET
      email = NEW.email,
      verification_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
      last_visit = NOW()
    WHERE auth_id = NEW.id;
    
    RAISE NOTICE 'Updated user with email % and auth_id %', NEW.email, NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete user from the wisco.users table
    DELETE FROM wisco.users
    WHERE auth_id = OLD.id;
    
    RAISE NOTICE 'Deleted user with auth_id %', OLD.id;
    RETURN OLD;
  END IF;
END;
$$;

-- Create triggers to execute the function on INSERT, UPDATE, and DELETE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wisco.handle_auth_user_changes();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wisco.handle_auth_user_changes();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION wisco.handle_auth_user_changes();

-- Additionally, if you need to sync existing users, you can run this function:
CREATE OR REPLACE FUNCTION wisco.sync_existing_users() RETURNS void AS $$
DECLARE 
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, email_confirmed_at
    FROM auth.users
  LOOP
    -- Check if user exists in wisco.users
    IF NOT EXISTS (SELECT 1 FROM wisco.users WHERE email = auth_user.email) THEN
      -- Insert the user if they don't exist
      INSERT INTO wisco.users (
        auth_id,
        email,
        first_visit,
        last_visit,
        reviews_left,
        verification_status,
        is_signed_up
      ) VALUES (
        auth_user.id,
        auth_user.email,
        NOW(),
        NOW(),
        5,
        CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
        TRUE
      );
      RAISE NOTICE 'Created user with email %', auth_user.email;
    ELSE
      -- Update the existing user
      UPDATE wisco.users
      SET 
        auth_id = auth_user.id,
        verification_status = CASE WHEN auth_user.email_confirmed_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
        last_visit = NOW()
      WHERE email = auth_user.email;
      RAISE NOTICE 'Updated user with email %', auth_user.email;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To run the initial synchronization, execute:
-- SELECT wisco.sync_existing_users();

-- Create a comment explaining what this migration does
COMMENT ON FUNCTION wisco.handle_auth_user_changes() IS 'Syncs changes from auth.users to wisco.users automatically via triggers';
COMMENT ON FUNCTION wisco.sync_existing_users() IS 'Synchronizes existing users from auth.users to wisco.users'; 