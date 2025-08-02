import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define user data type
interface UserMetrics {
  ai_unique_chats: number | null;
  ai_unique_messages: number | null;
}

/**
 * Updates AI chat metrics for a user
 * @param email User's email address
 * @param schema Database schema ('wisco' or 'utah')
 * @param type Type of increment ('chat' or 'message')
 */
export async function incrementAIMetric(
  email: string,
  schema: string,
  type: 'chat' | 'message'
): Promise<void> {
  try {
    // Get current value first
    const { data: userData, error: fetchError } = await supabase
      .schema(schema)
      .from('users')
      .select('ai_unique_chats, ai_unique_messages')
      .eq('email', email)
      .single<UserMetrics>();

    if (fetchError) {
      console.error(`Error fetching current ${type} count:`, fetchError);
      return;
    }

    // Get the current value
    const currentValue = type === 'chat' ? 
      (userData?.ai_unique_chats ?? 0) : 
      (userData?.ai_unique_messages ?? 0);

    // Update the user record with incremented value
    const { error: updateError } = await supabase
      .schema(schema)
      .from('users')
      .update({
        [type === 'chat' ? 'ai_unique_chats' : 'ai_unique_messages']: currentValue + 1,
        last_visit: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error(`Error incrementing ${type} count:`, updateError);
    }
  } catch (error) {
    console.error(`Failed to increment ${type} count:`, error);
    // Don't throw here - we don't want to break the user experience if metrics fail
  }
}

/**
 * Resets AI metrics for a user
 * @param email User's email address
 * @param schema Database schema ('wisco' or 'utah')
 */
export async function resetUserAIMetrics(
  email: string,
  schema: string
): Promise<void> {
  try {
    const { error } = await supabase
      .schema(schema)
      .from('users')
      .update({
        ai_unique_chats: 0,
        ai_unique_messages: 0
      })
      .eq('email', email);

    if (error) {
      console.error('Error resetting AI metrics:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to reset AI metrics:', error);
    throw error;
  }
} 