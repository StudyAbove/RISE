import { Modal, Pressable, Text, View } from 'react-native';

import LightbulbIcon from '../../../../assets/icons/help/lightbulb.svg';
import { styles } from './HelpPopup.styles';

import type { RootStackParamList } from '../../navigation/types';

/** The tools the help menu can open (#70). */
export type HelpOption = 'breathing' | 'extension' | 'officeHours';

/** The screen each option opens. */
export const HELP_OPTION_SCREENS = {
  breathing: 'Breathing',
  extension: 'ExtensionEmail',
  officeHours: 'OfficeHours',
} as const satisfies Record<HelpOption, keyof RootStackParamList>;

// In the order shown in the Figma.
const OPTIONS: { option: HelpOption; label: string }[] = [
  { option: 'breathing', label: 'Take a breath' },
  { option: 'extension', label: 'Ask for an extension' },
  { option: 'officeHours', label: 'Book office hours' },
];

type HelpPopupProps = {
  visible: boolean;
  onSelect: (option: HelpOption) => void;
  onClose: () => void;
};

/** "Feeling stuck?": opened by a Help button when the student needs support (#70). */
export function HelpPopup({ visible, onSelect, onClose }: HelpPopupProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.iconRing}>
            <View style={styles.iconCircle}>
              <LightbulbIcon accessible={false} />
            </View>
          </View>

          <View style={styles.text}>
            <Text accessibilityRole="header" style={styles.title}>
              Feeling stuck?
            </Text>
            <Text style={styles.message}>
              Pick what would help most right now. You can always come back to this.
            </Text>
          </View>

          <View style={styles.buttons}>
            {OPTIONS.map(({ option, label }) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => onSelect(option)}
                style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
              >
                <Text style={styles.optionText}>{label}</Text>
              </Pressable>
            ))}

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>Not right now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
