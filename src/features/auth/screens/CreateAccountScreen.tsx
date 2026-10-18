import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { EmailField } from '../../onboarding/components/EmailField';
import { NextButton } from '../../onboarding/components/NextButton';
import { OnboardingLayout } from '../../onboarding/components/OnboardingLayout';
import { ONBOARDING_STEPS } from '../../onboarding/onboardingSteps';
import { onboardingTextStyles } from '../../onboarding/onboardingTextStyles';
import { createAccountWithSchoolEmail } from '../services/authService';
import { styles } from './CreateAccountScreen.styles';

type CreateAccountScreenProps = {
  authLinkError?: string;
};

function getCreateAccountErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.message === 'EMAIL_ALREADY_REGISTERED') {
    return 'An account with this school email already exists. Please log in instead.';
  }

  if (error.message.toLowerCase().includes('rate limit')) {
    return 'Too many verification emails were requested. Please wait a few minutes and try again.';
  }

  return 'Something went wrong. Please try again.';
}

/** First onboarding step: the student enters their school email to get a sign-in link. */
export default function CreateAccountScreen({
  authLinkError = '',
}: CreateAccountScreenProps) {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLinkError) {
      setError(authLinkError);
    }
  }, [authLinkError]);

  async function handleCreateAccount() {
    Keyboard.dismiss();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Enter your school email.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!trimmedEmail.endsWith('.edu')) {
      setError('A school email ending in .edu is required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await createAccountWithSchoolEmail(trimmedEmail);

      navigation.navigate('CheckInbox', { email: trimmedEmail });
    } catch (err) {
      setError(getCreateAccountErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <OnboardingLayout step={ONBOARDING_STEPS.email}>
      <Text style={[onboardingTextStyles.title, styles.title]}>
        Welcome to RISE
      </Text>

      <Text style={[onboardingTextStyles.body, styles.body]}>
        RISE helps students plan smarter, study with less stress, and make room
        for wellness.
        {'\n\n'}
        Organize your week, get ahead, stay on top of your assignments, and
        build healthier study habits.
      </Text>

      <EmailField
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError('');
        }}
        hasError={Boolean(error)}
        editable={!isSubmitting}
        returnKeyType="done"
        onSubmitEditing={handleCreateAccount}
        accessibilityLabel="School email"
        style={styles.emailField}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <NextButton
        accessibilityLabel="Sign up"
        onPress={handleCreateAccount}
        isLoading={isSubmitting}
        style={styles.signUpButton}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log in"
        hitSlop={8}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate('Login');
        }}
        style={styles.loginPrompt}
      >
        <Text style={styles.loginPromptText}>
          Already have an account?{' '}
          <Text style={styles.loginLink}>Log in</Text>
        </Text>
      </Pressable>
    </OnboardingLayout>
  );
}
