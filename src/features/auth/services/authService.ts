import { supabase } from '../../../lib/supabase';

const EMAIL_REDIRECT_URL = 'rise://auth/callback';

type SchoolEmailStatus = {
  exists: boolean;
  verified: boolean;
};

export async function checkSchoolEmailExists(
  email: string
): Promise<SchoolEmailStatus> {
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

  return {
    exists: Boolean(data?.exists),
    verified: Boolean(data?.verified),
  };
}

export async function createAccountWithSchoolEmail(email: string) {
  const emailStatus = await checkSchoolEmailExists(email);

  if (emailStatus.exists && emailStatus.verified) {
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