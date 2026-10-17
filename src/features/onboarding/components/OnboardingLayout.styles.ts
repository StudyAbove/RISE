import { StyleSheet } from 'react-native';

import { colors, onboardingColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },

  background: {
    position: 'absolute',
    left: 0,
    opacity: 0.75,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 23,
  },

  wordmark: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 24,
    letterSpacing: 2.4,
    color: onboardingColors.wordmark,
  },

  card: {
    flexGrow: 1,
    paddingTop: 37,
    paddingHorizontal: 38,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.warmCream,
  },

  content: {
    flexGrow: 1,
    marginBottom: 20,
  },
});
