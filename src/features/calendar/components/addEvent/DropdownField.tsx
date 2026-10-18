import type { RefObject } from 'react';
import { Pressable, Text, type View } from 'react-native';

import ChevronDownIcon from '../../../../../assets/icons/calendar/dropdown-chevron-down.svg';
import ChevronUpIcon from '../../../../../assets/icons/calendar/dropdown-chevron-up.svg';
import { formStyles } from './formStyles';

interface DropdownFieldProps {
  /** Read by VoiceOver, e.g. "Date". */
  label: string;
  placeholder: string;
  /** The chosen value as text; the placeholder shows until there is one. */
  valueText?: string;
  open: boolean;
  /** The form decides what opens, so only one dropdown is open at a time. */
  onToggle: () => void;
  hasError?: boolean;
  disabled?: boolean;
  /** Lets the form find the button on screen, to float the choices right under it. */
  triggerRef?: RefObject<View | null>;
}

/**
 * A Figma dropdown button (Date, Time, and Reminder Picker) with a chevron.
 * Its choices open in a FloatingDropdown over the form, so opening one doesn't
 * push the rest of the form down.
 */
export function DropdownField({
  label,
  placeholder,
  valueText,
  open,
  onToggle,
  hasError = false,
  disabled = false,
  triggerRef,
}: DropdownFieldProps) {
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <Pressable
      ref={triggerRef}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${valueText ?? placeholder}`}
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[
        formStyles.input,
        formStyles.dropdownButton,
        open && formStyles.inputActive,
        hasError && formStyles.inputError,
      ]}
    >
      <Text numberOfLines={1} style={[formStyles.inputText, formStyles.dropdownValue, !valueText && formStyles.placeholderText]}>
        {valueText ?? placeholder}
      </Text>
      <Chevron width={10.6} height={6.1} />
    </Pressable>
  );
}
