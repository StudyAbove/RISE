import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Sizes from the open Figma "Date Picker" (Mini Calendar).
export const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 10,
  },
  // Figma has no month arrows; these reuse the dropdown chevron, turned sideways.
  previousArrow: {
    transform: [{ rotate: '90deg' }],
  },
  nextArrow: {
    transform: [{ rotate: '-90deg' }],
  },
  monthLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.deepOlive,
  },
  weekRow: {
    flexDirection: 'row',
    height: 30,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLetter: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
  },
  day: {
    width: 28,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma doesn't show a chosen day; this matches the selected "Time Slot".
  selectedDay: {
    backgroundColor: colors.softSage,
  },
  dayText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.deepOlive,
  },
  todayText: {
    fontFamily: fonts.body.bold,
    color: colors.eucalyptus,
  },
  selectedDayText: {
    color: colors.softWhite,
  },
});
