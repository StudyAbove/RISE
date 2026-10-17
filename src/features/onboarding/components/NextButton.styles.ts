import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

export const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.butterYellow,
  },

  pressed: {
    opacity: 0.82,
  },

  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
