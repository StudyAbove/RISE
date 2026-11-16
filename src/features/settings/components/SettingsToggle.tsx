import {
  Pressable,
  View,
} from 'react-native';

import { styles } from './SettingsToggle.styles';

type SettingsToggleProps = {
  value: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
};

export function SettingsToggle({
  value,
  onPress,
  label,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{
        checked: value,
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.track,
        value
          ? styles.trackOn
          : styles.trackOff,
        disabled &&
          styles.disabled,
      ]}
    >
      <View
        style={[
          styles.knob,
          value
            ? styles.knobOn
            : styles.knobOff,
        ]}
      />
    </Pressable>
  );
}
