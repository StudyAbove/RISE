import type {
  CalendarEventConflict,
  CalendarEventConflictResolution,
  CalendarEventConflictVersion,
} from '../../../models/CalendarEventConflict';

import type {
  CalendarEventLink,
  ExternalCalendarProvider,
} from '../../../models/CalendarEventLink';

import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLink,
  getCalendarEventLinks,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
} from '../../../repositories/calendarEventLinksRepository';

import {
  markCalendarEventConflictResolved,
} from '../../../repositories/calendarEventConflictsRepository';

import {
  createAppleCalendarEvent,
  deleteAppleCalendarEvent,
  updateAppleCalendarEvent,
} from './calendarService';

import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
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

async function requireConflictLink(
  conflict: CalendarEventConflict,
): Promise<CalendarEventLink> {
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

  return link;
}

/**
 * Removes a surviving provider copy.
 *
 * This is used when deletion wins the conflict. RISE itself is not
 * deleted until every surviving external copy has been removed.
 */
async function deleteProviderCopy(
  link: CalendarEventLink,
  startAt: string,
) {
  if (
    link.isWritable ===
    false
  ) {
    throw new Error(
      'CALENDAR_PROVIDER_READ_ONLY',
    );
  }

  if (
    link.provider ===
    'apple'
  ) {
    await deleteAppleCalendarEvent(
      link.externalEventId,
      startAt,
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

  await deleteGoogleCalendarEvent(
    link.externalEventId,
    link.externalCalendarId,
  );
}

/**
 * Recreates a provider copy that was deleted externally.
 *
 * saveCalendarEventLink upserts by the logical RISE event/provider
 * pair, so the old link is reused with the newly-created external ID
 * instead of creating a second link for the same provider.
 */
async function recreateDeletedProviderCopy(
  conflict: CalendarEventConflict,
  version: CalendarEventConflictVersion,
) {
  const link =
    await requireConflictLink(
      conflict,
    );

  if (
    link.isWritable ===
    false
  ) {
    throw new Error(
      'CALENDAR_PROVIDER_READ_ONLY',
    );
  }

  const details =
    toEventUpdate(
      version,
    );

  if (
    conflict.provider ===
    'apple'
  ) {
    const created =
      await createAppleCalendarEvent(
        details,
      );

    try {
      await saveCalendarEventLink({
        calendarEventId:
          conflict.calendarEventId,

        userId:
          conflict.userId,

        provider:
          'apple',

        externalEventId:
          created.externalEventId,

        externalCalendarId:
          created.externalCalendarId,

        externalUpdatedAt:
          created.updatedAt,

        isWritable:
          true,
      });
    } catch (error) {
      /*
       * Do not leave an unlinked Apple event behind if replacing the
       * tombstone link fails. Otherwise the next import could create
       * a duplicate RISE event.
       */
      try {
        await deleteAppleCalendarEvent(
          created.externalEventId,
          version.startAt,
        );
      } catch (cleanupError) {
        console.log(
          'Could not remove recreated Apple Calendar event after link failure:',
          cleanupError,
        );
      }

      throw error;
    }

    return;
  }

  const created =
    await createGoogleCalendarEvent(
      details,
    );

  try {
    await saveCalendarEventLink({
      calendarEventId:
        conflict.calendarEventId,

      userId:
        conflict.userId,

      provider:
        'google',

      externalEventId:
        created.externalEventId,

      externalCalendarId:
        created.externalCalendarId,

      externalUpdatedAt:
        created.updatedAt,

      isWritable:
        true,
    });
  } catch (error) {
    /*
     * Same protection for Google. A newly-created copy without a
     * RISE link would otherwise be imported again later.
     */
    try {
      await deleteGoogleCalendarEvent(
        created.externalEventId,
        created.externalCalendarId,
      );
    } catch (cleanupError) {
      console.log(
        'Could not remove recreated Google Calendar event after link failure:',
        cleanupError,
      );
    }

    throw error;
  }
}

/**
 * Makes one conflicting provider agree with a selected existing
 * version.
 *
 * If that provider's copy was deleted, it must be recreated instead
 * of trying to update the old external ID.
 */
async function syncProviderWithVersion(
  conflict: CalendarEventConflict,
  version: CalendarEventConflictVersion,
) {
  if (
    conflict.providerVersion.deleted
  ) {
    await recreateDeletedProviderCopy(
      conflict,
      version,
    );

    return;
  }

  const link =
    await requireConflictLink(
      conflict,
    );

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
    await requireConflictLink(
      conflict,
    );

  await markCalendarEventLinkSynced(
    conflict.calendarEventId,
    conflict.provider,
    conflict.providerVersion.updatedAt,
  );
}

/**
 * Applies a provider deletion as the winning state.
 *
 * The selected provider is already deleted. Every other still-linked
 * provider copy is removed first. Only after those external deletes
 * succeed is the central RISE event deleted.
 *
 * Deleting the RISE row cascades its link/conflict rows, so there is no
 * separate conflict row left to mark resolved afterward.
 */
async function resolveDeletionWinner(
  conflicts: CalendarEventConflict[],
  winningConflict: CalendarEventConflict,
) {
  const calendarEventId =
    winningConflict.calendarEventId;

  const links =
    await getCalendarEventLinks(
      calendarEventId,
    );

  const conflictsByProvider =
    new Map<
      ExternalCalendarProvider,
      CalendarEventConflict
    >(
      conflicts.map(
        (conflict) => [
          conflict.provider,
          conflict,
        ],
      ),
    );

  for (
    const link
    of links
  ) {
    /*
     * The winning provider's event is already gone.
     */
    if (
      link.provider ===
      winningConflict.provider
    ) {
      continue;
    }

    const providerConflict =
      conflictsByProvider.get(
        link.provider,
      );

    /*
     * Another provider can also already be deleted. Its delete helper
     * would treat "already gone" as success, but there is no reason to
     * call it again.
     */
    if (
      providerConflict
        ?.providerVersion
        .deleted
    ) {
      continue;
    }

    /*
     * If that provider has its own conflict, its provider snapshot is
     * the best known start time for deleting a repeating Apple
     * occurrence. Otherwise use the shared RISE snapshot.
     */
    const providerStartAt =
      providerConflict
        ?.providerVersion
        .startAt ??
      winningConflict
        .riseVersion
        .startAt;

    await deleteProviderCopy(
      link,
      providerStartAt,
    );
  }

  /*
   * This must be last. Its foreign-key cascades remove provider links
   * and unresolved conflict rows only after every required external
   * deletion succeeded.
   */
  await deleteCalendarEvent(
    calendarEventId,
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
    await syncProviderWithVersion(
      conflict,
      conflict.riseVersion,
    );

    return markCalendarEventConflictResolved(
      conflict.id,
      'rise',
    );
  }

  /*
   * Choosing a provider whose version is Deleted means deletion itself
   * wins. Remove any other linked provider copy, then RISE last.
   */
  if (
    conflict.providerVersion.deleted
  ) {
    await resolveDeletionWinner(
      [
        conflict,
      ],
      conflict,
    );

    /*
     * The database conflict row was removed by the calendar_events
     * cascade, so return the in-memory resolved representation.
     */
    return {
      ...conflict,

      status:
        'resolved',

      resolution:
        conflict.provider,

      resolvedAt:
        new Date().toISOString(),
    };
  }

  await requireConflictLink(
    conflict,
  );

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
 *     RISE wins. Existing provider copies are updated. Provider copies
 *     that were deleted are recreated and relinked.
 *
 * - Keep Apple/Google existing version:
 *     That provider version is copied into RISE. Other surviving
 *     provider copies are updated and deleted copies are recreated.
 *
 * - Keep Apple/Google deletion:
 *     Deletion wins globally. Other surviving provider copies are
 *     deleted first, then the RISE event is deleted last.
 *
 * Non-deletion conflict rows are not marked resolved until all required
 * event updates and provider baseline updates have succeeded.
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

  let winningProviderConflict:
    CalendarEventConflict | undefined;

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
    winningProviderConflict =
      providerConflicts.get(
        winner,
      );

    if (
      !winningProviderConflict
    ) {
      throw new Error(
        'CALENDAR_CONFLICT_WINNER_NOT_AVAILABLE',
      );
    }

    winningVersion =
      winningProviderConflict
        .providerVersion;
  }

  /*
   * A provider deletion is a real winning state, not an event version
   * to copy into RISE.
   */
  if (
    winningProviderConflict
      ?.providerVersion
      .deleted
  ) {
    await resolveDeletionWinner(
      conflicts,
      winningProviderConflict,
    );

    /*
     * The RISE deletion cascades the persisted conflict rows.
     * Returning [] signals successful completion without pretending
     * those database rows still exist.
     */
    return [];
  }

  /*
   * If Apple or Google wins with an existing event version, first make
   * RISE match the version the student selected.
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
   * Make every conflicting provider agree with the winner.
   *
   * The winning provider already contains the chosen existing version,
   * so it only needs its baseline advanced.
   *
   * A losing provider whose copy was deleted gets recreated here
   * rather than updated using its obsolete external event ID.
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

    await syncProviderWithVersion(
      conflict,
      winningVersion,
    );
  }

  /*
   * Only after every required update/recreation succeeded do we mark
   * any persisted conflict as resolved.
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
