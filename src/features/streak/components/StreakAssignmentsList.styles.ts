import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

const DOT_SIZE = 10;

// Not in Figma; follows the Streak page's white cards and Home's class dots.
export const styles = StyleSheet.create({
  section: {
    marginTop: 40,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  list: {
    gap: 8,
    marginTop: 12,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  details: {
    flex: 1,
  },
  assignmentTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
  },
  courseCode: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
  turnedIn: {
    ...textStyles.tinyLabel,
    color: colors.eucalyptus,
  },
  showAll: {
    minHeight: 44,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  showAllText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
