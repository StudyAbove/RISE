import { Text, View } from 'react-native';
import { format, isSameMonth, isToday } from 'date-fns';

import { getMonthGridDays } from '../utils/calendarDates';
import { styles } from './MonthGrid.styles';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_PER_WEEK = 7;

interface MonthGridProps {
  /** Any day in the month to show. */
  month: Date;
}

/** Monthly calendar: weekday letters over a grid of dates, with today circled. */
export function MonthGrid({ month }: MonthGridProps) {
  const days = getMonthGridDays(month);
  const weeks = Array.from({ length: days.length / DAYS_PER_WEEK }, (_, week) =>
    days.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK)
  );

  return (
    <View>
      {/* Each date already has its full weekday in its VoiceOver label, so the
          ambiguous single letters (T, S) are hidden from VoiceOver. */}
      <View style={styles.weekdayRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <Text key={index} style={styles.weekdayLetter}>
            {letter}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].toISOString()} style={styles.weekRow}>
          {week.map((day, index) => {
            const isLastColumn = index === DAYS_PER_WEEK - 1;

            // Days from the neighboring months keep their cell (so the grid lines
            // line up) but show no number, as in Figma.
            if (!isSameMonth(day, month)) {
              return <View key={day.toISOString()} style={[styles.dayCell, isLastColumn && styles.lastColumn]} />;
            }

            const today = isToday(day);
            const label = format(day, 'EEEE, MMMM d');

            return (
              <View
                key={day.toISOString()}
                accessible
                accessibilityLabel={today ? `Today, ${label}` : label}
                style={[styles.dayCell, isLastColumn && styles.lastColumn]}
              >
                <View style={[styles.dayNumberBox, today && styles.todayCircle]}>
                  <Text style={[styles.dayNumber, today && styles.todayNumber]}>{format(day, 'd')}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
