import { StyleSheet } from 'react-native';

import { colors, statusColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  title: {
    marginTop: 5,
    fontSize: 36,
  },

  body: {
    maxWidth: 218,
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 0.8,
  },

  emailField: {
    marginTop: 50,
  },

  errorText: {
    marginTop: 8,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
    color: statusColors.urgentRed,
  },

  signUpButton: {
    marginTop: 33,
  },

  loginPrompt: {
    marginTop: 20,
    alignSelf: 'center',
  },

  loginPromptText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.mutedGrayGreen,
  },

  loginLink: {
    fontFamily: fonts.body.semiBold,
    color: colors.eucalyptus,
  },
});
