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
  getGoogleAccessToken,
} from '../services/googleTokenService';

import {
  googleCalendarEventExists,
  updateGoogleCalendarEvent,
} from '../services/googleCalendarService';

import {
  syncGoogleCalendarEvents,
} from '../services/googleCalendarImportService';

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
  '../services/googleTokenService',
  () => ({
    getGoogleAccessToken:
      jest.fn(),

    clearGoogleAccessToken:
      jest.fn(),
  }),
);

jest.mock(
  '../services/googleCalendarService',
  () => ({
    googleCalendarEventExists:
      jest.fn(),

    updateGoogleCalendarEvent:
      jest.fn(),
  }),
);

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

const mockGetGoogleAccessToken =
  getGoogleAccessToken as jest.Mock;

const mockGoogleCalendarEventExists =
  googleCalendarEventExists as jest.Mock;

const mockUpdateGoogleCalendarEvent =
  updateGoogleCalendarEvent as jest.Mock;

const mockFetch =
  jest.fn();

globalThis.fetch =
  mockFetch as unknown as typeof fetch;

function mockCalendarListResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json:
      jest.fn().mockResolvedValue({
        items: [
          {
            id: 'primary',
            summary: 'Primary',
            selected: true,
            accessRole: 'owner',
          },
        ],
      }),
  });
}

function mockGoogleEventsResponse(
  events: unknown[],
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json:
      jest.fn().mockResolvedValue({
        items: events,
      }),
  });
}

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

  mockGoogleCalendarEventExists.mockResolvedValue(
    false,
  );

  mockGetGoogleAccessToken.mockResolvedValue(
    'google-access-token',
  );

  mockSaveCalendarEventConflict.mockResolvedValue(
    {
      id: 'conflict-1',
    },
  );
});

