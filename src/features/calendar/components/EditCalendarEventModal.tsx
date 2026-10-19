import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addDays,
  format,
  isSameDay,
  parseISO,
  set,
  startOfDay,
} from 'date-fns';

import CloseIcon from '../../../../assets/icons/calendar/close.svg';

import type {
  CalendarEvent,
  CalendarEventType,
} from '../../../models/CalendarEvent';

import type {
  CalendarEventConflict,
  CalendarEventConflictVersion,
} from '../../../models/CalendarEventConflict';

import type {
  ExternalCalendarProvider,
} from '../../../models/CalendarEventLink';

import {
  colors,
} from '../../../theme/colors';

import {
  resolveCalendarEventConflictGroup,
  type CalendarConflictWinner,
} from '../services/calendarConflictResolutionService';

import {
  retryCalendarEventSync,
  updateCalendarEventWithSync,
  type CalendarEventSyncResult,
  type ProviderSyncResult,
} from '../services/calendarEventSyncService';

import {
  formatTimeOption,
  getEndMinuteAfterStartChange,
  getEndTimeOptions,
  START_TIME_OPTIONS,
} from '../utils/addEventForm';

import {
  styles as sheetStyles,
} from './addEvent/AddEventSheet.styles';

import {
  DatePickerPanel,
} from './addEvent/DatePickerPanel';

import {
  DropdownField,
} from './addEvent/DropdownField';

import {
  EventTypePicker,
} from './addEvent/EventTypePicker';

import {
  FloatingDropdown,
  type DropdownAnchor,
} from './addEvent/FloatingDropdown';

import {
  FormField,
} from './addEvent/FormField';

import {
  formStyles,
} from './addEvent/formStyles';

import {
  FormTextInput,
} from './addEvent/FormTextInput';

import {
  OptionList,
} from './addEvent/OptionList';

import {
  OPTION_LIST_MAX_HEIGHT,
  OPTION_ROW_HEIGHT,
} from './addEvent/OptionList.styles';

import {
  REMINDER_CHOICES,
  ReminderField,
} from './addEvent/ReminderField';

type DropdownName =
  | 'date'
  | 'start'
  | 'end'
  | 'reminder';

type OpenField =
  DropdownName | null;

interface EditEventFormValues {
  title: string;
  date: Date | null;

  startMinute: number | null;
  endMinute: number | null;

  eventType:
    CalendarEventType | null;

  location: string;
  description: string;

  reminderMinutes: number | null;
}

interface EditCalendarEventModalProps {
  visible: boolean;

  event:
    CalendarEvent | null;

  conflicts:
    CalendarEventConflict[];

  readOnly?: boolean;

  startInConflictReview?: boolean;

  onClose: () => void;

  onSaved: (
    result: CalendarEventSyncResult,
  ) => void;

  onConflictResolved: () => void;
}

const END_OF_DAY =
  24 * 60;

const PANEL_HEIGHTS:
  Record<DropdownName, number> = {
    date:
      270,

    start:
      OPTION_LIST_MAX_HEIGHT + 4,

    end:
      OPTION_LIST_MAX_HEIGHT + 4,

    reminder:
      REMINDER_CHOICES.length *
        OPTION_ROW_HEIGHT +
      16,
  };

const PANEL_GAP =
  8;

const START_OPTIONS =
  START_TIME_OPTIONS.map(
    (minute) => ({
      value:
        minute,

      label:
        formatTimeOption(
          minute,
        ),
    }),
  );

const EMPTY_EDIT_FORM:
  EditEventFormValues = {
    title:
      '',

    date:
      null,

    startMinute:
      null,

    endMinute:
      null,

    eventType:
      null,

    location:
      '',

    description:
      '',

    reminderMinutes:
      null,
  };

function minuteOfDay(
  date: Date,
) {
  return (
    date.getHours() *
      60 +
    date.getMinutes()
  );
}

function getInitialEndMinute(
  start: Date,
  end: Date,
) {
  const nextDay =
    addDays(
      startOfDay(
        start,
      ),
      1,
    );

  const endIsNextMidnight =
    end.getTime() ===
    nextDay.getTime();

  if (
    endIsNextMidnight
  ) {
    return END_OF_DAY;
  }

  const sameCalendarDay =
    start.getFullYear() ===
      end.getFullYear() &&
    start.getMonth() ===
      end.getMonth() &&
    start.getDate() ===
      end.getDate();

  if (
    sameCalendarDay
  ) {
    return minuteOfDay(
      end,
    );
  }

  return getEndMinuteAfterStartChange(
    minuteOfDay(
      start,
    ),
    null,
  );
}

function atMinuteOfDay(
  day: Date,
  minute: number,
) {
  if (
    minute ===
    END_OF_DAY
  ) {
    return addDays(
      startOfDay(
        day,
      ),
      1,
    );
  }

  return set(
    day,
    {
      hours:
        Math.floor(
          minute / 60,
        ),

      minutes:
        minute % 60,

      seconds:
        0,

      milliseconds:
        0,
    },
  );
}

function getProviderName(
  provider:
    ExternalCalendarProvider,
) {
  return provider ===
    'apple'
    ? 'Apple Calendar'
    : 'Google Calendar';
}

function getWinnerName(
  winner:
    CalendarConflictWinner,
) {
  if (
    winner ===
    'rise'
  ) {
    return 'RISE';
  }

  return getProviderName(
    winner,
  );
}

