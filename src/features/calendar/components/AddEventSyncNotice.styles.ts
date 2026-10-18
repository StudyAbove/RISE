import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Same card look as the loading/error pill (CalendarEventsStatus), placed
  // just above it so the two never cover each other.
  pill: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    right: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  message: {
    ...textStyles.caption,
    color: colors.deepOlive,
    textAlign: 'center',
  },
});
