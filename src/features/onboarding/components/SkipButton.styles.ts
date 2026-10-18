import { StyleSheet } from 'react-native';

import { onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Lines the text up with the middle of the "RISE" wordmark.
  button: {
    paddingTop: 7,
  },

  pressed: {
    opacity: 0.6,
  },

  label: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: onboardingColors.heading,
  },
});
