import { useState } from 'react';
import { Text, View } from 'react-native';
import { format, startOfDay } from 'date-fns';

import { CalendarHeader } from '../components/CalendarHeader';
import { CalendarViewSwitcher } from '../components/CalendarViewSwitcher';
import { shiftAnchorDate, type CalendarViewMode } from '../utils/calendarDates';
import { styles } from './CalendarScreen.styles';

// How far the ‹ › arrows move in each view, used in their VoiceOver labels.
const PERIOD_NAMES: Record<CalendarViewMode, string> = {
  month: 'month',
  week: 'week',
  twoDay: '2 days',
  day: 'day',
};

// Main page of the Calendar tab.
export function CalendarScreen() {
  const [view, setView] = useState<CalendarViewMode>('month');
  // The day every view is built around. Switching views keeps it, so the
  // student stays on the same dates.
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));

  const shift = (direction: 1 | -1) =>
    setAnchorDate((date) => shiftAnchorDate(view, date, direction));

  return (
    <View style={styles.screen}>
      <CalendarHeader
        title={format(anchorDate, 'MMMM yyyy')}
        previousLabel={`Previous ${PERIOD_NAMES[view]}`}
        nextLabel={`Next ${PERIOD_NAMES[view]}`}
        onPrevious={() => shift(-1)}
        onNext={() => shift(1)}
      />
      <CalendarViewSwitcher selectedView={view} onSelectView={setView} />

      {/* Placeholder until the month and hourly views are built. */}
      <View style={styles.body}>
        <Text style={styles.placeholderText}>
          {format(anchorDate, 'EEEE, MMMM d')}
        </Text>
      </View>
    </View>
  );
}
