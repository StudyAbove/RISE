import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { format, parseISO } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { eventSourceColors } from '../calendarColors';
import { isAllDayEvent } from '../utils/allDayEvents';
import { EVENT_SOURCE_LABELS } from '../utils/eventLabels';
import { EVENT_CHIP_LOGO_SIZE, styles } from './EventChip.styles';
import { SourceLogo } from './SourceLogo';

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

const CONTENT_STYLES = {
  mini: styles.miniContent,
  compact: styles.compactContent,
  regular: styles.regularContent,
};

/**
 * An event drawn as in Figma: a colored tab (by source) on the left of a pale
 * chip, then the source's logo and the title (#82). Titles that don't fit end
 * in "…".
 */
export function EventChip({
  event,
  size,
  maxTitleLines = 1,
  style,
  onPress,
}: EventChipProps) {
  const timeRange =
    isAllDayEvent(event)
      ? 'all day'
      : `${format(parseISO(event.startAt), 'h:mm a')} to ${format(
          parseISO(event.endAt),
          'h:mm a',
        )}`;

  return (
    <Pressable
      accessibilityRole="button"
      // Names the source too, so it isn't told by color and logo alone (#82, AC8).
      accessibilityLabel={`${event.title}, ${EVENT_SOURCE_LABELS[event.source]}, ${timeRange}`}
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
      <View style={[styles.content, CONTENT_STYLES[size]]}>
        <SourceLogo
          testID="event-chip-logo"
          source={event.source}
          size={EVENT_CHIP_LOGO_SIZE[size]}
        />
        <Text
          numberOfLines={maxTitleLines}
          style={styles.title}
        >
          {event.title}
        </Text>
      </View>
    </Pressable>
  );
}