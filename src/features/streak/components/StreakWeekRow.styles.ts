import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const CIRCLE_SIZE = 36;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 12,
  },
  dayName: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 14,
    color: colors.deepOlive,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    backgroundColor: colors.softSage,
  },
  todayCircle: {
    backgroundColor: colors.butterYellow,
  },
  emptyCircle: {
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
  },
  dateNumber: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.mutedGrayGreen,
  },
  todayDateNumber: {
    color: colors.softWhite,
  },
});
