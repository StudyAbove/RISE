import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  format,
  parseISO,
} from 'date-fns';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export interface CalendarConflictPickerItem {
  calendarEventId: string;
  title: string;
  startAt: string;
}

interface CalendarConflictPickerModalProps {
  visible: boolean;
  items: CalendarConflictPickerItem[];
  onSelect: (
    item: CalendarConflictPickerItem,
  ) => void;
  onClose: () => void;
}

export function CalendarConflictPickerModal({
  visible,
  items,
  onSelect,
  onClose,
}: CalendarConflictPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={
            styles.modalCard
          }
        >
          <Text
            style={
              styles.modalTitle
            }
          >
            Calendar Conflicts
          </Text>

          <Text
            style={
              styles.modalMessage
            }
          >
            Choose an event to review.
          </Text>

          <ScrollView
            style={
              styles.eventList
            }
            contentContainerStyle={
              styles.eventListContent
            }
            showsVerticalScrollIndicator={
              items.length > 4
            }
          >
            {items.map(
              (item) => {
                const dateLabel =
                  format(
                    parseISO(
                      item.startAt,
                    ),
                    'MMM d',
                  ).toUpperCase();

                return (
                  <Pressable
                    key={
                      item.calendarEventId
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.eventButton,

                      pressed &&
                        styles.pressed,
                    ]}
                    onPress={() =>
                      onSelect(
                        item,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${dateLabel}, ${item.title}`}
                  >
                    <View
                      style={
                        styles.eventText
                      }
                    >
                      <Text
                        style={
                          styles.eventDate
                        }
                      >
                        {dateLabel}
                      </Text>

                      <Text
                        style={
                          styles.eventTitle
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {item.title}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.chevron
                      }
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      ›
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>

          <Pressable
            style={({
              pressed,
            }) => [
              styles.cancelButton,

              pressed &&
                styles.pressed,
            ]}
            onPress={
              onClose
            }
            accessibilityRole="button"
            accessibilityLabel="Close calendar conflicts"
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(0, 0, 0, 0.22)',
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingVertical:
      24,
  },

  /*
   * Match the existing RISE confirmation popup width.
   * Height is content-based so the card stays compact.
   */
  modalCard: {
    width: 324,
    maxHeight: 500,
    borderRadius: 16,
    backgroundColor:
      colors.softWhite,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,

    shadowColor:
      '#000000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity:
      0.12,

    shadowRadius:
      10,

    elevation:
      6,
  },

  modalTitle: {
    fontFamily:
      fonts.heading.bold,
    fontSize: 20,
    lineHeight: 27,
    color:
      '#000000',
    textAlign:
      'center',
  },

  modalMessage: {
    width: 276,
    marginTop: 8,
    fontFamily:
      fonts.body.medium,
    fontSize: 14,
    lineHeight: 18,
    color:
      '#71717B',
    textAlign:
      'center',
  },

  eventList: {
    width: 276,
    maxHeight: 300,
    marginTop: 18,
  },

  eventListContent: {
    gap: 10,
  },

  eventButton: {
    minHeight: 68,
    width: 276,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:
      '#D8DDD7',
    backgroundColor:
      '#F8F7F2',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  eventText: {
    flex: 1,
    paddingRight: 10,
  },

  eventDate: {
    fontFamily:
      fonts.heading.semiBold,
    fontSize: 12,
    lineHeight: 15,
    color:
      colors.deepOlive,
    letterSpacing: 0.5,
  },

  eventTitle: {
    marginTop: 4,
    fontFamily:
      fonts.body.medium,
    fontSize: 15,
    lineHeight: 19,
    color:
      '#242424',
  },

  chevron: {
    fontFamily:
      fonts.heading.semiBold,
    fontSize: 25,
    lineHeight: 28,
    color:
      colors.deepOlive,
  },

  cancelButton: {
    width: 276,
    height: 40,
    marginTop: 16,
    borderRadius: 8,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      '#000000',
  },

  cancelButtonText: {
    fontFamily:
      fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color:
      '#FFFFFF',
    textAlign:
      'center',
  },

  pressed: {
    opacity: 0.72,
  },
});
