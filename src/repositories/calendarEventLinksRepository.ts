import { supabase } from '../lib/supabase';

import type {
  CalendarEventLink,
  ExternalCalendarProvider,
} from '../models/CalendarEventLink';

interface CalendarEventLinkRow {
  id: string;
  calendar_event_id: string;
  user_id: string;
  provider: ExternalCalendarProvider;
  external_event_id: string;
  external_calendar_id: string | null;
  last_synced_at: string | null;
  external_updated_at: string | null;
}

const CALENDAR_EVENT_LINK_COLUMNS =
  'id, calendar_event_id, user_id, provider, external_event_id, external_calendar_id, last_synced_at, external_updated_at';

const toCalendarEventLink = (
  row: CalendarEventLinkRow,
): CalendarEventLink => ({
  id: row.id,

  calendarEventId:
    row.calendar_event_id,

  userId:
    row.user_id,

  provider:
    row.provider,

  externalEventId:
    row.external_event_id,

  externalCalendarId:
    row.external_calendar_id ??
    undefined,

  lastSyncedAt:
    row.last_synced_at ??
    undefined,

  externalUpdatedAt:
    row.external_updated_at ??
    undefined,
});

export async function getCalendarEventLinks(
  calendarEventId: string,
): Promise<CalendarEventLink[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .select(
        CALENDAR_EVENT_LINK_COLUMNS,
      )
      .eq(
        'calendar_event_id',
        calendarEventId,
      );

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventLinkRow[]
  ).map(
    toCalendarEventLink,
  );
}

export async function getCalendarEventLink(
  calendarEventId: string,
  provider: ExternalCalendarProvider,
): Promise<CalendarEventLink | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .select(
        CALENDAR_EVENT_LINK_COLUMNS,
      )
      .eq(
        'calendar_event_id',
        calendarEventId,
      )
      .eq(
        'provider',
        provider,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toCalendarEventLink(
    data as CalendarEventLinkRow,
  );
}

/**
 * Loads all links for one provider.
 *
 * RLS limits the result to links belonging to the signed-in student.
 */
export async function getCalendarEventLinksByProvider(
  provider: ExternalCalendarProvider,
): Promise<CalendarEventLink[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .select(
        CALENDAR_EVENT_LINK_COLUMNS,
      )
      .eq(
        'provider',
        provider,
      );

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventLinkRow[]
  ).map(
    toCalendarEventLink,
  );
}

/**
 * Returns the latest successful sync time recorded for a provider.
 *
 * This lets screens restore sync status even when the successful
 * sync happened somewhere else, such as the Settings connection flow.
 */
export async function getLatestCalendarEventLinkSyncTime(
  provider: ExternalCalendarProvider,
): Promise<string | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .select(
        'last_synced_at',
      )
      .eq(
        'provider',
        provider,
      )
      .not(
        'last_synced_at',
        'is',
        null,
      )
      .order(
        'last_synced_at',
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !data ||
    !data.last_synced_at
  ) {
    return null;
  }

  return data.last_synced_at;
}

/**
 * Finds whether an external Apple or Google event has already
 * been linked to a RISE calendar event.
 *
 * This prevents the same external event from being imported
 * into RISE more than once.
 */
export async function getCalendarEventLinkByExternalEvent(
  provider: ExternalCalendarProvider,
  externalEventId: string,
): Promise<CalendarEventLink | null> {
  if (!externalEventId) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .select(
        CALENDAR_EVENT_LINK_COLUMNS,
      )
      .eq(
        'provider',
        provider,
      )
      .eq(
        'external_event_id',
        externalEventId,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toCalendarEventLink(
    data as CalendarEventLinkRow,
  );
}

export async function saveCalendarEventLink({
  calendarEventId,
  userId,
  provider,
  externalEventId,
  externalCalendarId,
  externalUpdatedAt,
}: {
  calendarEventId: string;
  userId: string;
  provider: ExternalCalendarProvider;
  externalEventId: string;
  externalCalendarId?: string;
  externalUpdatedAt?: string;
}) {
  const now =
    new Date().toISOString();

  const linkData: {
    calendar_event_id: string;
    user_id: string;
    provider: ExternalCalendarProvider;
    external_event_id: string;
    external_calendar_id: string | null;
    last_synced_at: string;
    updated_at: string;
    external_updated_at?: string;
  } = {
    calendar_event_id:
      calendarEventId,

    user_id:
      userId,

    provider,

    external_event_id:
      externalEventId,

    external_calendar_id:
      externalCalendarId ??
      null,

    last_synced_at:
      now,

    updated_at:
      now,
  };

  if (externalUpdatedAt) {
    linkData.external_updated_at =
      externalUpdatedAt;
  }

  const {
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .upsert(
        linkData,
        {
          onConflict:
            'calendar_event_id,provider',
        },
      );

  if (error) {
    throw error;
  }
}

/**
 * Marks one provider link as successfully synchronized.
 *
 * When the provider supplies its own modification timestamp,
 * that value is stored so a later sync can determine whether
 * the external copy changed after this synchronization.
 */
export async function markCalendarEventLinkSynced(
  calendarEventId: string,
  provider: ExternalCalendarProvider,
  externalUpdatedAt?: string,
) {
  const now =
    new Date().toISOString();

  const syncData: {
    last_synced_at: string;
    updated_at: string;
    external_updated_at?: string;
  } = {
    last_synced_at:
      now,

    updated_at:
      now,
  };

  if (externalUpdatedAt) {
    syncData.external_updated_at =
      externalUpdatedAt;
  }

  const {
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .update(
        syncData,
      )
      .eq(
        'calendar_event_id',
        calendarEventId,
      )
      .eq(
        'provider',
        provider,
      );

  if (error) {
    throw error;
  }
}

/**
 * Marks several provider links as successfully synchronized in one query.
 *
 * This remains useful when only the RISE sync time needs updating.
 * Provider-specific modification timestamps are updated individually
 * through markCalendarEventLinkSynced because each event can have a
 * different provider timestamp.
 */
export async function markCalendarEventLinksSynced(
  calendarEventIds: string[],
  provider: ExternalCalendarProvider,
) {
  if (
    calendarEventIds.length ===
    0
  ) {
    return;
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } =
    await supabase
      .from('calendar_event_links')
      .update({
        last_synced_at:
          now,

        updated_at:
          now,
      })
      .eq(
        'provider',
        provider,
      )
      .in(
        'calendar_event_id',
        calendarEventIds,
      );

  if (error) {
    throw error;
  }
}