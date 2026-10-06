import { supabase } from '../../../lib/supabase';

const EMAIL_REDIRECT_URL = 'rise://auth/callback';

export async function checkSchoolEmailExists(email: string) {
  const { data, error } = await supabase.functions.invoke(
    'check-email-exists',
    {
      body: {
        email,
      },
    }
  );

  if (error) {
    throw error;
  }

  return Boolean(data?.exists);
}

export async function createAccountWithSchoolEmail(email: string) {
  const emailExists = await checkSchoolEmailExists(email);

  if (emailExists) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

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