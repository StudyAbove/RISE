import { Pressable, Text, View } from 'react-native';

import ChevronDownIcon from '../../../../assets/icons/calendar/dropdown-chevron-down.svg';
import ChevronUpIcon from '../../../../assets/icons/calendar/dropdown-chevron-up.svg';
import { OptionList, type Option } from '../../calendar/components/addEvent/OptionList';
import { styles } from './SelectField.styles';

type SelectFieldProps<Value extends string> = {
  /** Shown above the box and read by VoiceOver, e.g. "Class". */
  label: string;
  placeholder: string;
  options: Option<Value>[];
  selectedValue: Value | null;
  open: boolean;
  /** The screen decides what's open, so only one list is open at a time. */
  onToggle: () => void;
  onSelect: (value: Value) => void;
  disabled?: boolean;
};

/**
 * A labeled dropdown from the Figma help screens, e.g. "Select a class". Its
 * choices open right under the box, using the calendar's option list.
 */
export function SelectField<Value extends string>({
  label,
  placeholder,
  options,
  selectedValue,
  open,
  onToggle,
  onSelect,
  disabled = false,
}: SelectFieldProps<Value>) {
  const selected = options.find((option) => option.value === selectedValue);
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected?.label ?? placeholder}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={onToggle}
        style={[styles.box, open && styles.boxOpen, disabled && styles.boxDisabled]}
      >
        <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Chevron width={10.6} height={6.1} />
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <OptionList options={options} selectedValue={selectedValue} onSelect={onSelect} />
        </View>
      )}
    </View>
  );
}
