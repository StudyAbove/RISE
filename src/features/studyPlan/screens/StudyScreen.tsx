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
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { AssignmentCard } from '../../assignments/components/AssignmentCard';
import { SectionHeader } from '../../assignments/components/SectionHeader';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import type { MainTabParamList } from '../../navigation/types';
import { SettingsButton } from '../../settings/components/SettingsButton';
import { getStudySections } from '../utils/studySections';

type LoadStatus = 'loading' | 'ready' | 'signedOut' | 'error';

// Let the hills extend slightly below the title.
const SKY_OVERLAP_BELOW_HEADER = 8;

export function StudyScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);

  // Measure the header so the sky lines up with the title.
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // A pull-to-refresh keeps the sections on screen while it reloads.
  const isPullRefresh = useRef(false);

  const sections = useMemo(
    () => getStudySections(assignments, date),
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

  const openList = () => navigation.navigate('List');

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
      {/* Draw the shared sky artwork behind the header. */}
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

        <Text
          ref={titleRef}
          accessibilityRole="header"
          style={styles.title}
        >
          Study Plan
        </Text>
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

        {/* Overdue only appears when something is overdue. View all is on
            Upcoming only, so the page has one way to open List. */}
        {status === 'ready' && sections.overdue.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Overdue"
              count={sections.overdue.length}
            />

            {sections.overdue.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                today={date}
              />
            ))}
          </View>
        )}

        {status === 'ready' && assignments.length > 0 && (
          <>
            <View style={styles.section}>
              <SectionHeader
                title="Due Today"
                count={sections.dueToday.length}
                colorByWorkload
              />

              {sections.dueToday.length === 0 && (
                <Text style={styles.emptyNote}>Nothing due today.</Text>
              )}

              {sections.dueToday.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  today={date}
                />
              ))}
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="Upcoming"
                count={sections.upcoming.length}
                colorByWorkload
                linkText="View all"
                linkLabel="View all assignments"
                onLinkPress={openList}
              />

              {sections.upcoming.length === 0 && (
                <Text style={styles.emptyNote}>
                  Nothing else due this week.
                </Text>
              )}

              {sections.upcoming.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  today={date}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </TabScreenScrollView>
  );
}

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
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    paddingBottom: 8,
  },
  list: {
    gap: 8,
    marginTop: 16,
  },
  // Spacing follows the Figma Study Planning Screen sections.
  section: {
    gap: 10,
    marginBottom: 16,
  },
  emptyNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
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
  pressed: {
    opacity: 0.7,
  },
});