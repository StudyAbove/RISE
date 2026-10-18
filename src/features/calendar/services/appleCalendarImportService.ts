import * as Calendar from 'expo-calendar/legacy';

import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import type {
  CalendarEventLink,
} from '../../../models/CalendarEventLink';

import {
  createImportedCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEvent,
  type CalendarEventSyncRecord,
} from '../../../repositories/calendarEventsRepository';

import {
  getAllDayCalendarEventLinksByProvider,
  getCalendarEventLinkByExternalEvent,
  getCalendarEventLinksByProvider,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
  updateCalendarEventLinkAllDayMetadata,
  updateCalendarEventLinkWritability,
} from '../../../repositories/calendarEventLinksRepository';

import {
  saveCalendarEventConflict,
} from '../../../repositories/calendarEventConflictsRepository';

import {
  getAcademicTermRange,
} from '../utils/academicTermRange';

import {
  getAppleCalendarAccess,
  updateAppleCalendarEvent,
} from './calendarService';

export interface AppleCalendarImportCandidate {
  externalEventId: string;
  externalCalendarId: string;
  calendarTitle: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  allDay: boolean;
  allDayStartDate?: string;
  allDayEndDate?: string;

  /**
   * EventKit calendar permission.
   * False means RISE may read the event but must not push changes back.
   */
  isWritable: boolean;

  updatedAt?: string;
}

export type ImportAppleCalendarEventResult =
  | {
      status: 'imported';
      event: CalendarEvent;
    }
  | {
      status: 'already-imported';
      calendarEventId: string;
    };

export interface AppleCalendarBulkSyncResult {
  imported: number;
  skipped: number;

  // Actual provider/database/persistence failures.
  failed: number;

  // Events intentionally preserved for user conflict resolution.
  conflicts: number;

  total: number;
}

function normalizeCrossProviderTitle(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      ' ',
    )
    .toLocaleLowerCase();
}

function findCrossProviderAllDayMatch(
  candidate: AppleCalendarImportCandidate,
  otherProviderLinks: CalendarEventLink[],
  riseEventsById: Map<
    string,
    CalendarEventSyncRecord
  >,
) {
  if (
    !candidate.allDay ||
    !candidate.allDayStartDate ||
    !candidate.allDayEndDate
  ) {
    return undefined;
  }

  const candidateTitle =
    normalizeCrossProviderTitle(
      candidate.title,
    );

  for (
    const link
    of otherProviderLinks
  ) {
    if (
      !link.isAllDay ||
      link.allDayStartDate !==
        candidate.allDayStartDate ||
      link.allDayEndDate !==
        candidate.allDayEndDate
    ) {
      continue;
    }

    const riseEvent =
      riseEventsById.get(
        link.calendarEventId,
      );

    if (
      riseEvent &&
      normalizeCrossProviderTitle(
        riseEvent.title,
      ) === candidateTitle
    ) {
      return riseEvent;
    }
  }

  return undefined;
}

function normalizeOptionalText(
  value?: string,
) {
  return value?.trim() ||
    undefined;
}

function sameInstant(
  first: string,
  second: string,
) {
  return (
    new Date(first).getTime() ===
    new Date(second).getTime()
  );
}

function toExclusiveAllDayEndDate(
  value:
    | string
    | Date
    | number,
) {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime(),
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  const alreadyExclusive =
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0;

  // EventKit may expose an all-day end in either form:
  //
  // 1. Midnight of the following day, which is already exclusive.
  // 2. The final second/millisecond of the included day.
  //
  // RISE stores an exclusive semantic end date so it matches
  // Google Calendar's all-day date representation.
  if (
    !alreadyExclusive
  ) {
    date.setDate(
      date.getDate() + 1,
    );
  }

  return toLocalCalendarDate(
    date,
  );
}

function toLocalCalendarDate(
  value:
    | string
    | Date
    | number,
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

function normalizeAppleModifiedDate(
  value:
    | string
    | Date
    | number
    | null
    | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return undefined;
  }

  return parsed.toISOString();
}

