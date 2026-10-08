import type { RefObject } from 'react';
import { Text, View } from 'react-native';

import { SettingsButton } from '../../settings/components/SettingsButton';
import { formatLongDate, getTimeOfDayGreeting } from '../utils/greeting';
import { styles } from './HomeHeader.styles';

interface HomeHeaderProps {
  date: Date;
  /** Left out of the greeting when null (e.g. still loading or not set). */
  firstName: string | null;
  /** Lets the screen move VoiceOver focus to the greeting (see TabScreenScrollView). */
  greetingRef?: RefObject<Text | null>;
}

/** Top of the Home page: RISE wordmark and settings gear, then the greeting and today's date. */
export function HomeHeader({ date, firstName, greetingRef }: HomeHeaderProps) {
  const greeting = getTimeOfDayGreeting(date);

  return (
    <View>
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>RISE</Text>
        <SettingsButton />
      </View>

      <Text ref={greetingRef} accessibilityRole="header" style={styles.greeting}>
        {firstName ? `${greeting}, ${firstName}` : greeting}
      </Text>
      <Text style={styles.date}>{formatLongDate(date)}</Text>
    </View>
  );
}
