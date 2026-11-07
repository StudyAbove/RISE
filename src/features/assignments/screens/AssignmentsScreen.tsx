import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { TabPageHeader } from '../../../components/TabPageHeader';
import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { AssignmentCard } from '../components/AssignmentCard';
import { SectionHeader } from '../components/SectionHeader';
import { getAssignmentListSections } from '../utils/assignmentListSections';

type LoadStatus = 'loading' | 'ready' | 'signedOut' | 'error';

export function AssignmentsScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // A pull-to-refresh keeps the list on screen while it reloads.
  const isPullRefresh = useRef(false);

  // Completed work enters Past immediately.
  // Unfinished work enters Past after 2 days overdue.
  // Both remain in Past for 14 days before being hidden from List.
  const { currentAssignments, pastAssignments } = useMemo(
    () => getAssignmentListSections(assignments, date),
    [assignments, date],
  );

  // Reload when the student opens this tab, pulls down, or taps Try again.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadAssignments() {
        if (!isPullRefresh.current) {
          setStatus('loading');
          setAssignments([]);
        }

        try {
          const { data, error } = await supabase.auth.getSession();

          if (!active) return;
          if (error) throw error;

          // Skipping the login screen does not create a real session.
          if (!data.session) {
            setStatus('signedOut');
            return;
          }

          const loadedAssignments = await fetchAssignments();

          if (!active) return;

          setAssignments(loadedAssignments);
          setStatus('ready');
        } catch {
          if (!active) return;

          setAssignments([]);
          setStatus('error');
        } finally {
          isPullRefresh.current = false;
          setRefreshing(false);
        }
      }

      void loadAssignments();

      // Ignore a request's result if the student leaves this screen.
      return () => {
        active = false;
      };
    }, [reloadCount]),
  );

  const refreshAssignments = () => {
    setReloadCount((count) => count + 1);
  };

  const pullToRefresh = () => {
    isPullRefresh.current = true;
    setRefreshing(true);
    refreshAssignments();
  };

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={pullToRefresh}
          tintColor={colors.deepOlive}
          colors={[colors.deepOlive]}
        />
      }
    >
      {/* The sky, settings button, title and subtitle, shared with Study
          Plan and Analytics. */}
      <TabPageHeader
        title="List"
        subtitle="Look at an overview of the future"
        titleRef={titleRef}
      />

      <View style={styles.list}>
        {status === 'loading' && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.deepOlive} />
            <Text
              style={styles.statusText}
              accessibilityLiveRegion="polite"
            >
              Loading your assignments…
            </Text>
          </View>
        )}

        {status === 'signedOut' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Sign in to RISE to view your assignments.
            </Text>
            <Text style={styles.statusNote}>
              A signed-in account is required to load your saved coursework.
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
              onPress={refreshAssignments}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && assignments.length === 0 && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              No assignments to display.
            </Text>
            <Text style={styles.statusNote}>
              Connect and sync your Canvas courses to import assignments.
            </Text>
          </View>
        )}

        {status === 'ready' &&
          assignments.length > 0 &&
          currentAssignments.length === 0 && (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>You’re all caught up!</Text>
            </View>
          )}

        {status === 'ready' &&
          currentAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={date}
            />
          ))}

        {status === 'ready' && pastAssignments.length > 0 && (
          <View style={styles.pastHeader}>
            <SectionHeader
              title="Past"
              count={pastAssignments.length}
              linkText={showPast ? 'Hide' : 'Show'}
              linkLabel={
                showPast
                  ? 'Hide past assignments'
                  : `Show ${pastAssignments.length} past assignments`
              }
              linkExpanded={showPast}
              onLinkPress={() => setShowPast((shown) => !shown)}
            />
          </View>
        )}

        {status === 'ready' &&
          showPast &&
          pastAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={date}
            />
          ))}
      </View>
    </TabScreenScrollView>
  );
}

// Card styles now live in the shared AssignmentCard component.
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  // Same gap below the subtitle as before the shared header (8 + 12).
  list: {
    gap: 8,
    marginTop: 20,
  },
  statusCard: {
    padding: 20,
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
  },
  statusText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  statusNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.mistGreen,
    justifyContent: 'center',
  },
  retryText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  pastHeader: {
    marginTop: 16,
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});