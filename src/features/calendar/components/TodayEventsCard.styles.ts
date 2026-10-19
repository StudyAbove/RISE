import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Sizes from the Figma "Event Widget" in the Month frame.
export const styles = StyleSheet.create({
  // Full-width band behind the card, from just under the grid to the end of the page.
  band: {
    flexGrow: 1,
    marginTop: 3,
    paddingTop: 11,
    paddingBottom: 16,
    paddingHorizontal: 6,
    backgroundColor: calendarColors.todayCardBand,
  },
  card: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: calendarColors.gridLine,
    backgroundColor: colors.warmCream,
  },
  heading: {
    fontFamily: fonts.body.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.1,
    paddingBottom: 9,
    color: calendarColors.dateText,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: calendarColors.hairline,
  },
  sourceBar: {
    width: 5,
    height: 30,
    borderRadius: 5,
  },
  eventText: {
    flex: 1,
  },
  // The source logo (#82) and the title.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTitle: {
    flexShrink: 1,
    fontFamily: fonts.body.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: calendarColors.dateText,
  },
  eventTime: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    color: calendarColors.hourLabel,
  },
  message: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: calendarColors.hourLabel,
  },
  emptyMessage: {
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: calendarColors.hairline,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: calendarColors.hairline,
  },
  retry: {
    ...textStyles.link,
    textDecorationLine: 'underline',
    color: colors.eucalyptus,
  },
});
