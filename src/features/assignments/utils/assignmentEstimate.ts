/**
 * How long an assignment will take, shared by Home, List, and Study.
 *
 * The estimate-assignments Edge Function asks Claude for each assignment's
 * time and kind and saves them on the assignment. Until it has (or if AI is
 * unavailable), RISE makes its own guess from the title and points.
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

export function guessAssignmentKind(title: string): AssignmentKind {
  const match = KIND_KEYWORDS.find(([, pattern]) => pattern.test(title));
  return match ? match[0] : 'other';
}

/** Big assignments take longer than small ones of the same kind. */
export function guessAssignmentMinutes(
  kind: AssignmentKind,
  pointsPossible: number | null,
): number {
  let minutes = GUESS_MINUTES[kind];

  if (pointsPossible !== null && pointsPossible >= 100) {
    minutes *= 1.5;
  } else if (pointsPossible !== null && pointsPossible <= 10) {
    minutes *= 0.5;
  }

  // Round to 5 minutes so guesses don't look falsely precise.
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export function getAssignmentEstimate(assignment: {
  title: string;
  pointsPossible: number | null;
  estimatedMinutes: number | null;
  kind: AssignmentKind | null;
}): AssignmentEstimate {
  const kind = assignment.kind ?? guessAssignmentKind(assignment.title);

  if (assignment.estimatedMinutes !== null) {
    return { minutes: assignment.estimatedMinutes, kind, isGuess: false };
  }

  return {
    minutes: guessAssignmentMinutes(kind, assignment.pointsPossible),
    kind,
    isGuess: true,
  };
}

/** "45m", "2h", or "1h 20m". */
export function formatEstimate(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
