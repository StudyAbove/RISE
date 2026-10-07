import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  // Highlight size and corner radius match the "Active BG" layer in Figma.
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: colors.softSage,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    color: colors.deepOlive,
  },
  // A heavier label marks the selected tab, so the selected state doesn't rely on color alone.
  labelSelected: {
    fontFamily: fonts.body.bold,
  },
});
