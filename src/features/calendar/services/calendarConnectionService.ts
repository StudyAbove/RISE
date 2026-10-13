import { supabase } from '../../../lib/supabase';

export type CalendarProvider = 'apple' | 'google';

export type CalendarConnection = {
  provider: CalendarProvider;
  provider_email: string | null;
  connected: boolean;
};

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No signed-in user was found.');
  }

  return user.id;
}

export async function getCalendarConnection(
  provider: CalendarProvider,
): Promise<CalendarConnection | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('provider, provider_email, connected')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCalendarConnection(
  provider: CalendarProvider,
  providerEmail: string | null = null,
) {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('calendar_connections')
    .upsert(
      {
        user_id: userId,
        provider,
        provider_email: providerEmail,
        connected: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,provider',
      },
    );

  if (error) {
    throw error;
  }
}

export async function deleteCalendarConnection(
  provider: CalendarProvider,
) {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('calendar_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    throw error;
  }
}