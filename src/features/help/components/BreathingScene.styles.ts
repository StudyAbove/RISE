import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

/** Width to height of the illustration window, from the approved design. */
export const SCENE_ASPECT_RATIO = 304 / 260;

export const styles = StyleSheet.create({
  window: {
    width: '100%',
    aspectRatio: SCENE_ASPECT_RATIO,
    marginTop: 25,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    backgroundColor: colors.warmCream,
    overflow: 'hidden',
  },
});
