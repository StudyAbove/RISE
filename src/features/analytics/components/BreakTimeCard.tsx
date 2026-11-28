import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getBreakSessions,
  type BreakSession,
} from '../../../repositories/breakSessionsRepository';
import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';
import { BREAK_CATALOG } from '../../breaks/data/breakTypes';

export function formatBreakTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return hours > 0
    ? `${hours} hr ${minutes} min ${remainder} sec`
    : `${minutes} min ${remainder} sec`;
}

export function BreakTimeCard() {
  const [sessions, setSessions] = useState<BreakSession[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setStatus('loading');

      void getBreakSessions()
        .then((loaded) => {
          if (!active) return;
          setSessions(loaded);
          setStatus('ready');
        })
        .catch(() => {
          if (active) setStatus('error');
        });

      return () => {
        active = false;
      };
    }, [retry]),
  );

  const totalSeconds = sessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  );

  // Include saved types even if they are later removed from the catalog.
  const typeIds = Array.from(
    new Set([
      ...BREAK_CATALOG.map((option) => option.id),
      ...sessions.map((session) => session.breakType),
    ]),
  );

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Break time
      </Text>
      <Text style={styles.caption}>All time</Text>

      {status === 'loading' && (
        <Text style={styles.body} accessibilityLiveRegion="polite">
          Loading break activity…
        </Text>
      )}

      {status === 'error' && (
        <>
          <Text accessibilityRole="alert" style={styles.body}>
            Could not load break activity.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((value) => value + 1)}
            style={styles.retry}
          >
            <Text style={styles.link}>Retry break activity</Text>
          </Pressable>
        </>
      )}

      {status === 'ready' && (
        <>
          <Text style={styles.total}>
            {formatBreakTime(totalSeconds)}
          </Text>
          <Text style={styles.body}>
            {sessions.length} {sessions.length === 1 ? 'break' : 'breaks'} recorded
          </Text>

          {sessions.length === 0 && (
            <Text style={styles.caption}>
              Take a break during a study session to see your activity here.
            </Text>
          )}

          {typeIds.map((id) => {
            const matching = sessions.filter(
              (session) => session.breakType === id,
            );
            const seconds = matching.reduce(
              (sum, session) => sum + session.durationSeconds,
              0,
            );
            const label =
              BREAK_CATALOG.find((option) => option.id === id)?.label ?? id;

            return (
              <View key={id} style={styles.row}>
                <Text style={styles.body}>{label}</Text>
                <Text style={styles.detail}>
                  {matching.length} {matching.length === 1 ? 'break' : 'breaks'}
                  {' · '}
                  {formatBreakTime(seconds)}
                </Text>
              </View>
            );
          })}

          <Text style={styles.caption}>
            Mood insights will be available after mood check-ins are connected.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  total: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.deepOlive,
  },
  body: {
    ...textStyles.body,
    color: colors.deepOlive,
  },
  caption: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.mistGreen,
  },
  detail: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    ...textStyles.link,
    color: colors.deepOlive,
    textDecorationLine: 'underline',
  },
});