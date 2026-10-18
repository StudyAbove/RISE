import { getAppleCalendarAccess } from './calendarService';
import { getCalendarConnection, type CalendarProvider } from './calendarConnectionService';

/**
 * The external calendars RISE can sync with right now: Google when it's
 * connected, and Apple when it's connected with Full Access. Shared by the
 * Calendar screen's sync and by adding new events (#123).
 */
export async function getConnectedCalendarProviders(): Promise<CalendarProvider[]> {
  const [appleConnection, googleConnection, appleAccess] = await Promise.all([
    getCalendarConnection('apple'),
    getCalendarConnection('google'),
    getAppleCalendarAccess(),
  ]);

  const providers: CalendarProvider[] = [];

  if (appleConnection?.connected && appleAccess === 'full') {
    providers.push('apple');
  }

  if (googleConnection?.connected) {
    providers.push('google');
  }

  return providers;
}
