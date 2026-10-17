import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes follow Figma's "Slider Button with Cheer/Variant7" component.
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The pieces are positioned around this box, and some sit outside it.
  burst: {
    width: 300,
    height: 56,
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 36,
    textAlign: 'center',
    color: colors.deepOlive,
  },

  piece: {
    position: 'absolute',
  },
});
