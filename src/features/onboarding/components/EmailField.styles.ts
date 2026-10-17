import { StyleSheet } from 'react-native';

import { colors, statusColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 19,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    borderRadius: 10,
    backgroundColor: colors.softWhite,
  },

  fieldError: {
    borderColor: statusColors.urgentRed,
  },

  mailIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 15,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.deepOlive,
  },

  confirmedCircle: {
    width: 22,
    height: 22,
    marginLeft: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.eucalyptus,
  },
});
