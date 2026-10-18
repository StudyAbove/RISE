import { StyleSheet } from 'react-native';

import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

export const styles = StyleSheet.create({
  // One line under the calendar grid.
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // A short piece of the source's tab color, as on the event chips.
  tab: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  label: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 14,
    color: calendarColors.weekdayText,
  },
});
