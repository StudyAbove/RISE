import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
} from '../../../theme/colors';

import {
  fonts,
} from '../../../theme/typography';

import {
  BREAK_CONTENT_WIDTH,
} from '../constants';

import type {
  BreakType,
} from '../types';

type BreakTypeSelectorProps = {
  options: BreakType[];
  selectedId: string;
  onSelect: (
    breakType: BreakType,
  ) => void;
};

const SELECTOR_BORDER_WIDTH = 2;
const SELECTOR_HORIZONTAL_PADDING = 3;
const SELECTED_OPTION_WIDTH = 176;

export function BreakTypeSelector({
  options,
  selectedId,
  onSelect,
}: BreakTypeSelectorProps) {
  const innerWidth =
    BREAK_CONTENT_WIDTH -
    SELECTOR_BORDER_WIDTH * 2 -
    SELECTOR_HORIZONTAL_PADDING * 2;

  const unselectedCount =
    Math.max(
      options.length - 1,
      1,
    );

  const unselectedWidth =
    (
      innerWidth -
      SELECTED_OPTION_WIDTH
    ) /
    unselectedCount;

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const isSelected =
          option.id === selectedId;

        const Icon =
          option.icon;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityLabel={
              `${option.label} break`
            }
            accessibilityState={{
              selected: isSelected,
            }}
            onPress={() =>
              onSelect(option)
            }
            style={({ pressed }) => [
              styles.option,
              isSelected
                ? styles.selectedOption
                : {
                    width:
                      unselectedWidth,
                  },
              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.optionContent
              }
            >
              <Icon
                width={
                  option.iconWidth
                }
                height={
                  option.iconHeight
                }
                color={
                  isSelected
                    ? colors.eucalyptus
                    : colors.deepOlive
                }
              />

              {isSelected && (
                <Text
                  style={
                    styles.selectedLabel
                  }
                >
                  {option.label}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      width:
        BREAK_CONTENT_WIDTH,
      height: 39,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        colors.softWhite,
      borderWidth:
        SELECTOR_BORDER_WIDTH,
      borderColor:
        'rgba(120, 146, 123, 0.3)',
      borderRadius: 10,
      paddingHorizontal:
        SELECTOR_HORIZONTAL_PADDING,
      overflow: 'hidden',
    },

    option: {
      height: 32,
      flexShrink: 0,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },

    selectedOption: {
      width:
        SELECTED_OPTION_WIDTH,
      backgroundColor:
        colors.mistGreen,
      borderWidth: 2,
      borderColor:
        'rgba(120, 146, 123, 0.3)',
    },


    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    selectedLabel: {
      fontFamily:
        fonts.body.semiBold,
      fontSize: 13,
      letterSpacing: 0.65,
      color:
        colors.eucalyptus,
    },

    pressed: {
      opacity: 0.7,
    },
  });
