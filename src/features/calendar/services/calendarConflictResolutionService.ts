import type {
  CalendarEventConflict,
  CalendarEventConflictResolution,
  CalendarEventConflictVersion,
} from '../../../models/CalendarEventConflict';

import {
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLink,
  markCalendarEventLinkSynced,
} from '../../../repositories/calendarEventLinksRepository';

import {
  markCalendarEventConflictResolved,
} from '../../../repositories/calendarEventConflictsRepository';

import {
  updateAppleCalendarEvent,
} from './calendarService';

import {
  updateGoogleCalendarEvent,
} from './googleCalendarService';

export type CalendarConflictWinner =
  | 'rise'
  | 'apple'
  | 'google';

function toEventUpdate(
  version: CalendarEventConflictVersion,
) {
  return {
    title:
      version.title,

    startAt:
      version.startAt,

    endAt:
      version.endAt,

    location:
      version.location,

    description:
      version.description,
  };
}

function versionsMatch(
  first: CalendarEventConflictVersion,
  second: CalendarEventConflictVersion,
) {
  return (
    first.title ===
      second.title &&
    first.startAt ===
      second.startAt &&
    first.endAt ===
      second.endAt &&
    first.location ===
      second.location &&
    first.description ===
      second.description
  );
}

async function updateProviderWithVersion(
  conflict: CalendarEventConflict,
  version: CalendarEventConflictVersion,
) {
  const link =
    await getCalendarEventLink(
      conflict.calendarEventId,
      conflict.provider,
    );

  if (
    !link ||
    link.id !==
      conflict.calendarEventLinkId
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_LINK_NOT_FOUND',
    );
  }

  /*
   * Never attempt to push a conflict winner into a provider
   * calendar that does not permit modifications.
   */
  if (
    link.isWritable ===
    false
  ) {
    throw new Error(
      'CALENDAR_PROVIDER_READ_ONLY',
    );
  }

  if (
    conflict.provider ===
    'apple'
  ) {
    const result =
      await updateAppleCalendarEvent(
        link.externalEventId,
        toEventUpdate(
          version,
        ),
      );

    await markCalendarEventLinkSynced(
      conflict.calendarEventId,
      'apple',
      result.updatedAt,
    );

    return;
  }

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
      toEventUpdate(
        version,
      ),
    );

  await markCalendarEventLinkSynced(
    conflict.calendarEventId,
    'google',
    result.updatedAt,
  );
}

async function markWinningProviderBaseline(
  conflict: CalendarEventConflict,
) {
  const link =
    await getCalendarEventLink(
      conflict.calendarEventId,
      conflict.provider,
    );

  if (
    !link ||
    link.id !==
      conflict.calendarEventLinkId
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_LINK_NOT_FOUND',
    );
  }

  await markCalendarEventLinkSynced(
    conflict.calendarEventId,
    conflict.provider,
    conflict.providerVersion.updatedAt,
  );
}

/**
 * Resolves one provider conflict.
 *
 * This remains useful when an event has only one unresolved
 * provider conflict.
 */
export async function resolveCalendarEventConflict(
  conflict: CalendarEventConflict,
  resolution: CalendarEventConflictResolution,
): Promise<CalendarEventConflict> {
  if (
    conflict.status !==
    'unresolved'
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_ALREADY_RESOLVED',
    );
  }

  if (
    resolution !==
      'rise' &&
    resolution !==
      conflict.provider
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_WINNER_NOT_AVAILABLE',
    );
  }

  if (
    resolution ===
    'rise'
  ) {
    await updateProviderWithVersion(
      conflict,
      conflict.riseVersion,
    );

    return markCalendarEventConflictResolved(
      conflict.id,
      'rise',
    );
  }

  const link =
    await getCalendarEventLink(
      conflict.calendarEventId,
      conflict.provider,
    );

  if (
    !link ||
    link.id !==
      conflict.calendarEventLinkId
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_LINK_NOT_FOUND',
    );
  }

  await updateCalendarEvent(
    conflict.calendarEventId,
    toEventUpdate(
      conflict.providerVersion,
    ),
  );

  await markCalendarEventLinkSynced(
    conflict.calendarEventId,
    conflict.provider,
    conflict.providerVersion.updatedAt,
  );

  return markCalendarEventConflictResolved(
    conflict.id,
    conflict.provider,
  );
}

