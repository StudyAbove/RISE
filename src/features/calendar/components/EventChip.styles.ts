import { StyleSheet } from 'react-native';

import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Sizes from the event chips in the Figma Week (compact) and 2 Day / Day (regular)
// frames. Figma has no Month chips; mini is a smaller compact chip that fits
// two per month cell.
export const EVENT_CHIP_MIN_HEIGHT = { mini: 14, compact: 16, regular: 18 } as const;
export const EVENT_TITLE_LINE_HEIGHT = 12;
// The source logo before the title (#82), from the Figma "Option B" board.
// Month (mini) is 10 rather than Figma's 8, so the logos are easier to make out.
export const EVENT_CHIP_LOGO_SIZE = { mini: 10, compact: 10, regular: 13 } as const;
// The gap between the logo and the title on regular chips.
const REGULAR_CONTENT_GAP = 5;

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
  // The logo and title side by side, centered on the title's line.
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniContent: {
    gap: 2,
  },
  compactContent: {
    gap: 2,
  },
  regularContent: {
    gap: REGULAR_CONTENT_GAP,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.body.medium,
    fontSize: 10,
    lineHeight: EVENT_TITLE_LINE_HEIGHT,
    color: calendarColors.dateText,
  },
  // The event's type on 2 Day and Day chips (#38), in the hour labels' gray.
  // On its own line it lines up with the title, past the logo.
  typeLine: {
    paddingLeft: EVENT_CHIP_LOGO_SIZE.regular + REGULAR_CONTENT_GAP,
    fontFamily: fonts.body.regular,
    fontSize: 9,
    lineHeight: EVENT_TITLE_LINE_HEIGHT,
    color: calendarColors.hourLabel,
  },
  // After the title on one-line chips. It never shrinks, so a long title is
  // cut off before the type is.
  inlineType: {
    flexShrink: 0,
    fontFamily: fonts.body.regular,
    fontSize: 9,
    lineHeight: EVENT_TITLE_LINE_HEIGHT,
    color: calendarColors.hourLabel,
  },
});
