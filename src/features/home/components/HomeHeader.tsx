import type { RefObject } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { colors } from '../../../theme/colors';
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

      <View style={styles.titleBlock}>
        {/* Soft cream glow behind the text so it stays readable over the sky picture. */}
        <View pointerEvents="none" style={styles.textScrim}>
          <Svg width="100%" height="100%">
            <Defs>
              {/* Cream that fades in above the text and out below it. */}
              <LinearGradient id="textScrimFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.warmCream} stopOpacity={0} />
                <Stop offset="0.35" stopColor={colors.warmCream} stopOpacity={0.6} />
                <Stop offset="0.65" stopColor={colors.warmCream} stopOpacity={0.6} />
                <Stop offset="1" stopColor={colors.warmCream} stopOpacity={0} />
              </LinearGradient>
              {/* Fades the glow out just past the end of the text. */}
              <LinearGradient id="textScrimEdge" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0.75" stopColor="white" stopOpacity={1} />
                <Stop offset="1" stopColor="white" stopOpacity={0} />
              </LinearGradient>
              <Mask id="textScrimMask">
                <Rect width="100%" height="100%" fill="url(#textScrimEdge)" />
              </Mask>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill="url(#textScrimFill)"
              mask="url(#textScrimMask)"
            />
          </Svg>
        </View>

        <Text ref={greetingRef} accessibilityRole="header" style={styles.greeting}>
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </Text>
        <Text style={styles.date}>{formatLongDate(date)}</Text>
      </View>
    </View>
  );
}
