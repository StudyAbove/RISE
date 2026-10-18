import { getAppleCalendarAccess } from './calendarService';
import { getCalendarConnection, type CalendarProvider } from './calendarConnectionService';

/** Whether one calendar is connected, or why that couldn't be checked. */
export type CalendarProviderCheck =
  | { provider: CalendarProvider; status: 'connected' | 'not-connected' }
  | { provider: CalendarProvider; status: 'check-failed'; error: unknown };

// Apple counts only when it's connected with Full Access.
async function isAppleConnected() {
  const [appleConnection, appleAccess] = await Promise.all([
    getCalendarConnection('apple'),
    getAppleCalendarAccess(),
  ]);
  return Boolean(appleConnection?.connected) && appleAccess === 'full';
}

async function isGoogleConnected() {
  const googleConnection = await getCalendarConnection('google');
  return Boolean(googleConnection?.connected);
}

async function checkProvider(
  provider: CalendarProvider,
  isConnected: () => Promise<boolean>,
): Promise<CalendarProviderCheck> {
  try {
    return { provider, status: (await isConnected()) ? 'connected' : 'not-connected' };
  } catch (error) {
    return { provider, status: 'check-failed', error };
  }
}

/**
 * Checks Apple and Google separately, so a problem checking one never
 * hides the other. Used when adding new events (#123). Never throws.
 */
export async function checkCalendarProviders(): Promise<CalendarProviderCheck[]> {
  return Promise.all([
    checkProvider('apple', isAppleConnected),
    checkProvider('google', isGoogleConnected),
  ]);
}

/**
 * The external calendars RISE can sync with right now: Google when it's
 * connected, and Apple when it's connected with Full Access. Used by the
 * Calendar screen's sync, which treats a failed check as a sync error, so
 * this throws if either check fails, as it did before #123.
 */
export async function getConnectedCalendarProviders(): Promise<CalendarProvider[]> {
  const checks = await checkCalendarProviders();

  const failed = checks.find((check) => check.status === 'check-failed');
  if (failed && failed.status === 'check-failed') {
    throw failed.error;
  }

  return checks.filter((check) => check.status === 'connected').map((check) => check.provider);
}
