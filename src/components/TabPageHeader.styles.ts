import { StyleSheet } from 'react-native';

import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';

// Spacing follows Home's greeting and date (HomeHeader.styles.ts).
const TITLE_TOP_SPACE = 28;
const SUBTITLE_GAP = 4;

/** How far the hills reach below the title and subtitle, like on Home. */
export const SKY_BOTTOM_BELOW_TEXT = 8;

/**
 * The room a subtitle takes up (its gap plus one 12pt line). A page without a
 * subtitle adds this to its sky, so the sky matches the other tabs.
 */
export const SUBTITLE_SPACE = SUBTITLE_GAP + 15;

export const styles = StyleSheet.create({
  // Holds the settings gear in the top-right corner.
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // Only as wide as its longest line, so the glow behind it hugs the text.
  titleBlock: {
    alignSelf: 'flex-start',
    marginTop: TITLE_TOP_SPACE,
  },
  // Sized by the text: it starts at the screen edge (past the 18pt side
  // padding) and ends just past the longer of the title and subtitle, so a
  // short title like "List" gets a short glow.
  textGlow: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: -18,
    right: -20,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
  },
  subtitle: {
    ...textStyles.subtitle,
    color: colors.mutedGrayGreen,
    marginTop: SUBTITLE_GAP,
  },
});
