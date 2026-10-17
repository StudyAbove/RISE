import { StyleSheet } from 'react-native';

import { colors, onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  row: {
    height: 60,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 20,
    borderWidth: 1,
    borderColor: onboardingColors.rowBorder,
    borderRadius: 14,
    backgroundColor: colors.softWhite,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onboardingColors.iconCircle,
  },

  label: {
    flex: 1,
    marginLeft: 14,
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: onboardingColors.heading,
  },

  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onboardingColors.iconGreen,
  },

  pendingCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: onboardingColors.iconCircle,
  },
});
