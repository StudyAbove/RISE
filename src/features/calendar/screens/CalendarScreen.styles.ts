import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // The banner bleeds past the screen edges, so clip it here.
    overflow: 'hidden',
    backgroundColor: colors.warmCream,
  },
  body: {
    flex: 1,
  },
  // Lets the today card's band stretch to the bottom when the month is short.
  monthContent: {
    flexGrow: 1,
  },
});
