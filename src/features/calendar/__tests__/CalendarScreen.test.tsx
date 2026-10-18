import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import {
  CalendarScreen,
} from '../screens/CalendarScreen';

import * as googleTokenService from '../services/googleTokenService';

const mockGetCalendarEventsInRange =
  jest.fn();

const mockCreateCalendarEvent =
  jest.fn();

const mockGetLatestCalendarEventLinkSyncTime =
  jest.fn();

const mockStartAppleCalendarBackgroundSync =
  jest.fn();

const mockStartGoogleCalendarBackgroundSync =
  jest.fn();

const mockGetCalendarConnection =
  jest.fn();

const mockGetAppleCalendarAccess =
  jest.fn();

let mockBackgroundSyncSnapshot = {
  status:
    'idle' as
      | 'idle'
      | 'syncing'
      | 'error',

  provider:
    null as
      | 'apple'
      | 'google'
      | null,

  lastSyncedAt:
    null as Date | null,

  error:
    null as string | null,
};

let mockBackgroundSyncRunning =
  false;

jest.mock(
  '@react-navigation/native',
  () => {
    const ReactModule =
      require(
        'react',
      );

    return {
      useFocusEffect: (
        callback: () =>
          | void
          | (() => void),
      ) => {
        ReactModule.useEffect(
          callback,
          [
            callback,
          ],
        );
      },
    };
  },
);

jest.mock(
  '../../../repositories/calendarEventsRepository',
  () => ({
    getCalendarEventsInRange:
      (...args: unknown[]) =>
        mockGetCalendarEventsInRange(
          ...args,
        ),
    createCalendarEvent:
      (...args: unknown[]) =>
        mockCreateCalendarEvent(
          ...args,
        ),
  }),
);

beforeEach(() => {
  mockCreateCalendarEvent.mockReset();
});

