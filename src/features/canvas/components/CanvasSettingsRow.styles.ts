import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Same card as the Calendar and Logout rows in SettingsScreen.styles.ts.
export const styles = StyleSheet.create({
  card: {
    height: 72,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mutedGrayGreen,
    backgroundColor: colors.softWhite,
  },

  icon: {
    width: 24,
    height: 24,
    marginRight: 18,
  },

  label: {
    flex: 1,
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: '#424758',
  },

  // Sits where the Calendar row's 44 × 44 chevron button does.
  chevron: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: 'contain',
  },

  pressed: {
    opacity: 0.72,
  },
});
