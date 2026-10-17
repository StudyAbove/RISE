import { View } from 'react-native';

import { ONBOARDING_STEP_COUNT } from '../onboardingSteps';
import { styles } from './PageIndicator.styles';

type PageIndicatorProps = {
  step: number;
};

/** Row of dots under each onboarding screen. The current step is a wider pill. */
export function PageIndicator({ step }: PageIndicatorProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${step} of ${ONBOARDING_STEP_COUNT}`}
    >
      {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, index + 1 === step && styles.activeDot]}
        />
      ))}
    </View>
  );
}
