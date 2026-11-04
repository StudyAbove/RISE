import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import ArrowLeftIcon from '../../assets/icons/arrow-left.svg';

import { colors } from '../theme/colors';
import { styles } from './BackButton.styles';

const ICON_SIZE = 24;

type BackButtonProps = {
  onPress?: () => void;
};

/**
 * Round back button from the Figma "_Action left" component.
 * Returns to the previous screen unless a custom action is provided.
 */
export function BackButton({
  onPress,
}: BackButtonProps = {}) {
  const navigation =
    useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={
        onPress ??
        (() => navigation.goBack())
      }
      style={styles.button}
    >
      <ArrowLeftIcon
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={colors.deepOlive}
      />
    </Pressable>
  );
}
