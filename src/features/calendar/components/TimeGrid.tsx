import { ScrollView, Text, View } from 'react-native';
import { format, isToday } from 'date-fns';

import { GRID_SIZES, styles, type TimeGridView } from './TimeGrid.styles';

const HOURS_IN_DAY = 24;
// Figma's hourly frames open with 7 AM near the top; earlier hours are a scroll away.
const INITIAL_VISIBLE_HOUR = 7;

// "12 AM", "1 AM", … "11 PM". The date is a placeholder; only the hour is shown.
const HOUR_LABELS = Array.from({ length: HOURS_IN_DAY }, (_, hour) =>
  format(new Date(2000, 0, 1, hour), 'h a')
);

interface TimeGridProps {
  /** The day columns to show, left to right (7 for Week, 2 for 2 Day, 1 for Day). */
  days: Date[];
  /** Which hourly view this is; sets the sizes and header style. */
  view: TimeGridView;
}

/**
 * Hourly calendar shared by the Week, 2 Day, and Day views: a row of day
 * names and dates (today circled) over a scrollable 24-hour grid.
 */
export function TimeGrid({ days, view }: TimeGridProps) {
  const { hourRowHeight, hourGutterWidth } = GRID_SIZES[view];
  // 2 Day and Day use the darker header text from their Figma frames.
  const isFocusView = view !== 'week';

  const renderDayHeader = (day: Date, width?: number) => {
    const today = isToday(day);
    const label = format(day, 'EEEE, MMMM d');

    return (
      <View
        key={day.toISOString()}
        accessible
        accessibilityRole="header"
        accessibilityLabel={today ? `Today, ${label}` : label}
        style={[styles.dayHeader, width !== undefined && { flex: 0, width }]}
      >
        <Text style={[styles.dayName, isFocusView && styles.focusDayName]}>
          {format(day, 'EEE').toUpperCase()}
        </Text>
        <View style={[styles.dayNumberBox, today && styles.todayCircle]}>
          <Text style={[styles.dayNumber, isFocusView && styles.focusDayNumber, today && styles.todayNumber]}>
            {format(day, 'd')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.dayHeaderRow}>
        {view === 'day' ? (
          // Like Google Calendar's day view, the single date sits above the hour labels.
          renderDayHeader(days[0], hourGutterWidth)
        ) : (
          <>
            <View style={{ width: hourGutterWidth }} />
            {days.map((day) => renderDayHeader(day))}
          </>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentOffset={{ x: 0, y: INITIAL_VISIBLE_HOUR * hourRowHeight }}
      >
        <View style={styles.gridRow}>
          <View style={{ width: hourGutterWidth }}>
            {HOUR_LABELS.map((label, hour) => (
              <Text key={label} style={[styles.hourLabel, { top: hour * hourRowHeight }]}>
                {label}
              </Text>
            ))}
          </View>

          {days.map((day) => (
            <View key={day.toISOString()} style={styles.dayColumn}>
              {HOUR_LABELS.map((label) => (
                <View key={label} style={[styles.hourCell, { height: hourRowHeight }]} />
              ))}

            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
