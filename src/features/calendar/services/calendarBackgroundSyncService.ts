import {
  syncAppleCalendarEvents,
} from './appleCalendarImportService';

import {
  syncGoogleCalendarEvents,
} from './googleCalendarImportService';

export type CalendarBackgroundSyncStatus =
  | 'idle'
  | 'syncing'
  | 'error';

export type CalendarBackgroundSyncProvider =
  | 'apple'
  | 'google'
  | null;

export interface CalendarBackgroundSyncResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

export interface CalendarBackgroundSyncSnapshot {
  status: CalendarBackgroundSyncStatus;
  provider: CalendarBackgroundSyncProvider;
  lastSyncedAt: Date | null;
  error: string | null;
}

type CalendarBackgroundSyncListener =
  () => void;

let snapshot: CalendarBackgroundSyncSnapshot = {
  status: 'idle',
  provider: null,
  lastSyncedAt: null,
  error: null,
};

let activeSync:
  Promise<CalendarBackgroundSyncResult> | null =
  null;

let activeProvider:
  CalendarBackgroundSyncProvider =
  null;

const listeners =
  new Set<CalendarBackgroundSyncListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(
  updates:
    Partial<CalendarBackgroundSyncSnapshot>,
) {
  snapshot = {
    ...snapshot,
    ...updates,
  };

  notifyListeners();
}

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : 'UNKNOWN_SYNC_ERROR';
}

export function markCalendarBackgroundSyncFailed(
  error: string,
  provider: CalendarBackgroundSyncProvider =
    null,
) {
  updateSnapshot({
    status:
      'error',

    provider,

    error,
  });
}

export function getCalendarBackgroundSyncSnapshot() {
  return snapshot;
}

export function subscribeToCalendarBackgroundSync(
  listener:
    CalendarBackgroundSyncListener,
) {
  listeners.add(
    listener,
  );

  return () => {
    listeners.delete(
      listener,
    );
  };
}

export function isCalendarBackgroundSyncRunning() {
  return activeSync !== null;
}

export function getActiveCalendarBackgroundSyncProvider() {
  return activeProvider;
}

function startProviderSync(
  provider:
    Exclude<
      CalendarBackgroundSyncProvider,
      null
    >,
  sync:
    () => Promise<CalendarBackgroundSyncResult>,
): Promise<CalendarBackgroundSyncResult> {
  /*
   * If the same provider is already syncing, reuse that job.
   *
   * This lets Settings and Calendar observe the same import
   * without starting duplicate provider requests.
   */
  if (
    activeSync &&
    activeProvider === provider
  ) {
    return activeSync;
  }

  /*
   * Only one provider-wide import runs at a time.
   *
   * Starting Apple and Google imports simultaneously would make
   * the shared status ambiguous and could create unnecessary
   * database/API work.
   */
  if (activeSync) {
    return Promise.reject(
      new Error(
        'CALENDAR_SYNC_ALREADY_RUNNING',
      ),
    );
  }

  activeProvider =
    provider;

  updateSnapshot({
    status:
      'syncing',

    provider,

    error:
      null,
  });

  activeSync =
    (async () => {
      try {
        const result =
          await sync();

        if (
          result.failed >
          0
        ) {
          updateSnapshot({
            status:
              'error',

            provider,

            error:
              'Some calendar events could not be synced.',
          });

          return result;
        }

        updateSnapshot({
          status:
            'idle',

          provider,

          lastSyncedAt:
            new Date(),

          error:
            null,
        });

        return result;
      } catch (error) {
        updateSnapshot({
          status:
            'error',

          provider,

          error:
            getErrorMessage(
              error,
            ),
        });

        throw error;
      } finally {
        activeSync =
          null;

        activeProvider =
          null;
      }
    })();

  return activeSync;
}

/**
 * Starts one shared Apple Calendar synchronization.
 *
 * If Apple is already synchronizing, callers reuse the
 * currently running Apple job instead of starting another one.
 */
export function startAppleCalendarBackgroundSync():
  Promise<CalendarBackgroundSyncResult> {
  return startProviderSync(
    'apple',
    syncAppleCalendarEvents,
  );
}

/**
 * Starts one shared Google Calendar synchronization.
 *
 * If Google is already synchronizing, callers reuse the
 * currently running Google job instead of starting another one.
 */
export function startGoogleCalendarBackgroundSync():
  Promise<CalendarBackgroundSyncResult> {
  return startProviderSync(
    'google',
    syncGoogleCalendarEvents,
  );
}

/**
 * Used when another successful calendar operation already
 * established a newer sync time, such as a RISE event edit
 * that successfully synchronized to an external provider.
 */
export function markCalendarBackgroundSyncSuccessful(
  syncedAt:
    Date = new Date(),
  provider:
    CalendarBackgroundSyncProvider =
    null,
) {
  updateSnapshot({
    status:
      'idle',

    provider,

    lastSyncedAt:
      syncedAt,

    error:
      null,
  });
}