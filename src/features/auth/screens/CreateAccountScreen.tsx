import { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Keyboard,
  KeyboardEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { createAccountWithSchoolEmail } from '../services/authService';

// Normal keyboard-open scroll position.
const INPUT_FOCUS_SCROLL_Y = 180;

// Extra scroll when an error message is visible.
const ERROR_SCROLL_EXTRA = 45;

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const errorRef = useRef('');

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    function handleKeyboardShow(event: KeyboardEvent) {
      setKeyboardHeight(event.endCoordinates.height);

      setTimeout(() => {
        const scrollAmount = errorRef.current
          ? INPUT_FOCUS_SCROLL_Y + ERROR_SCROLL_EXTRA
          : INPUT_FOCUS_SCROLL_Y;

        scrollViewRef.current?.scrollTo({
          y: scrollAmount,
          animated: true,
        });
      }, 100);
    }

    function handleKeyboardHide() {
      setKeyboardHeight(0);

      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }

    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardShow
    );

    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function handleCreateAccount() {
    Keyboard.dismiss();

    const trimmedEmail = email.trim().toLowerCase();

    setSuccessMessage('');

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

      setSuccessMessage(
        'Check your school email for a verification link.'
      );
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'EMAIL_ALREADY_REGISTERED') {
          setError(
            'An account with this school email already exists. Please log in instead.'
          );
          return;
        }

        const message = err.message.toLowerCase();

        if (message.includes('rate limit')) {
          setError(
            'Too many verification emails were requested. Please wait a few minutes and try again.'
          );
          return;
        }

        setError(
          'Something went wrong. Please try again.'
        );
      } else {
        setError(
          'Something went wrong. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDismissKeyboard() {
    Keyboard.dismiss();
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight : 0,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <TouchableWithoutFeedback
        onPress={handleDismissKeyboard}
        accessible={false}
      >
        <View style={styles.screenContent}>
          <ImageBackground
            source={require('../../../../assets/rise-header.png')}
            style={styles.header}
            resizeMode="cover"
          >
            <Text style={styles.logo}>RISE</Text>
          </ImageBackground>

          <View style={styles.content}>
            <Text style={styles.title}>Welcome!</Text>

            <Text style={styles.subtitle}>
              Create your RISE account to start organizing
              your school life.
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.label}>
                Enter your school email below:
              </Text>

              <TextInput
                style={[
                  styles.input,
                  error ? styles.inputError : undefined,
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);

                  if (error) {
                    setError('');
                  }

                  if (successMessage) {
                    setSuccessMessage('');
                  }
                }}
                placeholder="Enter your email ending with .edu"
                placeholderTextColor="#8A918B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isSubmitting}
                onSubmitEditing={handleCreateAccount}
              />

              {error ? (
                <Text style={styles.errorText}>
                  {error}
                </Text>
              ) : null}

              {successMessage ? (
                <Text style={styles.successText}>
                  {successMessage}
                </Text>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.arrowButton,
                  pressed && styles.arrowButtonPressed,
                  isSubmitting &&
                    styles.arrowButtonDisabled,
                ]}
                onPress={handleCreateAccount}
                disabled={isSubmitting}
              >
                <Text style={styles.arrow}>
                  {isSubmitting ? '...' : '→'}
                </Text>
              </Pressable>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                </Text>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();

                    // Login navigation will be added later.
                  }}
                >
                  <Text style={styles.loginLink}>
                    Log in
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF8F1',
  },

  scrollContent: {
    flexGrow: 1,
  },

  screenContent: {
    flexGrow: 1,
    backgroundColor: '#FAF8F1',
  },

  header: {
    height: 235,
    justifyContent: 'flex-start',
    paddingTop: 118,
    paddingHorizontal: 32,
  },

  logo: {
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#35312F',
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 40,
  },

  title: {
    fontSize: 29,
    fontWeight: '700',
    color: '#35433B',
  },

  subtitle: {
    marginTop: 42,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '600',
    color: '#35433B',
    maxWidth: 380,
  },

  formSection: {
    marginTop: 120,
  },

  label: {
    fontSize: 21,
    fontWeight: '600',
    color: '#35433B',
    marginBottom: 20,
  },

  input: {
    height: 74,
    borderWidth: 2,
    borderColor: '#DCE8D7',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#35433B',
  },

  inputError: {
    borderColor: '#C85C54',
  },

  errorText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: '#C85C54',
  },

  successText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: '#5F7D66',
  },

  arrowButton: {
    alignSelf: 'flex-end',
    marginTop: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DFECDC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowButtonPressed: {
    opacity: 0.7,
  },

  arrowButtonDisabled: {
    opacity: 0.5,
  },

  arrow: {
    fontSize: 34,
    lineHeight: 38,
    color: '#35433B',
    fontWeight: '400',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },

  loginText: {
    fontSize: 16,
    color: '#6F7772',
  },

  loginLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#35433B',
  },
});