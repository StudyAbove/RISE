import {
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { format, parseISO } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { eventSourceColors } from '../calendarColors';
import { styles } from './EventChip.styles';

export type EventChipSize =
  | 'mini'
  | 'compact'
  | 'regular';

interface EventChipProps {
  event: CalendarEvent;

  /** Mini for Month, compact for Week, regular for 2 Day and Day. */
  size: EventChipSize;

  /** How many lines the title may wrap to; taller events have room for more. */
  maxTitleLines?: number;

  /** Position and size, set by the grid that places the chip. */
  style?: StyleProp<ViewStyle>;

  /** Called when the student selects this event. */
  onPress?: (
    event: CalendarEvent,
  ) => void;
}

const SIZE_STYLES = {
  mini: styles.miniChip,
  compact: styles.compactChip,
  regular: styles.regularChip,
};

/**
 * An event drawn as in Figma: a colored tab (by source) on the left of a pale
 * chip with the title. Titles that don't fit end in "…".
 */
export function EventChip({
  event,
  size,
  maxTitleLines = 1,
  style,
  onPress,
}: EventChipProps) {
  const timeRange =
    `${format(parseISO(event.startAt), 'h:mm a')} to ${format(
      parseISO(event.endAt),
      'h:mm a',
    )}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${timeRange}`}
      accessibilityHint="Opens this event"
      onPress={() => {
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.chip,
        SIZE_STYLES[size],
        {
          borderLeftColor:
            eventSourceColors[event.source],
        },
        style,
        pressed && {
          opacity: 0.7,
        },
      ]}
    >
      <Text
        numberOfLines={maxTitleLines}
        style={styles.title}
      >
        {event.title}
      </Text>
    </Pressable>
  );
}