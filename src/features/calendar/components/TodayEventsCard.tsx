import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addDays, format, parseISO, startOfDay } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { eventSourceColors } from '../calendarColors';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { getDaySegments } from '../utils/calendarEvents';
import { styles } from './TodayEventsCard.styles';

/** "9:00 AM – 10:30 AM", or "At 11:59 PM" for an event with no length, like a deadline. */
export function formatEventTime(event: CalendarEvent): string {
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);

  if (start.getTime() === end.getTime()) {
    return `At ${format(start, 'h:mm a')}`;
  }
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
}

/**
 * The card under the month grid listing today's events (Figma "Event Widget").
 * It loads today on its own, so it stays correct while the student browses
 * other months.
 */
export function TodayEventsCard() {
  const [today] = useState(() => startOfDay(new Date()));
  const { events, status, retry } = useCalendarEvents(today, addDays(today, 1));
  const todayEvents = getDaySegments(events, today).map((segment) => segment.event);

  return (
    <View style={styles.band}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>
          {format(today, 'MMMM d, EEEE')}
        </Text>

        {todayEvents.map((event) => (
          <View key={event.id} accessible style={styles.eventRow}>
            <View style={[styles.sourceBar, { backgroundColor: eventSourceColors[event.source] }]} />
            <View style={styles.eventText}>
              <Text numberOfLines={1} style={styles.eventTitle}>
                {event.title}
              </Text>
              <Text style={styles.eventTime}>{formatEventTime(event)}</Text>
            </View>
          </View>
        ))}

        {status === 'ready' && todayEvents.length === 0 && (
          <Text style={[styles.message, styles.emptyMessage]}>No events today.</Text>
        )}
        {status === 'error' && (
          <View style={styles.errorRow}>
            <Text style={styles.message}>Couldn't load today's events.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry today's events" onPress={retry} hitSlop={12}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
