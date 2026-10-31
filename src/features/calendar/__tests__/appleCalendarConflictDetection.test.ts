import * as Calendar from 'expo-calendar/legacy';

import {
  deleteCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getAllDayCalendarEventLinksByProvider,
  getCalendarEventLinksByProvider,
  markCalendarEventLinkSynced,
  updateCalendarEventLinkAllDayMetadata,
  updateCalendarEventLinkWritability,
} from '../../../repositories/calendarEventLinksRepository';

import {
  saveCalendarEventConflict,
} from '../../../repositories/calendarEventConflictsRepository';

import {
  appleCalendarEventExists,
  getAppleCalendarAccess,
  updateAppleCalendarEvent,
} from '../services/calendarService';

import {
  syncAppleCalendarEvents,
} from '../services/appleCalendarImportService';

jest.mock(
  'expo-calendar/legacy',
  () => ({
    EntityTypes: {
      EVENT: 'event',
    },

    getCalendarsAsync:
      jest.fn(),

    getEventsAsync:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventsRepository',
  () => ({
    createImportedCalendarEvent:
      jest.fn(),

    deleteCalendarEvent:
      jest.fn(),

    getCalendarEventsByIdsForSync:
      jest.fn(),

    updateCalendarEvent:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventLinksRepository',
  () => ({
    getCalendarEventLinkByExternalEvent:
      jest.fn(),

    getAllDayCalendarEventLinksByProvider:
      jest.fn(),

    getCalendarEventLinksByProvider:
      jest.fn(),

    markCalendarEventLinkSynced:
      jest.fn(),

    saveCalendarEventLink:
      jest.fn(),

    updateCalendarEventLinkAllDayMetadata:
      jest.fn(),

    updateCalendarEventLinkExternalEventId:
      jest.fn(),

    updateCalendarEventLinkWritability:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventConflictsRepository',
  () => ({
    saveCalendarEventConflict:
      jest.fn(),
  }),
);

jest.mock(
  '../services/calendarService',
  () => ({
    appleCalendarEventExists:
      jest.fn(),

    getAppleCalendarAccess:
      jest.fn(),

    getAppleCalendarExternalEventId:
      jest.fn(
        (
          nativeEventId: string,
          originalStartAt?: string,
        ) =>
          originalStartAt
            ? `rise-apple-occurrence:${encodeURIComponent(
                nativeEventId,
              )}:${encodeURIComponent(
                originalStartAt,
              )}`
            : nativeEventId,
      ),

    updateAppleCalendarEvent:
      jest.fn(),
  }),
);

const mockGetCalendarsAsync =
  Calendar.getCalendarsAsync as jest.Mock;

const mockGetEventsAsync =
  Calendar.getEventsAsync as jest.Mock;

const mockDeleteCalendarEvent =
  deleteCalendarEvent as jest.Mock;

const mockGetCalendarEventsByIdsForSync =
  getCalendarEventsByIdsForSync as jest.Mock;

const mockUpdateCalendarEvent =
  updateCalendarEvent as jest.Mock;

const mockGetAllDayCalendarEventLinksByProvider =
  getAllDayCalendarEventLinksByProvider as jest.Mock;

const mockUpdateCalendarEventLinkAllDayMetadata =
  updateCalendarEventLinkAllDayMetadata as jest.Mock;

const mockUpdateCalendarEventLinkWritability =
  updateCalendarEventLinkWritability as jest.Mock;

const mockGetCalendarEventLinksByProvider =
  getCalendarEventLinksByProvider as jest.Mock;

const mockMarkCalendarEventLinkSynced =
  markCalendarEventLinkSynced as jest.Mock;

const mockSaveCalendarEventConflict =
  saveCalendarEventConflict as jest.Mock;

const mockAppleCalendarEventExists =
  appleCalendarEventExists as jest.Mock;

const mockGetAppleCalendarAccess =
  getAppleCalendarAccess as jest.Mock;

const mockUpdateAppleCalendarEvent =
  updateAppleCalendarEvent as jest.Mock;

beforeEach(() => {
  mockUpdateCalendarEventLinkAllDayMetadata.mockResolvedValue(
    undefined,
  );

  mockUpdateCalendarEventLinkWritability.mockResolvedValue(
    undefined,
  );
    mockGetAllDayCalendarEventLinksByProvider.mockResolvedValue(
      [],
    );
  jest.clearAllMocks();

  mockAppleCalendarEventExists.mockResolvedValue(
    false,
  );

  mockGetAppleCalendarAccess.mockResolvedValue(
    'full',
  );

  mockGetCalendarsAsync.mockResolvedValue([
    {
      id: 'apple-calendar-1',
      title: 'School',
      allowsModifications: true,
    },
  ]);

  mockSaveCalendarEventConflict.mockResolvedValue(
    {
      id: 'conflict-1',
    },
  );
});

describe(
  'Apple Calendar conflict detection',
  () => {
    it(
      'stores both versions when Apple and RISE changed after the previous successful sync',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id: 'apple-event-1',
            calendarId:
              'apple-calendar-1',

            title:
              'Apple Version',

            startDate:
              '2026-10-20T19:00:00.000Z',

            endDate:
              '2026-10-20T20:00:00.000Z',

            location:
              'Home',

            notes:
              'Changed in Apple',

            allDay:
              false,

            lastModifiedDate:
              '2026-10-18T21:00:00.000Z',
          },
        ]);

        mockGetCalendarEventLinksByProvider
          .mockResolvedValue([
            {
              id:
                'link-1',

              calendarEventId:
                'rise-event-1',

              userId:
                'user-1',

              provider:
                'apple',

              externalEventId:
                'apple-event-1',

              externalCalendarId:
                'apple-calendar-1',

              lastSyncedAt:
                '2026-10-18T18:00:00.000Z',

              externalUpdatedAt:
                '2026-10-18T17:00:00.000Z',
            },
          ]);

        mockGetCalendarEventsByIdsForSync
          .mockResolvedValue([
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'RISE Version',

              startAt:
                '2026-10-20T18:00:00.000Z',

              endAt:
                '2026-10-20T19:00:00.000Z',

              source:
                'apple',

              location:
                'Library',

              description:
                'Changed in RISE',

              updatedAt:
                '2026-10-18T20:00:00.000Z',
            },
          ]);

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              18,
            ),
          );

        expect(
          mockSaveCalendarEventConflict,
        ).toHaveBeenCalledWith({
          calendarEventId:
            'rise-event-1',

          calendarEventLinkId:
            'link-1',

          userId:
            'user-1',

          provider:
            'apple',

          riseVersion: {
            title:
              'RISE Version',

            startAt:
              '2026-10-20T18:00:00.000Z',

            endAt:
              '2026-10-20T19:00:00.000Z',

            location:
              'Library',

            description:
              'Changed in RISE',

            updatedAt:
              '2026-10-18T20:00:00.000Z',
          },

          providerVersion: {
            title:
              'Apple Version',

            startAt:
              '2026-10-20T19:00:00.000Z',

            endAt:
              '2026-10-20T20:00:00.000Z',

            location:
              'Home',

            description:
              'Changed in Apple',

            updatedAt:
              '2026-10-18T21:00:00.000Z',
          },
        });

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();

        expect(
          result,
        ).toEqual({
          imported: 0,
          skipped: 0,
        failed: 0,
        conflicts: 1,
          total: 1,
        });
      },
    );

    it(
      'also stores both versions when RISE changed but an older Apple link has no provider baseline',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id: 'apple-event-1',
            calendarId:
              'apple-calendar-1',

            title:
              'Apple Version',

            startDate:
              '2026-10-20T17:00:00.000Z',

            endDate:
              '2026-10-20T18:00:00.000Z',

            location:
              null,

            notes:
              '',

            allDay:
              false,
          },
        ]);

        mockGetCalendarEventLinksByProvider
          .mockResolvedValue([
            {
              id:
                'link-1',

              calendarEventId:
                'rise-event-1',

              userId:
                'user-1',

              provider:
                'apple',

              externalEventId:
                'apple-event-1',

              externalCalendarId:
                'apple-calendar-1',

              lastSyncedAt:
                '2026-10-15T15:00:00.000Z',
            },
          ]);

        mockGetCalendarEventsByIdsForSync
          .mockResolvedValue([
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'RISE Version',

              startAt:
                '2026-10-20T17:00:00.000Z',

              endAt:
                '2026-10-20T18:00:00.000Z',

              source:
                'apple',

              updatedAt:
                '2026-10-15T16:00:00.000Z',
            },
          ]);

        await syncAppleCalendarEvents(
          new Date(
            2026,
            9,
            18,
          ),
        );

        expect(
          mockSaveCalendarEventConflict,
        ).toHaveBeenCalledWith({
          calendarEventId:
            'rise-event-1',

          calendarEventLinkId:
            'link-1',

          userId:
            'user-1',

          provider:
            'apple',

          riseVersion: {
            title:
              'RISE Version',

            startAt:
              '2026-10-20T17:00:00.000Z',

            endAt:
              '2026-10-20T18:00:00.000Z',

            location:
              undefined,

            description:
              undefined,

            updatedAt:
              '2026-10-15T16:00:00.000Z',
          },

          providerVersion: {
            title:
              'Apple Version',

            startAt:
              '2026-10-20T17:00:00.000Z',

            endAt:
              '2026-10-20T18:00:00.000Z',

            location:
              undefined,

            description:
              undefined,

            updatedAt:
              undefined,
          },
        });

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'preserves the original RISE version when Apple syncs first and a Google copy is also linked',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'APPLE RISE HERE',

            startDate:
              '2026-10-28T22:00:00.000Z',

            endDate:
              '2026-10-28T23:00:00.000Z',

            location:
              'Long Beach Airport',

            notes:
              'This is Apple.',

            allDay:
              false,

            lastModifiedDate:
              '2026-10-18T21:00:00.000Z',
          },
        ]);

        const appleLink = {
          id:
            'link-apple',

          calendarEventId:
            'rise-event-1',

          userId:
            'user-1',

          provider:
            'apple',

          externalEventId:
            'apple-event-1',

          externalCalendarId:
            'apple-calendar-1',

          lastSyncedAt:
            '2026-10-18T18:00:00.000Z',

          externalUpdatedAt:
            '2026-10-18T17:00:00.000Z',

          isWritable:
            true,
        };

        const googleLink = {
          id:
            'link-google',

          calendarEventId:
            'rise-event-1',

          userId:
            'user-1',

          provider:
            'google',

          externalEventId:
            'google-event-1',

          externalCalendarId:
            'primary',

          lastSyncedAt:
            '2026-10-18T18:00:00.000Z',

          externalUpdatedAt:
            '2026-10-18T17:00:00.000Z',

          isWritable:
            true,
        };

        mockGetCalendarEventLinksByProvider.mockImplementation(
          async (
            provider:
              'apple' | 'google',
          ) =>
            provider ===
            'apple'
              ? [
                  appleLink,
                ]
              : [
                  googleLink,
                ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'RISE HERE',

            startAt:
              '2026-10-28T22:00:00.000Z',

            endAt:
              '2026-10-28T23:00:00.000Z',

            source:
              'rise',

            location:
              'Original RISE location',

            description:
              'Original RISE description',

            /*
             * RISE has not changed since the Apple baseline.
             * Only the provider copies were edited externally.
             */
            updatedAt:
              '2026-10-18T18:00:00.000Z',
          },
        ]);

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              18,
            ),
          );

        /*
         * Most importantly, Apple must NOT replace RISE HERE with
         * APPLE RISE HERE merely because Apple synchronized first.
         */
        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();

        expect(
          mockSaveCalendarEventConflict,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            provider:
              'apple',

            riseVersion:
              expect.objectContaining({
                title:
                  'RISE HERE',

                location:
                  'Original RISE location',

                description:
                  'Original RISE description',
              }),

            providerVersion:
              expect.objectContaining({
                title:
                  'APPLE RISE HERE',

                location:
                  'Long Beach Airport',

                description:
                  'This is Apple.',
              }),
          }),
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            0,

          failed:
            0,

          conflicts:
            1,

          total:
            1,
        });
      },
    );


    it('stores a deletion conflict when a RISE-created Apple copy disappears', async () => {
      const appleLink = {
        id: 'apple-link-1',
        calendarEventId: 'rise-event-1',
        userId: 'user-1',
        provider: 'apple' as const,
        externalEventId: 'apple-event-1',
        externalCalendarId: 'apple-calendar-1',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-10-10T10:00:00.000Z',
        externalUpdatedAt: '2026-10-10T10:00:00.000Z',
      };

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'apple'
            ? [appleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-event-1',
          userId: 'user-1',
          title: 'RISE HERE',
          startAt: '2026-10-20T17:00:00.000Z',
          endAt: '2026-10-20T18:00:00.000Z',
          source: 'rise',
          updatedAt: '2026-10-10T10:00:00.000Z',
        },
      ]);

      // Apple returns no event with the linked external ID.
      mockGetEventsAsync.mockResolvedValue([]);

      const result =
        await syncAppleCalendarEvents(
          new Date('2026-10-18T12:00:00.000Z'),
        );

      expect(
        mockDeleteCalendarEvent,
      ).not.toHaveBeenCalled();

      expect(
        mockSaveCalendarEventConflict,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarEventId:
            'rise-event-1',

          calendarEventLinkId:
            'apple-link-1',

          provider:
            'apple',

          riseVersion:
            expect.objectContaining({
              title:
                'RISE HERE',
            }),

          providerVersion:
            expect.objectContaining({
              deleted:
                true,
            }),
        }),
      );

      expect(
        result.conflicts,
      ).toBe(1);
    });

    it('deletes an Apple-created RISE event when its original Apple event disappears', async () => {
      const appleLink = {
        id: 'apple-link-2',
        calendarEventId: 'rise-event-2',
        userId: 'user-1',
        provider: 'apple' as const,
        externalEventId: 'apple-event-2',
        externalCalendarId: 'apple-calendar-1',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-10-10T10:00:00.000Z',
        externalUpdatedAt: '2026-10-10T10:00:00.000Z',
      };

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'apple'
            ? [appleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-event-2',
          userId: 'user-1',
          title: 'Apple Event',
          startAt: '2026-10-21T17:00:00.000Z',
          endAt: '2026-10-21T18:00:00.000Z',
          source: 'apple',
          updatedAt: '2026-10-10T10:00:00.000Z',
        },
      ]);

      mockGetEventsAsync.mockResolvedValue([]);

      await syncAppleCalendarEvents(
        new Date('2026-10-18T12:00:00.000Z'),
      );

      expect(
        mockDeleteCalendarEvent,
      ).toHaveBeenCalledWith(
        'rise-event-2',
      );

      expect(
        mockSaveCalendarEventConflict,
      ).not.toHaveBeenCalled();
    });

    it('does not treat an Apple event moved outside the term as deleted', async () => {
      const appleLink = {
        id: 'apple-link-moved',
        calendarEventId: 'rise-event-moved',
        userId: 'user-1',
        provider: 'apple' as const,
        externalEventId: 'apple-event-moved',
        externalCalendarId: 'apple-calendar-1',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-10-10T10:00:00.000Z',
        externalUpdatedAt: '2026-10-10T10:00:00.000Z',
      };

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'apple'
            ? [appleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-event-moved',
          userId: 'user-1',
          title: 'Moved Apple Event',
          startAt: '2026-10-20T17:00:00.000Z',
          endAt: '2026-10-20T18:00:00.000Z',
          source: 'rise',
          updatedAt: '2026-10-10T10:00:00.000Z',
        },
      ]);

      // The term-scoped EventKit query no longer returns the event.
      mockGetEventsAsync.mockResolvedValue([]);

      // But the linked EventKit ID still exists, meaning the event was moved
      // outside the term instead of deleted.
      mockAppleCalendarEventExists.mockResolvedValue(
        true,
      );

      const result =
        await syncAppleCalendarEvents(
          new Date('2026-10-18T12:00:00.000Z'),
        );

      expect(
        mockAppleCalendarEventExists,
      ).toHaveBeenCalledWith(
        'apple-event-moved',
      );

      expect(
        mockDeleteCalendarEvent,
      ).not.toHaveBeenCalled();

      expect(
        mockSaveCalendarEventConflict,
      ).not.toHaveBeenCalled();

      expect(
        result.conflicts,
      ).toBe(0);

      expect(
        result.failed,
      ).toBe(0);
    });


    it('does not treat an Apple link outside the sync range as deleted', async () => {
      const appleLink = {
        id: 'apple-link-3',
        calendarEventId: 'rise-event-3',
        userId: 'user-1',
        provider: 'apple' as const,
        externalEventId: 'apple-event-3',
        externalCalendarId: 'apple-calendar-1',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-10-10T10:00:00.000Z',
        externalUpdatedAt: '2026-10-10T10:00:00.000Z',
      };

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'apple'
            ? [appleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-event-3',
          userId: 'user-1',
          title: 'Old Apple Event',
          startAt: '2024-01-10T17:00:00.000Z',
          endAt: '2024-01-10T18:00:00.000Z',
          source: 'rise',
          updatedAt: '2024-01-01T10:00:00.000Z',
        },
      ]);

      mockGetEventsAsync.mockResolvedValue([]);

      await syncAppleCalendarEvents(
        new Date('2026-10-18T12:00:00.000Z'),
      );

      expect(
        mockDeleteCalendarEvent,
      ).not.toHaveBeenCalled();

      expect(
        mockSaveCalendarEventConflict,
      ).not.toHaveBeenCalled();
    });

  },
);
