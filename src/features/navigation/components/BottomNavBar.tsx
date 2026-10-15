import { View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors } from '../../../theme/colors';
import { BottomNavBarItem } from './BottomNavBarItem';
import { styles } from './BottomNavBar.styles';

// Required by `tabBarIcon`, but unused: our icons have fixed sizes from the tab config.
const ICON_SIZE = 35;

// Same gap above and below the tab icons, so they sit centered in the bar.
const ICON_GAP = 10;

// The iPhone home indicator line sits this far above the bottom of the
// screen. On those phones the bottom gap is measured to the line instead.
const HOME_INDICATOR_TOP = 13;

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
      // Centers the tabs between the top of the bar and the home indicator.
      style={[
        styles.container,
        {
          paddingTop: ICON_GAP,
          paddingBottom: insets.bottom > 0 ? HOME_INDICATOR_TOP + ICON_GAP : ICON_GAP,
        },
      ]}
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
