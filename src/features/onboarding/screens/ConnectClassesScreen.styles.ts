import { StyleSheet } from 'react-native';

import { onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Exported at 1264 × 721 and shown at 284 × 162 in Figma.
  illustration: {
    width: 284,
    height: 162,
    marginTop: 7,
    alignSelf: 'center',
  },

  featureList: {
    marginTop: 22,
    paddingHorizontal: 30,
    gap: 14,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  featureCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onboardingColors.iconCircle,
  },

  featureText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: onboardingColors.heading,
  },

  button: {
    marginTop: 23,
  },

  copiedNote: {
    marginTop: 10,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: onboardingColors.bodyText,
  },
});
