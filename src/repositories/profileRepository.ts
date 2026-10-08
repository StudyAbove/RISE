import { supabase } from '../lib/supabase';

/**
 * Display name from the signed-in student's profile, or null when nobody is
 * signed in or the name hasn't been set yet.
 */
export async function fetchCurrentDisplayName(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.display_name ?? null;
}
