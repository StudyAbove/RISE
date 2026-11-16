import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

export const styles = StyleSheet.create({
  // 44pt tall to meet Apple's minimum tap size.
  pill: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
  },
  flame: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
