import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

const CORNER_RADIUS = 10;

export const styles = StyleSheet.create({
  container: {
    height: 30,
    marginTop: 12,
    marginHorizontal: 10,
    flexDirection: 'row',
    borderRadius: CORNER_RADIUS,
    borderWidth: 0.5,
    borderColor: calendarColors.hairline,
    backgroundColor: calendarColors.switcherBackground,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    borderLeftWidth: 0.5,
    borderLeftColor: calendarColors.hairline,
  },
  selectedOption: {
    borderRadius: CORNER_RADIUS,
    backgroundColor: calendarColors.selectedGreen,
  },
  label: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    color: calendarColors.labelText,
  },
  selectedLabel: {
    color: colors.softWhite,
  },
});
