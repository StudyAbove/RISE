import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AppState,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  format,
  startOfDay,
} from 'date-fns';

import type {
  CalendarEvent,
} from '../../../models/CalendarEvent';

import {
  getLatestCalendarEventLinkSyncTime,
} from '../../../repositories/calendarEventLinksRepository';

import { CalendarEventsStatus } from '../components/CalendarEventsStatus';
import { CalendarHeader } from '../components/CalendarHeader';
import { CalendarViewSwitcher } from '../components/CalendarViewSwitcher';
import { EditCalendarEventModal } from '../components/EditCalendarEventModal';
import { MonthGrid } from '../components/MonthGrid';
import { TimeGrid } from '../components/TimeGrid';
import { TodayEventsCard } from '../components/TodayEventsCard';

import { useCalendarEvents } from '../hooks/useCalendarEvents';

import {
  getCalendarBackgroundSyncSnapshot,
  isCalendarBackgroundSyncRunning,
  markCalendarBackgroundSyncSuccessful,
  startAppleCalendarBackgroundSync,
  startGoogleCalendarBackgroundSync,
  subscribeToCalendarBackgroundSync,
  type CalendarBackgroundSyncProvider,
  type CalendarBackgroundSyncStatus,
} from '../services/calendarBackgroundSyncService';

import {
  getCalendarConnection,
} from '../services/calendarConnectionService';

import type {
  CalendarEventSyncResult,
} from '../services/calendarEventSyncService';

import {
  getAppleCalendarAccess,
} from '../services/calendarService';

import {
  getTimeGridDays,
  getVisibleRange,
  shiftAnchorDate,
  type CalendarViewMode,
} from '../utils/calendarDates';

import { styles } from './CalendarScreen.styles';

const AUTO_SYNC_INTERVAL_MS =
  30 * 60 * 1000;

const AUTO_SYNC_CHECK_MS =
  60 * 1000;

const PERIOD_NAMES: Record<
  CalendarViewMode,
  string
> = {
  month: 'month',
  week: 'week',
  twoDay: '2 days',
  day: 'day',
};

type CalendarSyncState =
  CalendarBackgroundSyncStatus;

type CalendarSyncTrigger =
  | 'manual'
  | 'automatic';

type ConnectedCalendarProvider =
  Exclude<
    CalendarBackgroundSyncProvider,
    null
  >;

