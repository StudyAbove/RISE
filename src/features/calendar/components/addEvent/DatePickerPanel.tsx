import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth } from 'date-fns';

import ChevronDownIcon from '../../../../../assets/icons/calendar/dropdown-chevron-down.svg';
import { getMonthGridDays } from '../../utils/calendarDates';
import { styles } from './DatePickerPanel.styles';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_PER_WEEK = 7;

interface DatePickerPanelProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

/**
 * The mini calendar inside the Date dropdown (Figma "Date Picker", open state).
 * Opens on the chosen date's month, or this month if none is chosen. Uses the
 * same month layout as the Calendar's month view.
 */
export function DatePickerPanel({ selectedDate, onSelect }: DatePickerPanelProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const days = getMonthGridDays(visibleMonth);
  const weeks = Array.from({ length: days.length / DAYS_PER_WEEK }, (_, week) =>
    days.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK)
  );

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={12}
          onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
          style={styles.previousArrow}
        >
          <ChevronDownIcon width={10.6} height={6.1} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.monthLabel}>
          {format(visibleMonth, 'MMMM yyyy')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={12}
          onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
          style={styles.nextArrow}
        >
          <ChevronDownIcon width={10.6} height={6.1} />
        </Pressable>
      </View>

      {/* Each day says its full weekday to VoiceOver, so the letters are hidden. */}
      <View style={styles.weekRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <Text key={index} style={[styles.cell, styles.weekdayLetter]}>
            {letter}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].toISOString()} style={styles.weekRow}>
          {week.map((day) => {
            // Days from the neighboring months stay blank, as in the month view.
            if (!isSameMonth(day, visibleMonth)) {
              return <View key={day.toISOString()} style={styles.cell} />;
            }

            const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
            const today = isToday(day);
            const label = `${today ? 'Today, ' : ''}${format(day, 'EEEE, MMMM d')}`;

            return (
              <View key={day.toISOString()} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(day)}
                  style={[styles.day, isSelected && styles.selectedDay]}
                >
                  <Text style={[styles.dayText, today && styles.todayText, isSelected && styles.selectedDayText]}>
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
