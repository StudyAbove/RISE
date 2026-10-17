import { StyleSheet } from 'react-native';

import { onboardingColors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

/** Title and paragraph styles shared by every onboarding screen. */
export const onboardingTextStyles = StyleSheet.create({
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 30,
    textAlign: 'center',
    color: onboardingColors.heading,
  },

  body: {
    maxWidth: 282,
    marginTop: 7,
    alignSelf: 'center',
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: onboardingColors.bodyText,
  },
});
