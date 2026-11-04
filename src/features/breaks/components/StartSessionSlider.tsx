import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import Heart1Icon from '../../../../assets/images/onboarding/congratulations/heart-1.svg';
import Heart2Icon from '../../../../assets/images/onboarding/congratulations/heart-2.svg';
import OrangeStar1Icon from '../../../../assets/images/onboarding/congratulations/orange-star-1.svg';
import OrangeStar2Icon from '../../../../assets/images/onboarding/congratulations/orange-star-2.svg';
import Spark1Icon from '../../../../assets/images/onboarding/congratulations/spark-1.svg';
import Spark2Icon from '../../../../assets/images/onboarding/congratulations/spark-2.svg';
import YellowStar1Icon from '../../../../assets/images/onboarding/congratulations/yellow-star-1.svg';
import YellowStar2Icon from '../../../../assets/images/onboarding/congratulations/yellow-star-2.svg';

import {
  colors,
} from '../../../theme/colors';

import {
  fonts,
} from '../../../theme/typography';

import {
  BREAK_CONTENT_WIDTH,
} from '../constants';

const SLIDER_WIDTH =
  BREAK_CONTENT_WIDTH;

const SLIDER_HEIGHT = 54;

const KNOB_SIZE = 40;
const KNOB_X_INSET = 8;
const KNOB_Y_INSET = 7;

const MAX_DRAG =
  SLIDER_WIDTH -
  KNOB_SIZE -
  KNOB_X_INSET * 2;

/*
 * The user cannot manually drag the knob all the way
 * into its completed position.
 *
 * Figma stops the manual drag slightly before the
 * far-right edge in the final "Alrighty" state.
 * Releasing from there lets the knob automatically
 * finish the remaining distance into "Woo!".
 */
const RELEASE_STOP =
  MAX_DRAG - 24;

const COMPLETE_THRESHOLD =
  RELEASE_STOP - 8;

type StartSessionSliderProps = {
  onComplete?: () => void;
};

type CelebrationParticleProps = {
  progress: Animated.Value;
  dx: number;
  dy: number;
  children: ReactNode;
};

