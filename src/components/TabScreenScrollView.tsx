import { useRef, type ReactNode, type RefObject } from 'react';
import {
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type Text,
  type View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { styles } from './TabScreenScrollView.styles';

interface TabScreenScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  /** Element VoiceOver focuses after scroll-to-top, usually the page heading. */
  focusTargetRef?: RefObject<View | Text | null>;
}

/**
 * Scroll container for the main page of each bottom tab.
 *
 * Use this as the root of a tab's main screen to get the standard behavior:
 * top safe-area padding, and scroll-to-top when the user re-taps the tab.
 * Pages built on a FlatList can call `useScrollToTopOnTabPress` directly.
 */
export function TabScreenScrollView({
  children,
  focusTargetRef,
  onScroll,
  style,
  contentContainerStyle,
  ...scrollViewProps
}: TabScreenScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { onScroll: trackScrollOffset } = useScrollToTopOnTabPress({
    scrollRef,
    focusTargetRef,
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    trackScrollOffset(event);
    onScroll?.(event);
  };

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={[styles.scrollView, style]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top },
        contentContainerStyle,
      ]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}
