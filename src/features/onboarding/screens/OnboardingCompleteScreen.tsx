import { useRef, useState } from 'react';
import { Alert, Animated, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import ArrowRightIcon from '../../../../assets/icons/onboarding/arrow-right.svg';
import CalendarCheckIcon from '../../../../assets/icons/onboarding/calendar-check.svg';
import ClipboardCheckIcon from '../../../../assets/icons/onboarding/clipboard-check.svg';
import GraduationHatIcon from '../../../../assets/icons/onboarding/graduation-hat.svg';
import { markOnboardingCompleted } from '../../../repositories/profileRepository';
import type { RootStackParamList } from '../../navigation/types';
import { CongratulationsBurst } from '../components/CongratulationsBurst';
import { OnboardingButton } from '../components/OnboardingButton';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { SetupStatusRow } from '../components/SetupStatusRow';
import { ONBOARDING_STEPS } from '../onboardingSteps';
import { onboardingTextStyles } from '../onboardingTextStyles';
import { styles } from './OnboardingCompleteScreen.styles';

// How long the summary takes to fade in after the celebration.
const SUMMARY_FADE_IN_DURATION = 300;

type OnboardingCompleteScreenProps = {
  onComplete: () => void;
};

/**
 * Last onboarding step. Celebrates with "Congratulations!" (as in Figma),
 * then shows what's connected and opens the app.
 */
export function OnboardingCompleteScreen({
  onComplete,
}: OnboardingCompleteScreenProps) {
  const route =
    useRoute<RouteProp<RootStackParamList, 'OnboardingComplete'>>();
  const { calendarConnected } = route.params;

  const [isFinishing, setIsFinishing] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(true);
  const summaryOpacity = useRef(new Animated.Value(0)).current;

  function showSummary() {
    setIsCelebrating(false);

    Animated.timing(summaryOpacity, {
      toValue: 1,
      duration: SUMMARY_FADE_IN_DURATION,
      useNativeDriver: true,
    }).start();
  }

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
      {isCelebrating ? (
        <CongratulationsBurst onFinish={showSummary} />
      ) : (
        <Animated.View style={{ opacity: summaryOpacity }}>
          <Text style={[onboardingTextStyles.title, styles.title]}>
            You’re all set
          </Text>

          <Text style={[onboardingTextStyles.body, styles.body]}>
            RISE is ready to help you plan your week. You can connect anything
            you skipped later in Settings.
          </Text>

          <View style={styles.rows}>
            {/* Canvas classes only sync from the computer extension, so this
                stays unchecked until RISE can see that sync (#22). */}
            <SetupStatusRow
              icon={<GraduationHatIcon />}
              label="Classes synced"
              done={false}
            />

            <SetupStatusRow
              icon={<CalendarCheckIcon />}
              label="Calendar connected"
              done={calendarConnected}
            />

            <SetupStatusRow
              icon={<ClipboardCheckIcon />}
              label="Study plan ready"
              done
            />
          </View>

          <OnboardingButton
            label="Show me my week"
            trailingIcon={<ArrowRightIcon />}
            onPress={handleShowMyWeek}
            isLoading={isFinishing}
            style={styles.button}
          />
        </Animated.View>
      )}
    </OnboardingLayout>
  );
}
