import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Matches the sync row above it: same side padding, text size, and divider.
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistGreen,
    backgroundColor: colors.warmCream,
  },
  message: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.mutedGrayGreen,
  },
  showAll: {
    fontFamily: fonts.body.semiBold,
    fontSize: 13,
    color: colors.eucalyptus,
  },
  pressed: {
    opacity: 0.6,
  },
});
