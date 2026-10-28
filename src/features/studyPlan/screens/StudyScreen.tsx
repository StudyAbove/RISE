import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import type { MainTabParamList } from '../../navigation/types';
import { SettingsButton } from '../../settings/components/SettingsButton';

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

  // Reload real assignments when the student opens this tab or retries.
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

      {/* Open the full assignment list in its existing tab. */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all assignments"
          accessibilityHint="Opens the assignment list"
          onPress={() => navigation.navigate('List')}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
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

        {/* Reuse the List card so both pages open the same details screen. */}
        {status === 'ready' &&
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={date}
            />
          ))}

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
  actionsRow: {
    alignItems: 'flex-end',
    marginTop: 16,
  },
  viewAllButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  viewAllText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  list: {
    gap: 8,
    marginTop: 8,
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