import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

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
});