function getConflictResolutionErrorMessage(
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : String(
          error,
        );

  if (
    message ===
    'APPLE_CALENDAR_NOT_CONNECTED'
  ) {
    return 'Apple Calendar is no longer connected. Reconnect it and try again.';
  }

  if (
    message ===
    'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
  ) {
    return 'Google Calendar needs to be reconnected. Reconnect it in Settings and try again.';
  }

  if (
    message ===
      'CALENDAR_CONFLICT_LINK_NOT_FOUND' ||
    message ===
      'GOOGLE_CALENDAR_ID_MISSING'
  ) {
    return 'RISE could not find the connected calendar event. Reconnect the calendar and try again.';
  }

  if (
    message ===
    'CALENDAR_CONFLICT_RISE_VERSIONS_DIFFER'
  ) {
    return 'RISE changed again after this conflict was detected. Sync your calendars again, then review the updated versions.';
  }

  return 'RISE could not finish resolving this conflict. Nothing was marked resolved. Try again.';
}

function formatConflictDateTime(
  version:
    CalendarEventConflictVersion,
) {
  const start =
    parseISO(
      version.startAt,
    );

  const end =
    parseISO(
      version.endAt,
    );

  if (
    isSameDay(
      start,
      end,
    )
  ) {
    return `${format(
      start,
      'MMM d, yyyy',
    )} • ${format(
      start,
      'h:mm a',
    )} – ${format(
      end,
      'h:mm a',
    )}`;
  }

  return `${format(
    start,
    'MMM d, yyyy, h:mm a',
  )} – ${format(
    end,
    'MMM d, yyyy, h:mm a',
  )}`;
}