function CelebrationParticle({
  progress,
  dx,
  dy,
  children,
}: CelebrationParticleProps) {
  const translateX =
    progress.interpolate({
      inputRange: [
        0,
        0.2,
        1,
      ],
      outputRange: [
        0,
        dx * 0.3,
        dx,
      ],
    });

  const translateY =
    progress.interpolate({
      inputRange: [
        0,
        0.2,
        1,
      ],
      outputRange: [
        0,
        dy * 0.3,
        dy,
      ],
    });

  const opacity =
    progress.interpolate({
      inputRange: [
        0,
        0.12,
        0.7,
        1,
      ],
      outputRange: [
        0,
        1,
        1,
        0,
      ],
    });

  const scale =
    progress.interpolate({
      inputRange: [
        0,
        0.35,
        1,
      ],
      outputRange: [
        0.25,
        1.15,
        0.8,
      ],
    });

  const rotate =
    progress.interpolate({
      inputRange: [
        0,
        1,
      ],
      outputRange: [
        '0deg',
        dx > 0
          ? '35deg'
          : '-35deg',
      ],
    });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particleOrigin,
        {
          opacity,
          transform: [
            {
              translateX,
            },
            {
              translateY,
            },
            {
              scale,
            },
            {
              rotate,
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function StartSessionSlider({
  onComplete,
}: StartSessionSliderProps) {
  const translateX =
    useRef(
      new Animated.Value(0),
    ).current;

  const completedOpacity =
    useRef(
      new Animated.Value(0),
    ).current;

  const celebration =
    useRef(
      new Animated.Value(0),
    ).current;

  const currentX =
    useRef(0);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  /*
   * Figma's Release variant appears while the student
   * is nearing the end of the drag:
   *
   * yellow / Start Session
   *        ↓
   * pale blue / Alrighty
   *        ↓
   * green / Woo!
   */
  const dragProgress =
    Animated.divide(
      translateX,
      RELEASE_STOP,
    );

  const releaseOpacity =
    dragProgress.interpolate({
      inputRange: [
        0,
        0.35,
        0.82,
        1,
      ],
      outputRange: [
        0,
        0,
        1,
        1,
      ],
      extrapolate:
        'clamp',
    });

  const startLabelOpacity =
    dragProgress.interpolate({
      inputRange: [
        0,
        0.28,
        0.68,
      ],
      outputRange: [
        1,
        1,
        0,
      ],
      extrapolate:
        'clamp',
    });

  const releaseLabelOpacity =
    dragProgress.interpolate({
      inputRange: [
        0,
        0.34,
        0.72,
      ],
      outputRange: [
        0,
        0,
        1,
      ],
      extrapolate:
        'clamp',
    });

  const finishSlider =
    useCallback(() => {
      if (completed) {
        return;
      }

      setCompleted(true);

      celebration.setValue(0);

      Animated.parallel([
        Animated.spring(
          translateX,
          {
            toValue:
              MAX_DRAG,
            useNativeDriver:
              true,
            damping: 18,
            stiffness: 170,
            mass: 0.7,
          },
        ),

        Animated.timing(
          completedOpacity,
          {
            toValue: 1,
            duration: 160,
            useNativeDriver:
              true,
          },
        ),

        Animated.sequence([
          Animated.delay(40),

          Animated.timing(
            celebration,
            {
              toValue: 1,
              duration: 620,
              useNativeDriver:
                true,
            },
          ),
        ]),
      ]).start(() => {
        onComplete?.();
      });
    }, [
      celebration,
      completed,
      completedOpacity,
      onComplete,
      translateX,
    ]);

  const resetSlider =
    useCallback(() => {
      currentX.current = 0;

      Animated.spring(
        translateX,
        {
          toValue: 0,
          useNativeDriver:
            true,
          damping: 16,
          stiffness: 190,
          mass: 0.7,
        },
      ).start();
    }, [
      translateX,
    ]);

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () =>
              !completed,

          onMoveShouldSetPanResponder:
            (
              _,
              gestureState,
            ) =>
              !completed &&
              Math.abs(
                gestureState.dx,
              ) > 2,

          onPanResponderGrant:
            () => {
              translateX.stopAnimation(
                (value) => {
                  currentX.current =
                    value;
                },
              );
            },

          onPanResponderMove:
            (
              _,
              gestureState,
            ) => {
              if (completed) {
                return;
              }

              const nextX =
                Math.max(
                  0,
                  Math.min(
                    RELEASE_STOP,
                    currentX.current +
                      gestureState.dx,
                  ),
                );

              translateX.setValue(
                nextX,
              );
            },

          onPanResponderRelease:
            (
              _,
              gestureState,
            ) => {
              const releaseX =
                Math.max(
                  0,
                  Math.min(
                    RELEASE_STOP,
                    currentX.current +
                      gestureState.dx,
                  ),
                );

              if (
                releaseX >=
                COMPLETE_THRESHOLD
              ) {
                finishSlider();
                return;
              }

              resetSlider();
            },

          onPanResponderTerminate:
            () => {
              if (!completed) {
                resetSlider();
              }
            },
        }),
      [
        completed,
        finishSlider,
        resetSlider,
        translateX,
      ],
    );

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Start break session"
        accessibilityHint="Slide the control to the right to start the break"
        style={styles.slider}
      >
        <Svg
          width={
            SLIDER_WIDTH
          }
          height={
            SLIDER_HEIGHT
          }
          style={
            StyleSheet.absoluteFill
          }
        >
          <Defs>
            <RadialGradient
              id="startShade"
              cx="10%"
              cy="62%"
              rx="54%"
              ry="120%"
            >
              <Stop
                offset="0"
                stopColor="#000000"
                stopOpacity={0.20}
              />

              <Stop
                offset="0.52"
                stopColor="#000000"
                stopOpacity={0.08}
              />

              <Stop
                offset="1"
                stopColor="#000000"
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>

          <Rect
            width={
              SLIDER_WIDTH
            }
            height={
              SLIDER_HEIGHT
            }
            rx={
              SLIDER_HEIGHT / 2
            }
            fill={
              colors.butterYellow
            }
          />

          <Rect
            width={
              SLIDER_WIDTH
            }
            height={
              SLIDER_HEIGHT
            }
            rx={
              SLIDER_HEIGHT / 2
            }
            fill="url(#startShade)"
          />
        </Svg>

        <View
          pointerEvents="none"
          style={
            styles.trackInset
          }
        >
          <Svg
            width={
              SLIDER_WIDTH
            }
            height={
              SLIDER_HEIGHT
            }
          >
            <Defs>
              <RadialGradient
                id="innerShadowLeft"
                cx="7%"
                cy="82%"
                rx="48%"
                ry="100%"
              >
                <Stop
                  offset="0"
                  stopColor="#010114"
                  stopOpacity={0.15}
                />

                <Stop
                  offset="0.45"
                  stopColor="#010114"
                  stopOpacity={0.07}
                />

                <Stop
                  offset="1"
                  stopColor="#010114"
                  stopOpacity={0}
                />
              </RadialGradient>

              <RadialGradient
                id="rightInsetShadow"
                cx="100%"
                cy="50%"
                rx="100%"
                ry="75%"
              >
                <Stop
                  offset="0"
                  stopColor="#010114"
                  stopOpacity={0.10}
                />

                <Stop
                  offset="0.45"
                  stopColor="#010114"
                  stopOpacity={0.05}
                />

                <Stop
                  offset="1"
                  stopColor="#010114"
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>

            <Rect
              x={2}
              y={2}
              width={
                SLIDER_WIDTH - 4
              }
              height={
                SLIDER_HEIGHT - 4
              }
              rx={
                (SLIDER_HEIGHT - 4) /
                2
              }
              fill="url(#innerShadowLeft)"
            />

            {/*
             * Very subtle shadow confined to the inside
             * of the right rounded edge.
             */}
            <Rect
              x={
                SLIDER_WIDTH - 24
              }
              y={3}
              width={21}
              height={
                SLIDER_HEIGHT - 6
              }
              rx={
                (SLIDER_HEIGHT - 6) /
                2
              }
              fill="url(#rightInsetShadow)"
            />
          </Svg>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.releaseTrack,
            {
              opacity:
                releaseOpacity,
            },
          ]}
        >
          <Svg
            width={
              SLIDER_WIDTH
            }
            height={
              SLIDER_HEIGHT
            }
          >
            <Defs>
              <LinearGradient
                id="releaseGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <Stop
                  offset="0"
                  stopColor="#E3EAF9"
                />

                <Stop
                  offset="0.65"
                  stopColor="#E3EAF9"
                />

                <Stop
                  offset="1"
                  stopColor="#87B7FF"
                />
              </LinearGradient>
            </Defs>

            <Rect
              width={
                SLIDER_WIDTH
              }
              height={
                SLIDER_HEIGHT
              }
              rx={
                SLIDER_HEIGHT /
                2
              }
              fill="url(#releaseGradient)"
            />
          </Svg>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.completedTrack,
            {
              opacity:
                completedOpacity,
            },
          ]}
        >
          <Svg
            width={
              SLIDER_WIDTH
            }
            height={
              SLIDER_HEIGHT
            }
          >
            <Defs>
              <LinearGradient
                id="completeGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <Stop
                  offset="0"
                  stopColor={
                    colors.eucalyptus
                  }
                />

                <Stop
                  offset="0.55"
                  stopColor={
                    colors.softSage
                  }
                />

                <Stop
                  offset="1"
                  stopColor="#E5D483"
                />
              </LinearGradient>
            </Defs>

            <Rect
              width={
                SLIDER_WIDTH
              }
              height={
                SLIDER_HEIGHT
              }
              rx={
                SLIDER_HEIGHT /
                2
              }
              fill="url(#completeGradient)"
            />
          </Svg>
        </Animated.View>

        {!completed && (
          <View
            pointerEvents="none"
            style={
              styles.labelViewport
            }
          >
            {/*
             * Figma lays these out as:
             *
             * [ Alrighty ][ knob ][ Start Session ]
             *
             * The whole text rail follows the knob.
             * This naturally pulls Start Session out
             * through the right edge while Alrighty
             * enters through the left edge.
             */}
            <Animated.Text
              style={[
                styles.railLabel,
                styles.alrightyRailLabel,
                {
                  opacity:
                    releaseLabelOpacity,
                  transform: [
                    {
                      translateX,
                    },
                  ],
                },
              ]}
            >
              Alrighty
            </Animated.Text>

            <Animated.Text
              style={[
                styles.railLabel,
                styles.startRailLabel,
                {
                  opacity:
                    startLabelOpacity,
                  transform: [
                    {
                      translateX,
                    },
                  ],
                },
              ]}
            >
              Start Session
            </Animated.Text>
          </View>
        )}

        {completed && (
          <Text
            pointerEvents="none"
            style={[
              styles.label,
              styles.completedLabel,
            ]}
          >
            Woo!
          </Text>
        )}

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.knob,
            {
              transform: [
                {
                  translateX,
                },
              ],
            },
          ]}
        >

          {completed ? (
            <Svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              pointerEvents="none"
            >
              <Path
                d="M4 10.5 L8.2 14.5 L16 6.5"
                fill="none"
                stroke={
                  colors.eucalyptus
                }
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <Svg
              width={16}
              height={24}
              viewBox="0 0 16 24"
              pointerEvents="none"
            >
              <Path
                d="M4.15 4.3 L11.85 12 L4.15 19.7"
                fill="none"
                stroke={
                  colors.deepOlive
                }
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </Animated.View>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={-135}
          dy={-62}
        >
          <YellowStar1Icon
            width={20}
            height={22}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={-92}
          dy={-38}
        >
          <OrangeStar1Icon
            width={13}
            height={13}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={-45}
          dy={55}
        >
          <Spark1Icon
            width={7}
            height={18}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={-118}
          dy={48}
        >
          <YellowStar2Icon
            width={14}
            height={16}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={58}
          dy={-52}
        >
          <Spark2Icon
            width={8}
            height={20}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={108}
          dy={-35}
        >
          <Heart1Icon
            width={24}
            height={25}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={136}
          dy={38}
        >
          <Heart2Icon
            width={18}
            height={20}
          />
        </CelebrationParticle>

        <CelebrationParticle
          progress={
            celebration
          }
          dx={72}
          dy={58}
        >
          <OrangeStar2Icon
            width={16}
            height={16}
          />
        </CelebrationParticle>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      width:
        SLIDER_WIDTH,
      height: 104,
      alignItems: 'center',
      justifyContent:
        'flex-start',
      overflow: 'visible',
    },

    slider: {
      width:
        SLIDER_WIDTH,
      height:
        SLIDER_HEIGHT,
      borderRadius:
        SLIDER_HEIGHT / 2,
      justifyContent:
        'center',
      overflow: 'visible',
    },

    trackInset: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
    },

    releaseTrack: {
      ...StyleSheet.absoluteFill,
    },

    completedTrack: {
      ...StyleSheet.absoluteFill,
    },

    label: {
      position: 'absolute',
      left: 44,
      right: 8,
      textAlign: 'center',
      fontFamily:
        fonts.heading.bold,
      fontSize: 18,
      lineHeight: 24,
      color:
        colors.deepOlive,
    },

    labelViewport: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
      borderRadius:
        SLIDER_HEIGHT / 2,
    },

    railLabel: {
      position: 'absolute',
      top:
        (SLIDER_HEIGHT - 24) /
        2,
      width: 240,
      textAlign: 'center',
      fontFamily:
        fonts.heading.bold,
      fontSize: 18,
      lineHeight: 24,
    },

    /*
     * The right edge of Alrighty's 240px region
     * begins immediately before the knob.
     */
    alrightyRailLabel: {
      left:
        KNOB_X_INSET - 240,
      color: '#1162B1',
    },

    /*
     * Start Session begins immediately after
     * the knob's right edge.
     */
    startRailLabel: {
      left:
        KNOB_X_INSET +
        KNOB_SIZE,
      color:
        colors.deepOlive,
    },

    completedLabel: {
      left: 8,
      right: 46,
      color:
        colors.softWhite,
    },

    knob: {
      position: 'absolute',
      left:
        KNOB_X_INSET,
      top:
        KNOB_Y_INSET,
      width:
        KNOB_SIZE,
      height:
        KNOB_SIZE,
      borderRadius:
        KNOB_SIZE / 2,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.softWhite,

      shadowColor:
        '#010114',
      shadowOpacity: 0.22,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },

      zIndex: 10,
    },

    knobIcon: {
      width: 18,
      height: 18,
      zIndex: 2,
    },

    particleOrigin: {
      position: 'absolute',
      left:
        SLIDER_WIDTH / 2 -
        10,
      top:
        SLIDER_HEIGHT / 2 -
        10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent:
        'center',
      zIndex: 20,
    },
  });
