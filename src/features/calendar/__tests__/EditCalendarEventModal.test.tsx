import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import type {
  CalendarEventConflict,
} from '../../../models/CalendarEventConflict';

import {
  EditCalendarEventModal,
} from '../components/EditCalendarEventModal';

import {
  resolveCalendarEventConflictGroup,
} from '../services/calendarConflictResolutionService';

jest.mock(
  '../services/calendarConflictResolutionService',
  () => ({
    resolveCalendarEventConflictGroup:
      jest.fn(),
  }),
);

jest.mock(
  '../services/calendarEventSyncService',
  () => ({
    updateCalendarEventWithSync:
      jest.fn(),

    retryCalendarEventSync:
      jest.fn(),
  }),
);

jest.mock(
  '../../../../assets/icons/calendar/close.svg',
  () => 'CloseIcon',
);

const mockedResolveCalendarEventConflictGroup =
  jest.mocked(
    resolveCalendarEventConflictGroup,
  );

let rendered!: ReturnType<
  typeof render
>;

const EVENT:
  CalendarEvent = {
    id:
      'event-1',

    userId:
      'user-1',

    title:
      'Study for Exam',

    startAt:
      '2026-10-20T18:00:00.000Z',

    endAt:
      '2026-10-20T19:00:00.000Z',

    source:
      'rise',

    location:
      'Library',

    description:
      'Review chapters',

    eventType:
      'study',

    reminderMinutes:
      180,
  };

const APPLE_CONFLICT:
  CalendarEventConflict = {
    id:
      'conflict-apple',

    calendarEventId:
      'event-1',

    calendarEventLinkId:
      'link-apple',

    userId:
      'user-1',

    provider:
      'apple',

    riseVersion: {
      title:
        'Study for Exam',

      startAt:
        '2026-10-20T18:00:00.000Z',

      endAt:
        '2026-10-20T19:00:00.000Z',

      location:
        'Library',

      description:
        'Review chapters',

      updatedAt:
        '2026-10-18T20:00:00.000Z',
    },

    providerVersion: {
      title:
        'Study for Midterm',

      startAt:
        '2026-10-20T19:00:00.000Z',

      endAt:
        '2026-10-20T20:00:00.000Z',

      location:
        'Home',

      description:
        'Review lecture notes',

      updatedAt:
        '2026-10-18T20:05:00.000Z',
    },

    status:
      'unresolved',

    createdAt:
      '2026-10-18T20:06:00.000Z',
  };

const GOOGLE_CONFLICT:
  CalendarEventConflict = {
    id:
      'conflict-google',

    calendarEventId:
      'event-1',

    calendarEventLinkId:
      'link-google',

    userId:
      'user-1',

    provider:
      'google',

    riseVersion: {
      title:
        'Study for Exam',

      startAt:
        '2026-10-20T18:00:00.000Z',

      endAt:
        '2026-10-20T19:00:00.000Z',

      location:
        'Library',

      description:
        'Review chapters',

      updatedAt:
        '2026-10-18T20:00:00.000Z',
    },

    providerVersion: {
      title:
        'Exam Review Session',

      startAt:
        '2026-10-20T17:00:00.000Z',

      endAt:
        '2026-10-20T18:00:00.000Z',

      location:
        'CSULB',

      description:
        'Go over practice problems',

      updatedAt:
        '2026-10-18T20:07:00.000Z',
    },

    status:
      'unresolved',

    createdAt:
      '2026-10-18T20:08:00.000Z',
  };

async function renderModal(
  conflicts:
    CalendarEventConflict[] = [],
) {
  const onClose =
    jest.fn();

  const onSaved =
    jest.fn();

  const onConflictResolved =
    jest.fn();

  await render(
    <EditCalendarEventModal
      visible
      event={
        EVENT
      }
      conflicts={
        conflicts
      }
      onClose={
        onClose
      }
      onSaved={
        onSaved
      }
      onConflictResolved={
        onConflictResolved
      }
    />,
  );

  return {
    onClose,
    onSaved,
    onConflictResolved,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockedResolveCalendarEventConflictGroup.mockResolvedValue(
    [],
  );
});

