import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { formStyles } from './formStyles';
import { styles } from './FloatingDropdown.styles';

/** Where to draw the panel, in the sheet's coordinates (from AddEventSheet). */
export interface DropdownAnchor {
  left: number;
  width: number;
  /** Set when the panel opens below its box. */
  top?: number;
  /** Set when there's no room below, so the panel opens above its box instead. */
  bottom?: number;
}

interface FloatingDropdownProps {
  /** Read by VoiceOver for the invisible close area, e.g. "Start time". */
  label: string;
  /** Null until the box has been measured; the panel stays invisible until then. */
  anchor: DropdownAnchor | null;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A dropdown's choices, floating right under (or above) its box instead of
 * pushing the form down. It sits outside the form's scrolling, so lists inside
 * it scroll with the finger. Tapping anywhere outside closes it.
 */
export function FloatingDropdown({ label, anchor, onClose, children }: FloatingDropdownProps) {
  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Close ${label}`}
        onPress={onClose}
        style={styles.outside}
      />
      <View
        style={[
          formStyles.panel,
          styles.panel,
          anchor ?? styles.hidden,
          // Invisible for the moment before the box's position is known.
          !anchor && styles.measuring,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
