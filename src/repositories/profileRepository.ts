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

/** Records that the signed-in student finished onboarding so it isn't shown again. */
export async function markOnboardingCompleted(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No signed-in user was found.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id);

  if (error) {
    throw error;
  }
}
