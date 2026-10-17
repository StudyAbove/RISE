import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import EmailConfirmedCheckIcon from '../../../../assets/icons/onboarding/email-confirmed-check.svg';
import MailIcon from '../../../../assets/icons/onboarding/mail.svg';
import { colors } from '../../../theme/colors';
import { styles } from './EmailField.styles';

type EmailFieldProps = Omit<TextInputProps, 'style'> & {
  hasError?: boolean;
  // Shows a green check once the sign-in link was sent to this address.
  confirmed?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** School email input with a mail icon, from the onboarding Figma screens. */
export function EmailField({
  hasError = false,
  confirmed = false,
  style,
  ...inputProps
}: EmailFieldProps) {
  return (
    <View style={[styles.field, hasError && styles.fieldError, style]}>
      <View style={styles.mailIcon}>
        <MailIcon />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter your school email"
        placeholderTextColor={colors.mutedGrayGreen}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />

      {confirmed ? (
        <View style={styles.confirmedCircle}>
          <EmailConfirmedCheckIcon />
        </View>
      ) : null}
    </View>
  );
}
