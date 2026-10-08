import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SettingsIcon from '../../../../assets/icons/settings.svg';
import { colors } from '../../../theme/colors';

const ICON_SIZE = 27;

// Extends the tap area to 45pt (Apple's minimum is 44pt) without
// changing the icon's position in the layout.
const HIT_SLOP = 9;

/** Gear icon that opens the Settings page. Shown in the top-right of some main pages. */
export function SettingsButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={HIT_SLOP}
      onPress={() => navigation.navigate('Settings')}
    >
      <SettingsIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.deepOlive} />
    </Pressable>
  );
}
