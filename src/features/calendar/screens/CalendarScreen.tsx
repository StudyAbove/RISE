import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { format, startOfDay } from 'date-fns';

import { CalendarHeader } from '../components/CalendarHeader';
import { CalendarViewSwitcher } from '../components/CalendarViewSwitcher';
import { MonthGrid } from '../components/MonthGrid';
import { TimeGrid } from '../components/TimeGrid';
import {
  getTimeGridDays,
  shiftAnchorDate,
  type CalendarViewMode,
} from '../utils/calendarDates';
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

      {view === 'month' ? (
        // Scrolls so six-week months still fit on smaller iPhones.
        <ScrollView style={styles.body}>
          <MonthGrid month={anchorDate} />
        </ScrollView>
      ) : (
        // The key gives each hourly view a fresh grid, so switching views
        // always opens at 7 AM instead of keeping the last view's scroll position.
        <TimeGrid key={view} days={getTimeGridDays(view, anchorDate)} view={view} />
      )}
    </View>
  );
}
