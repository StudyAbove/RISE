import {
  deleteCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEventSource,
} from '../../../repositories/calendarEventsRepository';

import {
  deleteCalendarEventLink,
  getCalendarEventLink,
  getCalendarEventLinksByProvider,
} from '../../../repositories/calendarEventLinksRepository';

import {
  deleteCalendarConnection,
} from './calendarConnectionService';

import {
  clearGoogleAccessToken,
} from './googleTokenService';

/**
 * Permanently disconnects Google Calendar from RISE.
 *
 * Google-imported events that are backed only by Google are removed from RISE.
 * Events that still belong to RISE or Apple stay in RISE and only lose their
 * Google provider relationship.
 */
export async function disconnectGoogleCalendarWithCleanup():
Promise<void> {
  const googleLinks =
    await getCalendarEventLinksByProvider(
      'google',
    );

  const eventIds = [
    ...new Set(
      googleLinks.map(
        (link) =>
          link.calendarEventId,
      ),
    ),
  ];

  const events =
    await getCalendarEventsByIdsForSync(
      eventIds,
    );

  const eventsById =
    new Map(
      events.map(
        (event) => [
          event.id,
          event,
        ],
      ),
    );

  for (const link of googleLinks) {
    const event =
      eventsById.get(
        link.calendarEventId,
      );

    /*
     * The foreign key normally prevents dangling links.
     * If the RISE event disappeared during cleanup, there is
     * nothing else to remove for this link.
     */
    if (!event) {
      continue;
    }

    if (
      event.source ===
      'google'
    ) {
      const appleLink =
        await getCalendarEventLink(
          event.id,
          'apple',
        );

      /*
       * This event is represented by both Apple and Google.
       * Keep the RISE event because Apple still backs it.
       */
      if (appleLink) {
        await updateCalendarEventSource(
          event.id,
          'apple',
        );

        await deleteCalendarEventLink(
          event.id,
          'google',
        );

        continue;
      }

      /*
       * This event came only from Google.
       *
       * Deleting the RISE event automatically removes its provider
       * links and conflict records through database cascades.
       */
      await deleteCalendarEvent(
        event.id,
      );

      continue;
    }

    /*
     * RISE-created or Apple-origin events stay in RISE.
     * Only the Google synchronization relationship is removed.
     */
    await deleteCalendarEventLink(
      event.id,
      'google',
    );
  }

  /*
   * Only mark Google disconnected after the RISE cleanup succeeds.
   */
  await deleteCalendarConnection(
    'google',
  );

  await clearGoogleAccessToken();
}
