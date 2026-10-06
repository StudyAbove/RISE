import { View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors } from '../../../theme/colors';
import { BottomNavBarItem } from './BottomNavBarItem';
import { styles } from './BottomNavBar.styles';

// Required by `tabBarIcon`, but unused: our icons have fixed sizes from the tab config.
const ICON_SIZE = 35;

// Keeps a small gap under the labels on devices without a home indicator.
const MIN_BOTTOM_PADDING = 8;

/**
 * The app's bottom navigation bar.
 *
 * Passed to the tab navigator through its `tabBar` prop. React Navigation
 * still owns which tab is selected; this component only renders the tabs and
 * reports presses back to the navigator.
 */
export function BottomNavBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      // iOS only announces children as tabs ("Home, tab, 1 of 5") when the
      // parent container has the tabbar role.
      accessibilityRole="tabbar"
      // Keeps the tabs above the iPhone home indicator.
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING) }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isSelected = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

        const handlePress = () => {
          // Emit the event first. Screens listen for it to scroll to the top
          // or pop back to their main page when their tab is tapped again.
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isSelected && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const handleLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <BottomNavBarItem
            key={route.key}
            label={label}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            icon={options.tabBarIcon?.({
              focused: isSelected,
              color: colors.deepOlive,
              size: ICON_SIZE,
            })}
            isSelected={isSelected}
            onPress={handlePress}
            onLongPress={handleLongPress}
            testID={options.tabBarButtonTestID}
          />
        );
      })}
    </View>
  );
}
