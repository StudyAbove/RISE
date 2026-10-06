import { useCallback, useEffect, useRef, type RefObject } from 'react';
import {
  AccessibilityInfo,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type Text,
  type View,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import { useReduceMotion } from './useReduceMotion';

type ScrollableRef =
  | Pick<ScrollView, 'scrollTo'>
  | Pick<FlatList<unknown>, 'scrollToOffset'>;

interface UseScrollToTopOnTabPressOptions {
  /** Ref to the page's ScrollView or FlatList. */
  scrollRef: RefObject<ScrollableRef | null>;
  /** Element VoiceOver should move to after scrolling, usually the page heading. */
  focusTargetRef?: RefObject<View | Text | null>;
}

/**
 * Scrolls a tab's main page back to the top when the user taps the tab they
 * are already on.
 *
 * Based on React Navigation's `useScrollToTop`, with two additions it does
 * not support: jumping without animation when Reduce Motion is on, and moving
 * VoiceOver focus to the top of the page.
 *
 * Returns an `onScroll` handler that must be passed to the scroll view so the
 * hook can tell whether the page is already at the top.
 */
export function useScrollToTopOnTabPress({
  scrollRef,
  focusTargetRef,
}: UseScrollToTopOnTabPressOptions) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  const isReduceMotionEnabled = useReduceMotion();
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    const tabNavigation = findParentTabNavigation(navigation);
    if (!tabNavigation) {
      return undefined;
    }

    // This listener only receives presses on the tab that contains this
    // screen, so tapping a different tab never scrolls this page.
    return tabNavigation.addListener('tabPress', (event) => {
      // If a detail screen is open, the stack navigator handles the first tap
      // by popping back to the tab's main page. We only scroll once we're there.
      const isTabMainPage =
        navigation === tabNavigation ||
        navigation.getState().routes[0]?.key === route.key;

      if (!navigation.isFocused() || !isTabMainPage) {
        return;
      }

      // Wait one frame so every tabPress listener has run and we can tell
      // whether any of them called preventDefault().
      requestAnimationFrame(() => {
        const scrollable = scrollRef.current;
        const isAlreadyAtTop = scrollOffsetRef.current <= 0;

        if (event.defaultPrevented || !scrollable || isAlreadyAtTop) {
          return;
        }

        const animated = !isReduceMotionEnabled;
        if ('scrollToOffset' in scrollable) {
          scrollable.scrollToOffset({ offset: 0, animated });
        } else {
          scrollable.scrollTo({ y: 0, animated });
        }
        scrollOffsetRef.current = 0;

        if (focusTargetRef?.current) {
          AccessibilityInfo.sendAccessibilityEvent(focusTargetRef.current, 'focus');
        }
      });
    });
  }, [navigation, route.key, scrollRef, focusTargetRef, isReduceMotionEnabled]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  return { onScroll };
}

/** Walks up the navigator tree to find the tab navigator this screen belongs to. */
function findParentTabNavigation(
  navigation: NavigationProp<ParamListBase>,
): BottomTabNavigationProp<ParamListBase> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;

  while (current) {
    if (current.getState()?.type === 'tab') {
      return current as unknown as BottomTabNavigationProp<ParamListBase>;
    }
    current = current.getParent();
  }

  return undefined;
}
