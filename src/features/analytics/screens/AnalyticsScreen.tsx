import { useRef } from 'react';
import type { Text } from 'react-native';

import { TabPageHeader } from '../../../components/TabPageHeader';
import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { styles } from './AnalyticsScreen.styles';

/**
 * Main page of the Analytics tab. Has the same sky, title and subtitle as
 * Study Plan and List, from the Figma "Analytics Overview" screen. The charts
 * come in the analytics stories.
 */
export function AnalyticsScreen() {
  const titleRef = useRef<Text>(null);

  return (
    <TabScreenScrollView focusTargetRef={titleRef} contentContainerStyle={styles.container}>
      <TabPageHeader
        title="Analytics"
        subtitle="Your progress tells a bigger story."
        titleRef={titleRef}
      />
    </TabScreenScrollView>
  );
}
