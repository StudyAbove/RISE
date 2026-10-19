import { Text, View } from 'react-native';

import type { CalendarSource } from '../../../models/CalendarEvent';
import { eventSourceColors } from '../calendarColors';
import { EVENT_SOURCE_LABELS } from '../utils/eventLabels';
import { styles } from './EventSourceLegend.styles';
import { SourceLogo } from './SourceLogo';

// Short names fit the four on one line; VoiceOver reads the full names.
const SOURCES: { source: CalendarSource; shortLabel: string }[] = [
  { source: 'rise', shortLabel: 'RISE' },
  { source: 'google', shortLabel: 'Google' },
  { source: 'apple', shortLabel: 'Apple' },
  { source: 'canvas', shortLabel: 'Canvas' },
];

/**
 * The key under the calendar grid (#82): each source's tab color, logo, and
 * name, so students can tell where an event came from.
 */
export function EventSourceLegend() {
  return (
    <View
      accessible
      accessibilityLabel={`Event sources: ${SOURCES.map(({ source }) => EVENT_SOURCE_LABELS[source]).join(', ')}`}
      style={styles.row}
    >
      {SOURCES.map(({ source, shortLabel }) => (
        <View key={source} style={styles.item}>
          <View style={[styles.tab, { backgroundColor: eventSourceColors[source] }]} />
          <SourceLogo source={source} size={12} />
          <Text style={styles.label}>{shortLabel}</Text>
        </View>
      ))}
    </View>
  );
}
