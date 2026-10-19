import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import type { MainTabParamList } from '../../navigation/types';
import { SettingsButton } from '../../settings/components/SettingsButton';

// Let the hills extend slightly below the title.
const SKY_OVERLAP_BELOW_HEADER = 8;

export function StudyScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  // Measure the header so the sky lines up with the title.
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
    >
      {/* Draw the shared sky artwork behind the header. */}
      {headerBottom !== null && (
        <HomeSkyBackdrop
          timeOfDay={getTimeOfDay(date)}
          bottom={headerBottom + SKY_OVERLAP_BELOW_HEADER}
        />
      )}

      <View onLayout={handleHeaderLayout}>
        <View style={styles.headerRow}>
          <SettingsButton />
        </View>

        <Text
          ref={titleRef}
          accessibilityRole="header"
          style={styles.title}
        >
          Study Plan
        </Text>
      </View>

      {/* Open the full assignment list in its existing tab. */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all assignments"
          accessibilityHint="Opens the assignment list"
          onPress={() => navigation.navigate('List')}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    paddingBottom: 8,
  },
  actionsRow: {
    alignItems: 'flex-end',
    marginTop: 16,
  },
  viewAllButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  viewAllText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});