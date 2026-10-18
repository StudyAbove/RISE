import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Sizes from the open Figma "Time Picker": 38pt rows inset 6pt in a list
// tall enough to show about six at a time.
export const OPTION_ROW_HEIGHT = 42;
export const OPTION_LIST_MAX_HEIGHT = 260;

export const styles = StyleSheet.create({
  list: {
    maxHeight: OPTION_LIST_MAX_HEIGHT,
  },
  content: {
    padding: 6,
  },
  option: {
    height: 38,
    marginBottom: OPTION_ROW_HEIGHT - 38,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
  },
  // Matches the selected Figma "Time Slot".
  selectedOption: {
    backgroundColor: colors.softSage,
  },
  optionText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.deepOlive,
  },
  selectedText: {
    color: colors.softWhite,
  },
  selectedTag: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.softWhite,
  },
});
