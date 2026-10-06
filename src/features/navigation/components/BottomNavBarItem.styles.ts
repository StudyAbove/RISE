import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  // Size matches the icon area in the Figma "Final - Bar" component.
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    color: colors.deepOlive,
  },
});
