import { StyleSheet } from 'react-native';

import { colors, onboardingColors } from '../../../theme/colors';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: onboardingColors.inactiveDot,
  },

  activeDot: {
    width: 22,
    backgroundColor: colors.eucalyptus,
  },
});