jest.mock(
  '../../../repositories/calendarEventLinksRepository',
  () => ({
    getLatestCalendarEventLinkSyncTime:
      (...args: unknown[]) =>
        mockGetLatestCalendarEventLinkSyncTime(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/calendarBackgroundSyncService',
  () => ({
    getCalendarBackgroundSyncSnapshot:
      () =>
        mockBackgroundSyncSnapshot,

    isCalendarBackgroundSyncRunning:
      () =>
        mockBackgroundSyncRunning,

    markCalendarBackgroundSyncSuccessful:
      jest.fn(),

    startAppleCalendarBackgroundSync:
      (...args: unknown[]) =>
        mockStartAppleCalendarBackgroundSync(
          ...args,
        ),

    startGoogleCalendarBackgroundSync:
      (...args: unknown[]) =>
        mockStartGoogleCalendarBackgroundSync(
          ...args,
        ),

    subscribeToCalendarBackgroundSync:
      jest.fn(
        () =>
          () => {},
      ),
  }),
);

jest.mock(
  '../services/calendarConnectionService',
  () => ({
    getCalendarConnection:
      (...args: unknown[]) =>
        mockGetCalendarConnection(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/calendarService',
  () => ({
    getAppleCalendarAccess:
      (...args: unknown[]) =>
        mockGetAppleCalendarAccess(
          ...args,
        ),
  }),
);

function makeEvent(
  title: string,
  start: Date,
  end: Date,
): CalendarEvent {
  return {
    id:
      title,

    userId:
      'user-1',

    title,

    startAt:
      start.toISOString(),

    endAt:
      end.toISOString(),

    source:
      'rise',
  };
}

// Pin "today" to Friday, November 13, 2026
// (the day used in the Figma frames).
beforeEach(() => {
  jest.useFakeTimers({
    now:
      new Date(
        2026,
        10,
        13,
        9,
        30,
      ),
  });

  mockGetCalendarEventsInRange.mockResolvedValue(
    [],
  );

  /*
   * Treat provider sync as recently successful so these UI tests
   * do not trigger an Apple Calendar pull when focus runs.
   */
  mockGetLatestCalendarEventLinkSyncTime.mockResolvedValue(
    new Date(
      2026,
      10,
      13,
      9,
      25,
    ).toISOString(),
  );

  mockBackgroundSyncSnapshot = {
    status:
      'idle',

    provider:
      null,

    lastSyncedAt:
      null,

    error:
      null,
  };

  mockBackgroundSyncRunning =
    false;

  mockGetCalendarConnection.mockResolvedValue(
    null,
  );

  mockGetAppleCalendarAccess.mockResolvedValue(
    'full',
  );

  mockStartAppleCalendarBackgroundSync.mockResolvedValue(
    {
      imported:
        0,

      skipped:
        0,

      failed:
        0,

      total:
        0,
    },
  );

  mockStartGoogleCalendarBackgroundSync.mockResolvedValue(
    {
      imported:
        0,

      skipped:
        0,

      failed:
        0,

      total:
        0,
    },
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe(
  'CalendarScreen',
  () => {
    it(
      'opens on the month view for the current month',
      async () => {
        await render(
          <CalendarScreen />,
        );

        expect(
          screen.getByRole(
            'tab',
            {
              name:
                'Month',
            },
          ),
        ).toBeSelected();

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'November 2026',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'selects a view when its option is tapped',
      async () => {
        await render(
          <CalendarScreen />,
        );

        for (
          const name of [
            'Week',
            '2 Day',
            'Day',
            'Month',
          ]
        ) {
          await fireEvent.press(
            screen.getByRole(
              'tab',
              {
                name,
              },
            ),
          );

          expect(
            screen.getByRole(
              'tab',
              {
                name,
              },
            ),
          ).toBeSelected();

          expect(
            screen.getAllByRole(
              'tab',
              {
                selected:
                  true,
              },
            ),
          ).toHaveLength(
            1,
          );
        }
      },
    );

    it(
      'moves between months with the arrows, across the year boundary',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Next month',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Next month',
            },
          ),
        );

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'January 2027',
            },
          ),
        ).toBeOnTheScreen();

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Previous month',
            },
          ),
        );

        expect(
          screen.getByRole(
            'header',
            {
              name:
                'December 2026',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'moves the arrows by the period of the selected view',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await fireEvent.press(
          screen.getByRole(
            'tab',
            {
              name:
                '2 Day',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Next 2 days',
            },
          ),
        );

        expect(
          screen.getByLabelText(
            'Sunday, November 15',
          ),
        ).toBeOnTheScreen();

        await fireEvent.press(
          screen.getByRole(
            'tab',
            {
              name:
                'Week',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Previous week',
            },
          ),
        );

        expect(
          screen.getByLabelText(
            'Sunday, November 8',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'keeps the selected day when switching views',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await fireEvent.press(
          screen.getByRole(
            'tab',
            {
              name:
                'Day',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'button',
            {
              name:
                'Next day',
            },
          ),
        );

        await fireEvent.press(
          screen.getByRole(
            'tab',
            {
              name:
                'Week',
            },
          ),
        );

        expect(
          screen.getByLabelText(
            'Saturday, November 14',
          ),
        ).toBeOnTheScreen();
      },
    );

    describe(
      'week view',
      () => {
        it(
          'shows the Sunday–Saturday week around the selected day, with today circled',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Week',
                },
              ),
            );

            for (
              const name of [
                'Sunday, November 8',
                'Monday, November 9',
                'Tuesday, November 10',
                'Wednesday, November 11',
                'Thursday, November 12',
                'Today, Friday, November 13',
                'Saturday, November 14',
              ]
            ) {
              expect(
                screen.getByRole(
                  'header',
                  {
                    name,
                  },
                ),
              ).toBeOnTheScreen();
            }

            expect(
              screen.getAllByRole(
                'header',
              ),
            ).toHaveLength(
              8,
            );
          },
        );

        it(
          'shows every hour of the day',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Week',
                },
              ),
            );

            for (
              const hour of [
                '12 AM',
                '7 AM',
                '12 PM',
                '11 PM',
              ]
            ) {
              expect(
                screen.getByText(
                  hour,
                ),
              ).toBeOnTheScreen();
            }
          },
        );

        it(
          'moves to the next week across a month boundary',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Week',
                },
              ),
            );

            for (
              let week = 0;
              week < 3;
              week += 1
            ) {
              await fireEvent.press(
                screen.getByRole(
                  'button',
                  {
                    name:
                      'Next week',
                  },
                ),
              );
            }

            expect(
              screen.getByLabelText(
                'Sunday, November 29',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByLabelText(
                'Saturday, December 5',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'December 2026',
                },
              ),
            ).toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      '2 day view',
      () => {
        it(
          'shows the selected day and the next day',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    '2 Day',
                },
              ),
            );

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Today, Friday, November 13',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Saturday, November 14',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getAllByRole(
                'header',
              ),
            ).toHaveLength(
              3,
            );

            expect(
              screen.getByText(
                '7 AM',
              ),
            ).toBeOnTheScreen();
          },
        );

        it(
          'moves two days at a time, into the next month',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    '2 Day',
                },
              ),
            );

            for (
              let page = 0;
              page < 9;
              page += 1
            ) {
              await fireEvent.press(
                screen.getByRole(
                  'button',
                  {
                    name:
                      'Next 2 days',
                  },
                ),
              );
            }

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Tuesday, December 1',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Wednesday, December 2',
                },
              ),
            ).toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'day view',
      () => {
        it(
          'shows only the selected day, with its date',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Day',
                },
              ),
            );

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Today, Friday, November 13',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getAllByRole(
                'header',
              ),
            ).toHaveLength(
              2,
            );

            expect(
              screen.getByText(
                '11 PM',
              ),
            ).toBeOnTheScreen();
          },
        );

        it(
          'moves one day at a time',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Day',
                },
              ),
            );

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    'Previous day',
                },
              ),
            );

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'Thursday, November 12',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              screen.queryByRole(
                'header',
                {
                  name:
                    /November 13/,
                },
              ),
            ).not.toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'events on the hourly views',
      () => {
        const lecture =
          makeEvent(
            'Biology Lecture',
            new Date(
              2026,
              10,
              13,
              9,
              0,
            ),
            new Date(
              2026,
              10,
              13,
              10,
              30,
            ),
          );

        const lateReview =
          makeEvent(
            'Late-Night Review',
            new Date(
              2026,
              10,
              13,
              23,
              30,
            ),
            new Date(
              2026,
              10,
              14,
              1,
              0,
            ),
          );

        beforeEach(() => {
          mockGetCalendarEventsInRange.mockResolvedValue(
            [
              lecture,
              lateReview,
            ],
          );
        });

        it(
          'shows the same event at the same time in Week, 2 Day, and Day (AC6)',
          async () => {
            await render(
              <CalendarScreen />,
            );

            for (
              const view of [
                'Week',
                '2 Day',
                'Day',
              ]
            ) {
              await fireEvent.press(
                screen.getByRole(
                  'tab',
                  {
                    name:
                      view,
                  },
                ),
              );

              expect(
                await screen.findByLabelText(
                  'Biology Lecture, 9:00 AM to 10:30 AM',
                ),
              ).toBeOnTheScreen();
            }
          },
        );

        it(
          'draws an event that crosses midnight on both days',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    '2 Day',
                },
              ),
            );

            expect(
              await screen.findAllByLabelText(
                'Late-Night Review, 11:30 PM to 1:00 AM',
              ),
            ).toHaveLength(
              2,
            );
          },
        );

        it(
          'loads events for the dates on screen when the view changes',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'tab',
                {
                  name:
                    'Day',
                },
              ),
            );

            expect(
              mockGetCalendarEventsInRange,
            ).toHaveBeenLastCalledWith(
              new Date(
                2026,
                10,
                13,
              ),
              new Date(
                2026,
                10,
                14,
              ),
            );
          },
        );
      },
    );

    describe(
      'events in the month view',
      () => {
        const at = (
          day: number,
          hour: number,
        ) =>
          new Date(
            2026,
            10,
            day,
            hour,
            0,
          );

        it(
          'shows up to two events under a date, then "+N more"',
          async () => {
            mockGetCalendarEventsInRange.mockResolvedValue(
              [
                makeEvent(
                  'Lecture',
                  at(
                    13,
                    9,
                  ),
                  at(
                    13,
                    10,
                  ),
                ),

                makeEvent(
                  'Lab',
                  at(
                    13,
                    11,
                  ),
                  at(
                    13,
                    12,
                  ),
                ),

                makeEvent(
                  'Study Group',
                  at(
                    13,
                    13,
                  ),
                  at(
                    13,
                    14,
                  ),
                ),

                makeEvent(
                  'Office Hours',
                  at(
                    13,
                    16,
                  ),
                  at(
                    13,
                    17,
                  ),
                ),

                makeEvent(
                  'Quiz',
                  at(
                    18,
                    12,
                  ),
                  at(
                    18,
                    13,
                  ),
                ),
              ],
            );

            await render(
              <CalendarScreen />,
            );

            const todayCell =
              await screen.findByLabelText(
                'Today, Friday, November 13, 4 events',
              );

            expect(
              within(
                todayCell,
              ).getByText(
                'Lecture',
              ),
            ).toBeOnTheScreen();

            expect(
              within(
                todayCell,
              ).getByText(
                'Lab',
              ),
            ).toBeOnTheScreen();

            expect(
              within(
                todayCell,
              ).queryByText(
                'Study Group',
              ),
            ).not.toBeOnTheScreen();

            expect(
              within(
                todayCell,
              ).getByText(
                '+2 more',
              ),
            ).toBeOnTheScreen();

            const quizDay =
              screen.getByLabelText(
                'Wednesday, November 18, 1 event',
              );

            expect(
              within(
                quizDay,
              ).getByText(
                'Quiz',
              ),
            ).toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'today card under the month grid',
      () => {
        it(
          "lists today's events with their times",
          async () => {
            mockGetCalendarEventsInRange.mockResolvedValue(
              [
                makeEvent(
                  'Biology Lecture',
                  new Date(
                    2026,
                    10,
                    13,
                    9,
                    0,
                  ),
                  new Date(
                    2026,
                    10,
                    13,
                    10,
                    30,
                  ),
                ),

                makeEvent(
                  'Osmosis Lab Report',
                  new Date(
                    2026,
                    10,
                    13,
                    23,
                    59,
                  ),
                  new Date(
                    2026,
                    10,
                    13,
                    23,
                    59,
                  ),
                ),

                makeEvent(
                  'Algebra Quiz',
                  new Date(
                    2026,
                    10,
                    18,
                    12,
                    0,
                  ),
                  new Date(
                    2026,
                    10,
                    18,
                    13,
                    0,
                  ),
                ),
              ],
            );

            await render(
              <CalendarScreen />,
            );

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'November 13, Friday',
                },
              ),
            ).toBeOnTheScreen();

            expect(
              await screen.findByText(
                '9:00 AM – 10:30 AM',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByText(
                'At 11:59 PM',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.queryByText(
                '12:00 PM – 1:00 PM',
              ),
            ).not.toBeOnTheScreen();
          },
        );

        it(
          'says so when there are no events today',
          async () => {
            await render(
              <CalendarScreen />,
            );

            expect(
              await screen.findByText(
                'No events today.',
              ),
            ).toBeOnTheScreen();
          },
        );

        it(
          'keeps showing today while browsing other months',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    'Next month',
                },
              ),
            );

            expect(
              screen.getByRole(
                'header',
                {
                  name:
                    'November 13, Friday',
                },
              ),
            ).toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'loading and errors',
      () => {
        it(
          "shows a message with Retry when events can't load, and loads again on Retry",
          async () => {
            const logSpy =
              jest
                .spyOn(
                  console,
                  'log',
                )
                .mockImplementation(
                  () => {},
                );

            let databaseIsDown =
              true;

            mockGetCalendarEventsInRange.mockImplementation(
              () =>
                databaseIsDown
                  ? Promise.reject(
                      new Error(
                        'permission denied for table calendar_events',
                      ),
                    )
                  : Promise.resolve(
                      [
                        makeEvent(
                          'Lecture',
                          new Date(
                            2026,
                            10,
                            13,
                            9,
                          ),
                          new Date(
                            2026,
                            10,
                            13,
                            10,
                          ),
                        ),
                      ],
                    ),
            );

            await render(
              <CalendarScreen />,
            );

            expect(
              await screen.findByText(
                "Couldn't load events.",
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByText(
                "Couldn't load today's events.",
              ),
            ).toBeOnTheScreen();

            databaseIsDown =
              false;

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    'Retry',
                },
              ),
            );

            expect(
              await screen.findByLabelText(
                'Today, Friday, November 13, 1 event',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.queryByText(
                "Couldn't load events.",
              ),
            ).not.toBeOnTheScreen();

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    "Retry today's events",
                },
              ),
            );

            expect(
              await screen.findByText(
                '9:00 AM – 10:00 AM',
              ),
            ).toBeOnTheScreen();

            logSpy.mockRestore();
          },
        );

        it(
          'shows a spinner only when loading takes a while',
          async () => {
            mockGetCalendarEventsInRange.mockReturnValue(
              new Promise(
                () => {},
              ),
            );

            await render(
              <CalendarScreen />,
            );

            expect(
              screen.queryByLabelText(
                'Loading events',
              ),
            ).not.toBeOnTheScreen();

            await act(
              async () => {
                jest.advanceTimersByTime(
                  300,
                );
              },
            );

            expect(
              screen.getByLabelText(
                'Loading events',
              ),
            ).toBeOnTheScreen();
          },
        );

        it(
          'shows nothing extra when there are no events',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await act(
              async () => {
                jest.advanceTimersByTime(
                  300,
                );
              },
            );

            expect(
              screen.queryByLabelText(
                'Loading events',
              ),
            ).not.toBeOnTheScreen();

            expect(
              screen.queryByText(
                "Couldn't load events.",
              ),
            ).not.toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'month view',
      () => {
        it(
          "shows every date of the current month and circles today's date",
          async () => {
            await render(
              <CalendarScreen />,
            );

            expect(
              screen.getByLabelText(
                'Sunday, November 1',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByLabelText(
                'Monday, November 30',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByLabelText(
                'Today, Friday, November 13',
              ),
            ).toBeOnTheScreen();
          },
        );

        it(
          'leaves the cells for neighboring months blank',
          async () => {
            await render(
              <CalendarScreen />,
            );

            expect(
              screen.queryByLabelText(
                'Tuesday, December 1',
              ),
            ).not.toBeOnTheScreen();

            expect(
              screen.getAllByText(
                '5',
              ),
            ).toHaveLength(
              1,
            );
          },
        );

        it(
          'shows the correct dates after moving to another month',
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    'Next month',
                },
              ),
            );

            expect(
              screen.getByLabelText(
                'Tuesday, December 1',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.getByLabelText(
                'Thursday, December 31',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.queryByLabelText(
                'Monday, November 30',
              ),
            ).not.toBeOnTheScreen();
          },
        );

        it(
          "only circles today's date in the current month",
          async () => {
            await render(
              <CalendarScreen />,
            );

            await fireEvent.press(
              screen.getByRole(
                'button',
                {
                  name:
                    'Previous month',
                },
              ),
            );

            expect(
              screen.getByLabelText(
                'Tuesday, October 13',
              ),
            ).toBeOnTheScreen();

            expect(
              screen.queryByLabelText(
                /^Today/,
              ),
            ).not.toBeOnTheScreen();
          },
        );
      },
    );

    describe(
      'calendar provider synchronization',
      () => {
        async function waitForInitialCalendarFocus() {
          await waitFor(() => {
            expect(
              mockGetLatestCalendarEventLinkSyncTime,
            ).toHaveBeenCalledWith(
              'apple',
            );

            expect(
              mockGetLatestCalendarEventLinkSyncTime,
            ).toHaveBeenCalledWith(
              'google',
            );
          });

          mockStartAppleCalendarBackgroundSync.mockClear();

          mockStartGoogleCalendarBackgroundSync.mockClear();
        }

        it(
          'manually syncs Apple when only Apple Calendar is connected',
          async () => {
            mockGetCalendarConnection.mockImplementation(
              async (
                provider: string,
              ) => {
                if (
                  provider ===
                  'apple'
                ) {
                  return {
                    provider:
                      'apple',

                    provider_email:
                      null,

                    connected:
                      true,
                  };
                }

                return null;
              },
            );

            const utils =
              await render(
                <CalendarScreen />,
              );

            await waitForInitialCalendarFocus();

            await act(
              async () => {
                fireEvent.press(
                  utils.getByRole(
                    'button',
                    {
                      name:
                        'Sync calendars',
                    },
                  ),
                );

                await Promise.resolve();

                await Promise.resolve();

                await Promise.resolve();
              },
            );

            expect(
              mockStartAppleCalendarBackgroundSync,
            ).toHaveBeenCalledTimes(
              1,
            );

            expect(
              mockStartGoogleCalendarBackgroundSync,
            ).not.toHaveBeenCalled();

            expect(
              mockGetCalendarConnection,
            ).toHaveBeenCalledWith(
              'apple',
            );

            expect(
              mockGetCalendarConnection,
            ).toHaveBeenCalledWith(
              'google',
            );

            await waitFor(() => {
              expect(
                utils.getByRole(
                  'button',
                  {
                    name:
                      'Sync calendars',
                  },
                ),
              ).toBeEnabled();
            });
          },
        );

        it(
          'manually syncs Google when only Google Calendar is connected',
          async () => {
            mockGetCalendarConnection.mockImplementation(
              async (
                provider: string,
              ) => {
                if (
                  provider ===
                  'google'
                ) {
                  return {
                    provider:
                      'google',

                    provider_email:
                      'student@gmail.com',

                    connected:
                      true,
                  };
                }

                return null;
              },
            );

            const utils =
              await render(
                <CalendarScreen />,
              );

            await waitForInitialCalendarFocus();

            await act(
              async () => {
                fireEvent.press(
                  utils.getByRole(
                    'button',
                    {
                      name:
                        'Sync calendars',
                    },
                  ),
                );

                await Promise.resolve();

                await Promise.resolve();

                await Promise.resolve();
              },
            );

            expect(
              mockStartGoogleCalendarBackgroundSync,
            ).toHaveBeenCalledTimes(
              1,
            );

            expect(
              mockStartAppleCalendarBackgroundSync,
            ).not.toHaveBeenCalled();

            expect(
              mockGetCalendarConnection,
            ).toHaveBeenCalledWith(
              'apple',
            );

            expect(
              mockGetCalendarConnection,
            ).toHaveBeenCalledWith(
              'google',
            );

            await waitFor(() => {
              expect(
                utils.getByRole(
                  'button',
                  {
                    name:
                      'Sync calendars',
                  },
                ),
              ).toBeEnabled();
            });
          },
        );

        it(
          'manually syncs Apple and Google sequentially when both are connected',
          async () => {
            mockGetCalendarConnection.mockImplementation(
              async (
                provider: string,
              ) => {
                if (
                  provider ===
                  'apple'
                ) {
                  return {
                    provider:
                      'apple',

                    provider_email:
                      null,

                    connected:
                      true,
                  };
                }

                if (
                  provider ===
                  'google'
                ) {
                  return {
                    provider:
                      'google',

                    provider_email:
                      'student@gmail.com',

                    connected:
                      true,
                  };
                }

                return null;
              },
            );

            mockStartAppleCalendarBackgroundSync.mockResolvedValue(
              {
                imported:
                  2,

                skipped:
                  1,

                failed:
                  0,

                total:
                  3,
              },
            );

            mockStartGoogleCalendarBackgroundSync.mockResolvedValue(
              {
                imported:
                  4,

                skipped:
                  2,

                failed:
                  0,

                total:
                  6,
              },
            );

            const utils =
              await render(
                <CalendarScreen />,
              );

            await waitForInitialCalendarFocus();

            await act(
              async () => {
                fireEvent.press(
                  utils.getByRole(
                    'button',
                    {
                      name:
                        'Sync calendars',
                    },
                  ),
                );

                await Promise.resolve();

                await Promise.resolve();

                await Promise.resolve();

                await Promise.resolve();
              },
            );

            expect(
              mockStartAppleCalendarBackgroundSync,
            ).toHaveBeenCalledTimes(
              1,
            );

            expect(
              mockStartGoogleCalendarBackgroundSync,
            ).toHaveBeenCalledTimes(
              1,
            );

            expect(
              mockStartAppleCalendarBackgroundSync
                .mock.invocationCallOrder[0],
            ).toBeLessThan(
              mockStartGoogleCalendarBackgroundSync
                .mock.invocationCallOrder[0],
            );

            await waitFor(() => {
              expect(
                utils.getByRole(
                  'button',
                  {
                    name:
                      'Sync calendars',
                  },
                ),
              ).toBeEnabled();
            });
          },
        );
      },
    );

    it(
      'shows the search and menu actions as not yet available',
      async () => {
        await render(
          <CalendarScreen />,
        );

        for (
          const name of [
            'Search',
            'More options',
          ]
        ) {
          expect(
            screen.getByRole(
              'button',
              {
                name,
              },
            ),
          ).toBeDisabled();
        }
      },
    );
  },
);

