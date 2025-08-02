-- Function to increment unique chat count for a user
CREATE OR REPLACE FUNCTION public.increment_ai_chat_metrics()
RETURNS trigger AS $$
BEGIN
  -- Determine which schema to use based on user's email domain
  IF NEW.user_email LIKE '%@wisc.edu' THEN
    -- Update Wisconsin user's chat metrics
    UPDATE wisco.users
    SET 
      ai_unique_chats = COALESCE(ai_unique_chats, 0) + 1,
      last_visit = NOW()
    WHERE email = NEW.user_email;
  ELSIF NEW.user_email LIKE '%@utah.edu' THEN
    -- Update Utah user's chat metrics
    UPDATE utah.users
    SET 
      ai_unique_chats = COALESCE(ai_unique_chats, 0) + 1,
      last_visit = NOW()
    WHERE email = NEW.user_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment message count for a user
CREATE OR REPLACE FUNCTION public.increment_ai_message_metrics()
RETURNS trigger AS $$
BEGIN
  -- Determine which schema to use based on user's email domain
  IF NEW.user_email LIKE '%@wisc.edu' THEN
    -- Update Wisconsin user's message metrics
    UPDATE wisco.users
    SET 
      ai_unique_messages = COALESCE(ai_unique_messages, 0) + 1,
      last_visit = NOW()
    WHERE email = NEW.user_email;
  ELSIF NEW.user_email LIKE '%@utah.edu' THEN
    -- Update Utah user's message metrics
    UPDATE utah.users
    SET 
      ai_unique_messages = COALESCE(ai_unique_messages, 0) + 1,
      last_visit = NOW()
    WHERE email = NEW.user_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reset AI metrics to 0 for a schema
CREATE OR REPLACE FUNCTION public.reset_ai_metrics(target_schema text)
RETURNS void AS $$
BEGIN
  -- Validate schema parameter
  IF target_schema NOT IN ('wisco', 'utah') THEN
    RAISE EXCEPTION 'Invalid schema. Must be either "wisco" or "utah"';
  END IF;

  -- Execute dynamic SQL to update the correct schema
  EXECUTE format('
    UPDATE %I.users 
    SET 
      ai_unique_chats = 0,
      ai_unique_messages = 0
    WHERE ai_unique_chats > 0 OR ai_unique_messages > 0', target_schema);

  -- Log the operation
  RAISE NOTICE 'Reset AI metrics to 0 for all users in schema %', target_schema;
END;
$$ LANGUAGE plpgsql;

-- Function to reset AI metrics for all users in both schemas
CREATE OR REPLACE FUNCTION public.reset_all_ai_metrics()
RETURNS void AS $$
BEGIN
  -- Reset Wisconsin users
  PERFORM public.reset_ai_metrics('wisco');
  
  -- Reset Utah users
  PERFORM public.reset_ai_metrics('utah');
  
  RAISE NOTICE 'Reset AI metrics to 0 for all users in both schemas';
END;
$$ LANGUAGE plpgsql;

-- Create triggers for the AI chat tables (assuming they exist)
-- Note: You'll need to create these tables if they don't exist

-- Example table creation (if needed):
-- CREATE TABLE IF NOT EXISTS public.ai_chats (
--   chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   user_email TEXT NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   -- other fields as needed
-- );

-- CREATE TABLE IF NOT EXISTS public.ai_messages (
--   message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   chat_id UUID REFERENCES public.ai_chats(chat_id),
--   user_email TEXT NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   -- other fields as needed
-- );

-- Create triggers
DROP TRIGGER IF EXISTS increment_ai_chat_count ON public.ai_chats;
CREATE TRIGGER increment_ai_chat_count
  AFTER INSERT ON public.ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_ai_chat_metrics();

DROP TRIGGER IF EXISTS increment_ai_message_count ON public.ai_messages;
CREATE TRIGGER increment_ai_message_count
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_ai_message_metrics();

-- Add comments explaining what these functions do
COMMENT ON FUNCTION public.increment_ai_chat_metrics() IS 'Automatically increments the ai_unique_chats count for a user when they start a new chat';
COMMENT ON FUNCTION public.increment_ai_message_metrics() IS 'Automatically increments the ai_unique_messages count for a user when they send a new message';
COMMENT ON FUNCTION public.reset_ai_metrics(text) IS 'Resets AI chat metrics to 0 for all users in the specified schema';
COMMENT ON FUNCTION public.reset_all_ai_metrics() IS 'Resets AI chat metrics to 0 for all users in both wisco and utah schemas';

-- Example usage:
-- To reset AI metrics for one schema: SELECT public.reset_ai_metrics('wisco');
-- To reset AI metrics for both schemas: SELECT public.reset_all_ai_metrics(); 