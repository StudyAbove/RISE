import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';

import {
  createExtensionPairingCode,
  fetchCanvasConnection,
  type CanvasConnection,
  type ExtensionPairingCode,
} from '../../../repositories/canvasRepository';
import { formatLastSynced, formatTimeLeft } from '../utils/formatLastSynced';
import { styles } from './CanvasSettingsModal.styles';

const canvasLogo = require('../../../../assets/icons/canvas/canvas-logo.png');

type CanvasSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** "123456" → "123 456", easier to read and type. */
function formatCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Canvas pop-up in Settings, based on Figma's "Canvas Settings". Shows the
 * code the student enters in the Canvas extension, and when Canvas last synced.
 */
export function CanvasSettingsModal({ visible, onClose }: CanvasSettingsModalProps) {
  const [pairingCode, setPairingCode] = useState<ExtensionPairingCode | null>(null);
  const [connection, setConnection] = useState<CanvasConnection | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [now, setNow] = useState(() => new Date());

  const getNewCode = useCallback(async () => {
    setIsLoadingCode(true);
    setCodeError('');

    try {
      setPairingCode(await createExtensionPairingCode());
    } catch (error) {
      console.log('Could not create an extension code:', error);
      setCodeError('Could not get a code. Check your connection and try again.');
    } finally {
      setIsLoadingCode(false);
    }
  }, []);

  // A fresh code and sync status every time the pop-up opens.
  useEffect(() => {
    if (!visible) {
      return;
    }

    getNewCode();

    fetchCanvasConnection()
      .then(setConnection)
      .catch((error) => console.log('Could not load Canvas sync status:', error));
  }, [visible, getNewCode]);

  // Ticks the countdown once a second while the pop-up is open.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const isCodeExpired = pairingCode !== null && pairingCode.expiresAt <= now;
  const isConnected = connection?.lastSyncedAt != null;

  let lastSyncedText = 'Not synced yet';
  if (connection?.lastSyncStatus === 'error') {
    lastSyncedText = 'Last sync failed. Open Canvas to try again.';
  } else if (connection?.lastSyncedAt) {
    lastSyncedText = `Last synced ${formatLastSynced(connection.lastSyncedAt, now)}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Image source={canvasLogo} style={styles.icon} accessibilityIgnoresInvertColors />
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title} accessibilityRole="header">
              Canvas Settings
            </Text>

            <Text style={styles.message}>
              Install the RISE Canvas extension on your computer and open Canvas.
              Then enter your school email and this code in the extension.
            </Text>
          </View>

          <View style={styles.box}>
            <View style={[styles.boxRow, styles.boxRowDivider]}>
              <View style={styles.codeLabels}>
                <Text style={styles.rowTitle}>Connection code</Text>

                <Text style={styles.rowDetail}>
                  {isCodeExpired
                    ? 'Code expired'
                    : pairingCode
                      ? `Expires in ${formatTimeLeft(pairingCode.expiresAt, now)}`
                      : ' '}
                </Text>
              </View>

              {isLoadingCode ? (
                <ActivityIndicator />
              ) : isCodeExpired || !pairingCode ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={getNewCode}
                  style={({ pressed }) => [styles.newCodeButton, pressed && styles.pressed]}
                >
                  <Text style={styles.newCodeButtonText}>New code</Text>
                </Pressable>
              ) : (
                <Text
                  style={styles.code}
                  accessibilityLabel={`Connection code ${pairingCode.code.split('').join(' ')}`}
                  selectable
                >
                  {formatCode(pairingCode.code)}
                </Text>
              )}
            </View>

            <View style={styles.boxRow}>
              <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />

              <View style={styles.statusLabels}>
                <Text style={styles.rowTitle}>Canvas Web Extension</Text>
                <Text style={styles.rowDetail}>{lastSyncedText}</Text>
              </View>
            </View>
          </View>

          {codeError ? <Text style={styles.error}>{codeError}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