describe('CalendarScreen: adding an event (#31)', () => {
  // Pretends to be the database: events saved through the form are returned
  // by later loads, the way Supabase would.
  function useFakeEventStore() {
    const stored: CalendarEvent[] = [];
    mockCreateCalendarEvent.mockImplementation(async (input) => {
      const event: CalendarEvent = { ...input, id: `new-${stored.length + 1}`, userId: 'user-1', source: 'rise' };
      stored.push(event);
      return event;
    });
    mockGetCalendarEventsInRange.mockImplementation(async () => [...stored]);
  }

  // Fills in the form: a title on the given November day at 9:00 AM.
  async function addEvent(title: string, dayLabel: string) {
    await fireEvent.press(screen.getByRole('button', { name: 'Add event' }));
    await fireEvent.changeText(screen.getByLabelText('Title'), title);
    await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
    await fireEvent.press(screen.getByRole('button', { name: dayLabel }));
    await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
    await fireEvent.press(screen.getByRole('button', { name: '9:00 AM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));
  }

  it('opens the event form from the + button (AC1)', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add event' }));

    expect(screen.getByRole('header', { name: 'Add to Calendar' })).toBeOnTheScreen();
  });

  it('shows the saved event on its date in the month view (AC3)', async () => {
    useFakeEventStore();
    await render(<CalendarScreen />);

    await addEvent('Chem Lab', 'Wednesday, November 18');

    expect(screen.queryByRole('header', { name: 'Add to Calendar' })).not.toBeOnTheScreen();
    const day = await screen.findByLabelText('Wednesday, November 18, 1 event');
    expect(within(day).getByText('Chem Lab')).toBeOnTheScreen();
  });

  it('shows the saved event at its time in the hourly views (AC3)', async () => {
    useFakeEventStore();
    await render(<CalendarScreen />);
    await addEvent('Chem Lab', 'Wednesday, November 18');

    for (const view of ['Week', '2 Day', 'Day']) {
      await fireEvent.press(screen.getByRole('tab', { name: view }));
      expect(await screen.findByLabelText('Chem Lab, 9:00 AM to 10:00 AM')).toBeOnTheScreen();
    }
  });

  it('jumps to the new event when it is in another month', async () => {
    useFakeEventStore();
    await render(<CalendarScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add event' }));
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Finals Review');
    await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
    // Both the calendar and the date picker have a "Next month" arrow; the
    // date picker's is the later one on screen.
    const nextMonthArrows = screen.getAllByRole('button', { name: 'Next month' });
    await fireEvent.press(nextMonthArrows[nextMonthArrows.length - 1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Thursday, December 3' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
    await fireEvent.press(screen.getByRole('button', { name: '9:00 AM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

    expect(await screen.findByRole('header', { name: 'December 2026' })).toBeOnTheScreen();
    expect(await screen.findByLabelText('Thursday, December 3, 1 event')).toBeOnTheScreen();
  });

  it("updates today's card when the event is today", async () => {
    useFakeEventStore();
    await render(<CalendarScreen />);
    expect(await screen.findByText('No events today.')).toBeOnTheScreen();

    await addEvent('Office Hours', 'Today, Friday, November 13');

    expect(await screen.findByText('9:00 AM – 10:00 AM')).toBeOnTheScreen();
    expect(screen.queryByText('No events today.')).not.toBeOnTheScreen();
  });

  it('says when a new event could not be added to a connected Google Calendar (#123)', async () => {
    useFakeEventStore();
    mockGetCalendarConnection.mockImplementation(async (provider: string) =>
      provider === 'google'
        ? { provider: 'google', provider_email: 'student@gmail.com', connected: true }
        : null
    );
    // No saved Google access token, so Google asks the student to reconnect.
    const tokenSpy = jest.spyOn(googleTokenService, 'getGoogleAccessToken').mockResolvedValue(null);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await render(<CalendarScreen />);

    await addEvent('Chem Lab', 'Wednesday, November 18');

    expect(
      await screen.findByText("Added to RISE, but couldn't add it to Google Calendar. Reconnect Google in Settings.")
    ).toBeOnTheScreen();
    // The event is still in RISE.
    expect(await screen.findByLabelText('Wednesday, November 18, 1 event')).toBeOnTheScreen();
    tokenSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('shows no note when no calendar is connected', async () => {
    useFakeEventStore();
    await render(<CalendarScreen />);

    await addEvent('Chem Lab', 'Wednesday, November 18');

    expect(await screen.findByLabelText('Wednesday, November 18, 1 event')).toBeOnTheScreen();
    expect(screen.queryByText(/^Added to RISE, but/)).not.toBeOnTheScreen();
  });

  it('saves nothing when the form is closed', async () => {
    await render(<CalendarScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add event' }));
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Never mind');

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('header', { name: 'Add to Calendar' })).not.toBeOnTheScreen();
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });
});

describe('CalendarScreen: opening an event (#34)', () => {
  // Today in these tests is Friday, November 13, 2026.
  const todayEvent: CalendarEvent = {
    id: 'event-1',
    userId: 'user-1',
    title: 'Bio Lab',
    startAt: new Date(2026, 10, 13, 9).toISOString(),
    endAt: new Date(2026, 10, 13, 10).toISOString(),
    source: 'google',
    location: 'Hall of Science 210',
  };

  async function openTodayEvent() {
    mockGetCalendarEventsInRange.mockResolvedValue([todayEvent]);
    await render(<CalendarScreen />);
    const [eventButton] = await screen.findAllByRole('button', { name: /^Bio Lab,/ });
    await fireEvent.press(eventButton);
  }

  // iOS tells the details sheet once it has finished sliding away. The test
  // Modal disappears as soon as it's hidden, so keep its onDismiss from while
  // it's open and call it after the sheet closes.
  function captureDetailsDismiss(): () => Promise<void> {
    const onDismiss = screen.getByTestId('event-details-sheet').props.onDismiss as () => void;
    return () =>
      act(async () => {
        onDismiss();
      });
  }

  it('opens the details when an event is tapped (AC1, AC2)', async () => {
    await openTodayEvent();

    expect(screen.getByRole('header', { name: 'Bio Lab' })).toBeOnTheScreen();
    expect(screen.getByText('From Google Calendar')).toBeOnTheScreen();
    expect(screen.getByText('Hall of Science 210')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Close edit event')).not.toBeOnTheScreen();
  });

  it('returns to the calendar when the details are closed (AC3)', async () => {
    await openTodayEvent();

    const finishClosingDetails = captureDetailsDismiss();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await finishClosingDetails();

    expect(screen.queryByRole('header', { name: 'Bio Lab' })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Close edit event')).not.toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Month' })).toBeOnTheScreen();
  });

  it('opens the edit form from Edit once the details have closed', async () => {
    await openTodayEvent();

    const finishClosingDetails = captureDetailsDismiss();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByLabelText('Close edit event')).not.toBeOnTheScreen();
    await finishClosingDetails();

    expect(screen.getByLabelText('Close edit event')).toBeOnTheScreen();
    expect(screen.getByLabelText('Event title')).toHaveDisplayValue('Bio Lab');
  });
});
