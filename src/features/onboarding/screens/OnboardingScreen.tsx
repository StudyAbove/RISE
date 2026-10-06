import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../../../lib/supabase';

type OnboardingScreenProps = {
  onComplete: () => void;
};

export default function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCompleteOnboarding() {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Unable to continue',
          'We could not find your signed-in account.'
        );
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert(
          'Unable to continue',
          error.message
        );
        return;
      }

      onComplete();
    } catch {
      Alert.alert(
        'Unable to continue',
        'Something went wrong while finishing onboarding.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding</Text>

      <Text style={styles.subtitle}>
        Your account is verified. This is a temporary onboarding screen.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isSubmitting && styles.buttonDisabled,
        ]}
        onPress={handleCompleteOnboarding}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>
            Complete onboarding
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FAF8F1',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#35433B',
  },

  subtitle: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: '#6F7772',
  },

  button: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DFECDC',
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#35433B',
  },
});