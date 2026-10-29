/**
 * How long an assignment will take, shared by Home, List, and Study.
 *
 * The estimate-assignments Edge Function asks Claude for each assignment's
 * time and kind, based on what the assignment asks for, and saves them on
 * the assignment. Until it has (or if AI is unavailable), RISE makes its own
 * guess from the title and instructions.
 *
 * Points aren't used: classes grade on very different scales.
 */

// Keep in sync with supabase/functions/estimate-assignments/estimateRequest.ts
// and the check on assignments.kind.
export const ASSIGNMENT_KINDS = [
  'exam',
  'quiz',
  'project',
  'paper',
  'lab',
  'homework',
  'reading',
  'discussion',
  'other',
] as const;

export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

export type AssignmentEstimate = {
  minutes: number;
  kind: AssignmentKind;
  /** True when RISE guessed because there's no saved estimate yet. */
  isGuess: boolean;
};

// Checked in order, so "Final Project" is a project and "Lab Report" is a lab.
const KIND_KEYWORDS: [AssignmentKind, RegExp][] = [
  ['discussion', /\b(discussion|forum|reply|replies|post)\b/i],
  ['reading', /\b(reading|read|chapter)\b/i],
  ['quiz', /\bquiz(zes)?\b/i],
  ['lab', /\blab\b/i],
  ['project', /\b(project|milestone|presentation|prototype)\b/i],
  ['paper', /\b(essay|paper|report|reflection)\b/i],
  ['exam', /\b(exam|midterm|final|test)\b/i],
  ['homework', /\b(homework|hw|problem set|worksheet|assignment|exercise)s?\b/i],
];

// A typical student's time for each kind. Exams count the studying before them.
const GUESS_MINUTES: Record<AssignmentKind, number> = {
  exam: 240,
  quiz: 45,
  project: 300,
  paper: 240,
  lab: 120,
  homework: 90,
  reading: 45,
  discussion: 30,
  other: 60,
};

function findKind(text: string): AssignmentKind | null {
  const match = KIND_KEYWORDS.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : null;
}

/**
 * What the assignment is, from its title, or from its instructions when the
 * title doesn't say (e.g. "Week 6" with "Write a 3-page essay...").
 */
export function guessAssignmentKind(
  title: string,
  description: string | null = null,
): AssignmentKind {
  return findKind(title) ?? (description ? findKind(description) : null) ?? 'other';
}

export function getAssignmentEstimate(assignment: {
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  kind: AssignmentKind | null;
}): AssignmentEstimate {
  const kind =
    assignment.kind ?? guessAssignmentKind(assignment.title, assignment.description);

  if (assignment.estimatedMinutes !== null) {
    return { minutes: assignment.estimatedMinutes, kind, isGuess: false };
  }

  return { minutes: GUESS_MINUTES[kind], kind, isGuess: true };
}

/** "45m", "2h", or "1h 20m". */
export function formatEstimate(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
