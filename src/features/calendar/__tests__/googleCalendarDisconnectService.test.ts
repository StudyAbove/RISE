import {
  deleteCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEventSource,
} from '../../../repositories/calendarEventsRepository';

import {
  deleteCalendarEventLink,
  getCalendarEventLink,
  getCalendarEventLinksByProvider,
} from '../../../repositories/calendarEventLinksRepository';

import {
  deleteCalendarConnection,
} from '../services/calendarConnectionService';

import {
  disconnectGoogleCalendarWithCleanup,
} from '../services/googleCalendarDisconnectService';

import {
  clearGoogleAccessToken,
} from '../services/googleTokenService';

jest.mock(
  '../../../repositories/calendarEventsRepository',
  () => ({
    deleteCalendarEvent:
      jest.fn(),

    getCalendarEventsByIdsForSync:
      jest.fn(),

    updateCalendarEventSource:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventLinksRepository',
  () => ({
    deleteCalendarEventLink:
      jest.fn(),

    getCalendarEventLink:
      jest.fn(),

    getCalendarEventLinksByProvider:
      jest.fn(),
  }),
);

jest.mock(
  '../services/calendarConnectionService',
  () => ({
    deleteCalendarConnection:
      jest.fn(),
  }),
);

jest.mock(
  '../services/googleTokenService',
  () => ({
    clearGoogleAccessToken:
      jest.fn(),
  }),
);

const mockDeleteCalendarEvent =
  deleteCalendarEvent as jest.Mock;

const mockGetCalendarEventsByIdsForSync =
  getCalendarEventsByIdsForSync as jest.Mock;

const mockUpdateCalendarEventSource =
  updateCalendarEventSource as jest.Mock;

const mockDeleteCalendarEventLink =
  deleteCalendarEventLink as jest.Mock;

const mockGetCalendarEventLink =
  getCalendarEventLink as jest.Mock;

const mockGetCalendarEventLinksByProvider =
  getCalendarEventLinksByProvider as jest.Mock;

const mockDeleteCalendarConnection =
  deleteCalendarConnection as jest.Mock;

const mockClearGoogleAccessToken =
  clearGoogleAccessToken as jest.Mock;

const googleLink = {
  id:
    'google-link-1',

  calendarEventId:
    'event-1',

  userId:
    'user-1',

  provider:
    'google',

  externalEventId:
    'google-event-1',

  externalCalendarId:
    'primary',

  isWritable:
    true,

  isAllDay:
    false,
};

beforeEach(() => {
  jest.clearAllMocks();

  mockGetCalendarEventLinksByProvider.mockResolvedValue([
    googleLink,
  ]);

  mockDeleteCalendarEvent.mockResolvedValue(
    undefined,
  );

  mockDeleteCalendarEventLink.mockResolvedValue(
    undefined,
  );

  mockUpdateCalendarEventSource.mockResolvedValue(
    undefined,
  );

  mockDeleteCalendarConnection.mockResolvedValue(
    undefined,
  );

  mockClearGoogleAccessToken.mockResolvedValue(
    undefined,
  );
});

describe(
  'disconnectGoogleCalendarWithCleanup',
  () => {
    it(
      'removes a Google-only imported event from RISE',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            userId:
              'user-1',

            title:
              'Google Event',

            startAt:
              '2026-10-21T17:00:00.000Z',

            endAt:
              '2026-10-21T18:00:00.000Z',

            source:
              'google',
          },
        ]);

        mockGetCalendarEventLink.mockResolvedValue(
          null,
        );

        await disconnectGoogleCalendarWithCleanup();

        expect(
          mockDeleteCalendarEvent,
        ).toHaveBeenCalledWith(
          'event-1',
        );

        expect(
          mockDeleteCalendarEventLink,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarConnection,
        ).toHaveBeenCalledWith(
          'google',
        );

        expect(
          mockClearGoogleAccessToken,
        ).toHaveBeenCalled();
      },
    );

    it(
      'keeps an Apple and Google event and removes only Google',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            userId:
              'user-1',

            title:
              'Shared Event',

            startAt:
              '2026-10-21T17:00:00.000Z',

            endAt:
              '2026-10-21T18:00:00.000Z',

            source:
              'google',
          },
        ]);

        mockGetCalendarEventLink.mockResolvedValue({
          id:
            'apple-link-1',

          calendarEventId:
            'event-1',

          userId:
            'user-1',

          provider:
            'apple',

          externalEventId:
            'apple-event-1',

          externalCalendarId:
            'apple-calendar',

          isWritable:
            false,

          isAllDay:
            false,
        });

        await disconnectGoogleCalendarWithCleanup();

        expect(
          mockUpdateCalendarEventSource,
        ).toHaveBeenCalledWith(
          'event-1',
          'apple',
        );

        expect(
          mockDeleteCalendarEventLink,
        ).toHaveBeenCalledWith(
          'event-1',
          'google',
        );

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps a RISE-created event and removes only its Google link',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            userId:
              'user-1',

            title:
              'RISE Event',

            startAt:
              '2026-10-21T17:00:00.000Z',

            endAt:
              '2026-10-21T18:00:00.000Z',

            source:
              'rise',
          },
        ]);

        await disconnectGoogleCalendarWithCleanup();

        expect(
          mockDeleteCalendarEventLink,
        ).toHaveBeenCalledWith(
          'event-1',
          'google',
        );

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateCalendarEventSource,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps Google connected if cleanup fails',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            userId:
              'user-1',

            title:
              'Google Event',

            startAt:
              '2026-10-21T17:00:00.000Z',

            endAt:
              '2026-10-21T18:00:00.000Z',

            source:
              'google',
          },
        ]);

        mockGetCalendarEventLink.mockResolvedValue(
          null,
        );

        mockDeleteCalendarEvent.mockRejectedValue(
          new Error(
            'Database unavailable',
          ),
        );

        await expect(
          disconnectGoogleCalendarWithCleanup(),
        ).rejects.toThrow(
          'Database unavailable',
        );

        expect(
          mockDeleteCalendarConnection,
        ).not.toHaveBeenCalled();

        expect(
          mockClearGoogleAccessToken,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