/**
 * Resolves all unresolved provider conflicts for one logical RISE
 * event using a single winning version.
 *
 * Examples:
 *
 * - Keep RISE:
 *     RISE wins, then its version is pushed to Apple and Google.
 *
 * - Keep Apple:
 *     Apple's version is copied into RISE and pushed to Google.
 *
 * - Keep Google:
 *     Google's version is copied into RISE and pushed to Apple.
 *
 * Conflict rows are not marked resolved until all required event
 * updates and provider baseline updates have succeeded.
 */
export async function resolveCalendarEventConflictGroup(
  conflicts: CalendarEventConflict[],
  winner: CalendarConflictWinner,
): Promise<CalendarEventConflict[]> {
  if (
    conflicts.length ===
    0
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_GROUP_EMPTY',
    );
  }

  if (
    conflicts.some(
      (conflict) =>
        conflict.status !==
        'unresolved',
    )
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_ALREADY_RESOLVED',
    );
  }

  const calendarEventId =
    conflicts[0].calendarEventId;

  if (
    conflicts.some(
      (conflict) =>
        conflict.calendarEventId !==
        calendarEventId,
    )
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_GROUP_MISMATCH',
    );
  }

  const providerConflicts =
    new Map(
      conflicts.map(
        (conflict) => [
          conflict.provider,
          conflict,
        ],
      ),
    );

  if (
    providerConflicts.size !==
    conflicts.length
  ) {
    throw new Error(
      'CALENDAR_CONFLICT_DUPLICATE_PROVIDER',
    );
  }

  let winningVersion:
    CalendarEventConflictVersion;

  if (
    winner ===
    'rise'
  ) {
    winningVersion =
      conflicts[0].riseVersion;

    /*
     * Both provider conflicts should describe the same RISE
     * version. If they do not, a newer RISE edit happened while
     * conflicts were being collected. Refuse to guess which RISE
     * snapshot the student meant to keep.
     */
    if (
      conflicts.some(
        (conflict) =>
          !versionsMatch(
            winningVersion,
            conflict.riseVersion,
          ),
      )
    ) {
      throw new Error(
        'CALENDAR_CONFLICT_RISE_VERSIONS_DIFFER',
      );
    }
  } else {
    const winnerConflict =
      providerConflicts.get(
        winner,
      );

    if (!winnerConflict) {
      throw new Error(
        'CALENDAR_CONFLICT_WINNER_NOT_AVAILABLE',
      );
    }

    winningVersion =
      winnerConflict.providerVersion;
  }

  /*
   * If Apple or Google wins, first make RISE match the version
   * the student selected.
   */
  if (
    winner !==
    'rise'
  ) {
    await updateCalendarEvent(
      calendarEventId,
      toEventUpdate(
        winningVersion,
      ),
    );
  }

  /*
   * Now make every conflicting provider agree with the winner.
   *
   * The winning provider already contains the chosen version, so
   * it only needs its baseline advanced.
   */
  for (
    const conflict
    of conflicts
  ) {
    if (
      conflict.provider ===
      winner
    ) {
      await markWinningProviderBaseline(
        conflict,
      );

      continue;
    }

    await updateProviderWithVersion(
      conflict,
      winningVersion,
    );
  }

  /*
   * Only after every required update succeeded do we mark any
   * conflict as resolved.
   */
  const resolved:
    CalendarEventConflict[] =
    [];

  for (
    const conflict
    of conflicts
  ) {
    resolved.push(
      await markCalendarEventConflictResolved(
        conflict.id,
        winner,
      ),
    );
  }

  return resolved;
}