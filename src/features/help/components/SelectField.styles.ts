import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Shared by the help screens' fields: "Class", "Assignment", "Reason".
// Sizes follow the Figma "Help - Email" and "Help - Office Hours" screens.
export const fieldStyles = StyleSheet.create({
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.mutedGrayGreen,
    marginBottom: 3,
  },
  box: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  // A field the student is typing in or has open.
  boxOpen: {
    borderColor: colors.softSage,
  },
  value: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.deepOlive,
  },
  placeholder: {
    color: colors.mutedGrayGreen,
  },
});

export const styles = StyleSheet.create({
  label: fieldStyles.label,
  box: {
    ...fieldStyles.box,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boxOpen: fieldStyles.boxOpen,
  boxDisabled: {
    opacity: 0.6,
  },
  value: {
    ...fieldStyles.value,
    flex: 1,
  },
  placeholder: fieldStyles.placeholder,
  // The open list, right under the box.
  panel: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
});
