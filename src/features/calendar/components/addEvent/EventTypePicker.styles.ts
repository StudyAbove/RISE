import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Sizes from the Figma "Event Type Button": 70 tall with a 28pt icon area.
// Figma's buttons are 61 wide, but on real phones "Assignment" needs a little
// more room, so the five buttons share the row's width instead (about 64pt on
// most iPhones, never narrower than Figma's 61 on the smallest).
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classIcon: {
    width: 28,
    height: 28,
  },
  selectedClassIcon: {
    tintColor: colors.softWhite,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.deepOlive,
  },
  selectedLabel: {
    color: colors.softWhite,
  },
});
