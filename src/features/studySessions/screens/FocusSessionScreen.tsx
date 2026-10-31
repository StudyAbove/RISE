import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'FocusSession'
>;

// Focus-session layout and navigation.
// Countdown behavior will be added in the focus-timer story.
export function FocusSessionScreen({ route, navigation }: Props) {
  const { assignmentTitle } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Keep the timer area within the screen on smaller phones.
  const ringSize = Math.max(120, Math.min(width - 64, 280));

  // The assignment-details screen remains directly beneath this screen.
  const returnToAssignment = () => {
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to assignment"
          onPress={returnToAssignment}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Path
              d="M19 12H5m7-7-7 7 7 7"
              stroke={colors.deepOlive}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <View style={styles.headingGroup}>
          <Text accessibilityRole="header" style={styles.title}>
            Focus Session
          </Text>

          {/* Keep the selected assignment visible during the session. */}
          <Text style={styles.assignmentTitle}>
            {assignmentTitle}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Reserve the timer area without displaying an invented duration. */}
      <View style={styles.timerContainer}>
        <View
          accessible={false}
          style={[
            styles.timerRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
            },
          ]}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done, return to assignment"
          onPress={returnToAssignment}
          style={({ pressed }) => [
            styles.actionButton,
            styles.doneButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={21}
            height={21}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Circle
              cx={12}
              cy={12}
              r={9}
              stroke={colors.deepOlive}
              strokeWidth={1.5}
            />
            <Path
              d="m7 12 3 3 7-7"
              stroke={colors.deepOlive}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text style={styles.doneText}>Done</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a break"
          onPress={() => navigation.navigate('TakeABreak')}
          style={({ pressed }) => [
            styles.actionButton,
            styles.breakButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={21}
            height={21}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Path
              d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 1 1 0 6h-2M7 3v2m4-2v2"
              stroke={colors.softWhite}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text style={styles.breakText}>Break</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingGroup: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  assignmentTitle: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    marginTop: 3,
  },
  headerSpacer: {
    width: 44,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  timerRing: {
    borderWidth: 22,
    borderColor: colors.eucalyptus,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 28,
    marginTop: 48,
  },
  actionButton: {
    minWidth: 112,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  doneButton: {
    backgroundColor: colors.mistGreen,
    borderWidth: 1,
    borderColor: colors.softSage,
  },
  breakButton: {
    backgroundColor: colors.eucalyptus,
  },
  doneText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  breakText: {
    ...textStyles.link,
    color: colors.softWhite,
  },
  pressed: {
    opacity: 0.7,
  },
});