import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import {
  CalendarConflictModal,
  type CalendarConflict,
  type CalendarConflictChoice,
} from './CalendarConflictModal';

// Two sample versions of the same event, not real calendar records.
const sampleConflict: CalendarConflict = {
  id: 'preview-conflict',
  provider: 'google',
  calendarName: 'School calendar',
  riseVersion: {
    id: 'rise-preview-event',
    userId: 'preview-user',
    title: 'Study Group',
    startAt: '2026-10-20T15:00:00-07:00',
    endAt: '2026-10-20T16:00:00-07:00',
    source: 'rise',
    location: 'Library Room 201',
    description: 'Review chapters 4 and 5.',
  },
  calendarVersion: {
    id: 'google-preview-event',
    userId: 'preview-user',
    title: 'Exam Review Group',
    startAt: '2026-10-20T15:30:00-07:00',
    endAt: '2026-10-20T17:00:00-07:00',
    source: 'google',
    location: 'Library Room 305',
    description: 'Review chapters 4 through 6.',
  },
};

export function CalendarConflictPreview() {
  const [open, setOpen] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [result, setResult] = useState('');

  // These testing controls never appear in production builds.
  if (!__DEV__) return null;

  async function resolvePreview(
    _conflict: CalendarConflict,
    choice: CalendarConflictChoice,
  ): Promise<void> {
    // Allow the saving indicator to appear during testing.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 800);
    });

    if (simulateFailure) {
      // Fail once. The next attempt succeeds.
      setSimulateFailure(false);
      throw new Error('Preview failure');
    }

    setResult(
      choice === 'rise'
        ? 'Preview complete: kept the RISE version.'
        : 'Preview complete: kept the Google version.',
    );
  }

  function openPreview(withError: boolean) {
    setSimulateFailure(withError);
    setResult('');
    setOpen(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Conflict preview · Sample data</Text>
      <Text style={styles.note}>No real calendar changes are made.</Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => openPreview(false)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Compare versions</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => openPreview(true)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Test retry</Text>
        </Pressable>
      </View>

      {result !== '' && <Text style={styles.note}>{result}</Text>}

      {open && (
        <CalendarConflictModal
          conflict={sampleConflict}
          onResolve={resolvePreview}
          onClose={() => setOpen(false)}
          previewOnly
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 14,
    backgroundColor: colors.softWhite,
  },
  label: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  note: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  button: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: colors.mistGreen,
  },
  buttonText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});