function appleCandidateMatchesRiseEvent(
  candidate: AppleCalendarImportCandidate,
  event: CalendarEvent,
) {
  return (
    candidate.title ===
      event.title &&
    sameInstant(
      candidate.startAt,
      event.startAt,
    ) &&
    sameInstant(
      candidate.endAt,
      event.endAt,
    ) &&
    normalizeOptionalText(
      candidate.location,
    ) ===
      normalizeOptionalText(
        event.location,
      ) &&
    normalizeOptionalText(
      candidate.description,
    ) ===
      normalizeOptionalText(
        event.description,
      )
  );
}

function riseChangedSinceLastSync(
  event: CalendarEventSyncRecord,
  link: CalendarEventLink,
) {
  if (
    !event.updatedAt ||
    !link.lastSyncedAt
  ) {
    return false;
  }

  return (
    new Date(
      event.updatedAt,
    ).getTime() >
    new Date(
      link.lastSyncedAt,
    ).getTime()
  );
}

/**
 * Returns whether Apple changed since the provider timestamp
 * stored during the previous successful synchronization.
 *
 * null means there is no reliable Apple baseline yet.
 */
function appleChangedSinceLastSync(
  candidate: AppleCalendarImportCandidate,
  link: CalendarEventLink,
): boolean | null {
  if (
    !candidate.updatedAt ||
    !link.externalUpdatedAt
  ) {
    return null;
  }

  const currentAppleUpdatedAt =
    new Date(
      candidate.updatedAt,
    ).getTime();

  const previousAppleUpdatedAt =
    new Date(
      link.externalUpdatedAt,
    ).getTime();

  if (
    Number.isNaN(
      currentAppleUpdatedAt,
    ) ||
    Number.isNaN(
      previousAppleUpdatedAt,
    )
  ) {
    return null;
  }

  return (
    currentAppleUpdatedAt >
    previousAppleUpdatedAt
  );
}

async function markAppleLinkSynced(
  calendarEventId: string,
  externalUpdatedAt?: string,
) {
  if (externalUpdatedAt) {
    await markCalendarEventLinkSynced(
      calendarEventId,
      'apple',
      externalUpdatedAt,
    );

    return;
  }

  await markCalendarEventLinkSynced(
    calendarEventId,
    'apple',
  );
}

/**
 * Stores the RISE and Apple versions exactly as they exist when
 * synchronization detects that neither copy can be safely overwritten.
 */
async function saveAppleConflict(
  riseEvent: CalendarEventSyncRecord,
  link: CalendarEventLink,
  candidate: AppleCalendarImportCandidate,
) {
  await saveCalendarEventConflict({
    calendarEventId:
      riseEvent.id,

    calendarEventLinkId:
      link.id,

    userId:
      link.userId,

    provider:
      'apple',

    riseVersion: {
      title:
        riseEvent.title,

      startAt:
        riseEvent.startAt,

      endAt:
        riseEvent.endAt,

      location:
        riseEvent.location,

      description:
        riseEvent.description,

      updatedAt:
        riseEvent.updatedAt,
    },

    providerVersion: {
      title:
        candidate.title,

      startAt:
        candidate.startAt,

      endAt:
        candidate.endAt,

      location:
        candidate.location,

      description:
        candidate.description,

      updatedAt:
        candidate.updatedAt,
    },
  });
}

/**
 * Reads existing events from calendars available through
 * Apple Calendar / iOS EventKit.
 *
 * Nothing is written to RISE by this function.
 */
