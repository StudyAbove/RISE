import { StyleSheet } from 'react-native';

import { colors, statusColors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Sizes and colors from the Figma "Add Event" frame and its Input,
// Date Picker, and Time Picker components. Shared by every form field.
export const FIELD_HEIGHT = 50;
const FIELD_RADIUS = 12;

export const formStyles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.mutedGrayGreen,
  },
  // The white box shared by text inputs and dropdown buttons.
  input: {
    height: FIELD_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: FIELD_RADIUS,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  // Focused text input or open dropdown.
  inputActive: {
    borderColor: colors.deepOlive,
  },
  inputError: {
    borderColor: statusColors.urgentRed,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Long values shrink and end in "…" instead of pushing the chevron off.
  dropdownValue: {
    flexShrink: 1,
  },
  inputText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.deepOlive,
  },
  placeholderText: {
    color: colors.mutedGrayGreen,
  },
  // Small gray help text under a field.
  noteText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.mutedGrayGreen,
  },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: statusColors.urgentRed,
  },
  // The box a dropdown opens below its button.
  panel: {
    marginTop: 8,
    borderRadius: FIELD_RADIUS,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
