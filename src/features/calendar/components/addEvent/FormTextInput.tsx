import { useState } from 'react';
import { TextInput } from 'react-native';

import { colors } from '../../../../theme/colors';
import { formStyles } from './formStyles';

interface FormTextInputProps {
  /** Read by VoiceOver, e.g. "Title". */
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  hasError?: boolean;
}

/** The Title and Location boxes. The border darkens while typing and turns red on an error. */
export function FormTextInput({ label, placeholder, value, onChangeText, hasError = false }: FormTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedGrayGreen}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      returnKeyType="done"
      style={[
        formStyles.input,
        formStyles.inputText,
        isFocused && formStyles.inputActive,
        hasError && formStyles.inputError,
      ]}
    />
  );
}