export async function getAppleCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<AppleCalendarImportCandidate[]> {
  const access =
    await getAppleCalendarAccess();

  if (
    access !==
    'full'
  ) {
    throw new Error(
      'APPLE_CALENDAR_NOT_CONNECTED',
    );
  }

  const calendars =
    await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );

  const readableCalendars =
    calendars.filter(
      (calendar) =>
        Boolean(
          calendar.id,
        ),
    );

  if (
    readableCalendars.length ===
    0
  ) {
    return [];
  }

  const calendarIds =
    readableCalendars.map(
      (calendar) =>
        calendar.id,
    );

  const calendarTitles =
    new Map(
      readableCalendars.map(
        (calendar) => [
          calendar.id,
          calendar.title,
        ],
      ),
    );

  const calendarWritability =
    new Map(
      readableCalendars.map(
        (calendar) => [
          calendar.id,
          calendar.allowsModifications,
        ],
      ),
    );

  const events =
    await Calendar.getEventsAsync(
      calendarIds,
      rangeStart,
      rangeEnd,
    );

  return events
    .filter(
      (event) =>
        Boolean(
          event.id &&
            event.calendarId &&
            event.title,
        ),
    )
    .map(
      (
        event,
      ): AppleCalendarImportCandidate => {
        const updatedAt =
          normalizeAppleModifiedDate(
            event.lastModifiedDate,
          );

        return {
          externalEventId:
            event.id,

          externalCalendarId:
            event.calendarId,

          calendarTitle:
            calendarTitles.get(
              event.calendarId,
            ) ??
            'Apple Calendar',

          title:
            event.title,

          startAt:
            new Date(
              event.startDate,
            ).toISOString(),

          endAt:
            new Date(
              event.endDate,
            ).toISOString(),

          location:
            event.location?.trim() ||
            undefined,

          description:
            event.notes?.trim() ||
            undefined,

          allDay:
            event.allDay,

          allDayStartDate:
            event.allDay
              ? toLocalCalendarDate(
                  event.startDate,
                )
              : undefined,

          allDayEndDate:
            event.allDay
              ? toExclusiveAllDayEndDate(
                  event.endDate,
                )
              : undefined,

          isWritable:
            calendarWritability.get(
              event.calendarId,
            ) ??
            false,

          ...(updatedAt
            ? {
                updatedAt,
              }
            : {}),
        };
      },
    )
    .sort(
      (first, second) =>
        new Date(
          first.startAt,
        ).getTime() -
        new Date(
          second.startAt,
        ).getTime(),
    );
}

/**
 * Imports one Apple Calendar event into RISE.
 *
 * If the Apple event is already linked to a RISE event,
 * another RISE row is not created.
 */
export async function importAppleCalendarEvent(
  candidate: AppleCalendarImportCandidate,
): Promise<ImportAppleCalendarEventResult> {
  const existingLink =
    await getCalendarEventLinkByExternalEvent(
      'apple',
      candidate.externalEventId,
    );

  if (existingLink) {
    return {
      status:
        'already-imported',

      calendarEventId:
        existingLink.calendarEventId,
    };
  }

  const event =
    await createImportedCalendarEvent({
      title:
        candidate.title,

      startAt:
        candidate.startAt,

      endAt:
        candidate.endAt,

      source:
        'apple',

      location:
        candidate.location,

      description:
        candidate.description,
    });

  await saveCalendarEventLink({
    calendarEventId:
      event.id,

    userId:
      event.userId,

    provider:
      'apple',

    externalEventId:
      candidate.externalEventId,

    externalCalendarId:
      candidate.externalCalendarId,

    externalUpdatedAt:
      candidate.updatedAt,

    isWritable:
      candidate.isWritable,

    isAllDay:
      candidate.allDay,

    allDayStartDate:
      candidate.allDayStartDate,

    allDayEndDate:
      candidate.allDayEndDate,
  });

  return {
    status:
      'imported',

    event,
  };
}

/**
 * Synchronizes Apple Calendar with the active RISE academic window.
 *
 * New Apple events are imported into RISE.
 *
 * For linked events, RISE tracks both its own previous sync time
 * and Apple's lastModifiedDate.
 *
 * If only Apple changed, Apple is pulled into RISE.
 * If only RISE changed, RISE is pushed back to Apple.
 * If both changed, neither version is overwritten automatically.
 * Story #85 stores the conflicting versions for student review.
 */
