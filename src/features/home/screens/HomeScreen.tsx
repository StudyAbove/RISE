import { useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type Text } from 'react-native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSkyBackdrop } from '../components/HomeSkyBackdrop';
import { useStudentFirstName } from '../hooks/useStudentFirstName';
import { getTimeOfDay } from '../utils/greeting';

// How far the sky picture extends below the date, so the date sits on the hills.
const SKY_OVERLAP_BELOW_DATE = 8;

// Main page of the Home tab. The sections below the greeting (weekly
// forecast, priority tasks, mood check-in) come in their own stories.
export function HomeScreen() {
  const greetingRef = useRef<Text>(null);
  const date = useCurrentDate();
  const firstName = useStudentFirstName();
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
    </TabScreenScrollView>
  );
}
