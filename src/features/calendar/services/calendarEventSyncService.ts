import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import type {
  ExternalCalendarProvider,
} from '../../../models/CalendarEventLink';

import {
  getCalendarEventLinks,
  markCalendarEventLinkSynced,
} from '../../../repositories/calendarEventLinksRepository';

import {
  updateCalendarEvent,
  type UpdateCalendarEventInput,
} from '../../../repositories/calendarEventsRepository';

import {
  updateAppleCalendarEvent,
} from './calendarService';

import {
  updateGoogleCalendarEvent,
} from './googleCalendarService';

export type CalendarSyncStatus =
  | 'synced'
  | 'saved-only'
  | 'partial'
  | 'failed';

export type ProviderSyncResult = {
  provider: ExternalCalendarProvider;
  status: 'synced' | 'failed';
  error?: string;
};

export type CalendarEventSyncResult = {
  event: CalendarEvent;
  status: CalendarSyncStatus;
  providerResults: ProviderSyncResult[];
};

function getSyncErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : 'UNKNOWN_SYNC_ERROR';
}

/**
 * Syncs one already-saved RISE event to an external calendar provider.
 */
async function syncEventToProvider(
  event: CalendarEvent,
  provider: ExternalCalendarProvider,
) {
  const links =
    await getCalendarEventLinks(
      event.id,
    );

  const link =
    links.find(
      (item) =>
        item.provider ===
        provider,
    );

  if (!link) {
    throw new Error(
      `${provider.toUpperCase()}_EVENT_LINK_MISSING`,
    );
  }

  let externalUpdatedAt:
    string | undefined;

  if (
    provider ===
    'apple'
  ) {
    const result =
      await updateAppleCalendarEvent(
        link.externalEventId,
        {
          title:
            event.title,

          startAt:
            event.startAt,

          endAt:
            event.endAt,

          location:
            event.location,

          description:
            event.description,
        },
      );

    externalUpdatedAt =
      result?.updatedAt;
  }

  if (
    provider ===
    'google'
  ) {
    if (
      !link.externalCalendarId
    ) {
      throw new Error(
        'GOOGLE_CALENDAR_ID_MISSING',
      );
    }

    const result =
      await updateGoogleCalendarEvent(
        link.externalEventId,
        link.externalCalendarId,
        {
          title:
            event.title,

          startAt:
            event.startAt,

          endAt:
            event.endAt,

          location:
            event.location,

          description:
            event.description,
        },
      );

    externalUpdatedAt =
      result?.updatedAt;
  }

  if (externalUpdatedAt) {
    await markCalendarEventLinkSynced(
      event.id,
      provider,
      externalUpdatedAt,
    );
  } else {
    await markCalendarEventLinkSynced(
      event.id,
      provider,
    );
  }
}

/**
 * Saves the student's changes in RISE first.
 *
 * After the RISE save succeeds, each linked Apple or Google
 * Calendar event is updated independently.
 *
 * A provider failure does not undo the RISE edit.
 */
export async function updateCalendarEventWithSync(
  eventId: string,
  updates: UpdateCalendarEventInput,
): Promise<CalendarEventSyncResult> {
  const updatedEvent =
    await updateCalendarEvent(
      eventId,
      updates,
    );

  const links =
    await getCalendarEventLinks(
      eventId,
    );

  if (
    links.length ===
    0
  ) {
    return {
      event:
        updatedEvent,

      status:
        'saved-only',

      providerResults:
        [],
    };
  }

  const providerResults:
    ProviderSyncResult[] =
      [];

  for (
    const link
    of links
  ) {
    try {
      let externalUpdatedAt:
        string | undefined;

      if (
        link.provider ===
        'apple'
      ) {
        const result =
          await updateAppleCalendarEvent(
            link.externalEventId,
            {
              title:
                updatedEvent.title,

              startAt:
                updatedEvent.startAt,

              endAt:
                updatedEvent.endAt,

              location:
                updatedEvent.location,

              description:
                updatedEvent.description,
            },
          );

        externalUpdatedAt =
          result?.updatedAt;
      }

      if (
        link.provider ===
        'google'
      ) {
        if (
          !link.externalCalendarId
        ) {
          throw new Error(
            'GOOGLE_CALENDAR_ID_MISSING',
          );
        }

        const result =
          await updateGoogleCalendarEvent(
            link.externalEventId,
            link.externalCalendarId,
            {
              title:
                updatedEvent.title,

              startAt:
                updatedEvent.startAt,

              endAt:
                updatedEvent.endAt,

              location:
                updatedEvent.location,

              description:
                updatedEvent.description,
            },
          );

        externalUpdatedAt =
          result?.updatedAt;
      }

      if (externalUpdatedAt) {
        await markCalendarEventLinkSynced(
          eventId,
          link.provider,
          externalUpdatedAt,
        );
      } else {
        await markCalendarEventLinkSynced(
          eventId,
          link.provider,
        );
      }

      providerResults.push({
        provider:
          link.provider,

        status:
          'synced',
      });
    } catch (error) {
      const message =
        getSyncErrorMessage(
          error,
        );

      console.log(
        `${link.provider} Calendar sync failed:`,
        message,
        error,
      );

      providerResults.push({
        provider:
          link.provider,

        status:
          'failed',

        error:
          message,
      });
    }
  }

  const successfulCount =
    providerResults.filter(
      (result) =>
        result.status ===
        'synced',
    ).length;

  if (
    successfulCount ===
    providerResults.length
  ) {
    return {
      event:
        updatedEvent,

      status:
        'synced',

      providerResults,
    };
  }

  if (
    successfulCount ===
    0
  ) {
    return {
      event:
        updatedEvent,

      status:
        'failed',

      providerResults,
    };
  }

  return {
    event:
      updatedEvent,

    status:
      'partial',

    providerResults,
  };
}

/**
 * Retries synchronization for one provider without saving
 * the RISE event again.
 *
 * This is used after a sync error when the student's RISE
 * changes were already saved successfully.
 */
export async function retryCalendarEventSync(
  event: CalendarEvent,
  provider: ExternalCalendarProvider,
): Promise<ProviderSyncResult> {
  try {
    await syncEventToProvider(
      event,
      provider,
    );

    return {
      provider,
      status:
        'synced',
    };
  } catch (error) {
    const message =
      getSyncErrorMessage(
        error,
      );

    console.log(
      `${provider} Calendar retry failed:`,
      message,
      error,
    );

    return {
      provider,
      status:
        'failed',

      error:
        message,
    };
  }
}