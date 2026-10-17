import { useEffect, useRef, type ReactNode } from 'react';
import {
  Image,
  Keyboard,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageIndicator } from './PageIndicator';
import { styles } from './OnboardingLayout.styles';

const backgroundImage = require('../../../../assets/images/onboarding/onboarding-background.png');

// The background art is 852 × 1847. Figma shifts it up by about a quarter of
// its height so the sun sits just above the card.
const BACKGROUND_ASPECT_RATIO = 1847 / 852;
const BACKGROUND_SHIFT_UP = 0.2518;

// Space between the status bar and the top of the card on most screens.
const DEFAULT_HEADER_HEIGHT = 155;

// Space between the page indicator and the home indicator.
const INDICATOR_BOTTOM_SPACING = 41;

type OnboardingLayoutProps = {
  step: number;
  headerHeight?: number;
  headerAction?: ReactNode;
  children: ReactNode;
};

/**
 * Shared frame for the onboarding screens: sunrise background, "RISE"
 * wordmark, a rounded content card, and the page indicator at the bottom.
 */
export function OnboardingLayout({
  step,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  headerAction,
  children,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const backgroundHeight = width * BACKGROUND_ASPECT_RATIO;

  // Keep the email field and its button visible above the keyboard.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Image
        source={backgroundImage}
        style={[
          styles.background,
          {
            width,
            height: backgroundHeight,
            top: -backgroundHeight * BACKGROUND_SHIFT_UP,
          },
        ]}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[
            styles.header,
            {
              height: insets.top + headerHeight,
              paddingTop: insets.top,
            },
          ]}
        >
          <Text style={styles.wordmark} accessibilityRole="header">
            RISE
          </Text>

          {headerAction}
        </View>

        <View
          style={[
            styles.card,
            { paddingBottom: insets.bottom + INDICATOR_BOTTOM_SPACING },
          ]}
        >
          <View style={styles.content}>{children}</View>

          <PageIndicator step={step} />
        </View>
      </ScrollView>
    </View>
  );
}
