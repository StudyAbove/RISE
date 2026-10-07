import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import ArrowLeftIcon from '../../assets/icons/arrow-left.svg';
import { colors } from '../theme/colors';
import { styles } from './BackButton.styles';

const ICON_SIZE = 24;

/** Round back button from the Figma "_Action left" component. Returns to the previous screen. */
export function BackButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => navigation.goBack()}
      style={styles.button}
    >
      <ArrowLeftIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.deepOlive} />
    </Pressable>
  );
}
