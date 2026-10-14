import { StyleSheet } from 'react-native';

import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Sizes from the event chips in the Figma Week (compact) and 2 Day / Day (regular)
// frames. Figma has no Month chips; mini is a smaller compact chip that fits
// two per month cell.
export const EVENT_CHIP_MIN_HEIGHT = { mini: 14, compact: 16, regular: 18 } as const;
export const EVENT_TITLE_LINE_HEIGHT = 12;

export const styles = StyleSheet.create({
  chip: {
    overflow: 'hidden',
    // Titles sit in the vertical middle of the chip, however tall it is.
    justifyContent: 'center',
    backgroundColor: calendarColors.eventChip,
  },
  // The colored tab is the chip's left border; its color is set per event.
  miniChip: {
    minHeight: EVENT_CHIP_MIN_HEIGHT.mini,
    paddingLeft: 2,
    paddingRight: 1,
    borderRadius: 3,
    borderLeftWidth: 3,
  },
  compactChip: {
    minHeight: EVENT_CHIP_MIN_HEIGHT.compact,
    paddingLeft: 2,
    paddingRight: 1,
    borderRadius: 3,
    borderLeftWidth: 4,
  },
  regularChip: {
    minHeight: EVENT_CHIP_MIN_HEIGHT.regular,
    paddingLeft: 7,
    paddingRight: 4,
    borderRadius: 5,
    borderLeftWidth: 10,
  },
  title: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    lineHeight: EVENT_TITLE_LINE_HEIGHT,
    color: calendarColors.dateText,
  },
});
