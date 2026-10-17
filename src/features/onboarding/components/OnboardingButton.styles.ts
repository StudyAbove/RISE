import { StyleSheet } from 'react-native';

import { onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  button: {
    height: 54,
    marginHorizontal: 10,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: onboardingColors.primaryButton,
  },

  pressed: {
    opacity: 0.82,
  },

  label: {
    fontFamily: fonts.heading.bold,
    fontSize: 16,
    color: onboardingColors.heading,
  },
});
