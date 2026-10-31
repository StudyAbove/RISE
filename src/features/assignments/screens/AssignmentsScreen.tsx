import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import { SettingsButton } from '../../settings/components/SettingsButton';
import { AssignmentCard } from '../components/AssignmentCard';
import {
  isPastAssignment,
  sortByPriority,
} from '../utils/assignmentPriority';

type LoadStatus = 'loading' | 'ready' | 'signedOut' | 'error';

// Let the hills extend slightly below the subtitle.
const SKY_OVERLAP_BELOW_HEADER = 8;

export function AssignmentsScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Most urgent first (#86). Completed work, and work overdue for over a
  // week, stays hidden unless the student asks to see it.
  const { visibleAssignments, pastCount } = useMemo(() => {
    const current = sortByPriority(
      assignments.filter((assignment) => !isPastAssignment(assignment, date)),
    );
    // Shown below current work, most recent first.
    const past = sortByPriority(
      assignments.filter((assignment) => isPastAssignment(assignment, date)),
    ).reverse();

    return {
      visibleAssignments: showPast ? [...current, ...past] : current,
      pastCount: past.length,
    };
  }, [assignments, date, showPast]);

  // Reload when the student opens this tab or requests a refresh.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadAssignments() {
        setStatus('loading');
        setAssignments([]);

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
        }
      }

      void loadAssignments();

      // Ignore a request's result if the student leaves this screen.
      return () => {
        active = false;
      };
    }, [reloadCount]),
  );

  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  const refreshAssignments = () => {
    setReloadCount((count) => count + 1);
  };

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
    >
      {/* Draw the artwork behind the header. */}
      {headerBottom !== null && (
        <HomeSkyBackdrop
          timeOfDay={getTimeOfDay(date)}
          bottom={headerBottom + SKY_OVERLAP_BELOW_HEADER}
        />
      )}

      <View onLayout={handleHeaderLayout}>
        <View style={styles.headerRow}>
          <SettingsButton />
        </View>

        <View style={styles.header}>
          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={styles.title}
          >
            List
          </Text>

          <Text style={styles.subtitle}>
            Look at an overview of the future
          </Text>
        </View>
      </View>

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
          visibleAssignments.length === 0 && (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>You’re all caught up!</Text>
              <Text style={styles.statusNote}>
                Completed and past assignments are hidden.
              </Text>
            </View>
          )}

        {status === 'ready' &&
          visibleAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={date}
            />
          ))}

        {status === 'ready' && pastCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showPast }}
            onPress={() => setShowPast((shown) => !shown)}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>
              {showPast
                ? 'Hide past assignments'
                : `Show past assignments (${pastCount})`}
            </Text>
          </Pressable>
        )}

        {status === 'ready' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh assignments"
            onPress={refreshAssignments}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>Refresh assignments</Text>
          </Pressable>
        )}
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
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: 8,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
  },
  subtitle: {
    ...textStyles.subtitle,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
  list: {
    gap: 8,
    marginTop: 12,
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
  refreshButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});