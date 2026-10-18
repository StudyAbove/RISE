import * as Calendar from 'expo-calendar/legacy';

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
    getAppleCalendarAccess:
      jest.fn(),

    updateAppleCalendarEvent:
      jest.fn(),
  }),
);

const mockGetCalendarsAsync =
  Calendar.getCalendarsAsync as jest.Mock;

const mockGetEventsAsync =
  Calendar.getEventsAsync as jest.Mock;

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
  },
);
