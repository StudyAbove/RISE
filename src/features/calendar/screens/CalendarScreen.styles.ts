import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // The banner bleeds past the screen edges, so clip it here.
    overflow: 'hidden',
    backgroundColor: colors.warmCream,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...textStyles.body,
    color: colors.mutedGrayGreen,
  },
});
