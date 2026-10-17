import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import ArrowRightIcon from '../../../../assets/icons/onboarding/arrow-right.svg';
import CalendarIcon from '../../../../assets/icons/onboarding/calendar.svg';
import GraduationCapIcon from '../../../../assets/icons/onboarding/graduation-cap.svg';
import LeafIcon from '../../../../assets/icons/onboarding/leaf.svg';
import { markOnboardingCompleted } from '../../../repositories/profileRepository';
import type { RootStackParamList } from '../../navigation/types';
import { OnboardingButton } from '../components/OnboardingButton';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { SetupStatusRow } from '../components/SetupStatusRow';
import { ONBOARDING_STEPS } from '../onboardingSteps';
import { onboardingTextStyles } from '../onboardingTextStyles';
import { styles } from './OnboardingCompleteScreen.styles';

type OnboardingCompleteScreenProps = {
  onComplete: () => void;
};

/** Last onboarding step. Shows what's connected, then opens the app. */
export function OnboardingCompleteScreen({
  onComplete,
}: OnboardingCompleteScreenProps) {
  const route =
    useRoute<RouteProp<RootStackParamList, 'OnboardingComplete'>>();
  const { calendarConnected } = route.params;

  const [isFinishing, setIsFinishing] = useState(false);

  async function handleShowMyWeek() {
    setIsFinishing(true);

    try {
      await markOnboardingCompleted();
      onComplete();
    } catch (error) {
      console.log('Could not finish onboarding:', error);

      Alert.alert(
        'Unable to continue',
        'Something went wrong while finishing onboarding. Please try again.',
      );
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <OnboardingLayout step={ONBOARDING_STEPS.allSet}>
      <Text style={[onboardingTextStyles.title, styles.title]}>
        You’re all set
      </Text>

      <Text style={[onboardingTextStyles.body, styles.body]}>
        RISE is ready to help you plan your week. You can connect anything you
        skipped later in Settings.
      </Text>

      <View style={styles.rows}>
        {/* Canvas classes only sync from the computer extension, so this stays
            unchecked until RISE can see that sync (#22). */}
        <SetupStatusRow
          icon={<GraduationCapIcon />}
          label="Classes synced"
          done={false}
        />

        <SetupStatusRow
          icon={<CalendarIcon />}
          label="Calendar connected"
          done={calendarConnected}
        />

        <SetupStatusRow icon={<LeafIcon />} label="Study plan ready" done />
      </View>

      <OnboardingButton
        label="Show me my week"
        trailingIcon={<ArrowRightIcon />}
        onPress={handleShowMyWeek}
        isLoading={isFinishing}
        style={styles.button}
      />
    </OnboardingLayout>
  );
}
