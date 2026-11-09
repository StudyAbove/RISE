import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import DoneIcon from '../../../../assets/icons/focus-session-done.svg';
import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';
import type { RootStackParamList } from '../../navigation/types';
import { useFocusCountdown } from '../../studySessions/hooks/useFocusCountdown';
import { BREAK_CATALOG } from '../data/breakTypes';
import { useEffect, useRef } from 'react';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BreakSession'
>;

export function BreakSessionScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  // Read the selected break's actual saved duration.
  const selectedBreak = BREAK_CATALOG.find(
    (option) => option.id === route.params.breakId,
  );

  const validBreak =
    selectedBreak !== undefined &&
    Number.isInteger(selectedBreak.durationMinutes) &&
    selectedBreak.durationMinutes > 0 &&
    selectedBreak.durationMinutes <= 6000;

  const durationSeconds = validBreak
    ? selectedBreak.durationMinutes * 60
    : 0;

  // Reuse the focus timer's elapsed-clock countdown behavior.
  const { remainingSeconds, hasEnded } = useFocusCountdown({
    taskId: `break:${route.key}`,
    durationSeconds,
    running: isFocused && validBreak,
  });

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const timerLabel =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Match the focus timer's size, colors, and elapsed progress ring.
  const ringSize = Math.max(120, Math.min(width - 64, 280));
  const strokeWidth = 22;
  const center = ringSize / 2;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const elapsedProgress =
    durationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (durationSeconds - remainingSeconds) / durationSeconds,
          ),
        )
      : 0;

  const returningRef = useRef(false);

  useEffect(() => {
    if (!isFocused || !validBreak || !hasEnded || returningRef.current) {
      return;
    }

    returningRef.current = true;
    navigation.goBack();
  }, [isFocused, validBreak, hasEnded, navigation]);

  function returnFromBreak() {
    if (returningRef.current) return;

    returningRef.current = true;
    navigation.goBack();
  }

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

        <View style={styles.headingGroup}>
          <Text accessibilityRole="header" style={styles.title}>
            Break Session
          </Text>

          <Text style={styles.subtitle}>
            {validBreak ? selectedBreak.label : 'Break unavailable'}
          </Text>
        </View>

      </View>

      {validBreak ? (
        <>
          <View style={styles.timerContainer}>


            <View
              style={[
                styles.timerRing,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                },
              ]}
            >
              <Svg
                width={ringSize}
                height={ringSize}
                style={styles.timerProgressSvg}
                accessible={false}
              >
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors.mistGreen}
                  strokeWidth={strokeWidth}
                />

                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors.eucalyptus}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={
                    circumference * (1 - elapsedProgress)
                  }
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>

              <Text
                accessibilityLabel={
                  `Break time remaining: ${hours} hours, ` +
                  `${minutes} minutes, ${seconds} seconds`
                }
                style={[
                  styles.timerText,
                  { fontSize: Math.min(50, (ringSize - 44) / 6) },
                ]}
              >
                {timerLabel}
              </Text>
            </View>

            <Text style={styles.durationText}>
              Suggested time: {selectedBreak.durationMinutes} min
            </Text>

            <Text style={styles.timerNote}>
              {"Feel free to end early whenever you're ready"}
            </Text>
          </View>
        </>
      ) : (
        <Text accessibilityRole="alert" style={styles.errorText}>
          This break is unavailable. Return and choose another break.
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return from break"
          onPress={returnFromBreak}
          style={({ pressed }) => [
            styles.returnButton,
            pressed && styles.pressed,
          ]}
        >
          <DoneIcon accessible={false} />

          <Text style={styles.returnText}>
            {validBreak ? 'Return to studying' : 'Go back'}
          </Text>
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
  headingGroup: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    ...textStyles.screenHeading,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.1,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.caption,
    fontSize: 13,
    lineHeight: 17,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    marginTop: 3,
  },

  timerContainer: {
    alignItems: 'center',
    marginTop: 30,
    gap: 12,
  },

  durationText: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
  },
  timerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
  },
  timerProgressSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timerText: {
    ...textStyles.timer,
    color: colors.eucalyptus,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  timerNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    marginTop: 48,
  },
  returnButton: {
    minHeight: 54,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.mutedGrayGreen,
    backgroundColor: colors.mistGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  returnText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.75,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  errorText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
    marginTop: 30,
  },
  pressed: {
    opacity: 0.7,
  },
});