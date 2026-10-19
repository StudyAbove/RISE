import * as Calendar from 'expo-calendar/legacy';

import {
  createImportedCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLinkByExternalEvent,
  getAllDayCalendarEventLinksByProvider,
  getCalendarEventLinksByProvider,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
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
  getAppleCalendarEvents,
  importAppleCalendarEvent,
  syncAppleCalendarEvents,
} from '../services/appleCalendarImportService';

jest.mock(
  'expo-calendar/legacy',
  () => ({
    EntityTypes: {
      EVENT:
        'event',
    },

    getCalendarsAsync:
      jest.fn(),

    getEventsAsync:
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

    updateCalendarEventLinkAllDayMetadata:
      jest.fn(),

    updateCalendarEventLinkWritability:
      jest.fn(),

    saveCalendarEventLink:
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

const mockGetCalendarsAsync =
  Calendar.getCalendarsAsync as jest.Mock;

const mockGetEventsAsync =
  Calendar.getEventsAsync as jest.Mock;

const mockGetAppleCalendarAccess =
  getAppleCalendarAccess as jest.Mock;

const mockUpdateAppleCalendarEvent =
  updateAppleCalendarEvent as jest.Mock;

const mockCreateImportedCalendarEvent =
  createImportedCalendarEvent as jest.Mock;

const mockGetCalendarEventsByIdsForSync =
  getCalendarEventsByIdsForSync as jest.Mock;

const mockUpdateCalendarEvent =
  updateCalendarEvent as jest.Mock;

const mockGetCalendarEventLinkByExternalEvent =
  getCalendarEventLinkByExternalEvent as jest.Mock;

const mockGetAllDayCalendarEventLinksByProvider =
  getAllDayCalendarEventLinksByProvider as jest.Mock;

const mockGetCalendarEventLinksByProvider =
  getCalendarEventLinksByProvider as jest.Mock;

const mockMarkCalendarEventLinkSynced =
  markCalendarEventLinkSynced as jest.Mock;

const mockUpdateCalendarEventLinkAllDayMetadata =
  updateCalendarEventLinkAllDayMetadata as jest.Mock;

const mockUpdateCalendarEventLinkWritability =
  updateCalendarEventLinkWritability as jest.Mock;

const mockSaveCalendarEventLink =
  saveCalendarEventLink as jest.Mock;

const mockSaveCalendarEventConflict =
  saveCalendarEventConflict as jest.Mock;

beforeEach(() => {
    mockGetAllDayCalendarEventLinksByProvider.mockResolvedValue(
      [],
    );
  jest.clearAllMocks();

  mockGetAppleCalendarAccess.mockResolvedValue(
    'full',
  );

  mockGetCalendarEventLinkByExternalEvent.mockResolvedValue(
    null,
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

  mockUpdateAppleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-10-20T19:05:00.000Z',
  });

  mockSaveCalendarEventLink.mockResolvedValue(
    undefined,
  );

  mockSaveCalendarEventConflict.mockResolvedValue(
    undefined,
  );
});

describe(
  'getAppleCalendarEvents',
  () => {
    it(
      'reads Apple Calendar events inside the requested range',
      async () => {
        mockGetCalendarsAsync.mockResolvedValue([
          {
            id:
              'apple-calendar-1',

            title:
              'School',

            allowsModifications:
              true,
          },

          {
            id:
              'apple-calendar-2',

            title:
              'Personal',

            allowsModifications:
              true,
          },
        ]);

        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-2',

            calendarId:
              'apple-calendar-2',

            title:
              'Soccer',

            startDate:
              '2026-10-20T20:00:00.000Z',

            endDate:
              '2026-10-20T22:00:00.000Z',

            location:
              null,

            notes:
              '',

            allDay:
              false,
          },

          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'CECS Exam',

            startDate:
              '2026-10-18T17:00:00.000Z',

            endDate:
              '2026-10-18T19:00:00.000Z',

            location:
              'CSULB',

            notes:
              'Bring pencil',

            allDay:
              false,

            isWritable:
              true,
          },
        ]);

        const start =
          new Date(
            '2026-08-01T00:00:00.000Z',
          );

        const end =
          new Date(
            '2027-06-01T00:00:00.000Z',
          );

        const result =
          await getAppleCalendarEvents(
            start,
            end,
          );

        expect(
          mockGetCalendarsAsync,
        ).toHaveBeenCalledWith(
          Calendar.EntityTypes.EVENT,
        );

        expect(
          mockGetEventsAsync,
        ).toHaveBeenCalledWith(
          [
            'apple-calendar-1',
            'apple-calendar-2',
          ],
          start,
          end,
        );

        expect(
          result,
        ).toEqual([
          {
            externalEventId:
              'apple-event-1',

            externalCalendarId:
              'apple-calendar-1',

            calendarTitle:
              'School',

            title:
              'CECS Exam',

            startAt:
              '2026-10-18T17:00:00.000Z',

            endAt:
              '2026-10-18T19:00:00.000Z',

            location:
              'CSULB',

            description:
              'Bring pencil',

            allDay:
              false,

            isWritable:
              true,
          },

          {
            externalEventId:
              'apple-event-2',

            externalCalendarId:
              'apple-calendar-2',

            calendarTitle:
              'Personal',

            title:
              'Soccer',

            startAt:
              '2026-10-20T20:00:00.000Z',

            endAt:
              '2026-10-20T22:00:00.000Z',

            location:
              undefined,

            description:
              undefined,

            allDay:
              false,

            isWritable:
              true,
          },
        ]);
      },
    );

    it(
      'returns an empty array when there are no calendars',
      async () => {
        mockGetCalendarsAsync.mockResolvedValue(
          [],
        );

        const result =
          await getAppleCalendarEvents(
            new Date(
              '2026-08-01T00:00:00.000Z',
            ),

            new Date(
              '2027-06-01T00:00:00.000Z',
            ),
          );

        expect(
          result,
        ).toEqual([]);

        expect(
          mockGetEventsAsync,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not read events without full Apple Calendar access',
      async () => {
        mockGetAppleCalendarAccess.mockResolvedValue(
          'write-only',
        );

        await expect(
          getAppleCalendarEvents(
            new Date(
              '2026-08-01T00:00:00.000Z',
            ),

            new Date(
              '2027-06-01T00:00:00.000Z',
            ),
          ),
        ).rejects.toThrow(
          'APPLE_CALENDAR_NOT_CONNECTED',
        );

        expect(
          mockGetCalendarsAsync,
        ).not.toHaveBeenCalled();

        expect(
          mockGetEventsAsync,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'importAppleCalendarEvent',
  () => {
    const candidate = {
      externalEventId:
        'apple-event-1',

      externalCalendarId:
        'apple-calendar-1',

      calendarTitle:
        'School',

      title:
        'CECS Exam',

      startAt:
        '2026-10-18T17:00:00.000Z',

      endAt:
        '2026-10-18T19:00:00.000Z',

      location:
        'CSULB',

      description:
        'Bring pencil',

      allDay:
        false,

      isWritable:
        true,

      updatedAt:
        '2026-10-18T16:30:00.000Z',
    };

    it(
      'imports a new Apple event and saves its provider link',
      async () => {
        mockCreateImportedCalendarEvent.mockResolvedValue(
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'CECS Exam',

            startAt:
              '2026-10-18T17:00:00.000Z',

            endAt:
              '2026-10-18T19:00:00.000Z',

            source:
              'apple',

            location:
              'CSULB',

            description:
              'Bring pencil',
          },
        );

        const result =
          await importAppleCalendarEvent(
            candidate,
          );

        expect(
          mockGetCalendarEventLinkByExternalEvent,
        ).toHaveBeenCalledWith(
          'apple',
          'apple-event-1',
        );

        expect(
          mockCreateImportedCalendarEvent,
        ).toHaveBeenCalledWith({
          title:
            'CECS Exam',

          startAt:
            '2026-10-18T17:00:00.000Z',

          endAt:
            '2026-10-18T19:00:00.000Z',

          source:
            'apple',

          location:
            'CSULB',

          description:
            'Bring pencil',
        });

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledWith({
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

          externalUpdatedAt:
            '2026-10-18T16:30:00.000Z',

          isWritable:
            true,

      isAllDay:
        false,

      allDayStartDate:
        undefined,

      allDayEndDate:
        undefined,
        });

        expect(
          result.status,
        ).toBe(
          'imported',
        );
      },
    );

    it(
      'does not create a duplicate RISE event when the Apple event is already linked',
      async () => {
        mockGetCalendarEventLinkByExternalEvent.mockResolvedValue(
          {
            id:
              'link-1',

            calendarEventId:
              'rise-event-existing',

            userId:
              'user-1',

            provider:
              'apple',

            externalEventId:
              'apple-event-1',

            externalCalendarId:
              'apple-calendar-1',
          },
        );

        const result =
          await importAppleCalendarEvent(
            candidate,
          );

        expect(
          result,
        ).toEqual({
          status:
            'already-imported',

          calendarEventId:
            'rise-event-existing',
        });

        expect(
          mockCreateImportedCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockSaveCalendarEventLink,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'syncAppleCalendarEvents',
  () => {
    beforeEach(() => {
      mockGetCalendarsAsync.mockResolvedValue([
        {
          id:
            'apple-calendar-1',

          title:
            'School',

          allowsModifications:
            true,
        },
      ]);
    });

    it(
      'bulk imports new Apple events and skips matching linked events',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-new',

            calendarId:
              'apple-calendar-1',

            title:
              'New Exam',

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

          {
            id:
              'apple-event-existing',

            calendarId:
              'apple-calendar-1',

            title:
              'Existing Event',

            startDate:
              '2026-10-21T17:00:00.000Z',

            endDate:
              '2026-10-21T18:00:00.000Z',

            location:
              null,

            notes:
              '',

            allDay:
              false,
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue([
          {
            id:
              'link-existing',

            calendarEventId:
              'rise-existing',

            userId:
              'user-1',

            provider:
              'apple',

            externalEventId:
              'apple-event-existing',

            externalCalendarId:
              'apple-calendar-1',

            lastSyncedAt:
              '2026-10-15T15:00:00.000Z',
          },
        ]);

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-existing',

            userId:
              'user-1',

            title:
              'Existing Event',

            startAt:
              '2026-10-21T17:00:00.000Z',

            endAt:
              '2026-10-21T18:00:00.000Z',

            source:
              'apple',

            updatedAt:
              '2026-10-15T14:00:00.000Z',
          },
        ]);

        mockCreateImportedCalendarEvent.mockResolvedValue(
          {
            id:
              'rise-new',

            userId:
              'user-1',

            title:
              'New Exam',

            startAt:
              '2026-10-20T17:00:00.000Z',

            endAt:
              '2026-10-20T18:00:00.000Z',

            source:
              'apple',
          },
        );

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          result,
        ).toEqual({
          imported:
            1,

          skipped:
            1,

          failed: 0,


          conflicts: 0,
          total:
            2,
        });

        expect(
          mockCreateImportedCalendarEvent,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-existing',
          'apple',
        );
      },
    );

    it(
      'normalizes an Apple end-of-day all-day event to an exclusive semantic end date',
      async () => {
        mockGetCalendarsAsync.mockResolvedValue([
          {
            id:
              'apple-holidays',

            title:
              'Holidays',

            allowsModifications:
              false,
          },
        ]);

        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-columbus-day',

            calendarId:
              'apple-holidays',

            title:
              'Columbus Day',

            startDate:
              new Date(
                2026,
                9,
                12,
                0,
                0,
                0,
                0,
              ),

            endDate:
              new Date(
                2026,
                9,
                12,
                23,
                59,
                59,
                0,
              ),

            location:
              null,

            notes:
              '',

            allDay:
              true,
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [
            {
              id:
                'apple-link-1',

              calendarEventId:
                'rise-columbus-day',

              userId:
                'user-1',

              provider:
                'apple',

              externalEventId:
                'apple-columbus-day',

              externalCalendarId:
                'apple-holidays',

              isWritable:
                false,

              isAllDay:
                false,
            },
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-columbus-day',

              userId:
                'user-1',

              title:
                'Columbus Day',

              startAt:
                new Date(
                  2026,
                  9,
                  12,
                  0,
                  0,
                  0,
                  0,
                ).toISOString(),

              endAt:
                new Date(
                  2026,
                  9,
                  12,
                  23,
                  59,
                  59,
                  0,
                ).toISOString(),

              source:
                'apple',
            },
          ],
        );

        await syncAppleCalendarEvents(
          new Date(
            2026,
            9,
            12,
          ),
        );

        expect(
          mockUpdateCalendarEventLinkAllDayMetadata,
        ).toHaveBeenCalledWith(
          'rise-columbus-day',
          'apple',
          {
            isAllDay:
              true,

            allDayStartDate:
              '2026-10-12',

            allDayEndDate:
              '2026-10-13',
          },
        );
      },
    );

    it(
      'reuses a Google-linked RISE event for the same all-day Apple holiday',
      async () => {
        mockGetCalendarsAsync.mockResolvedValue([
          {
            id:
              'apple-holidays',

            title:
              'Holidays',

            allowsModifications:
              false,
          },
        ]);

        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-columbus-day',

            calendarId:
              'apple-holidays',

            title:
              'Columbus Day',

            startDate:
              new Date(
                2026,
                9,
                12,
              ),

            endDate:
              new Date(
                2026,
                9,
                13,
              ),

            location:
              null,

            notes:
              '',

            allDay:
              true,
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue(
          [],
        );

        mockGetAllDayCalendarEventLinksByProvider.mockResolvedValue(
          [
            {
              id:
                'google-link-1',

              calendarEventId:
                'rise-columbus-day',

              userId:
                'user-1',

              provider:
                'google',

              externalEventId:
                'google-columbus-day',

              externalCalendarId:
                'google-holidays',

              isWritable:
                false,

              isAllDay:
                true,

              allDayStartDate:
                '2026-10-12',

              allDayEndDate:
                '2026-10-13',
            },
          ],
        );

        mockGetCalendarEventsByIdsForSync.mockResolvedValue(
          [
            {
              id:
                'rise-columbus-day',

              userId:
                'user-1',

              title:
                'Columbus Day',

              startAt:
                new Date(
                  2026,
                  9,
                  12,
                ).toISOString(),

              endAt:
                new Date(
                  2026,
                  9,
                  13,
                ).toISOString(),

              source:
                'google',

              location:
                undefined,

              description:
                undefined,
            },
          ],
        );

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              12,
            ),
          );

        expect(
          mockCreateImportedCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledWith({
          calendarEventId:
            'rise-columbus-day',

          userId:
            'user-1',

          provider:
            'apple',

          externalEventId:
            'apple-columbus-day',

          externalCalendarId:
            'apple-holidays',

          externalUpdatedAt:
            undefined,

          isWritable:
            false,

          isAllDay:
            true,

          allDayStartDate:
            '2026-10-12',

          allDayEndDate:
            '2026-10-13',
        });

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed:
            0,

          conflicts:
            0,

          total:
            1,
        });
      },
    );

    it(
      'pulls a read-only Apple event into RISE without writing back to Apple',
      async () => {
        mockGetCalendarsAsync.mockResolvedValue([
          {
            id:
              'apple-calendar-1',

            title:
              'Holidays',

            allowsModifications:
              false,
          },
        ]);

        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'Thanksgiving Day',

            startDate:
              '2026-11-26T08:00:00.000Z',

            endDate:
              '2026-11-27T08:00:00.000Z',

            location:
              null,

            notes:
              '',

            allDay:
              true,
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue([
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

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Changed in RISE',

            startAt:
              '2026-11-26T09:00:00.000Z',

            endAt:
              '2026-11-27T09:00:00.000Z',

            source:
              'apple',

            location:
              'RISE location',

            description:
              'RISE description',

            updatedAt:
              '2026-10-18T20:00:00.000Z',
          },
        ]);

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          mockUpdateCalendarEventLinkWritability,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          false,
        );

        expect(
          mockUpdateCalendarEventLinkAllDayMetadata,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          {
            isAllDay:
              true,

            allDayStartDate:
              '2026-11-26',

            allDayEndDate:
              '2026-11-27',
          },
        );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
            title:
              'Thanksgiving Day',

            startAt:
              '2026-11-26T08:00:00.000Z',

            endAt:
              '2026-11-27T08:00:00.000Z',

            location:
              undefined,

            description:
              undefined,
          },
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockSaveCalendarEventConflict,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
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

          conflicts:
            0,

          total:
            1,
        });
      },
    );

    it(
      'pulls an Apple-side change into the existing RISE event',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'Updated in Apple',

            startDate:
              '2026-10-20T17:30:00.000Z',

            endDate:
              '2026-10-20T18:30:00.000Z',

            location:
              'ECS 302',

            notes:
              'Updated notes',

            allDay:
              false,
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue([
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

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Old title',

            startAt:
              '2026-10-20T17:00:00.000Z',

            endAt:
              '2026-10-20T18:00:00.000Z',

            source:
              'apple',

            location:
              undefined,

            description:
              undefined,

            updatedAt:
              '2026-10-15T14:00:00.000Z',
          },
        ]);

        mockUpdateCalendarEvent.mockResolvedValue(
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Updated in Apple',

            startAt:
              '2026-10-20T17:30:00.000Z',

            endAt:
              '2026-10-20T18:30:00.000Z',

            source:
              'apple',

            location:
              'ECS 302',

            description:
              'Updated notes',
          },
        );

        const result =
          await syncAppleCalendarEvents(
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
              'Updated in Apple',

            startAt:
              '2026-10-20T17:30:00.000Z',

            endAt:
              '2026-10-20T18:30:00.000Z',

            location:
              'ECS 302',

            description:
              'Updated notes',
          },
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed: 0,


          conflicts: 0,
          total:
            1,
        });
      },
    );

    it(
      'does not silently overwrite RISE when both sides may have changed',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'Changed in Apple',

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

        mockGetCalendarEventLinksByProvider.mockResolvedValue([
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

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'Changed in RISE',

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

        const result =
          await syncAppleCalendarEvents(
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
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            0,

          failed: 0,


          conflicts: 1,
          total:
            1,
        });

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'pushes a newer RISE copy to Apple when Apple did not change',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-1',

            calendarId:
              'apple-calendar-1',

            title:
              'Old Apple Version',

            startDate:
              '2026-10-20T17:00:00.000Z',

            endDate:
              '2026-10-20T18:00:00.000Z',

            location:
              'ECS 302',

            notes:
              'Old Apple notes',

            allDay:
              false,

            lastModifiedDate:
              '2026-10-15T14:00:00.000Z',
          },
        ]);

        mockGetCalendarEventLinksByProvider.mockResolvedValue([
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

            externalUpdatedAt:
              '2026-10-15T14:00:00.000Z',
          },
        ]);

        mockGetCalendarEventsByIdsForSync.mockResolvedValue([
          {
            id:
              'rise-event-1',

            userId:
              'user-1',

            title:
              'RISE Offline Version',

            startAt:
              '2026-10-20T18:00:00.000Z',

            endAt:
              '2026-10-20T19:00:00.000Z',

            source:
              'apple',

            location:
              'ECS 410',

            description:
              'Changed while Apple was unavailable',

            updatedAt:
              '2026-10-15T16:00:00.000Z',
          },
        ]);

        mockUpdateAppleCalendarEvent.mockResolvedValue({
          updatedAt:
            '2026-10-15T16:05:00.000Z',
        });

        const result =
          await syncAppleCalendarEvents(
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
          mockUpdateAppleCalendarEvent,
        ).toHaveBeenCalledWith(
          'apple-event-1',
          {
            title:
              'RISE Offline Version',

            startAt:
              '2026-10-20T18:00:00.000Z',

            endAt:
              '2026-10-20T19:00:00.000Z',

            location:
              'ECS 410',

            description:
              'Changed while Apple was unavailable',
          },
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          '2026-10-15T16:05:00.000Z',
        );

        expect(
          result,
        ).toEqual({
          imported:
            0,

          skipped:
            1,

          failed: 0,


          conflicts: 0,
          total:
            1,
        });
      },
    );

    it(
      'continues syncing when one new event fails',
      async () => {
        mockGetEventsAsync.mockResolvedValue([
          {
            id:
              'apple-event-failed',

            calendarId:
              'apple-calendar-1',

            title:
              'Failed Event',

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

          {
            id:
              'apple-event-success',

            calendarId:
              'apple-calendar-1',

            title:
              'Successful Event',

            startDate:
              '2026-10-21T17:00:00.000Z',

            endDate:
              '2026-10-21T18:00:00.000Z',

            location:
              null,

            notes:
              '',

            allDay:
              false,
          },
        ]);

        mockCreateImportedCalendarEvent
          .mockRejectedValueOnce(
            new Error(
              'Import failed',
            ),
          )
          .mockResolvedValueOnce(
            {
              id:
                'rise-success',

              userId:
                'user-1',

              title:
                'Successful Event',

              startAt:
                '2026-10-21T17:00:00.000Z',

              endAt:
                '2026-10-21T18:00:00.000Z',

              source:
                'apple',
            },
          );

        const result =
          await syncAppleCalendarEvents(
            new Date(
              2026,
              9,
              15,
            ),
          );

        expect(
          result,
        ).toEqual({
          imported:
            1,

          skipped:
            0,

          failed: 1,


          conflicts: 0,
          total:
            2,
        });

        expect(
          mockCreateImportedCalendarEvent,
        ).toHaveBeenCalledTimes(
          2,
        );

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      'uses the Fall plus Spring academic sync window during October',
      async () => {
        mockGetEventsAsync.mockResolvedValue(
          [],
        );

        await syncAppleCalendarEvents(
          new Date(
            2026,
            9,
            15,
          ),
        );

        const [
          ,
          rangeStart,
          rangeEnd,
        ] =
          mockGetEventsAsync.mock.calls[0];

        expect(
          rangeStart,
        ).toEqual(
          new Date(
            2026,
            7,
            1,
            0,
            0,
            0,
            0,
          ),
        );

        expect(
          rangeEnd,
        ).toEqual(
          new Date(
            2027,
            5,
            1,
            0,
            0,
            0,
            0,
          ),
        );
      },
    );
  },
);