export function EditCalendarEventModal({
  visible,
  event,
  conflicts,
  readOnly = false,
  startInConflictReview = false,
  onClose,
  onSaved,
  onConflictResolved,
}: EditCalendarEventModalProps) {
  const [
    values,
    setValues,
  ] =
    useState<EditEventFormValues>(
      EMPTY_EDIT_FORM,
    );

  const [
    openField,
    setOpenField,
  ] =
    useState<OpenField>(
      null,
    );

  const [
    anchor,
    setAnchor,
  ] =
    useState<DropdownAnchor | null>(
      null,
    );

  const [
    validationMessage,
    setValidationMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    syncResult,
    setSyncResult,
  ] =
    useState<
      CalendarEventSyncResult | null
    >(null);

  const [
    savedEvent,
    setSavedEvent,
  ] =
    useState<
      CalendarEvent | null
    >(null);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    retryingProvider,
    setRetryingProvider,
  ] =
    useState<
      ExternalCalendarProvider | null
    >(null);

  const [
    descriptionFocused,
    setDescriptionFocused,
  ] =
    useState(false);

  const [
    reviewingConflict,
    setReviewingConflict,
  ] =
    useState(false);

  const [
    resolvingWinner,
    setResolvingWinner,
  ] =
    useState<
      CalendarConflictWinner | null
    >(null);

  const [
    resolutionError,
    setResolutionError,
  ] =
    useState<
      string | null
    >(null);

  const [
    failedWinner,
    setFailedWinner,
  ] =
    useState<
      CalendarConflictWinner | null
    >(null);

  const [
    locallyResolvedConflictIds,
    setLocallyResolvedConflictIds,
  ] =
    useState<string[]>(
      [],
    );

  const sheetRef =
    useRef<View>(
      null,
    );

  const editFormScrollRef =
    useRef<ScrollView>(
      null,
    );

  const dropdownRefs = {
    date:
      useRef<View>(
        null,
      ),

    start:
      useRef<View>(
        null,
      ),

    end:
      useRef<View>(
        null,
      ),

    reminder:
      useRef<View>(
        null,
      ),
  };

  const activeConflicts =
    conflicts.filter(
      (conflict) =>
        !locallyResolvedConflictIds.includes(
          conflict.id,
        ),
    );

  const hasConflict =
    activeConflicts.length >
    0;

  const appleConflict =
    activeConflicts.find(
      (conflict) =>
        conflict.provider ===
        'apple',
    );

  const googleConflict =
    activeConflicts.find(
      (conflict) =>
        conflict.provider ===
        'google',
    );

  const riseVersion =
    activeConflicts[0]
      ?.riseVersion;

  useEffect(() => {
    if (
      !visible ||
      !event
    ) {
      return;
    }

    const start =
      parseISO(
        event.startAt,
      );

    const end =
      parseISO(
        event.endAt,
      );

    setValues({
      title:
        event.title,

      date:
        start,

      startMinute:
        minuteOfDay(
          start,
        ),

      endMinute:
        getInitialEndMinute(
          start,
          end,
        ),

      eventType:
        event.eventType ??
        null,

      location:
        event.location ??
        '',

      description:
        event.description ??
        '',

      reminderMinutes:
        event.reminderMinutes ??
        null,
    });

    setOpenField(
      null,
    );

    setAnchor(
      null,
    );

    setValidationMessage(
      null,
    );

    setSyncResult(
      null,
    );

    setSavedEvent(
      null,
    );

    setIsSaving(
      false,
    );

    setRetryingProvider(
      null,
    );

    setDescriptionFocused(
      false,
    );

    setReviewingConflict(
      startInConflictReview,
    );

    setResolvingWinner(
      null,
    );

    setResolutionError(
      null,
    );

    setFailedWinner(
      null,
    );

    setLocallyResolvedConflictIds(
      [],
    );
  }, [
    event,
    startInConflictReview,
    visible,
  ]);

  function scrollEditFormToBottom() {
    setTimeout(() => {
      editFormScrollRef.current?.scrollToEnd({
        animated:
          true,
      });
    }, 150);
  }

  const update = (
    changes:
      Partial<EditEventFormValues>,
  ) => {
    setValues(
      (current) => ({
        ...current,
        ...changes,
      }),
    );
  };

  const toggle = (
    field: DropdownName,
  ) => {
    if (readOnly) {
      return;
    }

    Keyboard.dismiss();

    if (
      openField ===
      field
    ) {
      setOpenField(
        null,
      );

      return;
    }

    setAnchor(
      null,
    );

    setOpenField(
      field,
    );

    dropdownRefs[
      field
    ].current?.measureInWindow(
      (
        x,
        y,
        width,
        height,
      ) => {
        sheetRef.current?.measureInWindow(
          (
            sheetX,
            sheetY,
            _sheetWidth,
            sheetHeight,
          ) => {
            const boxTop =
              y - sheetY;

            const below =
              boxTop +
              height +
              PANEL_GAP;

            const fitsBelow =
              below +
                PANEL_HEIGHTS[
                  field
                ] <=
              sheetHeight -
                PANEL_GAP;

            setAnchor(
              fitsBelow
                ? {
                    left:
                      x -
                      sheetX,

                    width,

                    top:
                      below,
                  }
                : {
                    left:
                      x -
                      sheetX,

                    width,

                    bottom:
                      sheetHeight -
                      boxTop +
                      PANEL_GAP,
                  },
            );
          },
        );
      },
    );
  };

  const closeDropdown =
    () => {
      setOpenField(
        null,
      );
    };

  const chooseStart = (
    startMinute: number,
  ) => {
    setValues(
      (current) => ({
        ...current,

        startMinute,

        endMinute:
          getEndMinuteAfterStartChange(
            startMinute,
            current.endMinute,
          ),
      }),
    );

    closeDropdown();
  };

  const endOptions =
    getEndTimeOptions(
      values.startMinute,
    ).map(
      (minute) => ({
        value:
          minute,

        label:
          formatTimeOption(
            minute,
          ),
      }),
    );

  const currentHour =
    new Date().getHours() *
    60;

  function applyConflictVersionToForm(
    version:
      CalendarEventConflictVersion,
  ) {
    const start =
      parseISO(
        version.startAt,
      );

    const end =
      parseISO(
        version.endAt,
      );

    setValues(
      (current) => ({
        ...current,

        title:
          version.title,

        date:
          start,

        startMinute:
          minuteOfDay(
            start,
          ),

        endMinute:
          getInitialEndMinute(
            start,
            end,
          ),

        location:
          version.location ??
          '',

        description:
          version.description ??
          '',
      }),
    );
  }

  function getWinningVersion(
    winner:
      CalendarConflictWinner,
  ):
    CalendarEventConflictVersion | null {
    if (
      winner ===
      'rise'
    ) {
      return (
        riseVersion ??
        null
      );
    }

    const conflict =
      activeConflicts.find(
        (item) =>
          item.provider ===
          winner,
      );

    return (
      conflict
        ?.providerVersion ??
      null
    );
  }

  async function handleResolveConflict(
    winner:
      CalendarConflictWinner,
  ) {
    if (
      activeConflicts.length ===
      0
    ) {
      return;
    }

    setResolutionError(
      null,
    );

    setFailedWinner(
      null,
    );

    try {
      setResolvingWinner(
        winner,
      );

      const conflictsBeingResolved =
        [
          ...activeConflicts,
        ];

      const winningVersion =
        getWinningVersion(
          winner,
        );

      await resolveCalendarEventConflictGroup(
        conflictsBeingResolved,
        winner,
      );

      if (
        winningVersion
      ) {
        applyConflictVersionToForm(
          winningVersion,
        );
      }

      setLocallyResolvedConflictIds(
        (current) => [
          ...current,
          ...conflictsBeingResolved.map(
            (conflict) =>
              conflict.id,
          ),
        ],
      );

      setResolutionError(
        null,
      );

      setFailedWinner(
        null,
      );

      setSyncResult(
        null,
      );

      /*
       * A successful conflict resolution already synchronized the
       * winning version and marked the conflict resolved.
       *
       * Refresh Calendar, then close the entire sheet instead of
       * dropping the student back onto Edit Event.
       */
      onConflictResolved();
      onClose();
    } catch (error) {
      console.log(
        'Calendar conflict resolution failed:',
        error,
      );

      setResolutionError(
        getConflictResolutionErrorMessage(
          error,
        ),
      );

      setFailedWinner(
        winner,
      );
    } finally {
      setResolvingWinner(
        null,
      );
    }
  }

  function getProviderErrorMessage(
    result:
      ProviderSyncResult,
  ) {
    if (
      result.error ===
      'APPLE_CALENDAR_NOT_CONNECTED'
    ) {
      return (
        'Apple Calendar is no longer connected. ' +
        'Your RISE changes are still saved.'
      );
    }

    if (
      result.error ===
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
    ) {
      return (
        'Google Calendar needs to be reconnected in Settings. ' +
        'Your RISE changes are still saved.'
      );
    }

    if (
      result.error ===
      'GOOGLE_EVENT_NOT_FOUND'
    ) {
      return (
        'The linked Google Calendar event could not be found.'
      );
    }

    if (
      result.error ===
        'APPLE_EVENT_LINK_MISSING' ||
      result.error ===
        'GOOGLE_EVENT_LINK_MISSING'
    ) {
      return (
        'RISE could not find the external calendar link for this event.'
      );
    }

    if (
      result.error ===
      'GOOGLE_CALENDAR_ID_MISSING'
    ) {
      return (
        'RISE is missing the Google Calendar information needed to sync this event.'
      );
    }

    return `${getProviderName(
      result.provider,
    )} could not be updated.`;
  }

  async function handleSave() {
    if (!event) {
      return;
    }

    if (readOnly) {
      return;
    }

    if (
      hasConflict
    ) {
      setValidationMessage(
        'Resolve the calendar conflict before saving changes.',
      );

      return;
    }

    Keyboard.dismiss();

    setOpenField(
      null,
    );

    setValidationMessage(
      null,
    );

    setSyncResult(
      null,
    );

    const cleanTitle =
      values.title.trim();

    if (!cleanTitle) {
      setValidationMessage(
        'Add a title.',
      );

      return;
    }

    if (!values.date) {
      setValidationMessage(
        'Pick a date.',
      );

      return;
    }

    if (
      values.startMinute ===
      null
    ) {
      setValidationMessage(
        'Pick a start time.',
      );

      return;
    }

    const endMinute =
      getEndMinuteAfterStartChange(
        values.startMinute,
        values.endMinute,
      );

    const parsedStart =
      atMinuteOfDay(
        values.date,
        values.startMinute,
      );

    const parsedEnd =
      atMinuteOfDay(
        values.date,
        endMinute,
      );

    if (
      parsedEnd.getTime() <=
      parsedStart.getTime()
    ) {
      setValidationMessage(
        'The end time must be after the start time.',
      );

      return;
    }

    try {
      setIsSaving(
        true,
      );

      const result =
        await updateCalendarEventWithSync(
          event.id,
          {
            title:
              cleanTitle,

            startAt:
              parsedStart.toISOString(),

            endAt:
              parsedEnd.toISOString(),

            location:
              values.location.trim(),

            description:
              values.description.trim(),

            eventType:
              values.eventType,

            reminderMinutes:
              values.reminderMinutes,
          },
        );

      setSyncResult(
        result,
      );

      setSavedEvent(
        result.event,
      );

      setValues(
        (current) => ({
          ...current,

          eventType:
            result.event
              .eventType ??
            null,

          reminderMinutes:
            result.event
              .reminderMinutes ??
            null,
        }),
      );

      onSaved(
        result,
      );
    } catch (error) {
      console.log(
        'Calendar event save failed:',
        error,
      );

      setValidationMessage(
        'The event could not be saved in RISE. Please try again.',
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  useEffect(() => {
    if (
      !visible ||
      reviewingConflict
    ) {
      return;
    }

    if (
      validationMessage ||
      syncResult
    ) {
      scrollEditFormToBottom();
    }
  }, [
    reviewingConflict,
    syncResult,
    validationMessage,
    visible,
  ]);

  async function handleRetry(
    provider:
      ExternalCalendarProvider,
  ) {
    if (
      !savedEvent ||
      !syncResult
    ) {
      return;
    }

    try {
      setRetryingProvider(
        provider,
      );

      const retryResult =
        await retryCalendarEventSync(
          savedEvent,
          provider,
        );

      const updatedProviderResults =
        syncResult.providerResults.map(
          (result) =>
            result.provider ===
            provider
              ? retryResult
              : result,
        );

      const successfulCount =
        updatedProviderResults.filter(
          (result) =>
            result.status ===
            'synced',
        ).length;

      let nextStatus:
        CalendarEventSyncResult['status'];

      if (
        successfulCount ===
        updatedProviderResults.length
      ) {
        nextStatus =
          'synced';
      } else if (
        successfulCount ===
        0
      ) {
        nextStatus =
          'failed';
      } else {
        nextStatus =
          'partial';
      }

      const nextSyncResult:
        CalendarEventSyncResult = {
          ...syncResult,

          status:
            nextStatus,

          providerResults:
            updatedProviderResults,
        };

      setSyncResult(
        nextSyncResult,
      );

      onSaved(
        nextSyncResult,
      );
    } finally {
      setRetryingProvider(
        null,
      );
    }
  }

  function renderSyncStatus() {
    if (!syncResult) {
      return null;
    }

    if (
      syncResult.status ===
      'synced'
    ) {
      return (
        <View
          style={
            localStyles.successBox
          }
        >
          <Text
            style={
              localStyles.successText
            }
          >
            Saved in RISE and synced successfully.
          </Text>
        </View>
      );
    }

    if (
      syncResult.status ===
      'saved-only'
    ) {
      return (
        <View
          style={
            localStyles.infoBox
          }
        >
          <Text
            style={
              localStyles.infoText
            }
          >
            Saved in RISE. This event is not currently linked to an Apple or Google Calendar event.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          localStyles.warningBox
        }
      >
        <Text
          style={
            localStyles.warningTitle
          }
        >
          Your RISE changes were saved.
        </Text>

        <Text
          style={
            localStyles.warningText
          }
        >
          One or more connected calendars could not be updated.
        </Text>

        {syncResult.providerResults
          .filter(
            (result) =>
              result.status ===
              'failed',
          )
          .map(
            (result) => (
              <View
                key={
                  result.provider
                }
                style={
                  localStyles.providerError
                }
              >
                <Text
                  style={
                    localStyles.providerErrorText
                  }
                >
                  {getProviderErrorMessage(
                    result,
                  )}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retry ${getProviderName(
                    result.provider,
                  )} sync`}
                  disabled={
                    retryingProvider !==
                    null
                  }
                  onPress={() =>
                    handleRetry(
                      result.provider,
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    localStyles.retryButton,

                    pressed &&
                      localStyles.pressed,

                    retryingProvider !==
                      null &&
                      localStyles.disabledButton,
                  ]}
                >
                  {retryingProvider ===
                  result.provider ? (
                    <ActivityIndicator
                      color={
                        colors.deepOlive
                      }
                    />
                  ) : (
                    <Text
                      style={
                        localStyles.retryButtonText
                      }
                    >
                      Retry
                    </Text>
                  )}
                </Pressable>
              </View>
            ),
          )}
      </View>
    );
  }

  function renderConflictVersion(
    label: string,
    version:
      CalendarEventConflictVersion,
    tone:
      | 'rise'
      | 'calendar',
  ) {
    return (
      <View
        style={[
          localStyles.versionCard,

          tone ===
            'rise'
            ? localStyles.riseVersionCard
            : localStyles.calendarVersionCard,
        ]}
      >
        <Text
          style={
            localStyles.versionTitle
          }
        >
          {label}
        </Text>

        {version.deleted ? (
          <View
            style={
              localStyles.versionField
            }
          >
            <Text
              style={
                localStyles.versionLabel
              }
            >
              Status
            </Text>

            <Text
              style={
                localStyles.versionValue
              }
            >
              Deleted
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                localStyles.versionField
              }
            >
              <Text
                style={
                  localStyles.versionLabel
                }
              >
                Title
              </Text>

          <Text
            style={
              localStyles.versionValue
            }
          >
            {version.title}
          </Text>
        </View>

        <View
          style={
            localStyles.versionField
          }
        >
          <Text
            style={
              localStyles.versionLabel
            }
          >
            Date & Time
          </Text>

          <Text
            style={
              localStyles.versionValue
            }
          >
            {formatConflictDateTime(
              version,
            )}
          </Text>
        </View>

        <View
          style={
            localStyles.versionField
          }
        >
          <Text
            style={
              localStyles.versionLabel
            }
          >
            Location
          </Text>

          <Text
            style={
              localStyles.versionValue
            }
          >
            {version.location?.trim() ||
              'No location'}
          </Text>
        </View>

        <View
          style={
            localStyles.versionField
          }
        >
          <Text
            style={
              localStyles.versionLabel
            }
          >
            Description
          </Text>

              <Text
                style={
                  localStyles.versionValue
                }
              >
                {version.description?.trim() ||
                  'No description'}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  }

  function renderConflictReview() {
    if (
      !riseVersion
    ) {
      return null;
    }

    const resolving =
      resolvingWinner !==
      null;

    return (
      <ScrollView
        testID="calendar-conflict-review"
        contentContainerStyle={
          localStyles.conflictReviewContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          style={
            sheetStyles.heading
          }
        >
          Review Conflict
        </Text>

        <Text
          style={
            localStyles.conflictIntro
          }
        >
          This event was changed or deleted in more than one place. Compare each version and choose the result you want RISE and your connected calendars to keep.
        </Text>

        {renderConflictVersion(
          'RISE',
          riseVersion,
          'rise',
        )}

        {appleConflict &&
          renderConflictVersion(
            'Apple Calendar',
            appleConflict.providerVersion,
            'calendar',
          )}

        {googleConflict &&
          renderConflictVersion(
            'Google Calendar',
            googleConflict.providerVersion,
            'calendar',
          )}

        {resolutionError && (
          <View
            style={
              localStyles.resolutionErrorBox
            }
          >
            <Text
              style={
                localStyles.resolutionErrorTitle
              }
            >
              Couldn't resolve conflict
            </Text>

            <Text
              style={
                localStyles.resolutionErrorText
              }
              accessibilityLiveRegion="polite"
            >
              {resolutionError}
            </Text>

            {failedWinner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retry keeping ${getWinnerName(
                  failedWinner,
                )}`}
                disabled={
                  resolving
                }
                onPress={() =>
                  handleResolveConflict(
                    failedWinner,
                  )
                }
                style={[
                  localStyles.retryResolutionButton,

                  resolving &&
                    localStyles.disabledButton,
                ]}
              >
                <Text
                  style={
                    localStyles.retryResolutionButtonText
                  }
                >
                  Retry
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View
          style={
            localStyles.resolutionActions
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keep RISE version"
            disabled={
              resolving
            }
            onPress={() =>
              handleResolveConflict(
                'rise',
              )
            }
            style={[
              localStyles.primaryResolutionButton,

              resolving &&
                localStyles.disabledButton,
            ]}
          >
            {resolvingWinner ===
            'rise' ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.softWhite
                }
              />
            ) : (
              <Text
                style={
                  localStyles.primaryResolutionButtonText
                }
              >
                Keep RISE
              </Text>
            )}
          </Pressable>

          {appleConflict && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                appleConflict.providerVersion.deleted
                  ? 'Keep Apple Calendar deletion'
                  : 'Keep Apple Calendar version'
              }
              disabled={
                resolving
              }
              onPress={() =>
                handleResolveConflict(
                  'apple',
                )
              }
              style={[
                localStyles.secondaryResolutionButton,

                resolving &&
                  localStyles.disabledButton,
              ]}
            >
              {resolvingWinner ===
              'apple' ? (
                <ActivityIndicator
                  size="small"
                  color={
                    colors.deepOlive
                  }
                />
              ) : (
                <Text
                  style={
                    localStyles.secondaryResolutionButtonText
                  }
                >
                  {appleConflict.providerVersion.deleted
                    ? 'Keep Apple Deletion'
                    : 'Keep Apple'}
                </Text>
              )}
            </Pressable>
          )}

          {googleConflict && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                googleConflict.providerVersion.deleted
                  ? 'Keep Google Calendar deletion'
                  : 'Keep Google Calendar version'
              }
              disabled={
                resolving
              }
              onPress={() =>
                handleResolveConflict(
                  'google',
                )
              }
              style={[
                localStyles.secondaryResolutionButton,

                resolving &&
                  localStyles.disabledButton,
              ]}
            >
              {resolvingWinner ===
              'google' ? (
                <ActivityIndicator
                  size="small"
                  color={
                    colors.deepOlive
                  }
                />
              ) : (
                <Text
                  style={
                    localStyles.secondaryResolutionButtonText
                  }
                >
                  {googleConflict.providerVersion.deleted
                    ? 'Keep Google Deletion'
                    : 'Keep Google'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

      </ScrollView>
    );
  }

  function renderEditForm() {
    const saveDisabled =
      isSaving ||
      hasConflict ||
      readOnly;

    return (
      <ScrollView
        ref={
          editFormScrollRef
        }
        testID="edit-event-form"
        contentContainerStyle={
          sheetStyles.content
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable
          accessible={
            false
          }
          onPress={
            Keyboard.dismiss
          }
          style={
            sheetStyles.fields
          }
        >
          <Text
            accessibilityRole="header"
            style={
              sheetStyles.heading
            }
          >
            Edit Event
          </Text>

          {readOnly && (
            <View
              style={
                localStyles.infoBox
              }
            >
              <Text
                style={
                  localStyles.infoText
                }
              >
                Read-only calendar event. This event is controlled by a connected calendar and cannot be edited in RISE.
              </Text>
            </View>
          )}

          {hasConflict && (
            <View
              style={
                localStyles.conflictBanner
              }
            >
              <Text
                style={
                  localStyles.conflictBannerTitle
                }
              >
                Calendar conflict
              </Text>

              <Text
                style={
                  localStyles.conflictBannerText
                }
              >
                {appleConflict &&
                googleConflict
                  ? 'This event was changed in RISE, Apple Calendar, and Google Calendar.'
                  : appleConflict
                    ? 'This event was changed in both RISE and Apple Calendar.'
                    : 'This event was changed in both RISE and Google Calendar.'}
              </Text>

              <Text
                style={
                  localStyles.conflictBannerHint
                }
              >
                Review the versions before saving any more changes.
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Review calendar conflict"
                onPress={() => {
                  Keyboard.dismiss();

                  setOpenField(
                    null,
                  );

                  setValidationMessage(
                    null,
                  );

                  setReviewingConflict(
                    true,
                  );
                }}
                style={
                  localStyles.reviewConflictButton
                }
              >
                <Text
                  style={
                    localStyles.reviewConflictButtonText
                  }
                >
                  Review Conflict
                </Text>
              </Pressable>
            </View>
          )}

          <FormField
            label="Title"
          >
            <FormTextInput
              label="Title"
              placeholder="Add a title"
              value={
                values.title
              }
              onChangeText={(
                title,
              ) =>
                update({
                  title,
                })
              }
              hasError={
                validationMessage ===
                'Add a title.'
              }
              disabled={
                readOnly
              }
            />
          </FormField>

          <FormField
            label="Date"
          >
            <DropdownField
              label="Date"
              placeholder="Select a date"
              valueText={
                values.date
                  ? format(
                      values.date,
                      'EEEE, MMMM d, yyyy',
                    )
                  : undefined
              }
              open={
                openField ===
                'date'
              }
              onToggle={() =>
                toggle(
                  'date',
                )
              }
              hasError={
                validationMessage ===
                'Pick a date.'
              }
              disabled={
                readOnly
              }
              triggerRef={
                dropdownRefs.date
              }
            />
          </FormField>

          <FormField
            label="Time"
          >
            <View
              style={
                sheetStyles.timeRow
              }
            >
              <View
                style={
                  sheetStyles.timeColumn
                }
              >
                <DropdownField
                  label="Start time"
                  placeholder="Start"
                  valueText={
                    values.startMinute !==
                    null
                      ? formatTimeOption(
                          values.startMinute,
                        )
                      : undefined
                  }
                  open={
                    openField ===
                    'start'
                  }
                  onToggle={() =>
                    toggle(
                      'start',
                    )
                  }
                  hasError={
                    validationMessage ===
                    'Pick a start time.'
                  }
                  disabled={
                    readOnly
                  }
                  triggerRef={
                    dropdownRefs.start
                  }
                />
              </View>

              <View
                style={
                  sheetStyles.timeColumn
                }
              >
                <DropdownField
                  label="End time"
                  placeholder="End"
                  valueText={
                    values.endMinute !==
                    null
                      ? formatTimeOption(
                          values.endMinute,
                        )
                      : undefined
                  }
                  open={
                    openField ===
                    'end'
                  }
                  onToggle={() =>
                    toggle(
                      'end',
                    )
                  }
                  disabled={
                    readOnly
                  }
                  triggerRef={
                    dropdownRefs.end
                  }
                />
              </View>
            </View>
          </FormField>

          <FormField
            label="Type"
          >
            <EventTypePicker
              selectedType={
                values.eventType
              }
              onChange={(
                eventType,
              ) =>
                update({
                  eventType,
                })
              }
              disabled={
                readOnly
              }
            />
          </FormField>

          <FormField
            label="Location"
          >
            <FormTextInput
              label="Location"
              placeholder="Add a location"
              value={
                values.location
              }
              onChangeText={(
                location,
              ) =>
                update({
                  location,
                })
              }
              disabled={
                readOnly
              }
            />
          </FormField>

          <FormField
            label="Description"
          >
            <TextInput
              accessibilityLabel="Description"
              placeholder="Add a description"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              value={
                values.description
              }
              onChangeText={(
                description,
              ) =>
                update({
                  description,
                })
              }
              multiline
              textAlignVertical="top"
              editable={
                !readOnly
              }
              accessibilityState={{
                disabled:
                  readOnly,
              }}              onFocus={() => {
                setDescriptionFocused(
                  true,
                );

                scrollEditFormToBottom();
              }}
              onBlur={() =>
                setDescriptionFocused(
                  false,
                )
              }
              style={[
                formStyles.input,
                formStyles.inputText,
                localStyles.descriptionInput,

                descriptionFocused &&
                  formStyles.inputActive,
              ]}
            />
          </FormField>

          <ReminderField
            reminderMinutes={
              values.reminderMinutes
            }
            open={
              openField ===
              'reminder'
            }
            onToggle={() =>
              toggle(
                'reminder',
              )
            }
            disabled={
              readOnly
            }
            triggerRef={
              dropdownRefs.reminder
            }
          />

          {validationMessage && (
            <Text
              style={[
                formStyles.errorText,
                localStyles.centeredMessage,
              ]}
              accessibilityLiveRegion="polite"
            >
              {
                validationMessage
              }
            </Text>
          )}

          {renderSyncStatus()}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hasConflict
                ? 'Resolve calendar conflict before saving'
                : readOnly
                  ? 'Read-only calendar event'
                  : 'Save event changes'
            }
            accessibilityState={{
              disabled:
                saveDisabled,

              busy:
                isSaving,
            }}
            disabled={
              saveDisabled
            }
            onPress={
              handleSave
            }
            style={[
              sheetStyles.addButton,

              saveDisabled &&
                sheetStyles.addButtonSaving,
            ]}
          >
            {isSaving ? (
              <View
                style={
                  sheetStyles.savingRow
                }
              >
                <ActivityIndicator
                  size="small"
                  color={
                    colors.softWhite
                  }
                />

                <Text
                  style={
                    sheetStyles.addButtonText
                  }
                >
                  Saving…
                </Text>
              </View>
            ) : (
              <Text
                style={
                  sheetStyles.addButtonText
                }
              >
                {hasConflict
                  ? 'Resolve Conflict First'
                  : readOnly
                    ? 'Read Only'
                    : 'Save Changes'}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <Modal
      visible={
        visible
      }
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={
        onClose
      }
    >
      <View
        ref={
          sheetRef
        }
        style={
          sheetStyles.sheet
        }
      >
        <KeyboardAvoidingView
          style={
            sheetStyles.keyboardArea
          }
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={
              sheetStyles.topBar
            }
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close edit event"
              hitSlop={
                14
              }
              disabled={
                resolvingWinner !==
                null
              }
              onPress={
                onClose
              }
            >
              <CloseIcon
                width={
                  16.5
                }
                height={
                  16.5
                }
              />
            </Pressable>
          </View>

          {hasConflict
            ? renderConflictReview()
            : renderEditForm()}
        </KeyboardAvoidingView>

        {!reviewingConflict &&
          openField ===
            'date' && (
            <FloatingDropdown
              label="Date"
              anchor={
                anchor
              }
              onClose={
                closeDropdown
              }
            >
              <DatePickerPanel
                selectedDate={
                  values.date
                }
                onSelect={(
                  date,
                ) => {
                  update({
                    date,
                  });

                  closeDropdown();
                }}
              />
            </FloatingDropdown>
          )}

        {!reviewingConflict &&
          openField ===
            'start' && (
            <FloatingDropdown
              label="Start time"
              anchor={
                anchor
              }
              onClose={
                closeDropdown
              }
            >
              <OptionList
                options={
                  START_OPTIONS
                }
                selectedValue={
                  values.startMinute
                }
                onSelect={
                  chooseStart
                }
                initialValue={
                  values.startMinute ??
                  currentHour
                }
                showSelectedTag={
                  false
                }
              />
            </FloatingDropdown>
          )}

        {!reviewingConflict &&
          openField ===
            'end' && (
            <FloatingDropdown
              label="End time"
              anchor={
                anchor
              }
              onClose={
                closeDropdown
              }
            >
              <OptionList
                options={
                  endOptions
                }
                selectedValue={
                  values.endMinute
                }
                onSelect={(
                  endMinute,
                ) => {
                  update({
                    endMinute,
                  });

                  closeDropdown();
                }}
                initialValue={
                  values.endMinute ??
                  (
                    values.startMinute !==
                    null
                      ? Math.min(
                          values.startMinute +
                            60,
                          END_OF_DAY,
                        )
                      : Math.min(
                          currentHour +
                            60,
                          END_OF_DAY,
                        )
                  )
                }
                showSelectedTag={
                  false
                }
              />
            </FloatingDropdown>
          )}

        {!reviewingConflict &&
          openField ===
            'reminder' && (
            <FloatingDropdown
              label="Reminder"
              anchor={
                anchor
              }
              onClose={
                closeDropdown
              }
            >
              <OptionList
                options={
                  REMINDER_CHOICES
                }
                selectedValue={
                  values.reminderMinutes
                }
                onSelect={(
                  reminderMinutes,
                ) => {
                  update({
                    reminderMinutes,
                  });

                  closeDropdown();
                }}
              />
            </FloatingDropdown>
          )}
      </View>
    </Modal>
  );
}

const localStyles =
  StyleSheet.create({
    descriptionInput: {
      minHeight:
        100,

      paddingTop:
        12,
    },

    centeredMessage: {
      textAlign:
        'center',
    },

    conflictBanner: {
      padding:
        16,

      borderRadius:
        14,

      backgroundColor:
        colors.paleSun,

      gap:
        6,
    },

    conflictBannerTitle: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    conflictBannerText: {
      fontSize:
        14,

      lineHeight:
        20,

      color:
        colors.deepOlive,
    },

    conflictBannerHint: {
      fontSize:
        13,

      lineHeight:
        18,

      color:
        colors.mutedGrayGreen,
    },

    reviewConflictButton: {
      minHeight:
        44,

      marginTop:
        6,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.eucalyptus,
    },

    reviewConflictButtonText: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        colors.softWhite,
    },

    conflictReviewContent: {
      paddingHorizontal:
        19,

      paddingBottom:
        40,

      gap:
        16,
    },

    conflictIntro: {
      fontSize:
        14,

      lineHeight:
        20,

      textAlign:
        'center',

      color:
        colors.mutedGrayGreen,

      marginBottom:
        2,
    },

    versionCard: {
      padding:
        16,

      borderRadius:
        14,

      borderWidth:
        1,

      gap:
        14,
    },

    riseVersionCard: {
      backgroundColor:
        colors.mistGreen,

      borderColor:
        colors.softSage,
    },

    calendarVersionCard: {
      backgroundColor:
        colors.softWhite,

      borderColor:
        colors.softSage,
    },

    versionTitle: {
      fontSize:
        17,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    versionField: {
      gap:
        3,
    },

    versionLabel: {
      fontSize:
        12,

      fontWeight:
        '700',

      color:
        colors.mutedGrayGreen,

      textTransform:
        'uppercase',
    },

    versionValue: {
      fontSize:
        15,

      lineHeight:
        21,

      color:
        colors.deepOlive,
    },

    resolutionActions: {
      gap:
        10,
    },

    primaryResolutionButton: {
      minHeight:
        50,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.eucalyptus,
    },

    primaryResolutionButtonText: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        colors.softWhite,
    },

    secondaryResolutionButton: {
      minHeight:
        50,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.softSage,
    },

    secondaryResolutionButtonText: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    backButton: {
      minHeight:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    backButtonText: {
      fontSize:
        14,

      fontWeight:
        '600',

      color:
        colors.eucalyptus,
    },

    resolutionErrorBox: {
      padding:
        14,

      borderRadius:
        14,

      backgroundColor:
        colors.paleSun,

      gap:
        8,
    },

    resolutionErrorTitle: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    resolutionErrorText: {
      fontSize:
        14,

      lineHeight:
        20,

      color:
        colors.deepOlive,
    },

    retryResolutionButton: {
      alignSelf:
        'flex-start',

      minHeight:
        38,

      minWidth:
        84,

      paddingHorizontal:
        16,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.softSage,
    },

    retryResolutionButtonText: {
      fontSize:
        14,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    successBox: {
      padding:
        12,

      borderRadius:
        10,

      backgroundColor:
        colors.mistGreen,
    },

    successText: {
      color:
        colors.deepOlive,

      fontSize:
        14,

      lineHeight:
        20,

      textAlign:
        'center',
    },

    infoBox: {
      padding:
        12,

      borderRadius:
        10,

      backgroundColor:
        colors.paleSun,
    },

    infoText: {
      color:
        colors.deepOlive,

      fontSize:
        14,

      lineHeight:
        20,
    },

    warningBox: {
      padding:
        12,

      borderRadius:
        10,

      backgroundColor:
        colors.paleSun,
    },

    warningTitle: {
      fontSize:
        14,

      fontWeight:
        '700',

      color:
        colors.deepOlive,

      marginBottom:
        4,
    },

    warningText: {
      fontSize:
        14,

      lineHeight:
        20,

      color:
        colors.deepOlive,
    },

    providerError: {
      marginTop:
        12,

      gap:
        8,
    },

    providerErrorText: {
      fontSize:
        14,

      lineHeight:
        20,

      color:
        colors.deepOlive,
    },

    retryButton: {
      alignSelf:
        'flex-start',

      minWidth:
        80,

      minHeight:
        36,

      paddingHorizontal:
        14,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.softSage,
    },

    retryButtonText: {
      color:
        colors.deepOlive,

      fontWeight:
        '700',
    },

    pressed: {
      opacity:
        0.75,
    },

    disabledButton: {
      opacity:
        0.5,
    },
  });