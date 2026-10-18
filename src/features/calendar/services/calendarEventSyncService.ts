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
  deleteCalendarEvent,
  updateCalendarEvent,
  type UpdateCalendarEventInput,
} from '../../../repositories/calendarEventsRepository';

import {
  createAppleCalendarEvent,
  deleteAppleCalendarEvent,
  updateAppleCalendarEvent,
} from './calendarService';

import { checkCalendarProviders } from './connectedCalendars';

import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
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
 * Deletes a copy RISE just added to Google or Apple Calendar but couldn't
 * link. Without a link, the next import would bring it back into RISE as a
 * duplicate. If deleting fails too, the duplicate can't be prevented here,
 * so it's only logged.
 */
async function removeUnlinkedCopy(
  provider: ExternalCalendarProvider,
  created: { externalEventId: string; externalCalendarId: string },
  startAt: string,
) {
  try {
    if (provider === 'google') {
      await deleteGoogleCalendarEvent(created.externalEventId, created.externalCalendarId);
    } else {
      await deleteAppleCalendarEvent(created.externalEventId, startAt);
    }
  } catch (error) {
    console.log(
      `Could not remove the unlinked ${provider} Calendar event; it may be imported as a duplicate:`,
      getSyncErrorMessage(error),
    );
  }
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
 * bringing it back into RISE as a duplicate. So if the link can't be saved,
 * the copy is deleted again and that calendar counts as failed.
 *
 * Status: 'saved-only' when no calendar is connected, 'synced' / 'partial' /
 * 'failed' otherwise. A calendar whose connection couldn't be checked counts
 * as failed.
 */
export async function createCalendarEventWithSync(
  input: NewCalendarEvent,
): Promise<CalendarEventSyncResult> {
  const event = await createCalendarEvent(input);

  // With the dev login skip on, no one is signed in, so nothing is connected.
  if (DEV_SKIP_AUTH) {
    return { event, status: 'saved-only', providerResults: [] };
  }

  const providerResults: ProviderSyncResult[] = [];
  const providers: ExternalCalendarProvider[] = [];

  // Each calendar is checked on its own, so a problem checking one doesn't
  // stop the event from reaching the other.
  for (const check of await checkCalendarProviders()) {
    if (check.status === 'connected') {
      providers.push(check.provider);
    } else if (check.status === 'check-failed') {
      const message = getSyncErrorMessage(check.error);
      console.log(`Could not check whether ${check.provider} Calendar is connected:`, message);
      providerResults.push({ provider: check.provider, status: 'failed', error: message });
    }
  }

  if (providers.length === 0 && providerResults.length === 0) {
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

  for (const provider of providers) {
    let created: { externalEventId: string; externalCalendarId: string; updatedAt?: string };

    try {
      created =
        provider === 'google'
          ? await createGoogleCalendarEvent(details)
          : await createAppleCalendarEvent(details);
    } catch (error) {
      const message = getSyncErrorMessage(error);
      console.log(`Could not add the event to ${provider} Calendar:`, message);
      providerResults.push({ provider, status: 'failed', error: message });
      continue;
    }

    try {
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
      console.log(`Could not link the new ${provider} Calendar event:`, message);
      await removeUnlinkedCopy(provider, created, event.startAt);
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

/**
 * Thrown when an event can't be deleted. provider is set when the
 * Apple or Google copy is what failed, so the screen can say which
 * calendar to check.
 */
export class CalendarEventDeleteError extends Error {
  provider?: ExternalCalendarProvider;

  constructor(
    message: string,
    provider?: ExternalCalendarProvider,
  ) {
    super(message);
    this.name =
      'CalendarEventDeleteError';
    this.provider =
      provider;
  }
}

/**
 * Deletes an event everywhere it lives (#80).
 *
 * Linked Apple and Google copies are deleted first. If any of them
 * can't be deleted, the RISE event is kept, so it doesn't vanish now
 * and get imported again on the next sync. Trying again is safe:
 * copies that are already gone count as deleted.
 *
 * The RISE event is deleted last; its links are deleted with it.
 */
export async function deleteCalendarEventWithSync(
  event: CalendarEvent,
): Promise<void> {
  // While the login skip is on there are no saved links to look up.
  const links =
    DEV_SKIP_AUTH
      ? []
      : await getCalendarEventLinks(
          event.id,
        );

  for (
    const link
    of links
  ) {
    try {
      if (
        link.provider ===
        'apple'
      ) {
        await deleteAppleCalendarEvent(
          link.externalEventId,
          event.startAt,
        );
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

        await deleteGoogleCalendarEvent(
          link.externalEventId,
          link.externalCalendarId,
        );
      }
    } catch (error) {
      const message =
        getSyncErrorMessage(
          error,
        );

      console.log(
        `${link.provider} Calendar delete failed:`,
        message,
        error,
      );

      throw new CalendarEventDeleteError(
        message,
        link.provider,
      );
    }
  }

  try {
    await deleteCalendarEvent(
      event.id,
    );
  } catch (error) {
    console.log(
      'RISE event delete failed:',
      error,
    );

    throw new CalendarEventDeleteError(
      getSyncErrorMessage(
        error,
      ),
    );
  }
}
