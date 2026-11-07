import { HelpToolLayout } from '../components/HelpToolLayout';

/**
 * "Ask for an extension", opened from the help menu (#70). Writing and
 * editing the email are #72 and #73.
 */
export function ExtensionEmailScreen() {
  return (
    <HelpToolLayout
      title="Ask for an extension"
      subtitle="Pick your class and fill in the blanks. We’ll write the rest."
    />
  );
}
