import { useCallback, useRef, useState } from 'react';
import type { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { startOfWeek } from 'date-fns';

import { TabPageHeader } from '../../../components/TabPageHeader';
import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { getTotalStudySeconds } from '../../../repositories/studySessionsRepository';
import { StudyTimeCard } from '../components/StudyTimeCard';
import { styles } from './AnalyticsScreen.styles';

/**
 * Main page of the Analytics tab. Has the same sky, title and subtitle as
 * Study Plan and List, from the Figma "Analytics Overview" screen. The charts
 * come in the analytics stories.
 */
export function AnalyticsScreen() {
  const titleRef = useRef<Text>(null);
  const [studySeconds, setStudySeconds] = useState<number | null>(null);

  // This week's recorded study time (#49), from Monday, reloaded each time
  // the tab opens so a session that just ended counts.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getTotalStudySeconds(startOfWeek(new Date(), { weekStartsOn: 1 }))
        .then((seconds) => {
          if (active) setStudySeconds(seconds);
        })
        .catch((error: Error) => {
          console.log('Could not load study time:', error.message);
          if (active) setStudySeconds(null);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <TabScreenScrollView focusTargetRef={titleRef} contentContainerStyle={styles.container}>
      <TabPageHeader
        title="Analytics"
        subtitle="Your progress tells a bigger story."
        titleRef={titleRef}
      />
      <StudyTimeCard seconds={studySeconds} />
    </TabScreenScrollView>
  );
}
