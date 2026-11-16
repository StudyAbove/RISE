import { Text, View } from 'react-native';
import { format, isAfter, isSameDay } from 'date-fns';

import CheckIcon from '../../../../assets/icons/calendar/check.svg';
import type { StreakDay } from '../utils/streak';
import { styles } from './StreakWeekRow.styles';

const CHECK_SIZE = 18;

interface StreakWeekRowProps {
  week: StreakDay[];
  today: Date;
}

/**
 * Monday to Sunday under the streak count: a check on days with an on-time
 * submission, today in yellow, and the date on every other day.
 */
export function StreakWeekRow({ week, today }: StreakWeekRowProps) {
  return (
    <View style={styles.row}>
      {week.map(({ date, submittedOnTime }) => {
        const isToday = isSameDay(date, today);
        const status = submittedOnTime
          ? 'turned in on time'
          : isToday
            ? 'today'
            : isAfter(date, today)
              ? 'upcoming'
              : 'nothing turned in';

        return (
          <View
            key={date.getTime()}
            accessible
            accessibilityLabel={`${format(date, 'EEEE, MMMM d')}, ${status}`}
            style={styles.day}
          >
            <Text style={styles.dayName}>{format(date, 'EEE')}</Text>

            {submittedOnTime ? (
              <View style={[styles.circle, styles.doneCircle]}>
                <CheckIcon width={CHECK_SIZE} height={CHECK_SIZE} />
              </View>
            ) : (
              <View style={[styles.circle, isToday ? styles.todayCircle : styles.emptyCircle]}>
                <Text style={[styles.dateNumber, isToday && styles.todayDateNumber]}>
                  {format(date, 'd')}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
