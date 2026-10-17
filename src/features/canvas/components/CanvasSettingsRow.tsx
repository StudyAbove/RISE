import { useState } from 'react';
import { Image, Pressable, Text } from 'react-native';

import { CanvasSettingsModal } from './CanvasSettingsModal';
import { styles } from './CanvasSettingsRow.styles';

const canvasLogo = require('../../../../assets/icons/canvas/canvas-logo.png');
const chevronRightIcon = require('../../../../assets/icons/chevron-right.png');

/** "Canvas" row in Settings, matching the Calendar row. Opens Canvas Settings. */
export function CanvasSettingsRow() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Canvas settings"
        onPress={() => setIsModalVisible(true)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Image source={canvasLogo} style={styles.icon} accessibilityIgnoresInvertColors />

        <Text style={styles.label}>Canvas</Text>

        <Image source={chevronRightIcon} style={styles.chevron} />
      </Pressable>

      <CanvasSettingsModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} />
    </>
  );
}
