import { useState, type RefObject } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { HomeSkyBackdrop } from '../features/home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../features/home/utils/greeting';
import { SettingsButton } from '../features/settings/components/SettingsButton';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { TextGlow } from './TextGlow';
import { SKY_BOTTOM_BELOW_TEXT, SUBTITLE_SPACE, styles } from './TabPageHeader.styles';

interface TabPageHeaderProps {
  title: string;
  /** The short line under the title, e.g. "Look at an overview of the future". */
  subtitle?: string;
  /** VoiceOver focuses the title after the tab scrolls back to the top. */
  titleRef: RefObject<Text | null>;
}

/**
 * The top of Study Plan, List and Analytics: the sky, the settings button,
 * and the title and subtitle with Home's cream glow behind them. Laid out like
 * Home's greeting and date, and shared so the sky and title sit in exactly the
 * same place on each page.
 *
 * Must be the first child of a TabScreenScrollView, so the sky draws behind
 * the rest of the page.
 */
export function TabPageHeader({ title, subtitle, titleRef }: TabPageHeaderProps) {
  const date = useCurrentDate();
  const [textBottom, setTextBottom] = useState<number | null>(null);

  const handleLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setTextBottom(layout.y + layout.height);
  };

  // Like Home, the hills end just under the text. A page without a subtitle
  // keeps the same sky as one with, so every tab lines up.
  const skyBottom =
    textBottom === null ? null : textBottom + SKY_BOTTOM_BELOW_TEXT + (subtitle ? 0 : SUBTITLE_SPACE);

  return (
    <>
      {skyBottom !== null && <HomeSkyBackdrop timeOfDay={getTimeOfDay(date)} bottom={skyBottom} />}

      <View onLayout={handleLayout}>
        <View style={styles.headerRow}>
          <SettingsButton />
        </View>

        <View style={styles.titleBlock}>
          {/* Soft cream glow behind the text so it stays readable over the sky picture. */}
          <TextGlow style={styles.textGlow} />

          <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </>
  );
}