describe(
  'Google Calendar conflict detection',
  () => {
    it(
      'stores both versions when Google and RISE changed after the previous successful sync',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Google Version',

            updated:
              '2026-11-13T18:40:00.000Z',

            start: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T20:00:00.000Z',
            },

            location:
              'Home',

            description:
              'Changed in Google',
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
                'google',

              externalEventId:
                'google-event-1',

              externalCalendarId:
                'primary',

              lastSyncedAt:
                '2026-11-13T18:00:00.000Z',

              externalUpdatedAt:
                '2026-11-13T17:30:00.000Z',
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
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',

              source:
                'google',

              location:
                'Library',

              description:
                'Changed in RISE',

              updatedAt:
                '2026-11-13T18:30:00.000Z',
            },
          ]);

        const result =
          await syncGoogleCalendarEvents(
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
            'google',

          riseVersion: {
            title:
              'RISE Version',

            startAt:
              '2026-11-13T18:00:00.000Z',

            endAt:
              '2026-11-13T19:00:00.000Z',

            location:
              'Library',

            description:
              'Changed in RISE',

            updatedAt:
              '2026-11-13T18:30:00.000Z',
          },

          providerVersion: {
            title:
              'Google Version',

            startAt:
              '2026-11-13T19:00:00.000Z',

            endAt:
              '2026-11-13T20:00:00.000Z',

            location:
              'Home',

            description:
              'Changed in Google',

            updatedAt:
              '2026-11-13T18:40:00.000Z',
          },
        });

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
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
      'also stores both versions when RISE changed but an older Google link has no provider baseline',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Google Version',

            updated:
              '2026-11-13T18:40:00.000Z',

            start: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T20:00:00.000Z',
            },
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
                'google',

              externalEventId:
                'google-event-1',

              externalCalendarId:
                'primary',

              lastSyncedAt:
                '2026-11-13T18:00:00.000Z',
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
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',

              source:
                'google',

              updatedAt:
                '2026-11-13T18:30:00.000Z',
            },
          ]);

        await syncGoogleCalendarEvents(
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
            'google',

          riseVersion: {
            title:
              'RISE Version',

            startAt:
              '2026-11-13T18:00:00.000Z',

            endAt:
              '2026-11-13T19:00:00.000Z',

            location:
              undefined,

            description:
              undefined,

            updatedAt:
              '2026-11-13T18:30:00.000Z',
          },

          providerVersion: {
            title:
              'Google Version',

            startAt:
              '2026-11-13T19:00:00.000Z',

            endAt:
              '2026-11-13T20:00:00.000Z',

            location:
              undefined,

            description:
              undefined,

            updatedAt:
              '2026-11-13T18:40:00.000Z',
          },
        });

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'preserves the original RISE version when Google syncs first and an Apple copy is also linked',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'GOOGLE RISE HERE',

            updated:
              '2026-10-18T21:05:00.000Z',

            start: {
              dateTime:
                '2026-10-28T22:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-10-28T23:00:00.000Z',
            },

            location:
              'Manhattan Beach, CA, USA',

            description:
              'This is Google.',
          },
        ]);

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

        mockGetCalendarEventLinksByProvider.mockImplementation(
          async (
            provider:
              'apple' | 'google',
          ) =>
            provider ===
            'google'
              ? [
                  googleLink,
                ]
              : [
                  appleLink,
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

            updatedAt:
              '2026-10-18T18:00:00.000Z',
          },
        ]);

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              18,
            ),
          );

        /*
         * Google synchronizing first must not turn GOOGLE RISE HERE
         * into the RISE copy before Apple is evaluated.
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
              'google',

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
                  'GOOGLE RISE HERE',

                location:
                  'Manhattan Beach, CA, USA',

                description:
                  'This is Google.',
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


    it('stores a deletion conflict when a RISE-created Google copy disappears', async () => {
      const googleLink = {
        id: 'google-link-delete-1',
        calendarEventId: 'rise-google-delete-1',
        userId: 'user-1',
        provider: 'google' as const,
        externalEventId: 'google-event-delete-1',
        externalCalendarId: 'primary',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-11-10T10:00:00.000Z',
        externalUpdatedAt: '2026-11-10T10:00:00.000Z',
      };

      mockCalendarListResponse();
      mockGoogleEventsResponse([]);

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'google'
            ? [googleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-google-delete-1',
          userId: 'user-1',
          title: 'RISE HERE',
          startAt: '2026-11-13T19:00:00.000Z',
          endAt: '2026-11-13T20:00:00.000Z',
          source: 'rise',
          updatedAt: '2026-11-10T10:00:00.000Z',
        },
      ]);

      const result =
        await syncGoogleCalendarEvents(
          new Date('2026-11-13T12:00:00.000Z'),
        );

      expect(
        mockDeleteCalendarEvent,
      ).not.toHaveBeenCalled();

      expect(
        mockSaveCalendarEventConflict,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarEventId:
            'rise-google-delete-1',

          calendarEventLinkId:
            'google-link-delete-1',

          provider:
            'google',

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

    it('deletes a Google-created RISE event when its original Google event disappears', async () => {
      const googleLink = {
        id: 'google-link-delete-2',
        calendarEventId: 'rise-google-delete-2',
        userId: 'user-1',
        provider: 'google' as const,
        externalEventId: 'google-event-delete-2',
        externalCalendarId: 'primary',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-11-10T10:00:00.000Z',
        externalUpdatedAt: '2026-11-10T10:00:00.000Z',
      };

      mockCalendarListResponse();
      mockGoogleEventsResponse([]);

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'google'
            ? [googleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-google-delete-2',
          userId: 'user-1',
          title: 'Google Event',
          startAt: '2026-11-14T19:00:00.000Z',
          endAt: '2026-11-14T20:00:00.000Z',
          source: 'google',
          updatedAt: '2026-11-10T10:00:00.000Z',
        },
      ]);

      await syncGoogleCalendarEvents(
        new Date('2026-11-13T12:00:00.000Z'),
      );

      expect(
        mockDeleteCalendarEvent,
      ).toHaveBeenCalledWith(
        'rise-google-delete-2',
      );

      expect(
        mockSaveCalendarEventConflict,
      ).not.toHaveBeenCalled();
    });

    it('does not treat a Google event moved outside the term as deleted', async () => {
      const googleLink = {
        id: 'google-link-moved',
        calendarEventId: 'rise-google-moved',
        userId: 'user-1',
        provider: 'google' as const,
        externalEventId: 'google-event-moved',
        externalCalendarId: 'primary',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2026-11-10T10:00:00.000Z',
        externalUpdatedAt: '2026-11-10T10:00:00.000Z',
      };

      mockCalendarListResponse();
      mockGoogleEventsResponse([]);

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'google'
            ? [googleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-google-moved',
          userId: 'user-1',
          title: 'Moved Google Event',
          startAt: '2026-11-13T19:00:00.000Z',
          endAt: '2026-11-13T20:00:00.000Z',
          source: 'rise',
          updatedAt: '2026-11-10T10:00:00.000Z',
        },
      ]);

      // The term-scoped Google query no longer returns the event.
      // Its direct calendar ID + event ID lookup still succeeds,
      // which means it was moved rather than deleted.
      mockGoogleCalendarEventExists.mockResolvedValue(
        true,
      );

      const result =
        await syncGoogleCalendarEvents(
          new Date('2026-11-13T12:00:00.000Z'),
        );

      expect(
        mockGoogleCalendarEventExists,
      ).toHaveBeenCalledWith(
        'google-event-moved',
        'primary',
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


    it('does not treat a Google link outside the sync range as deleted', async () => {
      const googleLink = {
        id: 'google-link-delete-3',
        calendarEventId: 'rise-google-delete-3',
        userId: 'user-1',
        provider: 'google' as const,
        externalEventId: 'google-event-delete-3',
        externalCalendarId: 'primary',
        isWritable: true,
        isAllDay: false,
        lastSyncedAt: '2024-01-01T10:00:00.000Z',
        externalUpdatedAt: '2024-01-01T10:00:00.000Z',
      };

      mockCalendarListResponse();
      mockGoogleEventsResponse([]);

      mockGetCalendarEventLinksByProvider.mockImplementation(
        async (provider: 'apple' | 'google') =>
          provider === 'google'
            ? [googleLink]
            : [],
      );

      mockGetCalendarEventsByIdsForSync.mockResolvedValue([
        {
          id: 'rise-google-delete-3',
          userId: 'user-1',
          title: 'Old Google Event',
          startAt: '2024-01-10T19:00:00.000Z',
          endAt: '2024-01-10T20:00:00.000Z',
          source: 'rise',
          updatedAt: '2024-01-01T10:00:00.000Z',
        },
      ]);

      await syncGoogleCalendarEvents(
        new Date('2026-11-13T12:00:00.000Z'),
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
