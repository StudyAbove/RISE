import { useRef } from 'react';
import type { Text } from 'react-native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { HomeHeader } from '../components/HomeHeader';
import { useStudentFirstName } from '../hooks/useStudentFirstName';

// Main page of the Home tab. The sections below the greeting (weekly
// forecast, priority tasks, mood check-in) come in their own stories.
export function HomeScreen() {
  const greetingRef = useRef<Text>(null);
  const date = useCurrentDate();
  const firstName = useStudentFirstName();

  return (
    <TabScreenScrollView focusTargetRef={greetingRef}>
      <HomeHeader date={date} firstName={firstName} greetingRef={greetingRef} />
    </TabScreenScrollView>
  );
}
