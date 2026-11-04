import { StyleSheet } from 'react-native';

import { colors, homeColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes and spacing follow the "Weekly forecast" card in the Figma "Home Page" frame.
export const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 9,
    borderWidth: 2,
    borderColor: colors.paleSun,
    borderRadius: 16,
    backgroundColor: colors.softWhite,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paleSun,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 17,
    color: colors.deepOlive,
  },

  summary: {
    marginTop: 5,
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.mutedGrayGreen,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  listTitle: {
    marginTop: 18,
    marginBottom: 6,
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: colors.deepOlive,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
    marginRight: 8,
  },

  rowTitle: {
    flex: 1,
    marginRight: 8,
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.deepOlive,
  },

  rowDetail: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
    color: colors.mutedGrayGreen,
  },

  // Not tappable yet; the Help story will give it an action.
  helpButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.paleSun,
  },

  helpLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    letterSpacing: 0.4,
    color: homeColors.helpGold,
  },
});
