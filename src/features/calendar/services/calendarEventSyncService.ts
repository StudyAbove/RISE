import { DEV_SKIP_AUTH } from '../../../lib/devFlags';

import type {
  CalendarEvent,
  NewCalendarEvent,
} from '../../../models/CalendarEvent';

import type {
  ExternalCalendarProvider,
} from '../../../models/CalendarEventLink';

import {
  getCalendarEventLinks,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
} from '../../../repositories/calendarEventLinksRepository';

import {
  createCalendarEvent,
  updateCalendarEvent,
  type UpdateCalendarEventInput,
} from '../../../repositories/calendarEventsRepository';

import {
  createAppleCalendarEvent,
  updateAppleCalendarEvent,
} from './calendarService';

import { getConnectedCalendarProviders } from './connectedCalendars';

import {
  createGoogleCalendarEvent,
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
 * Saves an event the student made in RISE, then adds it to each connected
 * Google or Apple calendar (#123).
 *
 * Like editing, RISE comes first: if saving in RISE fails, this throws and
 * nothing is sent anywhere. After that, each calendar is tried on its own, and
 * a calendar that fails never undoes the RISE save or stops the other one.
 *
 * Each new external copy gets a link back to the RISE event. The link is what
 * lets later edits reach that copy, and what stops the next import from
 * bringing it back into RISE as a duplicate.
 *
 * Status: 'saved-only' when no calendar is connected, 'synced' / 'partial' /
 * 'failed' otherwise. 'failed' with no provider results means the connected
 * calendars couldn't be checked.
 */
export async function createCalendarEventWithSync(
  input: NewCalendarEvent,
): Promise<CalendarEventSyncResult> {
  const event = await createCalendarEvent(input);

  // With the dev login skip on, no one is signed in, so nothing is connected.
  if (DEV_SKIP_AUTH) {
    return { event, status: 'saved-only', providerResults: [] };
  }

  let providers: ExternalCalendarProvider[];

  try {
    providers = await getConnectedCalendarProviders();
  } catch (error) {
    console.log('Could not check connected calendars:', getSyncErrorMessage(error));
    return { event, status: 'failed', providerResults: [] };
  }

  if (providers.length === 0) {
    return { event, status: 'saved-only', providerResults: [] };
  }

  const details = {
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: event.location,
    description: event.description,
    reminderMinutes: event.reminderMinutes,
  };

  const providerResults: ProviderSyncResult[] = [];

  for (const provider of providers) {
    try {
      const created =
        provider === 'google'
          ? await createGoogleCalendarEvent(details)
          : await createAppleCalendarEvent(details);

      await saveCalendarEventLink({
        calendarEventId: event.id,
        userId: event.userId,
        provider,
        externalEventId: created.externalEventId,
        externalCalendarId: created.externalCalendarId,
        externalUpdatedAt: created.updatedAt,
      });

      providerResults.push({ provider, status: 'synced' });
    } catch (error) {
      const message = getSyncErrorMessage(error);
      console.log(`Could not add the event to ${provider} Calendar:`, message);
      providerResults.push({ provider, status: 'failed', error: message });
    }
  }

  const successfulCount = providerResults.filter((result) => result.status === 'synced').length;
  const status =
    successfulCount === providerResults.length ? 'synced' : successfulCount === 0 ? 'failed' : 'partial';

  return { event, status, providerResults };
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