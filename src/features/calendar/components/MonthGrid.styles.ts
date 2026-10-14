import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Sizes from the Figma "Monthly Calendar" group.
const WEEKDAY_ROW_HEIGHT = 40;
const WEEK_ROW_HEIGHT = 77;
const TODAY_CIRCLE_SIZE = 30;

const dateText = {
  fontFamily: fonts.body.medium,
  fontSize: 15,
};

export const styles = StyleSheet.create({
  weekdayRow: {
    height: WEEKDAY_ROW_HEIGHT,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: calendarColors.gridLine,
  },
  weekdayLetter: {
    ...dateText,
    flex: 1,
    textAlign: 'center',
    color: calendarColors.weekdayText,
  },
  weekRow: {
    height: WEEK_ROW_HEIGHT,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: calendarColors.gridLine,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 2,
    borderRightWidth: 1,
    borderRightColor: calendarColors.gridLine,
  },
  // Figma has lines only between columns, not along the screen edges.
  lastColumn: {
    borderRightWidth: 0,
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
    ...dateText,
    color: calendarColors.dateText,
  },
  todayNumber: {
    color: colors.softWhite,
  },
  eventList: {
    alignSelf: 'stretch',
    paddingHorizontal: 2,
    gap: 1,
  },
  moreEvents: {
    fontFamily: fonts.body.medium,
    fontSize: 9,
    lineHeight: 11,
    paddingLeft: 2,
    color: calendarColors.hourLabel,
  },
});
