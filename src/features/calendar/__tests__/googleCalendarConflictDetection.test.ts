import {
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
    updateGoogleCalendarEvent:
      jest.fn(),
  }),
);

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
  },
);
