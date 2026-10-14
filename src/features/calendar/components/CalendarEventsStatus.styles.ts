import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

export const styles = StyleSheet.create({
  // Styled like the app's cards: white with a mist green border.
  pill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  message: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  retry: {
    ...textStyles.link,
    textDecorationLine: 'underline',
    color: colors.eucalyptus,
  },
});
