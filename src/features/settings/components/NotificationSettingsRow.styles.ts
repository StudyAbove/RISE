import {
  StyleSheet,
} from 'react-native';

import {
  colors,
} from '../../../theme/colors';

import {
  fonts,
} from '../../../theme/typography';

export const styles =
  StyleSheet.create({
    card: {
      height: 72,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        colors.mutedGrayGreen,
      backgroundColor:
        colors.softWhite,
    },

    icon: {
      marginRight: 18,
    },

    label: {
      flex: 1,
      fontFamily:
        fonts.heading.semiBold,
      fontSize: 16,
      color: '#424758',
    },
  });
