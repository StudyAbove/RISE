// What generate-extension-email sends to Claude and how it checks the answer.
// Kept apart from index.ts so Jest can test it without Deno.

export type ExtensionEmailInput = {
  /** "CECS 491B" or the class name. */
  className: string;
  assignmentTitle: string;
  /** ISO date, when the student picked a saved assignment. */
  dueAt: string | null;
  reason: string | null;
  /** From the class's syllabus, for the greeting. */
  professorName: string | null;
  /** From the student's profile, for the sign-off. */
  studentName: string | null;
};

export type ExtensionEmail = {
  subject: string;
  body: string;
};

/** Thrown when the app sends something the function can't use. */
export class InvalidEmailRequestError extends Error {}

const MAX_CLASS_LENGTH = 200;
const MAX_ASSIGNMENT_LENGTH = 300;
const MAX_REASON_LENGTH = 500;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Generous limits for a short email; anything longer means something went wrong.
const MAX_SUBJECT_LENGTH = 150;
const MAX_BODY_LENGTH = 2000;

export const EXTENSION_EMAIL_SYSTEM_PROMPT = `You write short emails from a college student to their professor, asking for an extension on one assignment.

Write in the student's voice: polite, warm, respectful, and simple. Sound like a real student, not a formal letter template.

The message:
- Starts with "Dear Professor" and the professor's last name, e.g. "Dear Professor Smith,". Leave out titles like Dr. and first names. If no name is given, start with "Dear Professor,".
- Names the class and the assignment.
- Mentions the due date if one is given, written exactly as given (e.g. "Wednesday, November 25"). You don't know today's date, so never call it "this Wednesday", "tomorrow", "next week" or anything else relative to today.
- Includes the student's reason briefly if they gave one, in their own terms. Never invent a reason, an illness, or any detail the student didn't give. If there is no reason, just ask politely without one.
- Asks for a short extension without naming a new date.
- Says that if an extension isn't possible, the student understands and will submit what they have by the original deadline.
- Thanks the professor.
- Ends with "Sincerely," and the student's name on the next line. If no name is given, use "[Your name]".
- Is plain text in 3 or 4 short paragraphs, under 120 words, with no markdown.

The subject is short and specific, e.g. "Extension request: Milestone 4 report (CECS 491B)".`;

function readText(value: unknown, field: string, maxLength: number, required: boolean): string | null {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    if (required) throw new InvalidEmailRequestError(`Add the ${field} first.`);
    return null;
  }

  if (text.length > maxLength) {
    throw new InvalidEmailRequestError(`The ${field} is too long.`);
  }

  return text;
}

/** The class, assignment, due date, reason and course ID from the app's request. */
export function parseEmailRequest(body: unknown) {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const dueAt = typeof record.dueAt === 'string' && !Number.isNaN(Date.parse(record.dueAt)) ? record.dueAt : null;

  // e.g. "America/Los_Angeles", so the due date is the day the student sees.
  const timeZone =
    typeof record.timeZone === 'string' && record.timeZone.length <= 64 ? record.timeZone : null;

  // Used to look up the professor's name; without it the email says "Dear Professor,".
  const courseId = typeof record.courseId === 'string' && UUID_PATTERN.test(record.courseId) ? record.courseId : null;

  return {
    courseId,
    className: readText(record.className, 'class', MAX_CLASS_LENGTH, true)!,
    assignmentTitle: readText(record.assignmentTitle, 'assignment', MAX_ASSIGNMENT_LENGTH, true)!,
    dueAt,
    reason: readText(record.reason, 'reason', MAX_REASON_LENGTH, false),
    timeZone,
  };
}

/** "Friday, November 13", in the student's time zone when the app sends one. */
function formatDueDate(dueAt: string, timeZone: string | null) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(dueAt));
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(
      new Date(dueAt),
    );
  }
}

export function buildEmailPrompt(input: ExtensionEmailInput, timeZone: string | null = null) {
  return [
    `Class: ${input.className}`,
    `Professor's name: ${input.professorName ?? 'not given'}`,
    `Assignment: ${input.assignmentTitle}`,
    `Due: ${input.dueAt ? formatDueDate(input.dueAt, timeZone) : 'not given'}`,
    `Reason: ${input.reason ?? 'not given'}`,
    `Student's name: ${input.studentName ?? 'not given'}`,
  ].join('\n');
}

/** Checks Claude's email before it goes back to the app. */
export function readEmail(email: { subject: string; body: string }): ExtensionEmail {
  const subject = email.subject.trim();
  const body = email.body.trim();

  if (!subject || !body || subject.length > MAX_SUBJECT_LENGTH || body.length > MAX_BODY_LENGTH) {
    throw new Error('Claude returned an email RISE can’t use.');
  }

  return { subject, body };
}
