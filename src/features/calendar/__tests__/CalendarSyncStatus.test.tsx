import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import type {
  CalendarEventSyncResult,
} from '../services/calendarEventSyncService';

import {
  CalendarScreen,
} from '../screens/CalendarScreen';

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

const mockMarkCalendarBackgroundSyncSuccessful =
  jest.fn();

const mockRetryCalendarEvents =
  jest.fn();

let mockEditCalendarEventOnSaved:
  | ((
      result:
        CalendarEventSyncResult,
    ) => void)
  | null =
  null;

let mockBackgroundSyncRunning =
  false;

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
  '../hooks/useCalendarEvents',
  () => ({
    useCalendarEvents:
      () => ({
        events:
          [],

        status:
          'success',

        retry:
          mockRetryCalendarEvents,
      }),
  }),
);

jest.mock(
  '../components/CalendarHeader',
  () => ({
    CalendarHeader:
      () => null,
  }),
);

jest.mock(
  '../components/CalendarViewSwitcher',
  () => ({
    CalendarViewSwitcher:
      () => null,
  }),
);

jest.mock(
  '../components/MonthGrid',
  () => ({
    MonthGrid:
      () => null,
  }),
);

jest.mock(
  '../components/TimeGrid',
  () => ({
    TimeGrid:
      () => null,
  }),
);

jest.mock(
  '../components/TodayEventsCard',
  () => ({
    TodayEventsCard:
      () => null,
  }),
);

jest.mock(
  '../components/CalendarEventsStatus',
  () => ({
    CalendarEventsStatus:
      () => null,
  }),
);

