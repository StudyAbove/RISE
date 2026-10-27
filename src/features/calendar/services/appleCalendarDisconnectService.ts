import {
  deleteCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEventSource,
} from '../../../repositories/calendarEventsRepository';

import {
  deleteCalendarEventLink,
  getCalendarEventLinksByProvider,
} from '../../../repositories/calendarEventLinksRepository';

import {
  deleteCalendarConnection,
} from './calendarConnectionService';

/**
 * Permanently disconnects Apple Calendar from RISE.
 *
 * Apple-imported events that are backed only by Apple are removed from RISE.
 * Events that still belong to RISE or Google stay in RISE and only lose their
 * Apple provider relationship.
 *
 * This does not delete anything from the user's actual Apple Calendar.
 */
export async function disconnectAppleCalendarWithCleanup():
Promise<void> {
  /*
   * Load both provider-link sets up front.
   *
   * Previously, every Apple-origin event required its own Google-link
   * lookup. On permission loss that made cleanup noticeably slower
   * because those database requests ran one after another.
   */
  const [
    appleLinks,
    googleLinks,
  ] =
    await Promise.all([
      getCalendarEventLinksByProvider(
        'apple',
      ),

      getCalendarEventLinksByProvider(
        'google',
      ),
    ]);

  /*
   * A calendar event should normally have only one Apple link.
   * Deduplicate by event ID anyway so cleanup remains safe if an
   * unexpected duplicate ever exists.
   */
  const uniqueAppleLinks = [
    ...new Map(
      appleLinks.map(
        (link) => [
          link.calendarEventId,
          link,
        ],
      ),
    ).values(),
  ];

  const eventIds =
    uniqueAppleLinks.map(
      (link) =>
        link.calendarEventId,
    );

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

  const googleLinkedEventIds =
    new Set(
      googleLinks.map(
        (link) =>
          link.calendarEventId,
      ),
    );

  /*
   * Every event can be cleaned independently, so perform the
   * per-event database work concurrently instead of serially.
   */
  await Promise.all(
    uniqueAppleLinks.map(
      async (link) => {
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
          return;
        }

        if (
          event.source ===
          'apple'
        ) {
          /*
           * This event is represented by both Apple and Google.
           * Keep the RISE event because Google still backs it.
           */
          if (
            googleLinkedEventIds.has(
              event.id,
            )
          ) {
            await updateCalendarEventSource(
              event.id,
              'google',
            );

            await deleteCalendarEventLink(
              event.id,
              'apple',
            );

            return;
          }

          /*
           * This event came only from Apple.
           *
           * Deleting the RISE event automatically removes its
           * provider links and conflict records through cascades.
           */
          await deleteCalendarEvent(
            event.id,
          );

          return;
        }

        /*
         * RISE-created or Google-origin events stay in RISE.
         * Only the Apple synchronization relationship is removed.
         */
        await deleteCalendarEventLink(
          event.id,
          'apple',
        );
      },
    ),
  );

  /*
   * Only mark Apple disconnected after every event cleanup
   * operation succeeds.
   */
  await deleteCalendarConnection(
    'apple',
  );
}
