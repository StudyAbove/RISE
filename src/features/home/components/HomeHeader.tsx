import type { RefObject } from 'react';
import { Text, View } from 'react-native';

import { TextGlow } from '../../../components/TextGlow';
import { SettingsButton } from '../../settings/components/SettingsButton';
import { StreakIndicator } from '../../streak/components/StreakIndicator';
import { formatLongDate, getTimeOfDayGreeting } from '../utils/greeting';
import { styles } from './HomeHeader.styles';

interface HomeHeaderProps {
  date: Date;
  streakCount?: number | null;
  /** Left out of the greeting when null (e.g. still loading or not set). */
  firstName: string | null;
  /** Lets the screen move VoiceOver focus to the greeting (see TabScreenScrollView). */
  greetingRef?: RefObject<Text | null>;
}

/**
 * Top of the Home page: RISE wordmark, streak pill, and settings gear, then
 * the greeting and today's date.
 */
export function HomeHeader({
  date,
  firstName,
  greetingRef,
  streakCount = null,
}: HomeHeaderProps) {
  const greeting = getTimeOfDayGreeting(date);

  return (
    <View>
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>RISE</Text>
        <View style={styles.topRowActions}>
          <StreakIndicator count={streakCount} />
          <SettingsButton />
        </View>
      </View>

      <View style={styles.titleBlock}>
        {/* Soft cream glow behind the text so it stays readable over the sky picture. */}
        <TextGlow style={styles.textScrim} />

        <Text ref={greetingRef} accessibilityRole="header" style={styles.greeting}>
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </Text>
        <Text style={styles.date}>{formatLongDate(date)}</Text>
      </View>
    </View>
  );
}
