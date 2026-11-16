import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';

// Sizes from the Figma "Streak Details" frame (393 wide).
const SUN_WIDTH = 256;
const SUN_HEIGHT = 138;
const HILLS_HEIGHT = 140;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  hills: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: HILLS_HEIGHT,
    opacity: 0.6,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 29,
  },
  header: {
    minHeight: 40,
    justifyContent: 'center',
  },
  backButtonContainer: {
    position: 'absolute',
    left: -9,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  sun: {
    width: SUN_WIDTH,
    height: SUN_HEIGHT,
    alignSelf: 'center',
    marginTop: 6,
  },
  // Overlaps the bottom of the sun, as in Figma.
  streakCount: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 36,
    color: colors.deepOlive,
    textAlign: 'center',
    marginTop: -14,
  },
  streakCaption: {
    ...textStyles.subtitle,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
  },
  week: {
    marginTop: 34,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 40,
  },
  statCard: {
    flex: 1,
    minHeight: 82,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
    shadowColor: colors.deepOlive,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.deepOlive,
  },
  statLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 10,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  quoteCard: {
    marginTop: 40,
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 15,
    backgroundColor: colors.mistGreen,
  },
  quoteText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  statusCard: {
    marginTop: 24,
    padding: 20,
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
  },
  statusText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.mistGreen,
    justifyContent: 'center',
  },
  retryText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
