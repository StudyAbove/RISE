import type { FC, ReactNode } from 'react';
import { Image, type ImageSourcePropType, Modal, Pressable, ScrollView, Text, View } from 'react-native';
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
import type { CalendarEvent, CalendarEventType, CalendarSource } from '../../../models/CalendarEvent';
import { eventTypeCircleColors } from '../calendarColors';
import { EVENT_SOURCE_LABELS, EVENT_TYPE_LABELS, formatReminder } from '../utils/eventLabels';
import { styles } from './EventDetailsSheet.styles';
import { formatEventTime } from './TodayEventsCard';

const BIG_ICON_SIZE = 44;

// The big icon at the top, by event type. Class is an image (see below).
const TYPE_ICONS: Partial<Record<CalendarEventType, FC<SvgProps>>> = {
  assignment: AssignmentIcon,
  study: StudyIcon,
  personal: PersonalIcon,
  wellness: WellnessIcon,
};

// Each source's logo for the "From" row; RISE events use the app icon.
const SOURCE_LOGOS: Record<CalendarSource, ImageSourcePropType> = {
  rise: require('../../../../assets/icon.png'),
  google: require('../../../../assets/icons/google.png'),
  apple: require('../../../../assets/icons/apple.png'),
  canvas: require('../../../../assets/icons/canvas/canvas-logo.png'),
};

interface EventDetailsSheetProps {
  visible: boolean;
  /** The event to show; nothing renders without one. */
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  /** iOS only: called once the sheet has finished sliding away. */
  onDismiss?: () => void;
}

/**
 * The details of one calendar event (Figma "Biology Details"), shown as an iOS
 * sheet when an event is tapped. Date, time, and where it came from always
 * show; type, location, reminder, and notes only when the event has them.
 */
export function EventDetailsSheet({ visible, event, onClose, onEdit, onDismiss }: EventDetailsSheetProps) {
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
                  <Image
                    testID="event-source-logo"
                    source={SOURCE_LOGOS[event.source]}
                    // The Apple logo is white (made for the dark Apple button), so it's darkened here to show on the card.
                    style={[styles.sourceLogo, event.source === 'apple' && styles.appleLogo]}
                    accessibilityIgnoresInvertColors
                  />
                }
              >
                From {EVENT_SOURCE_LABELS[event.source]}
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

            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit"
                onPress={() => onEdit(event)}
                style={[styles.button, styles.editButton]}
              >
                <Text style={styles.editLabel}>Edit</Text>
              </Pressable>
              {/* Deleting comes with #80; the button shows now so the layout matches Figma. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete"
                accessibilityHint="Coming soon"
                accessibilityState={{ disabled: true }}
                disabled
                style={[styles.button, styles.deleteButton, styles.disabledButton]}
              >
                <Text style={styles.deleteLabel}>Delete</Text>
              </Pressable>
            </View>
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
