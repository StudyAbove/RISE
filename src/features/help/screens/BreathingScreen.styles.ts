import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes follow the approved breathing design.
export const styles = StyleSheet.create({
  // Tall enough for two lines, so the buttons don't jump as the words change.
  guide: {
    minHeight: 96,
    marginTop: 24,
    alignItems: 'center',
  },
  cue: {
    fontFamily: fonts.heading.bold,
    fontSize: 26,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  detail: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.butterYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.deepOlive,
  },
  secondaryButton: {
    minHeight: 46,
    marginTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.deepOlive,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
