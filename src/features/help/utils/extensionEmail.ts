import type { ExtensionEmail } from '../../../repositories/extensionEmailRepository';

/**
 * The Preview before an email is written, from the Figma "Help - Email"
 * screen. The bracketed parts are what the student fills in.
 */
export const EMAIL_PREVIEW_TEMPLATE = `Dear Professor,

I hope you are doing well. I am a student in your [your class] class.

I am writing to ask whether it would be possible to receive a short extension on [assignment name]. [your reason]

If an extension is not possible, I completely understand and will submit what I have by the original deadline.

Thank you in advance for your time.

Sincerely,
[Your name]`;

/**
 * What to ask for before writing the email (#72, AC 3), or null when the
 * class and assignment are both filled in.
 */
export function getMissingFieldsMessage(hasClass: boolean, assignmentTitle: string): string | null {
  const hasAssignment = assignmentTitle.trim().length > 0;

  if (!hasClass && !hasAssignment) return 'Choose a class and an assignment first.';
  if (!hasClass) return 'Choose a class first.';
  if (!hasAssignment) return 'Choose or type the assignment first.';
  return null;
}

/** The subject and message together, for pasting into an email app. */
export function formatEmailForCopy(email: ExtensionEmail) {
  return `Subject: ${email.subject}\n\n${email.body}`;
}
