import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import LockIcon from '../../../../assets/icons/onboarding/lock.svg';
import { useCalendarConnection } from '../../calendar/hooks/useCalendarConnection';
import { NextButton } from '../components/NextButton';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { SkipButton } from '../components/SkipButton';
import { ONBOARDING_STEPS } from '../onboardingSteps';
import { onboardingTextStyles } from '../onboardingTextStyles';
import { styles } from './ConnectCalendarScreen.styles';

const calendarPreviewImage = require('../../../../assets/images/onboarding/calendar-preview.png');

/** Onboarding step where the student connects Apple or Google Calendar. */
export function ConnectCalendarScreen() {
  const navigation = useNavigation();

  const {
    appleConnected,
    googleConnected,
    isConnectingApple,
    isConnectingGoogle,
    connectApple,
    connectGoogle,
  } = useCalendarConnection({
    onConnected: () => {
      navigation.navigate('OnboardingComplete', { calendarConnected: true });
    },
  });

  function goToAllSetStep() {
    navigation.navigate('OnboardingComplete', {
      calendarConnected: appleConnected || googleConnected,
    });
  }

  // Shown behind Apple's permission prompt or while Google sign-in is open.
  if (isConnectingApple || isConnectingGoogle) {
    return (
      <OnboardingLayout step={ONBOARDING_STEPS.connectCalendar}>
        <View style={styles.permissionContent}>
          <Text style={onboardingTextStyles.title}>Almost there</Text>

          <Text style={onboardingTextStyles.body}>
            {isConnectingGoogle
              ? 'We just need permission to access your Google Calendar so RISE can import your classes and help you stay on track.'
              : 'We just need permission to access your calendar so RISE can import your classes and help you stay on track.'}
          </Text>

          <NextButton
            accessibilityLabel="Continue"
            onPress={goToAllSetStep}
            style={styles.permissionButton}
          />
        </View>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={ONBOARDING_STEPS.connectCalendar}
      headerAction={<SkipButton onPress={goToAllSetStep} />}
    >
      <Text style={onboardingTextStyles.title}>Connect your calendar</Text>

      <Text style={onboardingTextStyles.body}>
        RISE uses your schedule to place study sessions around classes, work,
        and real life.
      </Text>

      <Image
        source={calendarPreviewImage}
        style={styles.illustration}
        accessibilityIgnoresInvertColors
      />

      <View style={styles.calendarButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect Apple Calendar"
          onPress={connectApple}
          style={({ pressed }) => [
            styles.calendarButton,
            styles.appleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.calendarButtonText, styles.appleButtonText]}>
            Apple Calendar
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect Google Calendar"
          onPress={connectGoogle}
          style={({ pressed }) => [
            styles.calendarButton,
            styles.googleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.calendarButtonText}>Google Calendar</Text>
        </Pressable>
      </View>

      <View style={styles.privacyNote}>
        <View style={styles.lockIcon}>
          <LockIcon />
        </View>

        <Text style={styles.privacyText}>
          We only read your schedule to plan study sessions. Your information
          stays private and secure.
        </Text>
      </View>
    </OnboardingLayout>
  );
}
