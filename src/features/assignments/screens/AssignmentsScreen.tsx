import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);

  // A pull-to-refresh keeps the list on screen while it reloads.
  const isPullRefresh = useRef(false);

  // Most urgent first (#86). Completed work, and work overdue for over a
  // week, stays hidden unless the student asks to see it.
  const { currentAssignments, pastAssignments } = useMemo(
    () => ({
      currentAssignments: sortByPriority(
        assignments.filter((assignment) => !isPastAssignment(assignment, date)),
      ),
      // Most recent first.
      pastAssignments: sortByPriority(
        assignments.filter((assignment) => isPastAssignment(assignment, date)),
      ).reverse(),
    }),
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

  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

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

        {/* Styled like the "Upcoming" section header on the Figma Study page. */}
        {status === 'ready' && pastAssignments.length > 0 && (
          <View style={styles.pastHeader}>
            <View style={styles.pastTitleRow}>
              <Text accessibilityRole="header" style={styles.pastTitle}>
                Past
              </Text>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {pastAssignments.length}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPast
                  ? 'Hide past assignments'
                  : `Show ${pastAssignments.length} past assignments`
              }
              accessibilityState={{ expanded: showPast }}
              hitSlop={12}
              onPress={() => setShowPast((shown) => !shown)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.showLink}>{showPast ? 'Hide' : 'Show'}</Text>
            </Pressable>
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
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 2,
  },
  pastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pastTitle: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  // Count badge from the Figma Study page, e.g. "Upcoming 1".
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.paleSun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...textStyles.body,
    color: colors.deepOlive,
  },
  showLink: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});