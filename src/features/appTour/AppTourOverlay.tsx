import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import { TOUR_STEPS } from './tourSteps';

type Props = {
  mode: 'invite' | 'tour' | null;
  stepIndex: number;
  saving: boolean;
  error: string;
  onStart: () => void;
  onLater: () => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

export function AppTourOverlay({
  mode,
  stepIndex,
  saving,
  error,
  onStart,
  onLater,
  onBack,
  onNext,
  onSkip,
}: Props) {
  const insets = useSafeAreaInsets();
  const step = TOUR_STEPS[stepIndex];

  if (!mode || !step) return null;

  const inviting = mode === 'invite';
  const lastStep = stepIndex === TOUR_STEPS.length - 1;

  function button(
    label: string,
    onPress: () => void,
    primary = false,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving, busy: saving }}
        disabled={saving}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          primary ? styles.primaryButton : styles.secondaryButton,
          saving && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) {
          if (inviting) onLater();
          else onSkip();
        }
      }}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + (inviting ? 24 : 84),
          },
          inviting && styles.centered,
        ]}
      >
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.cardContent}
          >
            {!inviting && (
              <View style={styles.topRow}>
                <Text style={styles.counter}>
                  {stepIndex + 1} of {TOUR_STEPS.length}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip app tour"
                  accessibilityState={{ disabled: saving }}
                  disabled={saving}
                  hitSlop={8}
                  onPress={onSkip}
                  style={({ pressed }) => [
                    styles.skipButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              </View>
            )}

            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              style={styles.title}
            >
              {inviting ? 'Welcome to RISE' : step.title}
            </Text>

            <Text style={styles.description}>
              {inviting
                ? 'Want a quick look around? You can take the tour now or find it later in Settings.'
                : step.description}
            </Text>

            {error !== '' && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {inviting ? (
              <>
                {button('Take a quick tour', onStart, true)}
                {button('Maybe later', onLater)}
              </>
            ) : (
              <View style={styles.actions}>
                {stepIndex > 0 && button('Back', onBack)}
                {button(
                  lastStep ? 'Let’s get started' : 'Next',
                  onNext,
                  true,
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    flexShrink: 1,
    backgroundColor: colors.warmCream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mistGreen,
  },
  cardContent: {
    padding: 20,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  skipText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  description: {
    ...textStyles.body,
    color: colors.deepOlive,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  button: {
    minHeight: 48,
    minWidth: 100,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.butterYellow,
  },
  secondaryButton: {
    backgroundColor: colors.mistGreen,
  },
  buttonText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  error: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});