jest.mock(
  '../components/EditCalendarEventModal',
  () => ({
    EditCalendarEventModal: ({
      onSaved,
    }: {
      onSaved: (
        result:
          CalendarEventSyncResult,
      ) => void;
    }) => {
      mockEditCalendarEventOnSaved =
        onSaved;

      return null;
    },
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
      (...args: unknown[]) =>
        mockMarkCalendarBackgroundSyncSuccessful(
          ...args,
        ),

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

function makeEvent():
  CalendarEvent {
  return {
    id:
      'event-1',

    userId:
      'user-1',

    title:
      'Study Session',

    startAt:
      new Date(
        2026,
        10,
        13,
        10,
        0,
      ).toISOString(),

    endAt:
      new Date(
        2026,
        10,
        13,
        11,
        0,
      ).toISOString(),

    source:
      'rise',
  };
}

function emitEventSyncResult(
  result:
    CalendarEventSyncResult,
) {
  if (
    !mockEditCalendarEventOnSaved
  ) {
    throw new Error(
      'EditCalendarEventModal onSaved callback was not captured.',
    );
  }

  mockEditCalendarEventOnSaved(
    result,
  );
}

async function waitForInitialSyncStatus() {
  await waitFor(() => {
    expect(
      screen.getByText(
        'Last synced: Apple • 9:25 AM',
      ),
    ).toBeOnTheScreen();

    expect(
      mockEditCalendarEventOnSaved,
    ).not.toBeNull();
  });
}

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

  mockEditCalendarEventOnSaved =
    null;

  mockBackgroundSyncRunning =
    false;

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

  mockRetryCalendarEvents.mockClear();

  mockMarkCalendarBackgroundSyncSuccessful.mockClear();

  mockStartAppleCalendarBackgroundSync.mockReset();

  mockStartGoogleCalendarBackgroundSync.mockReset();

  mockGetCalendarConnection.mockReset();

  mockGetAppleCalendarAccess.mockReset();

  mockGetLatestCalendarEventLinkSyncTime.mockReset();

  /*
   * Give the screen one recent successful Apple sync.
   *
   * This prevents focus from immediately starting an automatic
   * provider-wide sync and gives the tests a known baseline:
   *
   * Last synced: Apple • 9:25 AM
   */
  mockGetLatestCalendarEventLinkSyncTime.mockImplementation(
    async (
      provider: string,
    ) => {
      if (
        provider ===
        'apple'
      ) {
        return new Date(
          2026,
          10,
          13,
          9,
          25,
        ).toISOString();
      }

      return null;
    },
  );

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
  'CalendarScreen sync status',
  () => {
    it(
      'shows Apple after an Apple event update successfully syncs',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'synced',

              providerResults: [
                {
                  provider:
                    'apple',

                  status:
                    'synced',
                },
              ],
            });
          },
        );

        expect(
          await screen.findByText(
            'Last synced: Apple • 9:30 AM',
          ),
        ).toBeOnTheScreen();

        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).toHaveBeenCalledWith(
          new Date(
            2026,
            10,
            13,
            9,
            30,
          ),
          'apple',
        );
      },
    );

    it(
      'shows Google after a Google event update successfully syncs',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'synced',

              providerResults: [
                {
                  provider:
                    'google',

                  status:
                    'synced',
                },
              ],
            });
          },
        );

        expect(
          await screen.findByText(
            'Last synced: Google • 9:30 AM',
          ),
        ).toBeOnTheScreen();

        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).toHaveBeenCalledWith(
          new Date(
            2026,
            10,
            13,
            9,
            30,
          ),
          'google',
        );
      },
    );

    it(
      'shows Apple + Google when both event provider updates succeed',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'synced',

              providerResults: [
                {
                  provider:
                    'apple',

                  status:
                    'synced',
                },

                {
                  provider:
                    'google',

                  status:
                    'synced',
                },
              ],
            });
          },
        );

        expect(
          await screen.findByText(
            'Last synced: Apple + Google • 9:30 AM',
          ),
        ).toBeOnTheScreen();

        /*
         * The shared background service currently has one provider
         * field, so CalendarScreen keeps Apple + Google locally and
         * records null in that single-provider field.
         */
        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).toHaveBeenCalledWith(
          new Date(
            2026,
            10,
            13,
            9,
            30,
          ),
          null,
        );
      },
    );

    it(
      'counts Apple success when Google merely needs reconnection',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'partial',

              providerResults: [
                {
                  provider:
                    'apple',

                  status:
                    'synced',
                },

                {
                  provider:
                    'google',

                  status:
                    'failed',

                  error:
                    'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
                },
              ],
            });
          },
        );

        expect(
          await screen.findByText(
            'Last synced: Apple • 9:30 AM',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.queryByText(
            'Last sync failed',
          ),
        ).not.toBeOnTheScreen();

        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).toHaveBeenCalledWith(
          new Date(
            2026,
            10,
            13,
            9,
            30,
          ),
          'apple',
        );
      },
    );

    it(
      'shows Last sync failed when an attempted provider update fails',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'failed',

              providerResults: [
                {
                  provider:
                    'apple',

                  status:
                    'failed',

                  error:
                    'APPLE_EVENT_LINK_MISSING',
                },
              ],
            });
          },
        );

        expect(
          await screen.findByText(
            'Last sync failed',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Retry calendar sync',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not advance Last synced for a RISE-only save',
      async () => {
        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        expect(
          screen.getByText(
            'Last synced: Apple • 9:25 AM',
          ),
        ).toBeOnTheScreen();

        await act(
          async () => {
            emitEventSyncResult({
              event:
                makeEvent(),

              status:
                'saved-only',

              providerResults:
                [],
            });
          },
        );

        expect(
          screen.getByText(
            'Last synced: Apple • 9:25 AM',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.queryByText(
            /Last synced:.*9:30 AM/,
          ),
        ).not.toBeOnTheScreen();

        expect(
          mockMarkCalendarBackgroundSyncSuccessful,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'shows Apple + Google after a successful manual sync of both providers',
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

        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            fireEvent.press(
              screen.getByRole(
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
          await screen.findByText(
            'Last synced: Apple + Google • 9:30 AM',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'shows Last sync failed when a provider-wide manual sync reports failed events',
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

        mockStartAppleCalendarBackgroundSync.mockResolvedValue(
          {
            imported:
              1,

            skipped:
              0,

            failed:
              1,

            total:
              2,
          },
        );

        await render(
          <CalendarScreen />,
        );

        await waitForInitialSyncStatus();

        await act(
          async () => {
            fireEvent.press(
              screen.getByRole(
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
          await screen.findByText(
            'Last sync failed',
          ),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Retry calendar sync',
            },
          ),
        ).toBeOnTheScreen();
      },
    );
  },
);