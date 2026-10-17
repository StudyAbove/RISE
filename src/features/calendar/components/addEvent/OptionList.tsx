import { Pressable, ScrollView, Text } from 'react-native';

import { OPTION_ROW_HEIGHT, styles } from './OptionList.styles';

export interface Option<Value> {
  value: Value;
  label: string;
}

interface OptionListProps<Value> {
  options: Option<Value>[];
  selectedValue: Value | null;
  onSelect: (value: Value) => void;
  /** The option to scroll to when the list opens if nothing is chosen yet, e.g. the current hour. */
  initialValue?: Value;
  /** The "Selected" tag; narrow lists (Start / End) hide it and rely on the highlight. */
  showSelectedTag?: boolean;
}

/**
 * The scrollable list inside the Time and Reminder dropdowns (Figma "Time
 * Picker", open state). The chosen option uses the selected "Time Slot" look.
 */
export function OptionList<Value extends string | number>({
  options,
  selectedValue,
  onSelect,
  initialValue,
  showSelectedTag = true,
}: OptionListProps<Value>) {
  // Opens scrolled so the chosen option, or the starting suggestion, is at the top.
  const scrollTarget = selectedValue ?? initialValue;
  const scrollIndex = Math.max(0, options.findIndex((option) => option.value === scrollTarget));

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      contentOffset={{ x: 0, y: scrollIndex * OPTION_ROW_HEIGHT }}
      nestedScrollEnabled
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            style={[styles.option, isSelected && styles.selectedOption]}
          >
            <Text style={[styles.optionText, isSelected && styles.selectedText]}>{option.label}</Text>
            {isSelected && showSelectedTag && <Text style={styles.selectedTag}>Selected</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
