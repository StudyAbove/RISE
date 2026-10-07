import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.deepOlive,
  },
  // Same width as the back button.
  headerSpacer: {
    width: 40,
  },
});
