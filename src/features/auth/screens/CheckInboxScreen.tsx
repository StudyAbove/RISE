import { Alert, Linking, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '../../navigation/types';
import { EmailField } from '../../onboarding/components/EmailField';
import { NextButton } from '../../onboarding/components/NextButton';
import { OnboardingLayout } from '../../onboarding/components/OnboardingLayout';
import { ONBOARDING_STEPS } from '../../onboarding/onboardingSteps';
import { onboardingTextStyles } from '../../onboarding/onboardingTextStyles';
import { styles } from './CheckInboxScreen.styles';

// Opens the Mail app on iOS.
const EMAIL_APP_URL = 'message:';

// Taller than the other onboarding headers so more of the lake shows, per Figma.
const TALL_HEADER_HEIGHT = 245;

/**
 * Shown after sign-up sends the magic link. Opening the link signs the
 * student in, and RootNavigator moves them on to the next onboarding step.
 */
export default function CheckInboxScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CheckInbox'>>();

  async function handleOpenEmailApp() {
    try {
      await Linking.openURL(EMAIL_APP_URL);
    } catch {
      Alert.alert(
        'Open your email',
        'Open your school email app and tap the sign-in link from RISE.',
      );
    }
  }

  return (
    <OnboardingLayout
      step={ONBOARDING_STEPS.checkInbox}
      headerHeight={TALL_HEADER_HEIGHT}
    >
      <Text style={[onboardingTextStyles.title, styles.title]}>
        Check your inbox
      </Text>

      <Text style={[onboardingTextStyles.body, styles.body]}>
        We just sent you a sign-in link to your school email. Open it to
        confirm your account and keep going.
      </Text>

      <EmailField
        value={route.params.email}
        editable={false}
        confirmed
        accessibilityLabel="School email"
        style={styles.emailField}
      />

      <NextButton
        accessibilityLabel="Open email app"
        onPress={handleOpenEmailApp}
        style={styles.openEmailButton}
      />
    </OnboardingLayout>
  );
}
