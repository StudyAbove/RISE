import {
  StyleSheet,
} from 'react-native';

import {
  colors,
} from '../../../theme/colors';

export const styles =
  StyleSheet.create({
    track: {
      width: 40,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },

    trackOn: {
      backgroundColor:
        colors.softSage,
    },

    trackOff: {
      backgroundColor:
        '#D36062',
    },

    knob: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor:
        colors.softWhite,
    },

    knobOn: {
      alignSelf: 'flex-end',
    },

    knobOff: {
      alignSelf: 'flex-start',
    },

    disabled: {
      opacity: 0.5,
    },
  });
