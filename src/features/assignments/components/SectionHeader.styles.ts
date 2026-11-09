import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

// Follows "Due Today 3 ... View all" on the Figma Study Planning Screen.
export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.paleSun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...textStyles.body,
    color: colors.deepOlive,
  },
  link: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
