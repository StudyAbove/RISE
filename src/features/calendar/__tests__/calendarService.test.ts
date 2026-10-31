import {
  ExpoCalendarEvent,
  getCalendarPermissions,
} from 'expo-calendar';

import {
  deleteAppleCalendarEvent,
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
      'updates only the linked occurrence of a recurring Apple event',
      async () => {
        mockGetCalendarPermissions.mockResolvedValueOnce({
          status: 'granted',
          accessPrivileges: 'full',
        });

        const firstOccurrenceUpdate =
          jest.fn().mockResolvedValue(undefined);

        const firstOccurrence = {
          update:
            firstOccurrenceUpdate,
        };

        const refreshedOccurrence = {
          startDate:
            '2026-11-09T19:00:00.000Z',
          endDate:
            '2026-11-09T20:15:00.000Z',
          lastModifiedDate:
            '2026-11-01T20:00:00.000Z',
        };

        const firstSeries = {
          recurrenceRule: {
            frequency: 'weekly',
          },
          getOccurrenceSync:
            jest.fn(
              () => firstOccurrence,
            ),
        };

        const refreshedSeries = {
          recurrenceRule: {
            frequency: 'weekly',
          },
          getOccurrenceSync:
            jest.fn(
              () => refreshedOccurrence,
            ),
        };

        mockGetAppleEvent
          .mockReset()
          .mockResolvedValueOnce(
            firstSeries,
          )
          .mockResolvedValueOnce(
            refreshedSeries,
          );

        const externalEventId =
          'rise-apple-occurrence:apple-series-1:2026-11-09T18%3A00%3A00.000Z';

        await expect(
          updateAppleCalendarEvent(
            externalEventId,
            {
              title:
                'Updated CECS 378',
              startAt:
                '2026-11-09T19:00:00.000Z',
              endAt:
                '2026-11-09T20:15:00.000Z',
              location:
                'Room 305',
              description:
                'Updated occurrence only',
            },
          ),
        ).resolves.toEqual({
          updatedAt:
            '2026-11-01T20:00:00.000Z',
        });

        expect(
          mockGetAppleEvent,
        ).toHaveBeenNthCalledWith(
          1,
          'apple-series-1',
        );

        expect(
          firstSeries.getOccurrenceSync,
        ).toHaveBeenCalledWith({
          instanceStartDate:
            '2026-11-09T18:00:00.000Z',
        });

        expect(
          firstOccurrenceUpdate,
        ).toHaveBeenCalledWith({
          title:
            'Updated CECS 378',
          startDate:
            new Date(
              '2026-11-09T19:00:00.000Z',
            ),
          endDate:
            new Date(
              '2026-11-09T20:15:00.000Z',
            ),
          location:
            'Room 305',
          notes:
            'Updated occurrence only',
        });

        expect(
          mockGetAppleEvent,
        ).toHaveBeenNthCalledWith(
          2,
          'apple-series-1',
        );

        expect(
          refreshedSeries.getOccurrenceSync,
        ).toHaveBeenCalledWith({
          instanceStartDate:
            '2026-11-09T18:00:00.000Z',
        });
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

describe('deleteAppleCalendarEvent', () => {
  const startAt = '2026-11-13T17:00:00.000Z';

  beforeEach(() => {
    // Drop the update fakes queued above for the update tests.
    mockGetAppleEvent.mockReset();
    mockGetCalendarPermissions.mockResolvedValue({ status: 'granted', accessPrivileges: 'full' });
  });

  it('deletes a one-time event', async () => {
    const appleEvent = { delete: jest.fn() };
    mockGetAppleEvent.mockResolvedValue(appleEvent);

    await deleteAppleCalendarEvent('apple-event-1', startAt);

    expect(mockGetAppleEvent).toHaveBeenCalledWith('apple-event-1');
    expect(appleEvent.delete).toHaveBeenCalled();
  });

  it('deletes only the occurrence on that date of a repeating event', async () => {
    const occurrence = { delete: jest.fn() };
    const series = { recurrenceRule: { frequency: 'weekly' }, delete: jest.fn(), getOccurrenceSync: jest.fn(() => occurrence) };
    mockGetAppleEvent.mockResolvedValue(series);

    await deleteAppleCalendarEvent('apple-event-1', startAt);

    expect(series.getOccurrenceSync).toHaveBeenCalledWith({ instanceStartDate: startAt });
    expect(occurrence.delete).toHaveBeenCalled();
    expect(series.delete).not.toHaveBeenCalled();
  });

  it('counts an event that is already gone as deleted', async () => {
    mockGetAppleEvent.mockRejectedValue(new Error('Event not found'));

    await expect(deleteAppleCalendarEvent('apple-event-1', startAt)).resolves.toBeUndefined();
  });

  it('needs Full Calendar Access', async () => {
    mockGetCalendarPermissions.mockResolvedValue({ status: 'denied' });

    await expect(deleteAppleCalendarEvent('apple-event-1', startAt)).rejects.toThrow('APPLE_CALENDAR_NOT_CONNECTED');
    expect(mockGetAppleEvent).not.toHaveBeenCalled();
  });

  it('throws when Apple Calendar cannot delete the event', async () => {
    mockGetAppleEvent.mockResolvedValue({ delete: jest.fn().mockRejectedValue(new Error('read-only calendar')) });

    await expect(deleteAppleCalendarEvent('apple-event-1', startAt)).rejects.toThrow('read-only calendar');
  });
});
