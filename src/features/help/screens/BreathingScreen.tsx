import { HelpToolLayout } from '../components/HelpToolLayout';

/**
 * "Take a breath", opened from the help menu (#70). The guided breathing
 * exercise itself is #71.
 */
export function BreathingScreen() {
  return (
    <HelpToolLayout
      title="Take a breath"
      subtitle="A short breathing reset to settle your head before you start."
    />
  );
}
