import { supabase } from '../lib/supabase';

import type {
  CalendarEventConflict,
  CalendarEventConflictResolution,
  CalendarEventConflictStatus,
  SaveCalendarEventConflictInput,
} from '../models/CalendarEventConflict';

import type {
  ExternalCalendarProvider,
} from '../models/CalendarEventLink';

interface CalendarEventConflictRow {
  id: string;
  calendar_event_id: string;
  calendar_event_link_id: string;
  user_id: string;
  provider: ExternalCalendarProvider;

  rise_title: string;
  rise_start_at: string;
  rise_end_at: string;
  rise_location: string | null;
  rise_description: string | null;
  rise_updated_at: string | null;

  provider_title: string;
  provider_start_at: string;
  provider_end_at: string;
  provider_location: string | null;
  provider_description: string | null;
  provider_updated_at: string | null;

  status: CalendarEventConflictStatus;
  resolution: CalendarEventConflictResolution | null;

  created_at: string;
  resolved_at: string | null;
}

const CALENDAR_EVENT_CONFLICT_COLUMNS = `
  id,
  calendar_event_id,
  calendar_event_link_id,
  user_id,
  provider,
  rise_title,
  rise_start_at,
  rise_end_at,
  rise_location,
  rise_description,
  rise_updated_at,
  provider_title,
  provider_start_at,
  provider_end_at,
  provider_location,
  provider_description,
  provider_updated_at,
  status,
  resolution,
  created_at,
  resolved_at
`;

const toCalendarEventConflict = (
  row: CalendarEventConflictRow,
): CalendarEventConflict => ({
  id: row.id,

  calendarEventId:
    row.calendar_event_id,

  calendarEventLinkId:
    row.calendar_event_link_id,

  userId:
    row.user_id,

  provider:
    row.provider,

  riseVersion: {
    title:
      row.rise_title,

    startAt:
      row.rise_start_at,

    endAt:
      row.rise_end_at,

    location:
      row.rise_location ??
      undefined,

    description:
      row.rise_description ??
      undefined,

    updatedAt:
      row.rise_updated_at ??
      undefined,
  },

  providerVersion: {
    title:
      row.provider_title,

    startAt:
      row.provider_start_at,

    endAt:
      row.provider_end_at,

    location:
      row.provider_location ??
      undefined,

    description:
      row.provider_description ??
      undefined,

    updatedAt:
      row.provider_updated_at ??
      undefined,
  },

  status:
    row.status,

  resolution:
    row.resolution ??
    undefined,

  createdAt:
    row.created_at,

  resolvedAt:
    row.resolved_at ??
    undefined,
});

/**
 * Saves the two versions involved in an unresolved calendar conflict.
 *
 * A provider link can have at most one unresolved conflict. If sync runs
 * again while that conflict still exists, its snapshots are refreshed
 * instead of creating duplicate conflict records.
 */
export async function saveCalendarEventConflict(
  input: SaveCalendarEventConflictInput,
): Promise<CalendarEventConflict> {
  const {
    data: existingData,
    error: existingError,
  } =
    await supabase
      .from('calendar_event_conflicts')
      .select(
        'id',
      )
      .eq(
        'calendar_event_link_id',
        input.calendarEventLinkId,
      )
      .eq(
        'status',
        'unresolved',
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const conflictData = {
    calendar_event_id:
      input.calendarEventId,

    calendar_event_link_id:
      input.calendarEventLinkId,

    user_id:
      input.userId,

    provider:
      input.provider,

    rise_title:
      input.riseVersion.title,

    rise_start_at:
      input.riseVersion.startAt,

    rise_end_at:
      input.riseVersion.endAt,

    rise_location:
      input.riseVersion.location?.trim() ||
      null,

    rise_description:
      input.riseVersion.description?.trim() ||
      null,

    rise_updated_at:
      input.riseVersion.updatedAt ??
      null,

    provider_title:
      input.providerVersion.title,

    provider_start_at:
      input.providerVersion.startAt,

    provider_end_at:
      input.providerVersion.endAt,

    provider_location:
      input.providerVersion.location?.trim() ||
      null,

    provider_description:
      input.providerVersion.description?.trim() ||
      null,

    provider_updated_at:
      input.providerVersion.updatedAt ??
      null,
  };

  if (existingData) {
    const {
      data,
      error,
    } =
      await supabase
        .from('calendar_event_conflicts')
        .update(
          conflictData,
        )
        .eq(
          'id',
          existingData.id,
        )
        .select(
          CALENDAR_EVENT_CONFLICT_COLUMNS,
        )
        .single();

    if (error) {
      throw error;
    }

    return toCalendarEventConflict(
      data as CalendarEventConflictRow,
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_conflicts')
      .insert({
        ...conflictData,

        status:
          'unresolved',

        resolution:
          null,

        resolved_at:
          null,
      })
      .select(
        CALENDAR_EVENT_CONFLICT_COLUMNS,
      )
      .single();

  if (error) {
    throw error;
  }

  return toCalendarEventConflict(
    data as CalendarEventConflictRow,
  );
}

/**
 * Returns every unresolved conflict belonging to the signed-in student.
 *
 * RLS limits this query to the current user's rows.
 */
export async function getUnresolvedCalendarEventConflicts():
Promise<CalendarEventConflict[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_conflicts')
      .select(
        CALENDAR_EVENT_CONFLICT_COLUMNS,
      )
      .eq(
        'status',
        'unresolved',
      )
      .order(
        'created_at',
        {
          ascending: true,
        },
      );

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventConflictRow[]
  ).map(
    toCalendarEventConflict,
  );
}

/**
 * Returns the unresolved conflict for a RISE event and provider.
 */
export async function getUnresolvedCalendarEventConflict(
  calendarEventId: string,
  provider: ExternalCalendarProvider,
): Promise<CalendarEventConflict | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_conflicts')
      .select(
        CALENDAR_EVENT_CONFLICT_COLUMNS,
      )
      .eq(
        'calendar_event_id',
        calendarEventId,
      )
      .eq(
        'provider',
        provider,
      )
      .eq(
        'status',
        'unresolved',
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toCalendarEventConflict(
    data as CalendarEventConflictRow,
  );
}

/**
 * Marks a conflict resolved only after the selected version has been
 * applied successfully.
 *
 * A failed provider/local update should leave the conflict unresolved
 * so the student can retry.
 */
export async function markCalendarEventConflictResolved(
  conflictId: string,
  resolution: CalendarEventConflictResolution,
): Promise<CalendarEventConflict> {
  const resolvedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_event_conflicts')
      .update({
        status:
          'resolved',

        resolution,

        resolved_at:
          resolvedAt,
      })
      .eq(
        'id',
        conflictId,
      )
      .eq(
        'status',
        'unresolved',
      )
      .select(
        CALENDAR_EVENT_CONFLICT_COLUMNS,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Calendar conflict could not be found or resolved.',
    );
  }

  return toCalendarEventConflict(
    data as CalendarEventConflictRow,
  );
}
