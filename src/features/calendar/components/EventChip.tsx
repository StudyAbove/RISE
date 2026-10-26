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
import { EVENT_SOURCE_LABELS, EVENT_TYPE_LABELS } from '../utils/eventLabels';
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
 *
 * Regular chips (2 Day and Day) also name the event's type (#38): on its own
 * line under the title when there's room for two lines, otherwise after the
 * title ("Gym · Wellness"). Week and Month chips are too small for it.
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

  const typeLabel =
    event.eventType
      ? EVENT_TYPE_LABELS[event.eventType]
      : undefined;

  const showType =
    size === 'regular' &&
    typeLabel !== undefined;

  // The type takes the last line when there are two or more; otherwise it
  // shares the title's line.
  const typeOnOwnLine =
    showType &&
    maxTitleLines >= 2;

  return (
    <Pressable
      accessibilityRole="button"
      // Names the source too, so it isn't told by color and logo alone (#82, AC8),
      // and the type in every view, even where the chip doesn't show it (#38).
      accessibilityLabel={[
        event.title,
        typeLabel,
        EVENT_SOURCE_LABELS[event.source],
        timeRange,
      ]
        .filter(Boolean)
        .join(', ')}
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
          numberOfLines={
            typeOnOwnLine
              ? maxTitleLines - 1
              : maxTitleLines
          }
          style={styles.title}
        >
          {event.title}
        </Text>
        {showType && !typeOnOwnLine && (
          <Text style={styles.inlineType}>
            · {typeLabel}
          </Text>
        )}
      </View>
      {typeOnOwnLine && (
        <Text
          numberOfLines={1}
          style={styles.typeLine}
        >
          {typeLabel}
        </Text>
      )}
    </Pressable>
  );
}