import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';
import { calendarColors } from '../../calendarColors';

// Sizes from the Figma "Search" frame (#78).
const SIDE_PADDING = 20;
export const RESULT_CIRCLE_SIZE = 65;
export const RESULT_ICON_SIZE = 32;

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  searchBar: {
    height: 50,
    marginTop: 28,
    marginHorizontal: SIDE_PADDING,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: calendarColors.switcherBackground,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.deepOlive,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mutedGrayGreen,
  },
  chips: {
    paddingHorizontal: SIDE_PADDING - 5,
    paddingVertical: 18,
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: calendarColors.switcherBackground,
  },
  chipSelected: {
    backgroundColor: colors.eucalyptus,
  },
  chipLabel: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    color: colors.mutedGrayGreen,
  },
  chipLabelSelected: {
    color: colors.softWhite,
  },
  results: {
    paddingHorizontal: SIDE_PADDING - 8,
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: calendarColors.hairline,
  },
  resultRow: {
    minHeight: 92,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  resultRowPressed: {
    opacity: 0.6,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    color: colors.deepOlive,
  },
  resultDetail: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.mutedGrayGreen,
  },
  // "No events match", a search error, and the hint before typing.
  message: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 24,
    fontFamily: fonts.body.regular,
    fontSize: 15,
    textAlign: 'center',
    color: colors.mutedGrayGreen,
  },
  loading: {
    paddingTop: 24,
  },
});
