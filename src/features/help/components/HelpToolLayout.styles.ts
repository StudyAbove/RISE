import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Positions follow the Figma help tool screens: the back button sits 18px
// left of the 37px content edge, with the title 14px below it.
const CONTENT_INSET = 37;
const BACK_BUTTON_INSET = 19;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: CONTENT_INSET,
  },
  backButtonContainer: {
    alignSelf: 'flex-start',
    marginLeft: BACK_BUTTON_INSET - CONTENT_INSET,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 21,
    color: colors.deepOlive,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
});
