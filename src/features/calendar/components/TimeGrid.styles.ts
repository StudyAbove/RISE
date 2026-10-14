import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';
import type { CalendarViewMode } from '../utils/calendarDates';

export type TimeGridView = Exclude<CalendarViewMode, 'month'>;

/**
 * Sizes from the Figma "Weekly View", "2 Day View", and "Day View" frames.
 * 2 Day and Day use taller hour rows than Week.
 */
export const GRID_SIZES: Record<TimeGridView, { hourRowHeight: number; hourGutterWidth: number }> = {
  week: { hourRowHeight: 37, hourGutterWidth: 44 },
  twoDay: { hourRowHeight: 41, hourGutterWidth: 50 },
  day: { hourRowHeight: 41, hourGutterWidth: 50 },
};

const TODAY_CIRCLE_SIZE = 30;
const HOUR_LABEL_HEIGHT = 16;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingBottom: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    lineHeight: 18,
    color: calendarColors.weekdayText,
  },
  focusDayName: {
    color: calendarColors.dateText,
  },
  dayNumberBox: {
    width: TODAY_CIRCLE_SIZE,
    height: TODAY_CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderRadius: TODAY_CIRCLE_SIZE / 2,
    backgroundColor: calendarColors.selectedGreen,
  },
  dayNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 16,
    color: calendarColors.weekHeaderNumber,
  },
  focusDayNumber: {
    fontFamily: fonts.body.medium,
    color: calendarColors.dateText,
  },
  todayNumber: {
    color: colors.softWhite,
  },
  scrollView: {
    flex: 1,
  },
  // Room above 12 AM and below the last line so their labels aren't cut in half.
  scrollContent: {
    paddingVertical: HOUR_LABEL_HEIGHT / 2,
  },
  gridRow: {
    flexDirection: 'row',
  },
  // Each label is centered on the line at the top of its hour.
  hourLabel: {
    position: 'absolute',
    right: 4,
    marginTop: -HOUR_LABEL_HEIGHT / 2,
    height: HOUR_LABEL_HEIGHT,
    lineHeight: HOUR_LABEL_HEIGHT,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: calendarColors.hourLabel,
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: calendarColors.gridLine,
    borderBottomWidth: 1,
    borderBottomColor: calendarColors.gridLine,
  },
  hourCell: {
    borderTopWidth: 1,
    borderTopColor: calendarColors.gridLine,
  },
  // Covers the day column so events can be placed by minute over the hour lines.
  eventLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // Leaves a 1pt gap below the hour line and between side-by-side events.
  eventSlot: {
    position: 'absolute',
    paddingTop: 1,
    paddingRight: 1,
  },
  // A cascaded Week event gets a thin outline in the page color, so its edge
  // shows where it overlaps the event underneath.
  cascadedEventSlot: {
    paddingLeft: 1,
    borderRadius: 4,
    backgroundColor: colors.warmCream,
  },
  eventChip: {
    flex: 1,
  },
});
