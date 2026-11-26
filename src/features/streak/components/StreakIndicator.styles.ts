import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Preserve a minimum 44-point accessible touch target.
  touchTarget: {
    minWidth: 58,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Home Page Figma streak component (4170:2650).
  pill: {
    minWidth: 58,
    height: 34,
    paddingLeft: 3,
    paddingRight: 9,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
  },

  count: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.deepOlive,
    textAlign: 'center',
    minWidth: 15,
  },

  pressed: {
    opacity: 0.7,
  },
});
