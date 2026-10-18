import {
  createImportedCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLinksByProvider,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
} from '../../../repositories/calendarEventLinksRepository';

import {
  clearGoogleAccessToken,
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
    getCalendarEventLinksByProvider:
      jest.fn(),

    markCalendarEventLinkSynced:
      jest.fn(),

    saveCalendarEventLink:
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

const mockCreateImportedCalendarEvent =
  createImportedCalendarEvent as jest.Mock;

const mockGetCalendarEventsByIdsForSync =
  getCalendarEventsByIdsForSync as jest.Mock;

const mockUpdateCalendarEvent =
  updateCalendarEvent as jest.Mock;

const mockGetCalendarEventLinksByProvider =
  getCalendarEventLinksByProvider as jest.Mock;

const mockMarkCalendarEventLinkSynced =
  markCalendarEventLinkSynced as jest.Mock;

const mockSaveCalendarEventLink =
  saveCalendarEventLink as jest.Mock;

const mockGetGoogleAccessToken =
  getGoogleAccessToken as jest.Mock;

const mockClearGoogleAccessToken =
  clearGoogleAccessToken as jest.Mock;

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
            id:
              'primary',

            summary:
              'Primary',

            selected:
              true,
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
        items:
          events,
      }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();

  mockGetGoogleAccessToken.mockResolvedValue(
    'google-access-token',
  );

  mockGetCalendarEventLinksByProvider.mockResolvedValue(
    [],
  );

  mockGetCalendarEventsByIdsForSync.mockResolvedValue(
    [],
  );

  mockMarkCalendarEventLinkSynced.mockResolvedValue(
    undefined,
  );

  mockSaveCalendarEventLink.mockResolvedValue(
    undefined,
  );

  mockUpdateGoogleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-11-13T19:05:00.000Z',
  });
});

