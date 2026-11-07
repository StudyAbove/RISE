import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../../components/BackButton';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors } from '../../../theme/colors';
import { AssignmentCard } from '../../assignments/components/AssignmentCard';
import type { RootStackParamList } from '../../navigation/types';
import { getClassWeekAssignments } from '../utils/weeklyForecast';
import { styles } from './ClassWeekScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassWeek'>;

type LoadStatus = 'loading' | 'ready' | 'signedOut' | 'error';

/**
 * Every unfinished assignment one class has due in the next 7 days, opened by
 * tapping the class on Home's Weekly Forecast (#61). Back returns to Home.
 */
export function ClassWeekScreen({ route }: Props) {
  const { courseId, courseLabel } = route.params;
  const insets = useSafeAreaInsets();
  const now = useCurrentDate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);

  const classAssignments = useMemo(
    () => getClassWeekAssignments(assignments, courseId, now),
    [assignments, courseId, now],
  );

  // Reload when the screen opens or the student returns from an assignment.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setStatus('loading');

        try {
          const { data, error } = await supabase.auth.getSession();

          if (!active) return;
          if (error) throw error;

          if (!data.session) {
            setStatus('signedOut');
            return;
          }

          const loaded = await fetchAssignments();

          if (!active) return;

          setAssignments(loaded);
          setStatus('ready');
        } catch {
          if (active) setStatus('error');
        }
      }

      void load();

      // Ignore a request's result if the student leaves this screen.
      return () => {
        active = false;
      };
    }, [reloadCount]),
  );

  const count = classAssignments.length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.backButtonContainer}>
        <BackButton />
      </View>

      <Text accessibilityRole="header" style={styles.title}>
        {courseLabel}
      </Text>
      <Text style={styles.subtitle}>
        {status === 'ready'
          ? `${count} ${count === 1 ? 'assignment' : 'assignments'} due in the next 7 days`
          : 'Due in the next 7 days'}
      </Text>

      <View style={styles.list}>
        {status === 'loading' && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.deepOlive} />
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              Loading assignments…
            </Text>
          </View>
        )}

        {status === 'signedOut' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Sign in to RISE to view your assignments.
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusCard}>
            <Text accessibilityRole="alert" style={styles.statusText}>
              Couldn’t load your assignments.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setReloadCount((reloads) => reloads + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && count === 0 && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Nothing left for this class this week.
            </Text>
          </View>
        )}

        {status === 'ready' &&
          classAssignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} today={now} />
          ))}
      </View>
    </ScrollView>
  );
}
