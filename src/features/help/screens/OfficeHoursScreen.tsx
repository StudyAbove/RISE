import { HelpToolLayout } from '../components/HelpToolLayout';

/**
 * "Book office hours", opened from the help menu (#70). Choosing a time and
 * adding it to the calendar is #74.
 */
export function OfficeHoursScreen() {
  return (
    <HelpToolLayout
      title="Book office hours"
      subtitle="Pick your class, then choose a time that works."
    />
  );
}