export async function syncAppleCalendarEvents(
  date: Date = new Date(),
): Promise<AppleCalendarBulkSyncResult> {
  const {
    start,
    end,
  } =
    getAcademicTermRange(
      date,
    );

  const candidates =
    await getAppleCalendarEvents(
      start,
      end,
    );

  const existingLinks =
    await getCalendarEventLinksByProvider(
      'apple',
    );

  const crossProviderAllDayLinks =
    await getAllDayCalendarEventLinksByProvider(
      'google',
    );

  const linksByExternalId =
    new Map(
      existingLinks.map(
        (link) => [
          link.externalEventId,
          link,
        ],
      ),
    );

  const linkedRiseEventIds =
    Array.from(
      new Set(
        [
          ...existingLinks,
          ...crossProviderAllDayLinks,
        ].map(
          (link) =>
            link.calendarEventId,
        ),
      ),
    );

  const riseEvents =
    await getCalendarEventsByIdsForSync(
      linkedRiseEventIds,
    );

  const riseEventsById =
    new Map(
      riseEvents.map(
        (event) => [
          event.id,
          event,
        ],
      ),
    );

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let conflicts = 0;

  for (
    const candidate
    of candidates
  ) {
    const existingLink =
      linksByExternalId.get(
        candidate.externalEventId,
      );

    if (!existingLink) {
      try {
        const crossProviderMatch =
          findCrossProviderAllDayMatch(
            candidate,
            crossProviderAllDayLinks,
            riseEventsById,
          );

        if (crossProviderMatch) {
          await saveCalendarEventLink({
            calendarEventId:
              crossProviderMatch.id,

            userId:
              crossProviderMatch.userId,

            provider:
              'apple',

            externalEventId:
              candidate.externalEventId,

            externalCalendarId:
              candidate.externalCalendarId,

            externalUpdatedAt:
              candidate.updatedAt,

            isWritable:
              candidate.isWritable,

            isAllDay:
              true,

            allDayStartDate:
              candidate.allDayStartDate,

            allDayEndDate:
              candidate.allDayEndDate,
          });

          skipped += 1;
        } else {
          const result =
            await importAppleCalendarEvent(
              candidate,
            );

          if (
            result.status ===
            'imported'
          ) {
            imported += 1;
          } else {
            skipped += 1;
          }
        }
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar event import failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    const riseEvent =
      riseEventsById.get(
        existingLink.calendarEventId,
      );

    if (!riseEvent) {
      failed += 1;

      console.log(
        'Apple Calendar sync could not find linked RISE event:',
        existingLink.calendarEventId,
      );

      continue;
    }

    /*
     * Refresh the stored permission from EventKit before making
     * any write/conflict decision. This also corrects links that
     * existed before writability tracking was added.
     */
    try {
      await updateCalendarEventLinkWritability(
        riseEvent.id,
        'apple',
        candidate.isWritable,
      );
    } catch (error) {
      failed += 1;

      console.log(
        'Apple Calendar writability update failed:',
        candidate.externalEventId,
        error,
      );

      continue;
    }

    try {
      await updateCalendarEventLinkAllDayMetadata(
        riseEvent.id,
        'apple',
        {
          isAllDay:
            candidate.allDay,

          allDayStartDate:
            candidate.allDayStartDate,

          allDayEndDate:
            candidate.allDayEndDate,
        },
      );
    } catch (error) {
      failed += 1;

      console.log(
        'Apple Calendar all-day metadata update failed:',
        candidate.externalEventId,
        error,
      );

      continue;
    }

    /*
     * The copies already match.
     *
     * This is also how older links safely acquire their first
     * external_updated_at value.
     */
    if (
      appleCandidateMatchesRiseEvent(
        candidate,
        riseEvent,
      )
    ) {
      try {
        await markAppleLinkSynced(
          riseEvent.id,
          candidate.updatedAt,
        );

        skipped += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar link baseline update failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    /*
     * Read-only Apple calendars cannot accept RISE changes.
     *
     * If the shared fields differ, Apple is authoritative and
     * its version is pulled into RISE. RISE-only Type and
     * Reminder are preserved because they are omitted here.
     */
    if (!candidate.isWritable) {
      try {
        await updateCalendarEvent(
          riseEvent.id,
          {
            title:
              candidate.title,

            startAt:
              candidate.startAt,

            endAt:
              candidate.endAt,

            location:
              candidate.location,

            description:
              candidate.description,
          },
        );

        await markAppleLinkSynced(
          riseEvent.id,
          candidate.updatedAt,
        );

        skipped += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar read-only event refresh failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    const riseChanged =
      riseChangedSinceLastSync(
        riseEvent,
        existingLink,
      );

    const appleChanged =
      appleChangedSinceLastSync(
        candidate,
        existingLink,
      );

    /*
     * No Apple provider baseline exists yet.
     *
     * If RISE did not change since the previous sync, Apple can
     * safely refresh the RISE copy.
     *
     * If RISE changed too, preserve both copies because there is
     * not enough historical information to know which side changed.
     */
    if (
      appleChanged ===
      null
    ) {
      if (riseChanged) {
        try {
          await saveAppleConflict(
            riseEvent,
            existingLink,
            candidate,
          );

          conflicts += 1;
        } catch (error) {
          failed += 1;

          console.log(
            'Apple Calendar conflict could not be stored:',
            candidate.externalEventId,
            error,
          );
        }

        console.log(
          'Apple Calendar sync conflict cannot be classified without provider baseline:',
          candidate.externalEventId,
        );

        continue;
      }

      try {
        await updateCalendarEvent(
          riseEvent.id,
          {
            title:
              candidate.title,

            startAt:
              candidate.startAt,

            endAt:
              candidate.endAt,

            location:
              candidate.location,

            description:
              candidate.description,
          },
        );

        await markAppleLinkSynced(
          riseEvent.id,
          candidate.updatedAt,
        );

        skipped += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar linked event update failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    /*
     * Apple changed but RISE did not.
     *
     * Apple is the only changed copy, so pull it into RISE.
     */
    if (
      appleChanged &&
      !riseChanged
    ) {
      try {
        await updateCalendarEvent(
          riseEvent.id,
          {
            title:
              candidate.title,

            startAt:
              candidate.startAt,

            endAt:
              candidate.endAt,

            location:
              candidate.location,

            description:
              candidate.description,
          },
        );

        await markAppleLinkSynced(
          riseEvent.id,
          candidate.updatedAt,
        );

        skipped += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar linked event update failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    /*
     * RISE changed but Apple did not.
     *
     * This is the reconnect/offline-edit case. RISE can safely
     * push its newer version back to Apple automatically.
     */
    if (
      riseChanged &&
      !appleChanged
    ) {
      try {
        const updateResult =
          await updateAppleCalendarEvent(
            candidate.externalEventId,
            {
              title:
                riseEvent.title,

              startAt:
                riseEvent.startAt,

              endAt:
                riseEvent.endAt,

              location:
                riseEvent.location,

              description:
                riseEvent.description,
            },
          );

        await markAppleLinkSynced(
          riseEvent.id,
          updateResult.updatedAt ??
            candidate.updatedAt,
        );

        skipped += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar RISE-side reconnect push failed:',
          candidate.externalEventId,
          error,
        );
      }

      continue;
    }

    /*
     * Both copies changed since the previous successful sync.
     *
     * Preserve both versions so Story #85 can let the student
     * choose which version should win.
     */
    if (
      riseChanged &&
      appleChanged
    ) {
      try {
        await saveAppleConflict(
          riseEvent,
          existingLink,
          candidate,
        );

        conflicts += 1;
      } catch (error) {
        failed += 1;

        console.log(
          'Apple Calendar conflict could not be stored:',
          candidate.externalEventId,
          error,
        );
      }

      console.log(
        'Apple Calendar sync conflict detected:',
        candidate.externalEventId,
      );

      continue;
    }

    /*
     * The copies differ but neither timestamp reports a change.
     * Preserve both and let the student choose rather than
     * silently selecting either version.
     */
    try {
      await saveAppleConflict(
        riseEvent,
        existingLink,
        candidate,
      );

      conflicts += 1;
    } catch (error) {
      failed += 1;

      console.log(
        'Apple Calendar conflict could not be stored:',
        candidate.externalEventId,
        error,
      );
    }

    console.log(
      'Apple Calendar sync could not safely classify differing copies:',
      candidate.externalEventId,
    );
  }

  return {
    imported,
    skipped,
    failed,
    conflicts,
    total:
      candidates.length,
  };
}