describe(
  'syncGoogleCalendarEvents',
  () => {
    it(
      'imports a new Google Calendar event and creates its provider link with the Google update timestamp',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            status:
              'confirmed',

            summary:
              'Biology Lecture',

            description:
              'Chapter 6',

            location:
              'Room 305',

            updated:
              '2026-11-13T17:30:00.000Z',

            start: {
              dateTime:
                '2026-11-13T10:00:00-08:00',
            },

            end: {
              dateTime:
                '2026-11-13T11:30:00-08:00',
            },
          },
        ]);

        mockCreateImportedCalendarEvent.mockResolvedValue(
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Biology Lecture',

            startAt:
              '2026-11-13T18:00:00.000Z',

            endAt:
              '2026-11-13T19:30:00.000Z',

            source:
              'google',

            location:
              'Room 305',

            description:
              'Chapter 6',
          },
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockCreateImportedCalendarEvent,
        ).toHaveBeenCalledWith(
          {
            title:
              'Biology Lecture',

            startAt:
              '2026-11-13T18:00:00.000Z',

            endAt:
              '2026-11-13T19:30:00.000Z',

            source:
              'google',

            location:
              'Room 305',

            description:
              'Chapter 6',
          },
        );

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledWith(
          {
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

            externalUpdatedAt:
              '2026-11-13T17:30:00.000Z',
          },
        );

        expect(
          result,
        ).toEqual({
          imported:
            1,

          skipped:
            0,

          failed:
            0,

          total:
            1,
        });
      },
    );

    it(
      'skips a matching linked event and records its Google baseline timestamp',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Biology Lecture',

            updated:
              '2026-11-13T17:30:00.000Z',

            start: {
              dateTime:
                '2026-11-13T18:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T19:30:00.000Z',
            },

            location:
              'Room 305',

            description:
              'Chapter 6',
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
                '2026-11-13T17:00:00.000Z',
            },
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'Biology Lecture',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:30:00.000Z',

              source:
                'google',

              location:
                'Room 305',

              description:
                'Chapter 6',

              updatedAt:
                '2026-11-13T16:00:00.000Z',
            },
          ],
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockCreateImportedCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-11-13T17:30:00.000Z',
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed:
            0,

          total:
            1,
        });
      },
    );

    it(
      'pulls a Google-side change into RISE when only Google changed',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Updated Biology Lecture',

            updated:
              '2026-11-13T18:30:00.000Z',

            start: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T20:30:00.000Z',
            },

            location:
              'Room 410',

            description:
              'Updated notes',
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'Biology Lecture',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:30:00.000Z',

              source:
                'google',

              location:
                'Room 305',

              description:
                'Chapter 6',

              updatedAt:
                '2026-11-13T17:00:00.000Z',
            },
          ],
        );

        mockUpdateCalendarEvent.mockResolvedValue(
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Updated Biology Lecture',

            startAt:
              '2026-11-13T19:00:00.000Z',

            endAt:
              '2026-11-13T20:30:00.000Z',

            source:
              'google',

            location:
              'Room 410',

            description:
              'Updated notes',
          },
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
            title:
              'Updated Biology Lecture',

            startAt:
              '2026-11-13T19:00:00.000Z',

            endAt:
              '2026-11-13T20:30:00.000Z',

            location:
              'Room 410',

            description:
              'Updated notes',
          },
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-11-13T18:30:00.000Z',
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed:
            0,

          total:
            1,
        });
      },
    );

    it(
      'pushes a newer RISE copy to Google when Google did not change',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Old Google Version',

            updated:
              '2026-11-13T17:30:00.000Z',

            start: {
              dateTime:
                '2026-11-13T18:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },

            location:
              'Room 305',

            description:
              'Old Google notes',
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'RISE Offline Version',

              startAt:
                '2026-11-13T19:00:00.000Z',

              endAt:
                '2026-11-13T20:00:00.000Z',

              source:
                'google',

              location:
                'Room 410',

              description:
                'Changed while Google was disconnected',

              updatedAt:
                '2026-11-13T18:30:00.000Z',
            },
          ],
        );

        mockUpdateGoogleCalendarEvent.mockResolvedValue({
          updatedAt:
            '2026-11-13T18:35:00.000Z',
        });

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
          {
            title:
              'RISE Offline Version',

            startAt:
              '2026-11-13T19:00:00.000Z',

            endAt:
              '2026-11-13T20:00:00.000Z',

            location:
              'Room 410',

            description:
              'Changed while Google was disconnected',
          },
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-11-13T18:35:00.000Z',
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed:
            0,

          total:
            1,
        });
      },
    );

    it(
      'does not overwrite either copy when both Google and RISE changed',
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

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
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
          ],
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

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
          imported:
            0,

          skipped:
            0,

          failed:
            1,

          total:
            1,
        });
      },
    );

    it(
      'keeps an older link conservative when no Google baseline exists and RISE already changed',
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

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
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
          ],
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

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
          result.failed,
        ).toBe(
          1,
        );
      },
    );

    it(
      'pulls Google into RISE for an older link with no baseline when RISE did not change',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Updated Biology Lecture',

            updated:
              '2026-11-13T18:30:00.000Z',

            start: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T20:30:00.000Z',
            },
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
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
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-event-1',

              userId:
                'user-1',

              title:
                'Biology Lecture',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:30:00.000Z',

              source:
                'google',

              updatedAt:
                '2026-11-13T17:00:00.000Z',
            },
          ],
        );

        mockUpdateCalendarEvent.mockResolvedValue({
          id:
            'rise-event-1',
        });

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-11-13T18:30:00.000Z',
        );

        expect(
          result.failed,
        ).toBe(
          0,
        );
      },
    );

    it(
      'ignores cancelled Google events',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            status:
              'cancelled',

            summary:
              'Cancelled Event',

            start: {
              dateTime:
                '2026-11-13T18:00:00.000Z',
            },

            end: {
              dateTime:
                '2026-11-13T19:00:00.000Z',
            },
          },
        ]);

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockCreateImportedCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            0,

          failed:
            0,

          total:
            0,
        });
      },
    );

    it(
      'supports all-day Google Calendar events',
      async () => {
        mockCalendarListResponse();

        mockGoogleEventsResponse([
          {
            id:
              'google-event-1',

            summary:
              'Study Day',

            updated:
              '2026-11-13T17:30:00.000Z',

            start: {
              date:
                '2026-11-13',
            },

            end: {
              date:
                '2026-11-14',
            },
          },
        ]);

        mockCreateImportedCalendarEvent.mockImplementation(
          async (
            input,
          ) => ({
            id:
              'rise-event-1',

            userId:
              'user-1',

            ...input,
          }),
        );

        const result =
          await syncGoogleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockCreateImportedCalendarEvent,
        ).toHaveBeenCalledTimes(
          1,
        );

        const input =
          mockCreateImportedCalendarEvent.mock
            .calls[0][0];

        expect(
          input.title,
        ).toBe(
          'Study Day',
        );

        expect(
          new Date(
            input.startAt,
          ).getFullYear(),
        ).toBe(
          2026,
        );

        expect(
          new Date(
            input.startAt,
          ).getMonth(),
        ).toBe(
          10,
        );

        expect(
          new Date(
            input.startAt,
          ).getDate(),
        ).toBe(
          13,
        );

        expect(
          result.imported,
        ).toBe(
          1,
        );
      },
    );

    it(
      'requires Google reconnection when no access token is stored',
      async () => {
        mockGetGoogleAccessToken.mockResolvedValue(
          null,
        );

        await expect(
          syncGoogleCalendarEvents(),
        ).rejects.toThrow(
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
        );

        expect(
          mockFetch,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'clears the stored token and requires reconnection after Google returns 401',
      async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,

          status: 401,
        });

        await expect(
          syncGoogleCalendarEvents(),
        ).rejects.toThrow(
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
        );

        expect(
          mockClearGoogleAccessToken,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      'reports a Google sync failure for other API errors',
      async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,

          status: 500,
        });

        await expect(
          syncGoogleCalendarEvents(),
        ).rejects.toThrow(
          'GOOGLE_CALENDAR_SYNC_FAILED',
        );

        expect(
          mockClearGoogleAccessToken,
        ).not.toHaveBeenCalled();
      },
    );
  },
);