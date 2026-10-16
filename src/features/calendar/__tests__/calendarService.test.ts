import {
  ExpoCalendarEvent,
  getCalendarPermissions,
} from 'expo-calendar';

import {
  getAppleCalendarAccess,
  updateAppleCalendarEvent,
} from '../services/calendarService';

const mockEventUpdate =
  jest.fn();

jest.mock(
  'expo-calendar',
  () => ({
    getCalendarPermissions:
      jest.fn(),

    requestCalendarPermissions:
      jest.fn(),

    ExpoCalendarEvent: {
      get:
        jest.fn(),
    },
  }),
);

const mockGetCalendarPermissions =
  getCalendarPermissions as jest.Mock;

const mockGetAppleEvent =
  ExpoCalendarEvent.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockGetAppleEvent
    .mockResolvedValueOnce({
      update:
        mockEventUpdate,
    })
    .mockResolvedValueOnce({
      lastModifiedDate:
        '2026-11-13T19:35:00.000Z',
    });
});

describe(
  'getAppleCalendarAccess',
  () => {
    it(
      'returns full when full calendar access is granted',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        await expect(
          getAppleCalendarAccess(),
        ).resolves.toBe(
          'full',
        );

        expect(
          mockGetCalendarPermissions,
        ).toHaveBeenCalledWith(
          false,
        );
      },
    );

    it(
      'returns write-only when only add-events access is granted',
      async () => {
        mockGetCalendarPermissions
          .mockResolvedValueOnce(
            {
              status:
                'denied',
            },
          )
          .mockResolvedValueOnce(
            {
              status:
                'granted',
            },
          );

        await expect(
          getAppleCalendarAccess(),
        ).resolves.toBe(
          'write-only',
        );

        expect(
          mockGetCalendarPermissions,
        ).toHaveBeenNthCalledWith(
          1,
          false,
        );

        expect(
          mockGetCalendarPermissions,
        ).toHaveBeenNthCalledWith(
          2,
          true,
        );
      },
    );

    it(
      'returns denied when neither permission is granted',
      async () => {
        mockGetCalendarPermissions
          .mockResolvedValueOnce(
            {
              status:
                'denied',
            },
          )
          .mockResolvedValueOnce(
            {
              status:
                'denied',
            },
          );

        await expect(
          getAppleCalendarAccess(),
        ).resolves.toBe(
          'denied',
        );
      },
    );
  },
);

describe(
  'updateAppleCalendarEvent',
  () => {
    it(
      'gets the matching Apple event and updates it with RISE fields',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        mockEventUpdate.mockResolvedValue(
          undefined,
        );

        await expect(
          updateAppleCalendarEvent(
            'apple-event-1',
            {
              title:
                'Updated Biology Lecture',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:30:00.000Z',

              location:
                'Room 305',

              description:
                'Bring the updated notes',
            },
          ),
        ).resolves.toEqual({
          updatedAt:
            '2026-11-13T19:35:00.000Z',
        });

        expect(
          mockGetAppleEvent,
        ).toHaveBeenNthCalledWith(
          1,
          'apple-event-1',
        );

        expect(
          mockEventUpdate,
        ).toHaveBeenCalledWith({
          title:
            'Updated Biology Lecture',

          startDate:
            new Date(
              '2026-11-13T18:00:00.000Z',
            ),

          endDate:
            new Date(
              '2026-11-13T19:30:00.000Z',
            ),

          location:
            'Room 305',

          notes:
            'Bring the updated notes',
        });

        expect(
          mockGetAppleEvent,
        ).toHaveBeenNthCalledWith(
          2,
          'apple-event-1',
        );
      },
    );

    it(
      'normalizes an Apple Date lastModifiedDate',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        mockGetAppleEvent
          .mockReset()
          .mockResolvedValueOnce({
            update:
              mockEventUpdate,
          })
          .mockResolvedValueOnce({
            lastModifiedDate:
              new Date(
                '2026-11-13T20:00:00.000Z',
              ),
          });

        mockEventUpdate.mockResolvedValue(
          undefined,
        );

        await expect(
          updateAppleCalendarEvent(
            'apple-event-1',
            {
              title:
                'Updated Event',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',
            },
          ),
        ).resolves.toEqual({
          updatedAt:
            '2026-11-13T20:00:00.000Z',
        });
      },
    );

    it(
      'clears blank location and description values',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        mockEventUpdate.mockResolvedValue(
          undefined,
        );

        await updateAppleCalendarEvent(
          'apple-event-1',
          {
            title:
              'Updated Event',

            startAt:
              '2026-11-13T18:00:00.000Z',

            endAt:
              '2026-11-13T19:00:00.000Z',

            location:
              '   ',

            description:
              '',
          },
        );

        expect(
          mockEventUpdate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            location:
              null,

            notes:
              '',
          }),
        );
      },
    );

    it(
      'does not update Apple Calendar without full access',
      async () => {
        mockGetCalendarPermissions
          .mockResolvedValueOnce(
            {
              status:
                'denied',
            },
          )
          .mockResolvedValueOnce(
            {
              status:
                'granted',
            },
          );

        await expect(
          updateAppleCalendarEvent(
            'apple-event-1',
            {
              title:
                'Updated Event',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',
            },
          ),
        ).rejects.toThrow(
          'APPLE_CALENDAR_NOT_CONNECTED',
        );

        expect(
          mockGetAppleEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockEventUpdate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not update when the external Apple event ID is missing',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        await expect(
          updateAppleCalendarEvent(
            '',
            {
              title:
                'Updated Event',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',
            },
          ),
        ).rejects.toThrow(
          'APPLE_EVENT_ID_MISSING',
        );

        expect(
          mockGetAppleEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockEventUpdate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'passes Apple Calendar lookup failures back to the sync flow',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        const appleError =
          new Error(
            'Apple event not found',
          );

        mockGetAppleEvent.mockReset();
        mockGetAppleEvent.mockRejectedValue(
          appleError,
        );

        await expect(
          updateAppleCalendarEvent(
            'apple-event-1',
            {
              title:
                'Updated Event',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',
            },
          ),
        ).rejects.toBe(
          appleError,
        );
      },
    );

    it(
      'passes Apple Calendar update failures back to the sync flow',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce(
          {
            status:
              'granted',
          },
        );

        const appleError =
          new Error(
            'Apple update failed',
          );

        mockGetAppleEvent.mockReset();
        mockGetAppleEvent.mockResolvedValueOnce({
          update:
            mockEventUpdate,
        });

        mockEventUpdate.mockRejectedValue(
          appleError,
        );

        await expect(
          updateAppleCalendarEvent(
            'apple-event-1',
            {
              title:
                'Updated Event',

              startAt:
                '2026-11-13T18:00:00.000Z',

              endAt:
                '2026-11-13T19:00:00.000Z',
            },
          ),
        ).rejects.toBe(
          appleError,
        );

        expect(
          mockGetAppleEvent,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);