describe(
  'EditCalendarEventModal calendar conflicts',
  () => {
    it(
      'shows the normal edit form when the event has no unresolved conflict',
      async () => {
        await renderModal();

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'Edit Event',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.queryByText(
            'Calendar conflict',
          ),
        ).not.toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Save event changes',
            },
          ),
        ).toBeEnabled();
      },
    );

    it(
      'makes the entire edit form view-only for a read-only provider event',
      async () => {
        await render(
          <EditCalendarEventModal
            visible
            event={
              EVENT
            }
            conflicts={
              []
            }
            readOnly
            onClose={
              jest.fn()
            }
            onSaved={
              jest.fn()
            }
            onConflictResolved={
              jest.fn()
            }
          />,
        );

        expect(
          screen.getByText(
            'Read-only calendar event. This event is controlled by a connected calendar and cannot be edited in RISE.',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByLabelText(
            'Title',
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                /^Date,/,
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                /^Start time,/,
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                /^End time,/,
            },
          ),
        ).toBeDisabled();

        for (
          const typeName of [
            'Class',
            'Assignment',
            'Study',
            'Personal',
            'Wellness',
          ]
        ) {
          expect(
            screen.getByRole(
              'radio',
              {
                name:
                  typeName,
              },
            ),
          ).toBeDisabled();
        }

        expect(
          screen.getByLabelText(
            'Location',
          ),
        ).toBeDisabled();

        expect(
          screen.getByLabelText(
            'Description',
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                /^Reminder,/,
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Read-only calendar event',
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByText(
            'Read Only',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'shows an Apple conflict warning and opens the RISE versus Apple comparison',
      async () => {
        await renderModal([
          APPLE_CONFLICT,
        ]);

        expect(
          screen.getByText(
            'Calendar conflict',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'This event was changed in both RISE and Apple Calendar.',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Resolve calendar conflict before saving',
            },
          ),
        ).toBeDisabled();

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'Review Conflict',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'RISE',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'Apple Calendar',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.queryByText(
            'Google Calendar',
          ),
        ).not.toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep RISE version',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Apple Calendar version',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'shows a Google conflict warning and opens the RISE versus Google comparison',
      async () => {
        await renderModal([
          GOOGLE_CONFLICT,
        ]);

        expect(
          screen.getByText(
            'This event was changed in both RISE and Google Calendar.',
          ),
        ).toBeOnTheScreen();

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        expect(
          screen.getByText(
            'RISE',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'Google Calendar',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.queryByText(
            'Apple Calendar',
          ),
        ).not.toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Google Calendar version',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'shows RISE, Apple, and Google when both providers conflict',
      async () => {
        await renderModal([
          APPLE_CONFLICT,
          GOOGLE_CONFLICT,
        ]);

        expect(
          screen.getByText(
            'This event was changed in RISE, Apple Calendar, and Google Calendar.',
          ),
        ).toBeOnTheScreen();

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        expect(
          screen.getByText(
            'RISE',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'Apple Calendar',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'Google Calendar',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep RISE version',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Apple Calendar version',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Google Calendar version',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'resolves the full conflict group when the student keeps Apple',
      async () => {
        const {
          onConflictResolved,
        } =
          await renderModal([
            APPLE_CONFLICT,
            GOOGLE_CONFLICT,
          ]);

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Apple Calendar version',
            },
          ),
        );

        await waitFor(
          async () => {
            expect(
              mockedResolveCalendarEventConflictGroup,
            ).toHaveBeenCalledWith(
              [
                APPLE_CONFLICT,
                GOOGLE_CONFLICT,
              ],
              'apple',
            );
          },
        );

        await waitFor(
          async () => {
            expect(
              onConflictResolved,
            ).toHaveBeenCalledTimes(
              1,
            );
          },
        );

        expect(
          screen.queryByText(
            'Calendar conflict',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'keeps the conflict unresolved and shows Retry when resolution fails',
      async () => {
        mockedResolveCalendarEventConflictGroup.mockRejectedValueOnce(
          new Error(
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
          ),
        );

        await renderModal([
          GOOGLE_CONFLICT,
        ]);

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Google Calendar version',
            },
          ),
        );

        await waitFor(
          async () => {
            expect(
              screen.getByText(
                "Couldn't resolve conflict",
              ),
            ).toBeOnTheScreen();
          },
        );

        expect(
          screen.getByText(
            'Google Calendar needs to be reconnected. Reconnect it in Settings and try again.',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Retry keeping Google Calendar',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'Review Conflict',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'retries the same selected winner after a failed resolution',
      async () => {
        mockedResolveCalendarEventConflictGroup
          .mockRejectedValueOnce(
            new Error(
              'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
            ),
          )
          .mockResolvedValueOnce(
            [],
          );

        const {
          onConflictResolved,
        } =
          await renderModal([
            GOOGLE_CONFLICT,
          ]);

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Review calendar conflict',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Keep Google Calendar version',
            },
          ),
        );

        await waitFor(
          async () => {
            expect(
              screen.getByRole(
                'button',
                {
                  name:
                    'Retry keeping Google Calendar',
                },
              ),
            ).toBeOnTheScreen();
          },
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Retry keeping Google Calendar',
            },
          ),
        );

        await waitFor(
          async () => {
            expect(
              mockedResolveCalendarEventConflictGroup,
            ).toHaveBeenCalledTimes(
              2,
            );
          },
        );

        expect(
          mockedResolveCalendarEventConflictGroup,
        ).toHaveBeenLastCalledWith(
          [
            GOOGLE_CONFLICT,
          ],
          'google',
        );

        await waitFor(
          async () => {
            expect(
              onConflictResolved,
            ).toHaveBeenCalledTimes(
              1,
            );
          },
        );
      },
    );
  },
);