import { StyleSheet } from 'react-native';

import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    marginTop: 16,
  },
  subtitle: {
    ...textStyles.subtitle,
    color: colors.mutedGrayGreen,
    marginTop: 4,
    marginBottom: 24,
  },
  placeholderBlock: {
    height: 120,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: colors.softWhite,
    borderWidth: 2,
    borderColor: colors.mistGreen,
  },
});
