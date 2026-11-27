import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { BreathingScene } from '../components/BreathingScene';
import { HelpToolLayout } from '../components/HelpToolLayout';
import { useBreathingSession, type BreathingStatus } from '../hooks/useBreathingSession';
import { BREATHING_TIMING, type BreathPhase } from '../utils/breathingSession';
import { styles } from './BreathingScreen.styles';

const PHASE_CUES: Record<BreathPhase, string> = {
  in: 'Breathe in',
  hold: 'Hold',
  out: 'Breathe out',
};

const PRIMARY_LABELS: Record<BreathingStatus, string> = {
  ready: 'Begin',
  rising: 'Settling in…',
  running: 'Pause',
  paused: 'Resume',
  settling: 'Settling…',
  done: 'Keep breathing',
};

/** The big instruction and the quieter line under it, for each moment. */
function getGuide(status: BreathingStatus, breath: number, phase: BreathPhase) {
  const progress = `Breath ${breath} of ${BREATHING_TIMING.breaths}`;

  switch (status) {
    case 'ready':
      return { cue: 'Ready when you are', detail: 'Five gentle breaths.' };
    case 'rising':
      return { cue: 'Settle in', detail: 'Follow the sun as it rises.' };
    case 'running':
      return { cue: PHASE_CUES[phase], detail: progress };
    case 'paused':
      return { cue: 'Take your time', detail: progress };
    case 'settling':
      return { cue: 'Take your time', detail: 'Let your breathing return to its own rhythm.' };
    case 'done':
      return { cue: 'Ready when you are', detail: 'A little space for the rest of your day.' };
  }
}

/**
 * "Take a breath", opened from the help menu (#70). A sun rises over the
 * hills and guides five slow breaths: in, hold, out (#71).
 */
export function BreathingScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const session = useBreathingSession();
  const { status, breath, phase, pause } = session;

  const { cue, detail } = getGuide(status, breath, phase);
  const busy = status === 'rising' || status === 'settling';
  const inSession = status === 'rising' || status === 'running' || status === 'paused';

  // Pause when another screen opens on top, e.g. a notification is tapped.
  useEffect(() => {
    if (!isFocused) pause();
  }, [isFocused, pause]);

  // Read each new instruction aloud with VoiceOver, once per change.
  useEffect(() => {
    if (status === 'running' || status === 'done') {
      AccessibilityInfo.announceForAccessibility(cue);
    }
  }, [status, cue]);

  const pressPrimary = () => {
    if (status === 'running') session.pause();
    else if (status === 'paused') session.resume();
    else if (status === 'ready' || status === 'done') session.begin();
  };

  return (
    <HelpToolLayout title="Take a breath" subtitle="Take a moment. Follow the sun.">
      <BreathingScene sunRise={session.sunRise} sunScale={session.sunScale} reduceMotion={reduceMotion} />

      <View style={styles.guide} accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={styles.cue}>
          {cue}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={pressPrimary}
        style={({ pressed }) => [styles.primaryButton, busy && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{PRIMARY_LABELS[status]}</Text>
      </Pressable>

      {inSession && (
        <Pressable
          accessibilityRole="button"
          onPress={session.finish}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Finish</Text>
        </Pressable>
      )}

      {status === 'done' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Return to studying</Text>
        </Pressable>
      )}
    </HelpToolLayout>
  );
}
