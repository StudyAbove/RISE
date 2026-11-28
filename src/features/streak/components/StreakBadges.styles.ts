import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';

const MEDALLION_SIZE = 84;
// The sun art is 768 × 411.
const SUN_WIDTH = 56;
const SUN_HEIGHT = SUN_WIDTH * (411 / 768);

// Not in Figma; uses the Streak page's sun art and palette.
export const styles = StyleSheet.create({
  section: {
    marginTop: 40,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  badge: {
    flex: 1,
    alignItems: 'center',
  },
  medallion: {
    width: MEDALLION_SIZE,
    height: MEDALLION_SIZE,
    borderRadius: MEDALLION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  earned: {
    backgroundColor: colors.paleSun,
    borderColor: colors.butterYellow,
    shadowColor: colors.butterYellow,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  locked: {
    backgroundColor: colors.softWhite,
    borderColor: colors.mistGreen,
    borderStyle: 'dashed',
  },
  sun: {
    width: SUN_WIDTH,
    height: SUN_HEIGHT,
  },
  lockedSun: {
    opacity: 0.3,
  },
  milestone: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 22,
    color: colors.deepOlive,
    marginTop: -6,
  },
  lockedText: {
    color: colors.mutedGrayGreen,
  },
  label: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: colors.deepOlive,
    marginTop: 8,
  },
  detail: {
    ...textStyles.tinyLabel,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
  earnedDetail: {
    color: colors.eucalyptus,
  },
});
