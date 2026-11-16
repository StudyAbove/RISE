import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../../components/BackButton';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { colors } from '../../../theme/colors';
import { StreakWeekRow } from '../components/StreakWeekRow';
import { useStreakData } from '../hooks/useStreakData';
import { styles } from './StreakScreen.styles';

const SUN_IMAGE = require('../../../../assets/images/streak/sun.png');
// Same hills as Home's morning sky, faded at the bottom of the page.
const HILLS_IMAGE = require('../../../../assets/images/home/sky-morning.png');

// Placeholder until the supportive messages story (#11).
const QUOTE = '“Progress, not perfection, leads to brighter tomorrows.”';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Your Streak (#7): how many days in a row the student has turned in work on
 * time, this week at a glance, and their longest streak. Opened from the
 * streak indicator on Home.
 */
export function StreakScreen() {
  const insets = useSafeAreaInsets();
  const now = useCurrentDate();
  const { status, streak, reload } = useStreakData(now);

  return (
    <View style={styles.screen}>
      <Image
        source={HILLS_IMAGE}
        resizeMode="cover"
        style={styles.hills}
        accessibilityIgnoresInvertColors
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Your Streak
          </Text>
          {/* After the full-width title so it sits on top and gets the taps. */}
          <View style={styles.backButtonContainer}>
            <BackButton />
          </View>
        </View>

        <Image source={SUN_IMAGE} style={styles.sun} accessibilityIgnoresInvertColors />

        {status === 'loading' && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.deepOlive} />
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              Loading your streak…
            </Text>
          </View>
        )}

        {status === 'signedOut' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>Sign in to RISE to see your streak.</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusCard}>
            <Text accessibilityRole="alert" style={styles.statusText}>
              Couldn’t load your streak.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={reload}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {streak && (
          <>
            <Text style={styles.streakCount}>
              {streak.current} {streak.current === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.streakCaption}>
              {streak.current > 0 ? 'days and counting!' : 'Turn something in on time to start a streak.'}
            </Text>

            <View style={styles.week}>
              <StreakWeekRow week={streak.week} today={now} />
            </View>

            <View style={styles.stats}>
              <StatCard value={streak.current} label="Current Streak" />
              <StatCard value={streak.longest} label="Longest Streak" />
              <StatCard value={streak.totalWeeks} label="Total Weeks" />
            </View>

            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>{QUOTE}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
