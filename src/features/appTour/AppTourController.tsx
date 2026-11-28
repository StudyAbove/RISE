import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { supabase } from '../../lib/supabase';
import { AppTourOverlay } from './AppTourOverlay';
import { TOUR_STEPS } from './tourSteps';
import {
  readTourChoice,
  saveTourChoice,
  type TourChoice,
} from './tourStorage';

// Settings can request a replay while the main tabs remain mounted.
const replayListeners = new Set<() => void>();

export function requestAppTourReplay() {
  replayListeners.forEach((listener) => listener());
}

type Props = {
  navigation: BottomTabBarProps['navigation'];
};

export function AppTourController({ navigation }: Props) {
  const focused = useIsFocused();
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'invite' | 'tour' | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const accountRef = useRef<string | null>(null);
  const versionRef = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;

    async function loadAccount(id: string | null) {
      if (!active || accountRef.current === id) return;

      accountRef.current = id;
      const version = ++versionRef.current;

      savingRef.current = false;
      setSaving(false);
      setUserId(id);
      setMode(null);
      setStepIndex(0);

      if (!id) return;

      try {
        const choice = await readTourChoice(id);

        if (!active || versionRef.current !== version) return;

        if (choice === null) {
          setMode('invite');
        }
      } catch {
        // A storage problem must never block access to the app.
        console.log('Could not read the app tour preference.');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authEventReceived = true;
        void loadAccount(session?.user.id ?? null);
      },
    );

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived || error) return;
      void loadAccount(data.session?.user.id ?? null);
    }).catch(() => {
      // Signed-out and unavailable sessions do not show the invitation.
    });

    return () => {
      active = false;
      versionRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function replay() {
      if (!accountRef.current || savingRef.current) return;

      navigation.navigate('Home');
      setStepIndex(0);
      setMode('tour');
    }

    replayListeners.add(replay);

    return () => {
      replayListeners.delete(replay);
    };
  }, [navigation]);

  async function choose(
    choice: TourChoice,
    nextMode: 'tour' | null,
  ) {
    if (!userId || savingRef.current) return;

    const version = versionRef.current;
    savingRef.current = true;
    setSaving(true);

    try {
      await saveTourChoice(userId, choice);
    } catch {
      // The tour stays optional even when saving fails.
      // Its invitation may appear again on a later launch.
      console.log('Could not save the app tour preference.');
    } finally {
      if (versionRef.current === version) {
        savingRef.current = false;
        setSaving(false);
        setStepIndex(0);
        setMode(nextMode);
        navigation.navigate('Home');
      }
    }
  }

  function moveToStep(index: number) {
    if (savingRef.current) return;

    const step = TOUR_STEPS[index];
    if (!step) return;

    navigation.navigate(step.tab);
    setStepIndex(index);
  }

  return (
    <AppTourOverlay
      mode={focused ? mode : null}
      stepIndex={stepIndex}
      saving={saving}
      error=""
      onStart={() => void choose('started', 'tour')}
      onLater={() => void choose('later', null)}
      onBack={() => moveToStep(stepIndex - 1)}
      onNext={() => {
        if (stepIndex === TOUR_STEPS.length - 1) {
          void choose('finished', null);
        } else {
          moveToStep(stepIndex + 1);
        }
      }}
      onSkip={() => void choose('skipped', null)}
    />
  );
}