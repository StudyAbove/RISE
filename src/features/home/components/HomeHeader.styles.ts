import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes and spacing follow the Figma "Home Page" frame.
export const styles = StyleSheet.create({
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 24,
    letterSpacing: 2.4,
    color: colors.deepOlive,
  },
  greeting: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 24,
    color: colors.deepOlive,
    marginTop: 28,
  },
  date: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.mutedGrayGreen,
    marginTop: 4,
  },
});
