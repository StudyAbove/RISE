import { type FC, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { format, parseISO } from 'date-fns';

import BellIcon from '../../../../assets/icons/calendar/details/bell.svg';
import CalendarIcon from '../../../../assets/icons/calendar/details/calendar.svg';
import FileTextIcon from '../../../../assets/icons/calendar/details/file-text.svg';
import MapPinIcon from '../../../../assets/icons/calendar/details/map-pin.svg';
import CloseIcon from '../../../../assets/icons/calendar/close.svg';
import AssignmentIcon from '../../../../assets/icons/calendar/event-types/assignment.svg';
import PersonalIcon from '../../../../assets/icons/calendar/event-types/personal.svg';
import StudyIcon from '../../../../assets/icons/calendar/event-types/study.svg';
import WellnessIcon from '../../../../assets/icons/calendar/event-types/wellness.svg';
import type { CalendarEvent, CalendarEventType } from '../../../models/CalendarEvent';
import { colors } from '../../../theme/colors';
import { eventTypeCircleColors } from '../calendarColors';
import { getLinkedCalendarProviders } from '../services/calendarEventSyncService';
import { getDeleteConfirmMessage, getDeleteErrorMessage } from '../utils/deleteEventMessages';
import { EVENT_SOURCE_LABELS, EVENT_TYPE_LABELS, formatReminder } from '../utils/eventLabels';
import { styles } from './EventDetailsSheet.styles';
import { SourceLogo } from './SourceLogo';
import { formatEventTime } from './TodayEventsCard';

const BIG_ICON_SIZE = 44;

// The big icon at the top, by event type. Class is an image (see below).
const TYPE_ICONS: Partial<Record<CalendarEventType, FC<SvgProps>>> = {
  assignment: AssignmentIcon,
  study: StudyIcon,
  personal: PersonalIcon,
  wellness: WellnessIcon,
};

interface EventDetailsSheetProps {
  visible: boolean;
  /** The event to show; nothing renders without one. */
  event: CalendarEvent | null;
  /** An unresolved provider conflict must be resolved before editing/deleting. */
  hasUnresolvedConflict: boolean;
  /** Provider permissions do not allow this event to be changed in RISE. */
  readOnly: boolean;
  /** Provider sources for an imported Apple/Google event after deduplication. */
  providerSources: Array<'apple' | 'google'>;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onReviewConflict: (event: CalendarEvent) => void;

  /**
   * Deletes the event after the student confirms (#80). Resolves once it's
   * gone, so the calendar can close the sheet; a rejection shows the error
   * and keeps the event.
   */
  onDelete: (event: CalendarEvent) => Promise<void>;
  /** iOS only: called once the sheet has finished sliding away. */
  onDismiss?: () => void;
}

/**
 * The details of one calendar event (Figma "Biology Details"), shown as an iOS
 * sheet when an event is tapped. Date, time, and where it came from always
 * show; type, location, reminder, and notes only when the event has them.
 */
export function EventDetailsSheet({
  visible,
  event,
  hasUnresolvedConflict,
  readOnly,
  providerSources,
  onClose,
  onEdit,
  onReviewConflict,
  onDelete,
  onDismiss,
}: EventDetailsSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // True while checking which calendars the event is in, before confirmation.
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  // Each time the sheet opens, it starts ready to delete again.
  useEffect(() => {
    if (visible) {
      setIsDeleting(false);
      setIsCheckingLinks(false);
    }
  }, [visible]);

  // Name every linked provider in the confirmation before deleting.
  async function confirmDelete(
    eventToDelete: CalendarEvent,
  ) {
    setIsCheckingLinks(true);

    let linkedProviders:
      Awaited<ReturnType<typeof getLinkedCalendarProviders>> | null;

    try {
      linkedProviders =
        await getLinkedCalendarProviders(
          eventToDelete.id,
        );
    } catch {
      linkedProviders = null;
    } finally {
      setIsCheckingLinks(false);
    }

    Alert.alert(
      `Delete "${eventToDelete.title}"?`,
      getDeleteConfirmMessage(
        linkedProviders,
      ),
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void deleteEvent(
              eventToDelete,
            ),
        },
      ],
    );
  }

  async function deleteEvent(
    eventToDelete: CalendarEvent,
  ) {
    setIsDeleting(true);

    try {
      await onDelete(
        eventToDelete,
      );
    } catch (error) {
      Alert.alert(
        "Couldn't delete event",
        getDeleteErrorMessage(
          error,
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  }
  return (
    <Modal
      testID="event-details-sheet"
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.sheet}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose}>
            <CloseIcon width={16.5} height={16.5} />
          </Pressable>
        </View>

        {event && (
          <ScrollView contentContainerStyle={styles.content}>
            <TypeCircle type={event.eventType} />

            <View style={[styles.card, styles.mainCard]}>
              <Text accessibilityRole="header" style={styles.title}>
                {event.title}
              </Text>

              <DetailRow icon={<CalendarIcon width={25} height={25} />}>
                {format(parseISO(event.startAt), 'EEEE, MMMM d, yyyy')}
                {'\n'}
                {formatEventTime(event)}
              </DetailRow>

              <DetailRow
                icon={
                  event.source !== 'rise' &&
                  event.source !== 'canvas' &&
                  providerSources.length > 1 ? (
                    <View style={styles.multipleSourceLogos}>
                      {providerSources.map((provider) => (
                        <SourceLogo
                          key={provider}
                          testID={`event-source-logo-${provider}`}
                          source={provider}
                          size={17}
                          style={styles.multipleSourceLogo}
                        />
                      ))}
                    </View>
                  ) : (
                    <SourceLogo testID="event-source-logo" source={event.source} size={22} style={styles.sourceLogo} />
                  )
                }
              >
                {event.source !== 'rise' &&
                event.source !== 'canvas' &&
                providerSources.length > 1
                  ? `From ${providerSources
                      .map(
                        (provider) =>
                          EVENT_SOURCE_LABELS[
                            provider
                          ],
                      )
                      .join(' + ')}`
                  : `From ${
                      EVENT_SOURCE_LABELS[
                        event.source
                      ]
                    }`}
              </DetailRow>

              {event.eventType && (
                <DetailRow icon={<FileTextIcon width={25} height={25} />}>{EVENT_TYPE_LABELS[event.eventType]}</DetailRow>
              )}

              {event.location ? (
                <DetailRow icon={<MapPinIcon width={25} height={25} />}>{event.location}</DetailRow>
              ) : null}

              {event.reminderMinutes != null && (
                <DetailRow icon={<BellIcon width={25} height={25} />}>
                  Reminder: {formatReminder(event.reminderMinutes)}
                </DetailRow>
              )}
            </View>

            {event.description?.trim() ? (
              <View style={[styles.card, styles.notesCard]}>
                <Text accessibilityRole="header" style={styles.notesHeading}>
                  Notes
                </Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{event.description.trim()}</Text>
                </View>
              </View>
            ) : null}

            {hasUnresolvedConflict ? (
              <View style={[styles.card, styles.conflictCard]}>
                <Text
                  accessibilityRole="header"
                  style={styles.conflictTitle}
                >
                  Calendar conflict
                </Text>

                <Text style={styles.conflictText}>
                  This event was changed or deleted in more than one calendar. Review the differences before editing or deleting it.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Review Conflict"
                  onPress={() =>
                    onReviewConflict(
                      event,
                    )
                  }
                  style={styles.reviewConflictButton}
                >
                  <Text style={styles.reviewConflictLabel}>
                    Review Conflict
                  </Text>
                </Pressable>
              </View>
            ) : readOnly ? (
              <View style={[styles.card, styles.readOnlyCard]}>
                <Text
                  accessibilityRole="header"
                  style={styles.readOnlyTitle}
                >
                  Read-only calendar event
                </Text>

                <Text style={styles.readOnlyText}>
                  This event is controlled by a connected calendar and cannot be edited or deleted in RISE.
                </Text>
              </View>
            ) : (
              <View style={styles.buttons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit"
                  accessibilityState={{
                    disabled:
                      isDeleting,
                  }}
                  disabled={isDeleting}
                  onPress={() =>
                    onEdit(
                      event,
                    )
                  }
                  style={[
                    styles.button,
                    styles.editButton,
                    isDeleting &&
                      styles.disabledButton,
                  ]}
                >
                  <Text style={styles.editLabel}>
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isDeleting
                      ? 'Deleting'
                      : 'Delete'
                  }
                  accessibilityState={{
                    disabled:
                      isDeleting ||
                      isCheckingLinks,
                    busy:
                      isDeleting,
                  }}
                  disabled={
                    isDeleting ||
                    isCheckingLinks
                  }
                  onPress={() =>
                    void confirmDelete(
                      event,
                    )
                  }
                  style={[
                    styles.button,
                    styles.deleteButton,
                    isDeleting &&
                      styles.disabledButton,
                  ]}
                >
                  {isDeleting ? (
                    <View style={styles.deletingRow}>
                      <ActivityIndicator
                        size="small"
                        color={colors.softWhite}
                      />
                      <Text style={styles.deleteLabel}>
                        Deleting…
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.deleteLabel}>
                      Delete
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

/** The colored circle with the event type's icon, or a calendar for events without a type. */
function TypeCircle({ type }: { type?: CalendarEventType }) {
  const Icon = type ? TYPE_ICONS[type] : CalendarIcon;

  return (
    <View
      testID="event-type-circle"
      style={[styles.circle, { backgroundColor: eventTypeCircleColors[type ?? 'none'] }]}
    >
      {Icon ? (
        <Icon width={BIG_ICON_SIZE} height={BIG_ICON_SIZE} />
      ) : (
        <Image
          source={require('../../../../assets/icons/calendar/event-types/class.png')}
          style={styles.classIcon}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

function DetailRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[styles.rowText, styles.rowLine]}>{children}</Text>
    </View>
  );
}
