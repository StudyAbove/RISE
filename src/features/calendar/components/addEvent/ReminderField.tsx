import type { RefObject } from 'react';
import { Text, type View } from 'react-native';

import { REMINDER_OPTIONS } from '../../utils/addEventForm';
import { DropdownField } from './DropdownField';
import { FormField } from './FormField';
import { formStyles } from './formStyles';

/** The reminder choices as list options, for the Reminder dropdown. */
export const REMINDER_CHOICES = REMINDER_OPTIONS.map(({ label, minutes }) => ({ value: minutes, label }));

interface ReminderFieldProps {
  reminderMinutes: number | null;
  /** Whether its choices are showing. */
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  triggerRef?: RefObject<View | null>;
}

/**
 * The Reminder dropdown button; its choices float below or above it. The choice is
 * saved with the event so notifications (#27) can use it once they're built;
 * until then nothing is sent, and the note under the field says so.
 */
export function ReminderField({
  reminderMinutes,
  open,
  onToggle,
  disabled = false,
  triggerRef,
}: ReminderFieldProps) {
  const chosen = REMINDER_CHOICES.find((option) => option.value === reminderMinutes);

  return (
    <FormField label="Reminder">
      <DropdownField
        label="Reminder"
        placeholder="Select a reminder"
        valueText={chosen?.label}
        open={open}
        onToggle={onToggle}
        disabled={disabled}
        triggerRef={triggerRef}
      />
      <Text style={formStyles.noteText}>Reminders will be sent once notifications are available.</Text>
    </FormField>
  );
}
