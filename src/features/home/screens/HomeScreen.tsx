import { useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type Text } from 'react-native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSkyBackdrop } from '../components/HomeSkyBackdrop';
import { WeeklyForecastCard } from '../components/WeeklyForecastCard';
import { useStudentFirstName } from '../hooks/useStudentFirstName';
import { useWeeklyForecast } from '../hooks/useWeeklyForecast';
import { getTimeOfDay } from '../utils/greeting';

// How far the sky picture extends below the date, so the date sits on the hills.
const SKY_OVERLAP_BELOW_DATE = 8;

// Main page of the Home tab. The other sections below the forecast
// (priority tasks, mood check-in) come in their own stories.
export function HomeScreen() {
  const greetingRef = useRef<Text>(null);
  const date = useCurrentDate();
  const firstName = useStudentFirstName();
  const weeklyForecast = useWeeklyForecast(date);
  // Where the header (and so the date line) ends, so the sky can line up with it.
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  const handleHeaderLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  return (
    <TabScreenScrollView focusTargetRef={greetingRef}>
      {/* First so it draws behind the header. */}
      {headerBottom !== null && (
        <HomeSkyBackdrop
          timeOfDay={getTimeOfDay(date)}
          bottom={headerBottom + SKY_OVERLAP_BELOW_DATE}
        />
      )}
      <View onLayout={handleHeaderLayout}>
        <HomeHeader date={date} firstName={firstName} greetingRef={greetingRef} />
      </View>
      {weeklyForecast.status !== 'signedOut' && (
        <WeeklyForecastCard
          status={weeklyForecast.status}
          forecast={weeklyForecast.forecast}
          now={date}
        />
      )}
    </TabScreenScrollView>
  );
}
