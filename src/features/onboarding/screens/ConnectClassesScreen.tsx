import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

import FeatureCheckIcon from '../../../../assets/icons/onboarding/feature-check.svg';
import { CANVAS_EXTENSION_URL } from '../../canvas/canvasExtension';
import { OnboardingButton } from '../components/OnboardingButton';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { SkipButton } from '../components/SkipButton';
import { ONBOARDING_STEPS } from '../onboardingSteps';
import { onboardingTextStyles } from '../onboardingTextStyles';
import { styles } from './ConnectClassesScreen.styles';

const canvasToRiseImage = require('../../../../assets/images/onboarding/canvas-to-rise.png');

const EXTENSION_FEATURES = [
  'Import your courses',
  'Sync assignments and due dates',
  'Keep everything up to date',
];

/**
 * Onboarding step that sends students to the Canvas extension. Students are
 * on their phone here, so they copy the link and open it on a computer.
 */
export function ConnectClassesScreen() {
  const navigation = useNavigation();
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  async function handleCopyLink() {
    try {
      await Clipboard.setStringAsync(CANVAS_EXTENSION_URL);
      setIsLinkCopied(true);
    } catch {
      Alert.alert(
        'Could not copy the link',
        `Open this link in Chrome on your computer: ${CANVAS_EXTENSION_URL}`,
      );
    }
  }

  function goToCalendarStep() {
    navigation.navigate('ConnectCalendar');
  }

  return (
    <OnboardingLayout
      step={ONBOARDING_STEPS.connectClasses}
      headerAction={<SkipButton onPress={goToCalendarStep} />}
    >
      <Text style={onboardingTextStyles.title}>Connect your classes</Text>

      <Text style={onboardingTextStyles.body}>
        Add the RISE browser extension or connect your Canvas account so RISE
        can import your courses, assignments, and due dates automatically.
      </Text>

      <Image
        source={canvasToRiseImage}
        style={styles.illustration}
        accessibilityIgnoresInvertColors
      />

      <View style={styles.featureList}>
        {EXTENSION_FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.featureCheckCircle}>
              <FeatureCheckIcon />
            </View>

            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <OnboardingButton
        label={isLinkCopied ? 'Continue' : 'Copy the Link'}
        onPress={isLinkCopied ? goToCalendarStep : handleCopyLink}
        style={styles.button}
      />

      {isLinkCopied ? (
        <Text style={styles.copiedNote} accessibilityLiveRegion="polite">
          Link copied. Open it in Chrome on your computer to add the extension.
        </Text>
      ) : null}
    </OnboardingLayout>
  );
}
