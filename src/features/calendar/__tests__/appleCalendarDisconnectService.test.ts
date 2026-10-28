import {
  deleteCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEventSource,
} from '../../../repositories/calendarEventsRepository';

import {
  deleteCalendarEventLink,
  getCalendarEventLinksByProvider,
} from '../../../repositories/calendarEventLinksRepository';

import {
  deleteCalendarConnection,
} from '../services/calendarConnectionService';

import {
  disconnectAppleCalendarWithCleanup,
} from '../services/appleCalendarDisconnectService';

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

const mockDeleteCalendarEvent =
  deleteCalendarEvent as jest.Mock;

const mockGetCalendarEventsByIdsForSync =
  getCalendarEventsByIdsForSync as jest.Mock;

const mockUpdateCalendarEventSource =
  updateCalendarEventSource as jest.Mock;

const mockDeleteCalendarEventLink =
  deleteCalendarEventLink as jest.Mock;

const mockGetCalendarEventLinksByProvider =
  getCalendarEventLinksByProvider as jest.Mock;

const mockDeleteCalendarConnection =
  deleteCalendarConnection as jest.Mock;

const appleLink = {
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
    'apple-calendar-1',

  isWritable:
    true,

  isAllDay:
    false,
};

beforeEach(() => {
  jest.clearAllMocks();

  mockGetCalendarEventLinksByProvider.mockImplementation(
    async (
      provider: string,
    ) => {
      if (
        provider ===
        'apple'
      ) {
        return [
          appleLink,
        ];
      }

      if (
        provider ===
        'google'
      ) {
        return [];
      }

      return [];
    },
  );

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
});

describe(
  'disconnectAppleCalendarWithCleanup',
  () => {
    it(
      'removes an Apple-only imported event from RISE',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            source:
              'apple',
          },
        ]);

        await disconnectAppleCalendarWithCleanup();

        expect(
          mockGetCalendarEventLinksByProvider,
        ).toHaveBeenCalledWith(
          'apple',
        );

        expect(
          mockGetCalendarEventLinksByProvider,
        ).toHaveBeenCalledWith(
          'google',
        );

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
          'apple',
        );
      },
    );

    it(
      'keeps an Apple-origin event that is also linked to Google and makes Google the remaining source',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            source:
              'apple',
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockImplementation(
          async (
            provider: string,
          ) => {
            if (
              provider ===
              'apple'
            ) {
              return [
                appleLink,
              ];
            }

            if (
              provider ===
              'google'
            ) {
              return [
                {
                  id:
                    'google-link-1',

                  calendarEventId:
                    'event-1',

                  provider:
                    'google',
                },
              ];
            }

            return [];
          },
        );

        await disconnectAppleCalendarWithCleanup();

        expect(
          mockUpdateCalendarEventSource,
        ).toHaveBeenCalledWith(
          'event-1',
          'google',
        );

        expect(
          mockDeleteCalendarEventLink,
        ).toHaveBeenCalledWith(
          'event-1',
          'apple',
        );

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarConnection,
        ).toHaveBeenCalledWith(
          'apple',
        );
      },
    );

    it(
      'keeps a RISE-created event and removes only its Apple provider link',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            source:
              'rise',
          },
        ]);

        await disconnectAppleCalendarWithCleanup();

        expect(
          mockDeleteCalendarEventLink,
        ).toHaveBeenCalledWith(
          'event-1',
          'apple',
        );

        expect(
          mockUpdateCalendarEventSource,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

      },
    );

    it(
      'keeps a Google-origin event and removes only its Apple provider link',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            source:
              'google',
          },
        ]);

        await disconnectAppleCalendarWithCleanup();

        expect(
          mockDeleteCalendarEventLink,
        ).toHaveBeenCalledWith(
          'event-1',
          'apple',
        );

        expect(
          mockUpdateCalendarEventSource,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'still disconnects Apple when there are no Apple-linked events',
      async () => {
        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [],
        );

        await disconnectAppleCalendarWithCleanup();

        expect(
          mockGetCalendarEventsByIdsForSync,
        ).toHaveBeenCalledWith(
          [],
        );

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarEventLink,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarConnection,
        ).toHaveBeenCalledWith(
          'apple',
        );
      },
    );

    it(
      'does not mark Apple disconnected when event cleanup fails',
      async () => {
        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'event-1',

            source:
              'rise',
          },
        ]);

        mockDeleteCalendarEventLink.mockRejectedValue(
          new Error(
            'LINK_DELETE_FAILED',
          ),
        );

        await expect(
          disconnectAppleCalendarWithCleanup(),
        ).rejects.toThrow(
          'LINK_DELETE_FAILED',
        );

        expect(
          mockDeleteCalendarConnection,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
