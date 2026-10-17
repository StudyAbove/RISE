import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import SetupDoneCheckIcon from '../../../../assets/icons/onboarding/setup-done-check.svg';
import { styles } from './SetupStatusRow.styles';

type SetupStatusRowProps = {
  icon: ReactNode;
  label: string;
  done: boolean;
};

/** One row on "You're all set", e.g. "Calendar connected" with a check when it's done. */
export function SetupStatusRow({ icon, label, done }: SetupStatusRowProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}, ${done ? 'done' : 'not set up yet'}`}
    >
      <View style={styles.iconCircle}>{icon}</View>

      <Text style={styles.label}>{label}</Text>

      {done ? (
        <View style={styles.doneCircle}>
          <SetupDoneCheckIcon />
        </View>
      ) : (
        <View style={styles.pendingCircle} />
      )}
    </View>
  );
}
