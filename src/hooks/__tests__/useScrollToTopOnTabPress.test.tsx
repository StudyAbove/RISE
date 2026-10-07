import { useRef } from 'react';
import { AccessibilityInfo, Button, ScrollView, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { BottomNavBar } from '../../features/navigation/components/BottomNavBar';
import { useScrollToTopOnTabPress } from '../useScrollToTopOnTabPress';

// The real ScrollView is mocked in Jest, so the page uses a stand-in
// whose scrollTo we can inspect.
const mockScrollTo = jest.fn();

function FeedMainScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef({ scrollTo: mockScrollTo });
  const headingRef = useRef<Text>(null);
  const { onScroll } = useScrollToTopOnTabPress({ scrollRef, focusTargetRef: headingRef });

  return (
    <ScrollView testID="feed-scroll" onScroll={onScroll}>
      <Text ref={headingRef}>Feed</Text>
      <Button title="Open details" onPress={() => navigation.navigate('FeedDetail' as never)} />
    </ScrollView>
  );
}

function FeedDetailScreen() {
  return <Text>Feed details</Text>;
}

function OtherScreen() {
  return <View />;
}

// A small app shaped like the real one: a tab navigator using our nav bar,
// where the Feed tab is a stack with a main page and a detail page.
const Tab = createBottomTabNavigator();
const FeedStack = createNativeStackNavigator();

function FeedStackNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen name="FeedMain" component={FeedMainScreen} />
      <FeedStack.Screen name="FeedDetail" component={FeedDetailScreen} />
    </FeedStack.Navigator>
  );
}

async function renderTestApp() {
  await render(
    <NavigationContainer>
      <Tab.Navigator tabBar={(props) => <BottomNavBar {...props} />}>
        <Tab.Screen name="Feed" component={FeedStackNavigator} />
        <Tab.Screen name="Other" component={OtherScreen} />
      </Tab.Navigator>
    </NavigationContainer>,
  );
}

async function scrollFeedTo(offsetY: number) {
  await fireEvent.scroll(screen.getByTestId('feed-scroll'), {
    nativeEvent: { contentOffset: { x: 0, y: offsetY } },
  });
}

async function pressTab(name: string) {
  await fireEvent.press(screen.getByRole('tab', { name }));
  // The hook waits one frame before scrolling.
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

describe('useScrollToTopOnTabPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  });

  it('smoothly scrolls to the top and moves VoiceOver focus when the active tab is tapped', async () => {
    await renderTestApp();
    await scrollFeedTo(600);

    await pressTab('Feed');

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(
      expect.anything(),
      'focus',
    );
  });

  it('does nothing when the page is already at the top', async () => {
    await renderTestApp();

    await pressTab('Feed');

    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
  });

  it('only switches tabs, without scrolling, when a different tab is tapped', async () => {
    await renderTestApp();
    await scrollFeedTo(600);

    await pressTab('Other');

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('returns to the main page first when a detail screen is open, then scrolls on the next tap', async () => {
    await renderTestApp();
    await scrollFeedTo(600);
    await fireEvent.press(screen.getByRole('button', { name: 'Open details' }));
    expect(screen.getByText('Feed details')).toBeOnTheScreen();

    await pressTab('Feed');

    expect(screen.queryByText('Feed details')).not.toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Feed' })).toBeSelected();
    expect(mockScrollTo).not.toHaveBeenCalled();

    await pressTab('Feed');

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('jumps to the top without animation when Reduce Motion is on', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    await renderTestApp();
    await scrollFeedTo(600);

    await pressTab('Feed');

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });
});