export function CalendarScreen() {
  const [
    view,
    setView,
  ] =
    useState<CalendarViewMode>(
      'month',
    );

  const [
    anchorDate,
    setAnchorDate,
  ] = useState(() =>
    startOfDay(
      new Date(),
    ),
  );

  const [
    selectedEvent,
    setSelectedEvent,
  ] =
    useState<
      CalendarEvent | null
    >(null);

  const [
    editModalVisible,
    setEditModalVisible,
  ] =
    useState(false);

  const [
    todayCardRefreshKey,
    setTodayCardRefreshKey,
  ] =
    useState(0);

  const [
    calendarSyncState,
    setCalendarSyncState,
  ] =
    useState<CalendarSyncState>(
      () =>
        getCalendarBackgroundSyncSnapshot()
          .status,
    );

  const [
    activeSyncProvider,
    setActiveSyncProvider,
  ] =
    useState<CalendarBackgroundSyncProvider>(
      () =>
        getCalendarBackgroundSyncSnapshot()
          .provider,
    );

  const [
    lastSyncedAt,
    setLastSyncedAt,
  ] =
    useState<Date | null>(
      () =>
        getCalendarBackgroundSyncSnapshot()
          .lastSyncedAt,
    );

  const [
    lastSyncedProviders,
    setLastSyncedProviders,
  ] =
    useState<
      ConnectedCalendarProvider[]
    >(() => {
      const snapshot =
        getCalendarBackgroundSyncSnapshot();

      if (
        snapshot.status ===
          'idle' &&
        snapshot.lastSyncedAt &&
        snapshot.provider
      ) {
        return [
          snapshot.provider,
        ];
      }

      return [];
    });

  const lastAutomaticAttemptRef =
    useRef(0);

  const latestSuccessfulSyncRef =
    useRef<number | null>(
      getCalendarBackgroundSyncSnapshot()
        .lastSyncedAt
        ?.getTime() ??
        null,
    );

  /*
   * This tells us why CalendarScreen itself requested the
   * currently running shared job.
   *
   * A null value means the sync may have been started somewhere
   * else, such as Settings immediately after a calendar was
   * connected.
   */
  const currentSyncTriggerRef =
    useRef<
      CalendarSyncTrigger | null
    >(null);

  const previousBackgroundStatusRef =
    useRef<CalendarBackgroundSyncStatus>(
      getCalendarBackgroundSyncSnapshot()
        .status,
    );

  const visibleRange =
    getVisibleRange(
      view,
      anchorDate,
    );

  const {
    events,
    status,
    retry,
  } =
    useCalendarEvents(
      visibleRange.start,
      visibleRange.end,
    );

  const refreshCalendar =
    useCallback(() => {
      retry();

      setTodayCardRefreshKey(
        (current) =>
          current + 1,
      );
    }, [
      retry,
    ]);

  /*
   * Watch the one shared provider-sync job used by both
   * Settings and Calendar.
   *
   * A sync that begins in Settings can therefore continue while
   * the student navigates to Calendar, and this screen can show
   * which provider is currently being synchronized.
   */
  useEffect(() => {
    function applyBackgroundSnapshot() {
      const snapshot =
        getCalendarBackgroundSyncSnapshot();

      const previousStatus =
        previousBackgroundStatusRef.current;

      setCalendarSyncState(
        snapshot.status,
      );

      setActiveSyncProvider(
        snapshot.provider,
      );

      if (
        snapshot.lastSyncedAt
      ) {
        const syncedTime =
          snapshot.lastSyncedAt.getTime();

        latestSuccessfulSyncRef.current =
          syncedTime;

        setLastSyncedAt(
          snapshot.lastSyncedAt,
        );

        if (
          snapshot.status ===
            'idle' &&
          snapshot.provider
        ) {
          setLastSyncedProviders(
            [
              snapshot.provider,
            ],
          );
        }
      }

      /*
       * When a shared job finishes, reload the RISE events.
       *
       * This also happens for a partial failure because some
       * events may still have imported successfully.
       */
      if (
        previousStatus ===
          'syncing' &&
        snapshot.status !==
          'syncing'
      ) {
        refreshCalendar();
      }

      previousBackgroundStatusRef.current =
        snapshot.status;
    }

    applyBackgroundSnapshot();

    return subscribeToCalendarBackgroundSync(
      applyBackgroundSnapshot,
    );
  }, [
    refreshCalendar,
  ]);

  const getConnectedCalendarProviders =
    useCallback(
      async (): Promise<
        ConnectedCalendarProvider[]
      > => {
        const [
          appleConnection,
          googleConnection,
          appleAccess,
        ] =
          await Promise.all([
            getCalendarConnection(
              'apple',
            ),
            getCalendarConnection(
              'google',
            ),
            getAppleCalendarAccess(),
          ]);

        const providers:
          ConnectedCalendarProvider[] =
          [];

        if (
          appleConnection?.connected &&
          appleAccess === 'full'
        ) {
          providers.push(
            'apple',
          );
        }

        if (
          googleConnection?.connected
        ) {
          providers.push(
            'google',
          );
        }

        return providers;
      },
      [],
    );

  const loadLatestSuccessfulSync =
    useCallback(
      async () => {
        try {
          const [
            appleLatestSync,
            googleLatestSync,
          ] =
            await Promise.all([
              getLatestCalendarEventLinkSyncTime(
                'apple',
              ),
              getLatestCalendarEventLinkSyncTime(
                'google',
              ),
            ]);

          const providerDates:
            {
              provider:
                ConnectedCalendarProvider;
              date: Date;
            }[] = [];

          if (
            appleLatestSync
          ) {
            const appleDate =
              new Date(
                appleLatestSync,
              );

            if (
              !Number.isNaN(
                appleDate.getTime(),
              )
            ) {
              providerDates.push({
                provider:
                  'apple',

                date:
                  appleDate,
              });
            }
          }

          if (
            googleLatestSync
          ) {
            const googleDate =
              new Date(
                googleLatestSync,
              );

            if (
              !Number.isNaN(
                googleDate.getTime(),
              )
            ) {
              providerDates.push({
                provider:
                  'google',

                date:
                  googleDate,
              });
            }
          }

          if (
            providerDates.length ===
            0
          ) {
            return null;
          }

          const latestTimestamp =
            Math.max(
              ...providerDates.map(
                (entry) =>
                  entry.date.getTime(),
              ),
            );

          const latestDate =
            new Date(
              latestTimestamp,
            );

          const latestProviders =
            providerDates
              .filter(
                (entry) =>
                  entry.date.getTime() ===
                  latestTimestamp,
              )
              .map(
                (entry) =>
                  entry.provider,
              );

          latestSuccessfulSyncRef.current =
            latestTimestamp;

          setLastSyncedAt(
            latestDate,
          );

          setLastSyncedProviders(
            latestProviders,
          );

          /*
           * Do not replace a live shared syncing/error state just
           * because Supabase contains an older successful timestamp.
           */
          const backgroundSnapshot =
            getCalendarBackgroundSyncSnapshot();

          if (
            backgroundSnapshot.status ===
            'idle'
          ) {
            setCalendarSyncState(
              'idle',
            );

            setActiveSyncProvider(
              backgroundSnapshot.provider,
            );
          }

          return latestDate;
        } catch (error) {
          console.log(
            'Could not load latest calendar sync time:',
            error,
          );

          return null;
        }
      },
      [],
    );

  const runProviderSync =
    useCallback(
      async (
        provider:
          ConnectedCalendarProvider,
      ) => {
        setActiveSyncProvider(
          provider,
        );

        if (
          provider ===
          'apple'
        ) {
          return startAppleCalendarBackgroundSync();
        }

        return startGoogleCalendarBackgroundSync();
      },
      [],
    );

  const runCalendarSync =
    useCallback(
      async (
        trigger:
          CalendarSyncTrigger,
      ) => {
        /*
         * Settings or another Calendar action may already be
         * synchronizing a provider.
         *
         * Do not start another job. The screen subscription will
         * receive the result from the job already running.
         */
        if (
          isCalendarBackgroundSyncRunning()
        ) {
          return;
        }

        currentSyncTriggerRef.current =
          trigger;

        lastAutomaticAttemptRef.current =
          Date.now();

        try {
          const connectedProviders =
            await getConnectedCalendarProviders();

          if (
            connectedProviders.length ===
            0
          ) {
            if (
              trigger ===
              'manual'
            ) {
              setCalendarSyncState(
                'error',
              );
            } else {
              setCalendarSyncState(
                'idle',
              );
            }

            setActiveSyncProvider(
              null,
            );

            return;
          }

          setCalendarSyncState(
            'syncing',
          );

          let anyFailure =
            false;

          const successfulProviders:
            ConnectedCalendarProvider[] =
            [];

          /*
           * Provider imports run sequentially.
           *
           * The shared background service intentionally allows only
           * one provider-wide job at a time.
           */
          for (
            const provider
            of connectedProviders
          ) {
            try {
              const result =
                await runProviderSync(
                  provider,
                );

              refreshCalendar();

              if (
                result.failed >
                0
              ) {
                anyFailure =
                  true;
              } else {
                successfulProviders.push(
                  provider,
                );
              }
            } catch (error) {
              anyFailure =
                true;

              console.log(
                `${
                  provider ===
                  'apple'
                    ? 'Apple'
                    : 'Google'
                } Calendar screen sync failed:`,
                error,
              );
            }
          }

          if (
            anyFailure
          ) {
            setCalendarSyncState(
              'error',
            );

            setActiveSyncProvider(
              null,
            );

            return;
          }

          const snapshot =
            getCalendarBackgroundSyncSnapshot();

          const syncedAt =
            snapshot.lastSyncedAt ??
            new Date();

          latestSuccessfulSyncRef.current =
            syncedAt.getTime();

          setLastSyncedAt(
            syncedAt,
          );

          setLastSyncedProviders(
            successfulProviders,
          );

          setCalendarSyncState(
            'idle',
          );

          setActiveSyncProvider(
            null,
          );
        } catch (error) {
          console.log(
            'Calendar screen sync failed:',
            error,
          );

          if (
            trigger ===
            'automatic'
          ) {
            setCalendarSyncState(
              'idle',
            );
          } else {
            setCalendarSyncState(
              'error',
            );
          }

          setActiveSyncProvider(
            null,
          );
        } finally {
          currentSyncTriggerRef.current =
            null;
        }
      },
      [
        getConnectedCalendarProviders,
        refreshCalendar,
        runProviderSync,
      ],
    );

  const runAutomaticSyncIfDue =
    useCallback(() => {
      if (
        editModalVisible
      ) {
        return;
      }

      /*
       * Never overlap the automatic timer with an initial sync
       * started from Settings or a manual Calendar sync.
       */
      if (
        isCalendarBackgroundSyncRunning()
      ) {
        return;
      }

      const now =
        Date.now();

      const latestSuccessfulSync =
        latestSuccessfulSyncRef.current;

      /*
       * If there is a known successful provider sync, use that as
       * the real 30-minute clock.
       */
      if (
        latestSuccessfulSync !==
          null &&
        now -
          latestSuccessfulSync <
          AUTO_SYNC_INTERVAL_MS
      ) {
        return;
      }

      /*
       * When disconnected there may be no successful sync time.
       * This secondary throttle prevents repeatedly attempting the
       * same automatic check every few seconds.
       */
      if (
        latestSuccessfulSync ===
          null &&
        now -
          lastAutomaticAttemptRef.current <
          AUTO_SYNC_INTERVAL_MS
      ) {
        return;
      }

      void runCalendarSync(
        'automatic',
      );
    }, [
      editModalVisible,
      runCalendarSync,
    ]);

  /*
   * Whenever the student returns to the Calendar tab:
   *
   * 1. Immediately reload RISE events from Supabase.
   * 2. Restore the newest Apple or Google sync timestamp.
   * 3. Observe any shared sync already running from Settings.
   * 4. Only contact providers again when the sync interval is due.
   */
  useFocusEffect(
    useCallback(() => {
      let active =
        true;

      refreshCalendar();

      async function handleFocus() {
        const backgroundSnapshot =
          getCalendarBackgroundSyncSnapshot();

        if (
          backgroundSnapshot.status ===
          'syncing'
        ) {
          setCalendarSyncState(
            'syncing',
          );

          setActiveSyncProvider(
            backgroundSnapshot.provider,
          );

          return;
        }

        const latestSync =
          await loadLatestSuccessfulSync();

        if (!active) {
          return;
        }

        if (
          isCalendarBackgroundSyncRunning()
        ) {
          return;
        }

        if (
          latestSync &&
          Date.now() -
            latestSync.getTime() <
            AUTO_SYNC_INTERVAL_MS
        ) {
          return;
        }

        runAutomaticSyncIfDue();
      }

      void handleFocus();

      return () => {
        active =
          false;
      };
    }, [
      loadLatestSuccessfulSync,
      refreshCalendar,
      runAutomaticSyncIfDue,
    ]),
  );

  /*
   * While Calendar remains open, periodically check whether the
   * provider synchronization interval has expired.
   */
  useEffect(() => {
    const interval =
      setInterval(
        () => {
          if (
            AppState.currentState ===
            'active'
          ) {
            runAutomaticSyncIfDue();
          }
        },
        AUTO_SYNC_CHECK_MS,
      );

    return () => {
      clearInterval(
        interval,
      );
    };
  }, [
    runAutomaticSyncIfDue,
  ]);

  /*
   * If the student leaves RISE and later returns, reload the latest
   * stored provider sync time before deciding whether another
   * automatic synchronization is needed.
   */
  useEffect(() => {
    let previousState =
      AppState.currentState;

    const subscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          const returningToApp =
            nextState ===
              'active' &&
            previousState !==
              'active';

          previousState =
            nextState;

          if (
            !returningToApp
          ) {
            return;
          }

          refreshCalendar();

          void (async () => {
            const backgroundSnapshot =
              getCalendarBackgroundSyncSnapshot();

            if (
              backgroundSnapshot.status ===
                'syncing'
            ) {
              setCalendarSyncState(
                'syncing',
              );

              setActiveSyncProvider(
                backgroundSnapshot.provider,
              );

              return;
            }

            const latestSync =
              await loadLatestSuccessfulSync();

            if (
              isCalendarBackgroundSyncRunning()
            ) {
              return;
            }

            if (
              latestSync &&
              Date.now() -
                latestSync.getTime() <
                AUTO_SYNC_INTERVAL_MS
            ) {
              return;
            }

            runAutomaticSyncIfDue();
          })();
        },
      );

    return () => {
      subscription.remove();
    };
  }, [
    loadLatestSuccessfulSync,
    refreshCalendar,
    runAutomaticSyncIfDue,
  ]);

  const shift = (
    direction: 1 | -1,
  ) =>
    setAnchorDate(
      (date) =>
        shiftAnchorDate(
          view,
          date,
          direction,
        ),
    );

  function handleEventPress(
    event: CalendarEvent,
  ) {
    setSelectedEvent(
      event,
    );

    setEditModalVisible(
      true,
    );
  }

  function handleCloseEditModal() {
    setEditModalVisible(
      false,
    );

    setSelectedEvent(
      null,
    );
  }

  function handleEventSaved(
    result:
      CalendarEventSyncResult,
  ) {
    /*
     * Refresh the calendar after saving, but do not replace
     * selectedEvent while the modal is still open.
     */
    refreshCalendar();

    const now =
      Date.now();

    lastAutomaticAttemptRef.current =
      now;

    const successfulProviders =
      result.providerResults
        .filter(
          (providerResult) =>
            providerResult.status ===
            'synced',
        )
        .map(
          (providerResult) =>
            providerResult.provider,
        );

    const blockingFailures =
      result.providerResults.filter(
        (providerResult) =>
          providerResult.status ===
            'failed' &&
          providerResult.error !==
            'APPLE_CALENDAR_NOT_CONNECTED' &&
          providerResult.error !==
            'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
      );

    /*
     * A real provider failure means the overall calendar sync
     * failed. Keep the previous successful timestamp/provider
     * instead of replacing it with a partial success.
     */
    if (
      blockingFailures.length >
      0
    ) {
      setCalendarSyncState(
        'error',
      );

      setActiveSyncProvider(
        null,
      );

      return;
    }

    /*
     * saved-only, or every linked provider was disconnected:
     * the RISE edit still saved, but no provider sync succeeded.
     * Do not advance Last synced.
     */
    if (
      successfulProviders.length ===
      0
    ) {
      return;
    }

    const syncedAt =
      new Date(now);

    latestSuccessfulSyncRef.current =
      now;

    setLastSyncedAt(
      syncedAt,
    );

    setLastSyncedProviders(
      successfulProviders,
    );

    setCalendarSyncState(
      'idle',
    );

    setActiveSyncProvider(
      null,
    );

    markCalendarBackgroundSyncSuccessful(
      syncedAt,
      successfulProviders.length ===
        1
        ? successfulProviders[0]
        : null,
    );
  }

  const lastSyncedProviderLabel =
    lastSyncedProviders.length ===
      2
      ? 'Apple + Google'
      : lastSyncedProviders[0] ===
          'apple'
        ? 'Apple'
        : lastSyncedProviders[0] ===
            'google'
          ? 'Google'
          : null;

  const syncStatusLabel =
    calendarSyncState ===
    'syncing'
      ? activeSyncProvider ===
        'google'
        ? 'Syncing Google Calendar...'
        : activeSyncProvider ===
          'apple'
          ? 'Syncing Apple Calendar...'
          : 'Syncing calendars...'
      : calendarSyncState ===
          'error'
        ? 'Last sync failed'
        : lastSyncedAt
          ? lastSyncedProviderLabel
            ? `Last synced: ${lastSyncedProviderLabel} • ${format(
                lastSyncedAt,
                'h:mm a',
              )}`
            : `Last synced: ${format(
                lastSyncedAt,
                'h:mm a',
              )}`
          : 'Last synced: Not yet';

  const syncButtonLabel =
    calendarSyncState ===
    'syncing'
      ? 'Syncing...'
      : calendarSyncState ===
          'error'
        ? 'Retry'
        : '↻ Sync';

  const syncButtonDisabled =
    calendarSyncState ===
      'syncing' ||
    isCalendarBackgroundSyncRunning();

  return (
    <View
      style={
        styles.screen
      }
    >
      <CalendarHeader
        title={format(
          anchorDate,
          'MMMM yyyy',
        )}
        previousLabel={`Previous ${PERIOD_NAMES[view]}`}
        nextLabel={`Next ${PERIOD_NAMES[view]}`}
        onPrevious={() =>
          shift(-1)
        }
        onNext={() =>
          shift(1)
        }
      />

      <CalendarViewSwitcher
        selectedView={
          view
        }
        onSelectView={
          setView
        }
      />

      <View
        style={
          styles.syncRow
        }
      >
        <Text
          style={[
            styles.syncStatusText,

            calendarSyncState ===
              'error' &&
              styles.syncStatusError,
          ]}
          accessibilityLiveRegion="polite"
        >
          {syncStatusLabel}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            calendarSyncState ===
            'error'
              ? 'Retry calendar sync'
              : 'Sync calendars'
          }
          disabled={
            syncButtonDisabled
          }
          hitSlop={8}
          onPress={() => {
            void runCalendarSync(
              'manual',
            );
          }}
          style={({
            pressed,
          }) => [
            styles.syncButton,

            pressed &&
              !syncButtonDisabled &&
              styles.syncButtonPressed,

            syncButtonDisabled &&
              styles.syncButtonDisabled,
          ]}
        >
          <Text
            style={
              styles.syncButtonText
            }
          >
            {syncButtonLabel}
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.body
        }
      >
        {view ===
        'month' ? (
          <ScrollView
            style={
              styles.body
            }
            contentContainerStyle={
              styles.monthContent
            }
          >
            <MonthGrid
              month={
                anchorDate
              }
              events={
                events
              }
              onEventPress={
                handleEventPress
              }
            />

            <TodayEventsCard
              key={
                todayCardRefreshKey
              }
              onEventPress={
                handleEventPress
              }
            />
          </ScrollView>
        ) : (
          <TimeGrid
            key={
              view
            }
            days={getTimeGridDays(
              view,
              anchorDate,
            )}
            view={
              view
            }
            events={
              events
            }
            onEventPress={
              handleEventPress
            }
          />
        )}

        <CalendarEventsStatus
          status={
            status
          }
          onRetry={
            retry
          }
        />
      </View>

      <EditCalendarEventModal
        visible={
          editModalVisible
        }
        event={
          selectedEvent
        }
        onClose={
          handleCloseEditModal
        }
        onSaved={
          handleEventSaved
        }
      />
    </View>
  );
}