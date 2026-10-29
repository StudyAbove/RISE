import { useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type Text } from 'react-native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { HighPriorityTasks } from '../components/HighPriorityTasks';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSkyBackdrop } from '../components/HomeSkyBackdrop';
import { WeeklyForecastCard } from '../components/WeeklyForecastCard';
import { useHomeAssignments } from '../hooks/useHomeAssignments';
import { useStudentFirstName } from '../hooks/useStudentFirstName';
import { getTimeOfDay } from '../utils/greeting';
import { getHighPriorityTasks } from '../utils/highPriorityTasks';
import { buildWeeklyForecast } from '../utils/weeklyForecast';

// How far the sky picture extends below the date, so the date sits on the hills.
const SKY_OVERLAP_BELOW_DATE = 8;

// Main page of the Home tab. The mood check-in below the tasks comes in
// its own story.
export function HomeScreen() {
  const greetingRef = useRef<Text>(null);
  const date = useCurrentDate();
  const firstName = useStudentFirstName();
  const { status, assignments } = useHomeAssignments();

  const forecast = useMemo(
    () => (status === 'ready' ? buildWeeklyForecast(assignments, date) : null),
    [assignments, date, status],
  );
  const highPriorityTasks = useMemo(
    () => getHighPriorityTasks(assignments, date),
    [assignments, date],
  );
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
      {status !== 'signedOut' && (
        <WeeklyForecastCard status={status} forecast={forecast} now={date} />
      )}
      {/* The forecast card shows loading and errors for both sections. */}
      {status === 'ready' && (
        <HighPriorityTasks tasks={highPriorityTasks} now={date} />
      )}
    </TabScreenScrollView>
  );
}
