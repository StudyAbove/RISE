import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { formStyles } from './formStyles';

interface FormFieldProps {
  label: string;
  /** Shown in red under the field, e.g. "Add a title". */
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A labeled form field: the small gray label, the input, and its error message. */
export function FormField({ label, error, children, style }: FormFieldProps) {
  return (
    <View style={[formStyles.field, style]}>
      {/* The input itself carries this label for VoiceOver. */}
      <Text style={formStyles.label} importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      {children}
      {error ? (
        <Text style={formStyles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
