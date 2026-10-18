import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { BURST_PIECES } from '../congratulationsBurst';
import { styles } from './CongratulationsBurst.styles';

// Timings from the "Slider Button with Cheer" prototype in Figma: the pieces
// burst out (Thanks → Explode), then fade away (Explode → Reset).
const BURST_DURATION = 500;
const BURST_EASING = Easing.bezier(0.015, 0.005, 0, 1.015);
const HOLD_DURATION = 700;
const FADE_DURATION = 550;

type CongratulationsBurstProps = {
  /** Called once the celebration has finished, or right away with Reduce Motion on. */
  onFinish: () => void;
};

/** "Congratulations!" with stars, hearts and sparks bursting out around it. */
export function CongratulationsBurst({ onFinish }: CongratulationsBurstProps) {
  const isReduceMotionEnabled = useReduceMotion();
  const burstProgress = useRef(new Animated.Value(0)).current;
  const fadeProgress = useRef(new Animated.Value(0)).current;

  // The animation starts once, so read the latest callback from a ref.
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    if (isReduceMotionEnabled) {
      onFinishRef.current();
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(burstProgress, {
        toValue: 1,
        duration: BURST_DURATION,
        easing: BURST_EASING,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_DURATION),
      Animated.timing(fadeProgress, {
        toValue: 1,
        duration: FADE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onFinishRef.current();
      }
    });

    return () => {
      animation.stop();
    };
  }, [isReduceMotionEnabled, burstProgress, fadeProgress]);

  const fadeOut = fadeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.burst}>
        <Animated.Text
          accessibilityRole="header"
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.title, { opacity: fadeOut }]}
        >
          Congratulations!
        </Animated.Text>

        {BURST_PIECES.map(({ Icon, width, height, start, end, fade }, index) => (
          <Animated.View
            key={index}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.piece,
              {
                left: end.x - width / 2,
                top: end.y - height / 2,
                opacity: fadeOut,
                transform: [
                  {
                    translateX: Animated.add(
                      burstProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [start.x - end.x, 0],
                      }),
                      fadeProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, fade.x - end.x],
                      }),
                    ),
                  },
                  {
                    translateY: Animated.add(
                      burstProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [start.y - end.y, 0],
                      }),
                      fadeProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, fade.y - end.y],
                      }),
                    ),
                  },
                  { scale: burstProgress },
                ],
              },
            ]}
          >
            <Icon width={width} height={height} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
