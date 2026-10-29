import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';

// Sizes and spacing follow "High Priority Tasks" in the Figma "Home Page" frame.
export const styles = StyleSheet.create({
  section: {
    marginTop: 21,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },

  viewAll: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },

  list: {
    gap: 8,
  },

  // Same look as a task card, for the "all caught up" message.
  caughtUp: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    borderRadius: 14,
    backgroundColor: colors.softWhite,
  },

  caughtUpTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 13,
    color: colors.deepOlive,
  },

  caughtUpText: {
    ...textStyles.caption,
    marginTop: 2,
    color: colors.mutedGrayGreen,
  },
});
