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

import { colors, statusColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { createAccountWithSchoolEmail } from '../services/authService';

const INPUT_FOCUS_SCROLL_Y = 140;
const ERROR_SCROLL_EXTRA = 40;

type CreateAccountScreenProps = {
  authLinkError?: string;
};

export default function CreateAccountScreen({
  authLinkError = '',
}: CreateAccountScreenProps) {
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
    if (authLinkError) {
      setSuccessMessage('');
      setError(authLinkError);
    }
  }, [authLinkError]);

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
      handleKeyboardShow,
    );

    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      handleKeyboardHide,
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
        'Check your school email for a verification link.',
      );
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'EMAIL_ALREADY_REGISTERED') {
          setError(
            'An account with this school email already exists. Please log in instead.',
          );
          return;
        }

        const message = err.message.toLowerCase();

        if (message.includes('rate limit')) {
          setError(
            'Too many verification emails were requested. Please wait a few minutes and try again.',
          );
          return;
        }

        setError('Something went wrong. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
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
            source={require('../../../../assets/images/auth/rise-auth-header.png')}
            style={styles.header}
            imageStyle={styles.headerImage}
            resizeMode="cover"
          />

          <View style={styles.contentCard}>
            <View>
              <Text style={styles.title}>Welcome!</Text>

              <Text style={styles.subtitle}>
                Create your RISE account to start organizing your
                school life.
              </Text>

              <View style={styles.formSection}>
                <Text style={styles.label}>School email</Text>

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
                  placeholderTextColor={colors.mutedGrayGreen}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  editable={!isSubmitting}
                  onSubmitEditing={handleCreateAccount}
                  accessibilityLabel="School email"
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
                    styles.signUpButton,
                    pressed && styles.signUpButtonPressed,
                    isSubmitting && styles.signUpButtonDisabled,
                  ]}
                  onPress={handleCreateAccount}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Sign up"
                >
                  <Text style={styles.signUpButtonText}>
                    {isSubmitting ? 'Sending link...' : 'Sign up'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.loginSection}>
              <View style={styles.loginPromptRow}>
                <View style={styles.divider} />

                <Text style={styles.loginText}>
                  Already have an account?
                </Text>

                <View style={styles.divider} />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log in"
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
      </TouchableWithoutFeedback>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },

  scrollContent: {
    flexGrow: 1,
  },

  screenContent: {
    flexGrow: 1,
    backgroundColor: colors.warmCream,
  },

  header: {
    height: 336,
    width: '100%',
    overflow: 'hidden',
  },

  headerImage: {
    transform: [
      { scale: 1.06 },
      { translateY: 14 },
    ],
  },

  contentCard: {
    flex: 1,
    marginTop: -32,
    backgroundColor: colors.warmCream,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 30,
    color: colors.deepOlive,
  },

  subtitle: {
    marginTop: 12,
    maxWidth: 340,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.mutedGrayGreen,
  },

  formSection: {
    marginTop: 34,
  },

  label: {
    marginBottom: 10,
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.deepOlive,
  },

  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.mistGreen,
    borderRadius: 14,
    backgroundColor: colors.softWhite,
    paddingHorizontal: 16,
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.deepOlive,
  },

  inputError: {
    borderColor: statusColors.urgentRed,
  },

  errorText: {
    marginTop: 8,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
    color: statusColors.urgentRed,
  },

  successText: {
    marginTop: 8,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.eucalyptus,
  },

  signUpButton: {
    marginTop: 26,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.eucalyptus,
    alignItems: 'center',
    justifyContent: 'center',
  },

  signUpButtonPressed: {
    opacity: 0.82,
  },

  signUpButtonDisabled: {
    opacity: 0.5,
  },

  signUpButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.softWhite,
  },

  loginSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },

  loginPromptRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.mistGreen,
    maxWidth: 80,
  },

  loginText: {
    marginHorizontal: 14,
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.mutedGrayGreen,
  },

  loginLink: {
    marginTop: 10,
    fontFamily: fonts.body.semiBold,
    fontSize: 17,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
});