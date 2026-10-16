import {
  getActiveCalendarBackgroundSyncProvider,
  getCalendarBackgroundSyncSnapshot,
  isCalendarBackgroundSyncRunning,
  startAppleCalendarBackgroundSync,
  startGoogleCalendarBackgroundSync,
} from '../services/calendarBackgroundSyncService';

const mockSyncAppleCalendarEvents =
  jest.fn();

const mockSyncGoogleCalendarEvents =
  jest.fn();

jest.mock(
  '../services/appleCalendarImportService',
  () => ({
    syncAppleCalendarEvents:
      (...args: unknown[]) =>
        mockSyncAppleCalendarEvents(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/googleCalendarImportService',
  () => ({
    syncGoogleCalendarEvents:
      (...args: unknown[]) =>
        mockSyncGoogleCalendarEvents(
          ...args,
        ),
  }),
);

describe(
  'calendarBackgroundSyncService',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(
      'reports Apple as the active provider while an Apple sync is running',
      async () => {
        let resolveSync:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncAppleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveSync =
                  resolve;
              },
            ),
        );

        const syncPromise =
          startAppleCalendarBackgroundSync();

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          true,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          'apple',
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'syncing',

            provider:
              'apple',

            error:
              null,
          }),
        );

        resolveSync({
          imported:
            5,

          skipped:
            0,

          failed:
            0,

          total:
            5,
        });

        await syncPromise;

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          false,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          null,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'idle',

            provider:
              'apple',

            error:
              null,
          }),
        );

        expect(
          getCalendarBackgroundSyncSnapshot()
            .lastSyncedAt,
        ).toBeInstanceOf(
          Date,
        );
      },
    );

    it(
      'reports Google as the active provider while a Google sync is running',
      async () => {
        let resolveSync:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncGoogleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveSync =
                  resolve;
              },
            ),
        );

        const syncPromise =
          startGoogleCalendarBackgroundSync();

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          true,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          'google',
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'syncing',

            provider:
              'google',

            error:
              null,
          }),
        );

        resolveSync({
          imported:
            4,

          skipped:
            2,

          failed:
            0,

          total:
            6,
        });

        await syncPromise;

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          false,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          null,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'idle',

            provider:
              'google',

            error:
              null,
          }),
        );
      },
    );

    it(
      'reuses the same running Apple sync instead of starting another one',
      async () => {
        let resolveSync:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncAppleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveSync =
                  resolve;
              },
            ),
        );

        const firstPromise =
          startAppleCalendarBackgroundSync();

        const secondPromise =
          startAppleCalendarBackgroundSync();

        expect(
          mockSyncAppleCalendarEvents,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          firstPromise,
        ).toBe(
          secondPromise,
        );

        resolveSync({
          imported:
            10,

          skipped:
            2,

          failed:
            0,

          total:
            12,
        });

        await firstPromise;
      },
    );

    it(
      'reuses the same running Google sync instead of starting another one',
      async () => {
        let resolveSync:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncGoogleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveSync =
                  resolve;
              },
            ),
        );

        const firstPromise =
          startGoogleCalendarBackgroundSync();

        const secondPromise =
          startGoogleCalendarBackgroundSync();

        expect(
          mockSyncGoogleCalendarEvents,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          firstPromise,
        ).toBe(
          secondPromise,
        );

        resolveSync({
          imported:
            7,

          skipped:
            1,

          failed:
            0,

          total:
            8,
        });

        await firstPromise;
      },
    );

    it(
      'does not start Google while Apple is already syncing',
      async () => {
        let resolveApple:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncAppleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveApple =
                  resolve;
              },
            ),
        );

        const applePromise =
          startAppleCalendarBackgroundSync();

        await expect(
          startGoogleCalendarBackgroundSync(),
        ).rejects.toThrow(
          'CALENDAR_SYNC_ALREADY_RUNNING',
        );

        expect(
          mockSyncGoogleCalendarEvents,
        ).not.toHaveBeenCalled();

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          'apple',
        );

        resolveApple({
          imported:
            1,

          skipped:
            0,

          failed:
            0,

          total:
            1,
        });

        await applePromise;
      },
    );

    it(
      'does not start Apple while Google is already syncing',
      async () => {
        let resolveGoogle:
          (value: {
            imported: number;
            skipped: number;
            failed: number;
            total: number;
          }) => void =
          () => {};

        mockSyncGoogleCalendarEvents.mockImplementation(
          () =>
            new Promise(
              (resolve) => {
                resolveGoogle =
                  resolve;
              },
            ),
        );

        const googlePromise =
          startGoogleCalendarBackgroundSync();

        await expect(
          startAppleCalendarBackgroundSync(),
        ).rejects.toThrow(
          'CALENDAR_SYNC_ALREADY_RUNNING',
        );

        expect(
          mockSyncAppleCalendarEvents,
        ).not.toHaveBeenCalled();

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          'google',
        );

        resolveGoogle({
          imported:
            1,

          skipped:
            0,

          failed:
            0,

          total:
            1,
        });

        await googlePromise;
      },
    );

    it(
      'marks the shared state as error when some Apple events fail',
      async () => {
        mockSyncAppleCalendarEvents.mockResolvedValue(
          {
            imported:
              8,

            skipped:
              1,

            failed:
              2,

            total:
              11,
          },
        );

        const result =
          await startAppleCalendarBackgroundSync();

        expect(
          result.failed,
        ).toBe(
          2,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'error',

            provider:
              'apple',

            error:
              'Some calendar events could not be synced.',
          }),
        );
      },
    );

    it(
      'marks the shared state as error when some Google events fail',
      async () => {
        mockSyncGoogleCalendarEvents.mockResolvedValue(
          {
            imported:
              3,

            skipped:
              1,

            failed:
              1,

            total:
              5,
          },
        );

        const result =
          await startGoogleCalendarBackgroundSync();

        expect(
          result.failed,
        ).toBe(
          1,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'error',

            provider:
              'google',

            error:
              'Some calendar events could not be synced.',
          }),
        );
      },
    );

    it(
      'marks the shared state as error when the Apple sync throws',
      async () => {
        mockSyncAppleCalendarEvents.mockRejectedValue(
          new Error(
            'Apple sync failed',
          ),
        );

        await expect(
          startAppleCalendarBackgroundSync(),
        ).rejects.toThrow(
          'Apple sync failed',
        );

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          false,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          null,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'error',

            provider:
              'apple',

            error:
              'Apple sync failed',
          }),
        );
      },
    );

    it(
      'marks the shared state as error when the Google sync throws',
      async () => {
        mockSyncGoogleCalendarEvents.mockRejectedValue(
          new Error(
            'Google sync failed',
          ),
        );

        await expect(
          startGoogleCalendarBackgroundSync(),
        ).rejects.toThrow(
          'Google sync failed',
        );

        expect(
          isCalendarBackgroundSyncRunning(),
        ).toBe(
          false,
        );

        expect(
          getActiveCalendarBackgroundSyncProvider(),
        ).toBe(
          null,
        );

        expect(
          getCalendarBackgroundSyncSnapshot(),
        ).toEqual(
          expect.objectContaining({
            status:
              'error',

            provider:
              'google',

            error:
              'Google sync failed',
          }),
        );
      },
    );
  },
);