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
  // Only as wide as its longest line, so the glow behind it hugs the text.
  titleBlock: {
    alignSelf: 'flex-start',
    marginTop: 28,
  },
  // Starts at the screen edge (past the 20pt side padding) and runs a bit
  // beyond the text so the glow fades out around it.
  textScrim: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: -20,
    right: -48,
  },
  greeting: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 24,
    color: colors.deepOlive,
  },
  date: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.mutedGrayGreen,
    marginTop: 4,
  },
});
