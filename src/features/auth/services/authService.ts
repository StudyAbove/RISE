import { supabase } from '../../../lib/supabase';

const EMAIL_REDIRECT_URL = 'rise://auth/callback';

export async function createAccountWithSchoolEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: EMAIL_REDIRECT_URL,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}