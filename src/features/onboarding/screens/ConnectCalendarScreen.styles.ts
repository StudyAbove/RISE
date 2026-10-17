import { StyleSheet } from 'react-native';

import { colors, onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Exported at 1192 × 841 and shown at 319 × 225 in Figma.
  illustration: {
    width: 319,
    height: 225,
    marginTop: 20,
    alignSelf: 'center',
  },

  calendarButtons: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 21,
    marginHorizontal: 10,
  },

  calendarButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appleButton: {
    backgroundColor: onboardingColors.appleButton,
  },

  googleButton: {
    borderWidth: 1,
    borderColor: onboardingColors.outlineBorder,
    backgroundColor: colors.softWhite,
  },

  pressed: {
    opacity: 0.82,
  },

  calendarButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 13,
    color: onboardingColors.heading,
  },

  appleButtonText: {
    color: colors.softWhite,
  },

  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 20,
    paddingHorizontal: 24,
  },

  // Lines the lock up with the first line of text.
  lockIcon: {
    marginTop: 4,
  },

  privacyText: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 10,
    lineHeight: 15,
    color: onboardingColors.bodyText,
  },

  // "Almost there" sits lower in the card than the other titles.
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
  },

  permissionButton: {
    marginTop: 30,
  },
});
