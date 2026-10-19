import type {
  CalendarEventConflict,
} from '../../../models/CalendarEventConflict';

import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLink,
  getCalendarEventLinks,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
} from '../../../repositories/calendarEventLinksRepository';

import {
  markCalendarEventConflictResolved,
} from '../../../repositories/calendarEventConflictsRepository';

import {
  createAppleCalendarEvent,
  deleteAppleCalendarEvent,
  updateAppleCalendarEvent,
} from '../services/calendarService';

import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '../services/googleCalendarService';

import {
  resolveCalendarEventConflict,
  resolveCalendarEventConflictGroup,
} from '../services/calendarConflictResolutionService';

jest.mock(
  '../../../repositories/calendarEventsRepository',
  () => ({
    deleteCalendarEvent:
      jest.fn(),

    updateCalendarEvent:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventLinksRepository',
  () => ({
    getCalendarEventLink:
      jest.fn(),

    getCalendarEventLinks:
      jest.fn(),

    markCalendarEventLinkSynced:
      jest.fn(),

    saveCalendarEventLink:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/calendarEventConflictsRepository',
  () => ({
    markCalendarEventConflictResolved:
      jest.fn(),
  }),
);

jest.mock(
  '../services/calendarService',
  () => ({
    createAppleCalendarEvent:
      jest.fn(),

    deleteAppleCalendarEvent:
      jest.fn(),

    updateAppleCalendarEvent:
      jest.fn(),
  }),
);

jest.mock(
  '../services/googleCalendarService',
  () => ({
    createGoogleCalendarEvent:
      jest.fn(),

    deleteGoogleCalendarEvent:
      jest.fn(),

    updateGoogleCalendarEvent:
      jest.fn(),
  }),
);

const mockDeleteCalendarEvent =
  deleteCalendarEvent as jest.Mock;

const mockUpdateCalendarEvent =
  updateCalendarEvent as jest.Mock;

const mockGetCalendarEventLink =
  getCalendarEventLink as jest.Mock;

const mockGetCalendarEventLinks =
  getCalendarEventLinks as jest.Mock;

const mockMarkCalendarEventLinkSynced =
  markCalendarEventLinkSynced as jest.Mock;

const mockSaveCalendarEventLink =
  saveCalendarEventLink as jest.Mock;

const mockMarkCalendarEventConflictResolved =
  markCalendarEventConflictResolved as jest.Mock;

const mockCreateAppleCalendarEvent =
  createAppleCalendarEvent as jest.Mock;

const mockDeleteAppleCalendarEvent =
  deleteAppleCalendarEvent as jest.Mock;

const mockUpdateAppleCalendarEvent =
  updateAppleCalendarEvent as jest.Mock;

const mockCreateGoogleCalendarEvent =
  createGoogleCalendarEvent as jest.Mock;

const mockDeleteGoogleCalendarEvent =
  deleteGoogleCalendarEvent as jest.Mock;

const mockUpdateGoogleCalendarEvent =
  updateGoogleCalendarEvent as jest.Mock;

const appleConflict: CalendarEventConflict = {
  id:
    'conflict-apple-1',

  calendarEventId:
    'rise-event-1',

  calendarEventLinkId:
    'apple-link-1',

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

  status:
    'unresolved',

  createdAt:
    '2026-10-18T21:05:00.000Z',
};

const googleConflict: CalendarEventConflict = {
  ...appleConflict,

  id:
    'conflict-google-1',

  calendarEventLinkId:
    'google-link-1',

  provider:
    'google',

  providerVersion: {
    title:
      'Google Version',

    startAt:
      '2026-10-20T20:00:00.000Z',

    endAt:
      '2026-10-20T21:00:00.000Z',

    location:
      'ECS 302',

    description:
      'Changed in Google',

    updatedAt:
      '2026-10-18T21:30:00.000Z',
  },
};

const appleLink = {
  id:
    'apple-link-1',

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
};

const googleLink = {
  id:
    'google-link-1',

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
};

function mockProviderLinks() {
  mockGetCalendarEventLink.mockImplementation(
    async (
      _calendarEventId,
      provider,
    ) => {
      if (
        provider ===
        'apple'
      ) {
        return appleLink;
      }

      if (
        provider ===
        'google'
      ) {
        return googleLink;
      }

      return null;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();

  mockDeleteCalendarEvent.mockResolvedValue(
    undefined,
  );

  mockUpdateCalendarEvent.mockResolvedValue({
    id:
      'rise-event-1',
  });

  mockGetCalendarEventLinks.mockResolvedValue([
    appleLink,
    googleLink,
  ]);

  mockMarkCalendarEventLinkSynced.mockResolvedValue(
    undefined,
  );

  mockSaveCalendarEventLink.mockResolvedValue(
    undefined,
  );

  mockCreateAppleCalendarEvent.mockResolvedValue({
    externalEventId:
      'apple-event-recreated',
    externalCalendarId:
      'apple-calendar-new',
    updatedAt:
      '2026-10-18T22:40:00.000Z',
  });

  mockDeleteAppleCalendarEvent.mockResolvedValue(
    undefined,
  );

  mockUpdateAppleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-10-18T22:10:00.000Z',
  });

  mockCreateGoogleCalendarEvent.mockResolvedValue({
    externalEventId:
      'google-event-recreated',
    externalCalendarId:
      'primary',
    updatedAt:
      '2026-10-18T22:45:00.000Z',
  });

  mockDeleteGoogleCalendarEvent.mockResolvedValue(
    undefined,
  );

  mockUpdateGoogleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-10-18T22:15:00.000Z',
  });

  mockMarkCalendarEventConflictResolved.mockImplementation(
    async (
      conflictId,
      resolution,
    ) => ({
      ...appleConflict,

      id:
        conflictId,

      status:
        'resolved',

      resolution,

      resolvedAt:
        '2026-10-18T22:30:00.000Z',
    }),
  );
});

describe(
  'resolveCalendarEventConflict',
  () => {
    it(
      'keeps the RISE version for Apple and updates the Apple provider copy',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          appleLink,
        );

        await resolveCalendarEventConflict(
          appleConflict,
          'rise',
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).toHaveBeenCalledWith(
          'apple-event-1',
          {
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
          },
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          '2026-10-18T22:10:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-apple-1',
          'rise',
        );
      },
    );

    it(
      'rejects keeping RISE when the provider link is read-only',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue({
          ...appleLink,

          isWritable:
            false,
        });

        await expect(
          resolveCalendarEventConflict(
            appleConflict,
            'rise',
          ),
        ).rejects.toThrow(
          'CALENDAR_PROVIDER_READ_ONLY',
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps the RISE version for Google and updates the Google provider copy',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          googleLink,
        );

        await resolveCalendarEventConflict(
          googleConflict,
          'rise',
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
          {
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
          },
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-10-18T22:15:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-google-1',
          'rise',
        );
      },
    );

    it(
      'keeps the connected Apple version by updating RISE',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          appleLink,
        );

        await resolveCalendarEventConflict(
          appleConflict,
          'apple',
        );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
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
          },
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          '2026-10-18T21:00:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-apple-1',
          'apple',
        );
      },
    );

    it(
      'does not mark the conflict resolved when the provider update fails',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          appleLink,
        );

        mockUpdateAppleCalendarEvent.mockRejectedValue(
          new Error(
            'APPLE_CALENDAR_NOT_CONNECTED',
          ),
        );

        await expect(
          resolveCalendarEventConflict(
            appleConflict,
            'rise',
          ),
        ).rejects.toThrow(
          'APPLE_CALENDAR_NOT_CONNECTED',
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not mark the conflict resolved when updating RISE fails',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          googleLink,
        );

        mockUpdateCalendarEvent.mockRejectedValue(
          new Error(
            'RISE_UPDATE_FAILED',
          ),
        );

        await expect(
          resolveCalendarEventConflict(
            googleConflict,
            'google',
          ),
        ).rejects.toThrow(
          'RISE_UPDATE_FAILED',
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'refuses to resolve a conflict when its provider link no longer exists',
      async () => {
        mockGetCalendarEventLink.mockResolvedValue(
          null,
        );

        await expect(
          resolveCalendarEventConflict(
            appleConflict,
            'rise',
          ),
        ).rejects.toThrow(
          'CALENDAR_CONFLICT_LINK_NOT_FOUND',
        );

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'refuses to resolve a conflict that is already resolved',
      async () => {
        await expect(
          resolveCalendarEventConflict(
            {
              ...appleConflict,

              status:
                'resolved',

              resolution:
                'rise',

              resolvedAt:
                '2026-10-18T22:00:00.000Z',
            },
            'rise',
          ),
        ).rejects.toThrow(
          'CALENDAR_CONFLICT_ALREADY_RESOLVED',
        );

        expect(
          mockGetCalendarEventLink,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'resolveCalendarEventConflictGroup',
  () => {
    it(
      'keeps RISE and pushes the RISE version to both Apple and Google',
      async () => {
        mockProviderLinks();

        await resolveCalendarEventConflictGroup(
          [
            appleConflict,
            googleConflict,
          ],
          'rise',
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
              'RISE Version',

            startAt:
              '2026-10-20T18:00:00.000Z',

            endAt:
              '2026-10-20T19:00:00.000Z',

            location:
              'Library',

            description:
              'Changed in RISE',
          },
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
          {
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
          },
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-apple-1',
          'rise',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-google-1',
          'rise',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      'keeps Apple by updating RISE and pushing the Apple version to Google',
      async () => {
        mockProviderLinks();

        await resolveCalendarEventConflictGroup(
          [
            appleConflict,
            googleConflict,
          ],
          'apple',
        );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
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
          },
        );

        /*
         * Apple already contains the winning copy,
         * so Apple itself does not need another write.
         */
        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        /*
         * Google's conflicting copy is replaced with
         * the Apple version selected by the student.
         */
        expect(
          mockUpdateGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
          {
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
          },
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'apple',
          '2026-10-18T21:00:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-apple-1',
          'apple',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-google-1',
          'apple',
        );
      },
    );

    it(
      'keeps Google by updating RISE and pushing the Google version to Apple',
      async () => {
        mockProviderLinks();

        await resolveCalendarEventConflictGroup(
          [
            appleConflict,
            googleConflict,
          ],
          'google',
        );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
            title:
              'Google Version',

            startAt:
              '2026-10-20T20:00:00.000Z',

            endAt:
              '2026-10-20T21:00:00.000Z',

            location:
              'ECS 302',

            description:
              'Changed in Google',
          },
        );

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateAppleCalendarEvent,
        ).toHaveBeenCalledWith(
          'apple-event-1',
          {
            title:
              'Google Version',

            startAt:
              '2026-10-20T20:00:00.000Z',

            endAt:
              '2026-10-20T21:00:00.000Z',

            location:
              'ECS 302',

            description:
              'Changed in Google',
          },
        );

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-10-18T21:30:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-apple-1',
          'google',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledWith(
          'conflict-google-1',
          'google',
        );
      },
    );

    it(
      'leaves every conflict unresolved when one provider cannot accept the winning version',
      async () => {
        mockProviderLinks();

        mockUpdateGoogleCalendarEvent.mockRejectedValue(
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
          ),
        );

        await expect(
          resolveCalendarEventConflictGroup(
            [
              appleConflict,
              googleConflict,
            ],
            'rise',
          ),
        ).rejects.toThrow(
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
        );

        /*
         * Apple may already have received the RISE version before
         * Google failed, but neither conflict is considered resolved.
         *
         * Retrying is safe because the desired winning version is
         * still the same.
         */
        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps RISE by recreating a deleted Apple copy without creating a duplicate Google copy',
      async () => {
        const deletedAppleConflict:
          CalendarEventConflict = {
            ...appleConflict,

            providerVersion: {
              ...appleConflict.providerVersion,

              deleted:
                true,
            },
          };

        mockProviderLinks();

        await resolveCalendarEventConflictGroup(
          [
            deletedAppleConflict,
            googleConflict,
          ],
          'rise',
        );

        expect(
          mockCreateAppleCalendarEvent,
        ).toHaveBeenCalledWith({
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
        });

        expect(
          mockSaveCalendarEventLink,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            calendarEventId:
              'rise-event-1',

            userId:
              'user-1',

            provider:
              'apple',

            externalEventId:
              'apple-event-recreated',

            externalCalendarId:
              'apple-calendar-new',
          }),
        );

        /*
         * Google already has a linked copy. It is updated using the
         * existing external event ID rather than recreated.
         */
        expect(
          mockUpdateGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
          {
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
          },
        );

        expect(
          mockCreateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      'keeps Apple deletion by deleting the surviving Google copy before deleting RISE',
      async () => {
        const deletedAppleConflict:
          CalendarEventConflict = {
            ...appleConflict,

            providerVersion: {
              ...appleConflict.providerVersion,

              deleted:
                true,
            },
          };

        mockProviderLinks();

        const operations:
          string[] = [];

        mockDeleteGoogleCalendarEvent.mockImplementation(
          async () => {
            operations.push(
              'google',
            );
          },
        );

        mockDeleteCalendarEvent.mockImplementation(
          async () => {
            operations.push(
              'rise',
            );
          },
        );

        const result =
          await resolveCalendarEventConflictGroup(
            [
              deletedAppleConflict,
              googleConflict,
            ],
            'apple',
          );

        expect(
          mockDeleteAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockDeleteGoogleCalendarEvent,
        ).toHaveBeenCalledWith(
          'google-event-1',
          'primary',
        );

        expect(
          mockDeleteCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
        );

        expect(
          operations,
        ).toEqual([
          'google',
          'rise',
        ]);

        /*
         * Deleting RISE cascades its links/conflicts, so there are no
         * surviving conflict rows to mark individually afterward.
         */
        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();

        expect(
          result,
        ).toEqual([]);
      },
    );

    it(
      'keeps Google by updating RISE and recreating Apple when Apple was deleted',
      async () => {
        const deletedAppleConflict:
          CalendarEventConflict = {
            ...appleConflict,

            providerVersion: {
              ...appleConflict.providerVersion,

              deleted:
                true,
            },
          };

        mockProviderLinks();

        await resolveCalendarEventConflictGroup(
          [
            deletedAppleConflict,
            googleConflict,
          ],
          'google',
        );

        expect(
          mockUpdateCalendarEvent,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          {
            title:
              'Google Version',

            startAt:
              '2026-10-20T20:00:00.000Z',

            endAt:
              '2026-10-20T21:00:00.000Z',

            location:
              'ECS 302',

            description:
              'Changed in Google',
          },
        );

        expect(
          mockCreateAppleCalendarEvent,
        ).toHaveBeenCalledWith({
          title:
            'Google Version',

          startAt:
            '2026-10-20T20:00:00.000Z',

          endAt:
            '2026-10-20T21:00:00.000Z',

          location:
            'ECS 302',

          description:
            'Changed in Google',
        });

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        /*
         * Google is the winning provider and already has the selected
         * version, so it is not recreated or rewritten.
         */
        expect(
          mockCreateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventLinkSynced,
        ).toHaveBeenCalledWith(
          'rise-event-1',
          'google',
          '2026-10-18T21:30:00.000Z',
        );

        expect(
          mockMarkCalendarEventConflictResolved,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      'keeps RISE when deleting a surviving provider fails during deletion resolution',
      async () => {
        const deletedAppleConflict:
          CalendarEventConflict = {
            ...appleConflict,

            providerVersion: {
              ...appleConflict.providerVersion,

              deleted:
                true,
            },
          };

        mockProviderLinks();

        mockDeleteGoogleCalendarEvent.mockRejectedValue(
          new Error(
            'GOOGLE_CALENDAR_DELETE_FAILED',
          ),
        );

        await expect(
          resolveCalendarEventConflictGroup(
            [
              deletedAppleConflict,
              googleConflict,
            ],
            'apple',
          ),
        ).rejects.toThrow(
          'GOOGLE_CALENDAR_DELETE_FAILED',
        );

        /*
         * The central RISE event must survive when propagation of the
         * winning deletion did not complete.
         */
        expect(
          mockDeleteCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'refuses to choose Apple when no Apple conflict exists in the group',
      async () => {
        await expect(
          resolveCalendarEventConflictGroup(
            [
              googleConflict,
            ],
            'apple',
          ),
        ).rejects.toThrow(
          'CALENDAR_CONFLICT_WINNER_NOT_AVAILABLE',
        );

        expect(
          mockUpdateCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateAppleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateGoogleCalendarEvent,
        ).not.toHaveBeenCalled();

        expect(
          mockMarkCalendarEventConflictResolved,
        ).not.toHaveBeenCalled();
      },
    );
  },
);