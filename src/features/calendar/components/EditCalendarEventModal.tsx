import {
  ActivityIndicator,
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
  format,
  parseISO,
} from 'date-fns';

import {
  useEffect,
  useState,
} from 'react';

import type { CalendarEvent } from '../../../models/CalendarEvent';

import type {
  ExternalCalendarProvider,
} from '../../../models/CalendarEventLink';

import {
  colors,
  statusColors,
} from '../../../theme/colors';

import {
  retryCalendarEventSync,
  updateCalendarEventWithSync,
  type CalendarEventSyncResult,
  type ProviderSyncResult,
} from '../services/calendarEventSyncService';

interface EditCalendarEventModalProps {
  visible: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onSaved: (
    result: CalendarEventSyncResult,
  ) => void;
}

/**
 * Temporary edit form used to exercise calendar event synchronization.
 * The final Edit Event user story can replace this UI later
 * without changing the sync service.
 */
export function EditCalendarEventModal({
  visible,
  event,
  onClose,
  onSaved,
}: EditCalendarEventModalProps) {
  const [
    title,
    setTitle,
  ] = useState('');

  const [
    startDate,
    setStartDate,
  ] = useState('');

  const [
    startTime,
    setStartTime,
  ] = useState('');

  const [
    endDate,
    setEndDate,
  ] = useState('');

  const [
    endTime,
    setEndTime,
  ] = useState('');

  const [
    location,
    setLocation,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    validationMessage,
    setValidationMessage,
  ] = useState<
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
  ] = useState(false);

  const [
    retryingProvider,
    setRetryingProvider,
  ] =
    useState<
      ExternalCalendarProvider | null
    >(null);

  useEffect(() => {
    if (
      !event ||
      !visible
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

    setTitle(
      event.title,
    );

    setStartDate(
      format(
        start,
        'yyyy-MM-dd',
      ),
    );

    setStartTime(
      format(
        start,
        'HH:mm',
      ),
    );

    setEndDate(
      format(
        end,
        'yyyy-MM-dd',
      ),
    );

    setEndTime(
      format(
        end,
        'HH:mm',
      ),
    );

    setLocation(
      event.location ??
        '',
    );

    setDescription(
      event.description ??
        '',
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
  }, [
    event,
    visible,
  ]);

  function parseLocalDateTime(
    dateText: string,
    timeText: string,
  ): Date | null {
    const dateMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        dateText.trim(),
      );

    const timeMatch =
      /^(\d{2}):(\d{2})$/.exec(
        timeText.trim(),
      );

    if (
      !dateMatch ||
      !timeMatch
    ) {
      return null;
    }

    const year =
      Number(
        dateMatch[1],
      );

    const month =
      Number(
        dateMatch[2],
      );

    const day =
      Number(
        dateMatch[3],
      );

    const hour =
      Number(
        timeMatch[1],
      );

    const minute =
      Number(
        timeMatch[2],
      );

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    const parsed =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0,
      );

    if (
      parsed.getFullYear() !==
        year ||
      parsed.getMonth() !==
        month - 1 ||
      parsed.getDate() !==
        day ||
      parsed.getHours() !==
        hour ||
      parsed.getMinutes() !==
        minute
    ) {
      return null;
    }

    return parsed;
  }

  async function handleSave() {
    if (!event) {
      return;
    }

    setValidationMessage(
      null,
    );

    setSyncResult(
      null,
    );

    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      setValidationMessage(
        'Event title is required.',
      );

      return;
    }

    const parsedStart =
      parseLocalDateTime(
        startDate,
        startTime,
      );

    if (!parsedStart) {
      setValidationMessage(
        'Enter a valid start date and time using YYYY-MM-DD and HH:MM.',
      );

      return;
    }

    const parsedEnd =
      parseLocalDateTime(
        endDate,
        endTime,
      );

    if (!parsedEnd) {
      setValidationMessage(
        'Enter a valid end date and time using YYYY-MM-DD and HH:MM.',
      );

      return;
    }

    if (
      parsedEnd.getTime() <
      parsedStart.getTime()
    ) {
      setValidationMessage(
        'The end time cannot be before the start time.',
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
              location.trim(),

            description:
              description.trim(),
          },
        );

      setSyncResult(
        result,
      );

      setSavedEvent(
        result.event,
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

  function getProviderName(
    provider:
      ExternalCalendarProvider,
  ) {
    return provider ===
      'apple'
      ? 'Apple Calendar'
      : 'Google Calendar';
  }

  function getProviderErrorMessage(
    result:
      ProviderSyncResult,
  ) {
    if (
      result.error ===
      'APPLE_CALENDAR_NOT_CONNECTED'
    ) {
      return 'Apple Calendar is no longer connected. Your RISE changes are still saved.';
    }

    if (
      result.error ===
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
    ) {
      return 'Google Calendar needs to be reconnected in Settings. Your RISE changes are still saved.';
    }

    if (
      result.error ===
      'GOOGLE_EVENT_NOT_FOUND'
    ) {
      return 'The linked Google Calendar event could not be found.';
    }

    if (
      result.error ===
        'APPLE_EVENT_LINK_MISSING' ||
      result.error ===
        'GOOGLE_EVENT_LINK_MISSING'
    ) {
      return 'RISE could not find the external calendar link for this event.';
    }

    if (
      result.error ===
      'GOOGLE_CALENDAR_ID_MISSING'
    ) {
      return 'RISE is missing the Google Calendar information needed to sync this event.';
    }

    return `${getProviderName(
      result.provider,
    )} could not be updated.`;
  }

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
    if (
      !syncResult
    ) {
      return null;
    }

    if (
      syncResult.status ===
      'synced'
    ) {
      return (
        <View
          style={
            styles.successBox
          }
        >
          <Text
            style={
              styles.successText
            }
          >
            Saved in RISE and
            synced successfully.
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
            styles.infoBox
          }
        >
          <Text
            style={
              styles.infoText
            }
          >
            Saved in RISE. This
            event is not currently
            linked to an Apple or
            Google Calendar event.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.warningBox
        }
      >
        <Text
          style={
            styles.warningTitle
          }
        >
          Your RISE changes were
          saved.
        </Text>

        <Text
          style={
            styles.warningText
          }
        >
          One or more connected
          calendars could not be
          updated.
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
                  styles.providerError
                }
              >
                <Text
                  style={
                    styles.providerErrorText
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
                    styles.retryButton,

                    pressed &&
                      styles.pressed,

                    retryingProvider !==
                      null &&
                      styles.disabledButton,
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
                        styles.retryButtonText
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

  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <KeyboardAvoidingView
        style={
          styles.overlay
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
            styles.modalCard
          }
        >
          <View
            style={
              styles.header
            }
          >
            <Text
              accessibilityRole="header"
              style={
                styles.heading
              }
            >
              Edit Event
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close edit event"
              onPress={
                onClose
              }
              hitSlop={
                12
              }
            >
              <Text
                style={
                  styles.closeText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.form
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Event Title
            </Text>

            <TextInput
              value={
                title
              }
              onChangeText={
                setTitle
              }
              placeholder="Event title"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              style={
                styles.input
              }
              accessibilityLabel="Event title"
            />

            <Text
              style={
                styles.label
              }
            >
              Start Date
            </Text>

            <TextInput
              value={
                startDate
              }
              onChangeText={
                setStartDate
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              autoCapitalize="none"
              style={
                styles.input
              }
              accessibilityLabel="Start date"
            />

            <Text
              style={
                styles.label
              }
            >
              Start Time
            </Text>

            <TextInput
              value={
                startTime
              }
              onChangeText={
                setStartTime
              }
              placeholder="HH:MM"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              autoCapitalize="none"
              style={
                styles.input
              }
              accessibilityLabel="Start time"
            />

            <Text
              style={
                styles.label
              }
            >
              End Date
            </Text>

            <TextInput
              value={
                endDate
              }
              onChangeText={
                setEndDate
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              autoCapitalize="none"
              style={
                styles.input
              }
              accessibilityLabel="End date"
            />

            <Text
              style={
                styles.label
              }
            >
              End Time
            </Text>

            <TextInput
              value={
                endTime
              }
              onChangeText={
                setEndTime
              }
              placeholder="HH:MM"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              autoCapitalize="none"
              style={
                styles.input
              }
              accessibilityLabel="End time"
            />

            <Text
              style={
                styles.label
              }
            >
              Location
            </Text>

            <TextInput
              value={
                location
              }
              onChangeText={
                setLocation
              }
              placeholder="Optional"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              style={
                styles.input
              }
              accessibilityLabel="Event location"
            />

            <Text
              style={
                styles.label
              }
            >
              Description
            </Text>

            <TextInput
              value={
                description
              }
              onChangeText={
                setDescription
              }
              placeholder="Optional"
              placeholderTextColor={
                colors.mutedGrayGreen
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              accessibilityLabel="Event description"
            />

            {validationMessage && (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {
                    validationMessage
                  }
                </Text>
              </View>
            )}

            {renderSyncStatus()}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save event changes"
              disabled={
                isSaving
              }
              onPress={
                handleSave
              }
              style={({
                pressed,
              }) => [
                styles.saveButton,

                pressed &&
                  styles.pressed,

                isSaving &&
                  styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator
                  color={
                    colors.softWhite
                  }
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Save Changes
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,

      justifyContent:
        'flex-end',

      backgroundColor:
        `${colors.deepOlive}4D`,
    },

    modalCard: {
      maxHeight:
        '90%',

      backgroundColor:
        colors.softWhite,

      borderTopLeftRadius:
        24,

      borderTopRightRadius:
        24,

      paddingTop:
        18,
    },

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        20,

      paddingBottom:
        12,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        statusColors.progressTrack,
    },

    heading: {
      fontSize:
        22,

      fontWeight:
        '700',

      color:
        colors.deepOlive,
    },

    closeText: {
      fontSize:
        16,

      fontWeight:
        '600',

      color:
        colors.eucalyptus,
    },

    form: {
      padding:
        20,

      paddingBottom:
        40,
    },

    label: {
      fontSize:
        14,

      fontWeight:
        '700',

      color:
        colors.deepOlive,

      marginBottom:
        6,

      marginTop:
        14,
    },

    input: {
      minHeight:
        46,

      borderWidth:
        1,

      borderColor:
        statusColors.progressTrack,

      borderRadius:
        10,

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      fontSize:
        16,

      color:
        colors.deepOlive,

      backgroundColor:
        colors.warmCream,
    },

    descriptionInput: {
      minHeight:
        100,
    },

    saveButton: {
      minHeight:
        48,

      marginTop:
        22,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.eucalyptus,
    },

    saveButtonText: {
      fontSize:
        16,

      fontWeight:
        '700',

      color:
        colors.softWhite,
    },

    pressed: {
      opacity:
        0.75,
    },

    disabledButton: {
      opacity:
        0.5,
    },

    errorBox: {
      marginTop:
        16,

      padding:
        12,

      borderRadius:
        10,

      backgroundColor:
        colors.warmCream,

      borderWidth:
        1,

      borderColor:
        statusColors.urgentRed,
    },

    errorText: {
      color:
        statusColors.urgentRed,

      fontSize:
        14,

      lineHeight:
        20,
    },

    successBox: {
      marginTop:
        16,

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
    },

    infoBox: {
      marginTop:
        16,

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
      marginTop:
        16,

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
  });