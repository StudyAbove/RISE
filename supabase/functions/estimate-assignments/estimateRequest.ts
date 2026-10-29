// What estimate-assignments sends to Claude and how it checks the answer.
// Kept apart from index.ts so Jest can test it without Deno.

// Keep in sync with src/features/assignments/utils/assignmentEstimate.ts and
// the check on assignments.kind.
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

export type AssignmentToEstimate = {
  id: string;
  title: string;
  description: string | null;
  courseName: string | null;
  courseCode: string | null;
};

export type SavedEstimate = {
  id: string;
  minutes: number;
  kind: AssignmentKind;
};

// Same limits as the check on assignments.estimated_minutes.
const MIN_MINUTES = 5;
const MAX_MINUTES = 6000;

// The instructions are what Claude sizes the work from, so send most of them
// (Canvas sync keeps up to 5,000 characters).
const MAX_DESCRIPTION_LENGTH = 4000;

export const ESTIMATE_SYSTEM_PROMPT = `You estimate how long college assignments take, for a student planner app.

For each assignment, give:
- minutes: the total time a typical college student needs to finish it, start to submit. For exams and quizzes, the time to study for them.
- kind: one of ${ASSIGNMENT_KINDS.join(', ')}.

Base the time on what the assignment asks the student to do: read the instructions for the deliverables and their size, like the number of problems, pages or word count, sources to cite, parts or steps to complete, code to write, or material an exam covers. Use the title and class to fill in what the instructions leave out. Points are not given, because classes grade on very different scales.

Be realistic, not optimistic: a short discussion post is often 20-30 minutes, a problem set 1-3 hours, a lab report 2-4 hours, a midterm 4-8 hours of studying, a final project 8+ hours.

Return one estimate for every assignment id you're given.`;

/** The assignments as plain text, one block each. */
export function buildEstimatePrompt(assignments: AssignmentToEstimate[]): string {
  const blocks = assignments.map((assignment) => {
    const lines = [`id: ${assignment.id}`, `title: ${assignment.title}`];

    const course = [assignment.courseCode, assignment.courseName].filter(Boolean).join(' - ');
    if (course) lines.push(`class: ${course}`);

    const description = assignment.description?.trim();
    if (description) {
      lines.push(`instructions: ${description.slice(0, MAX_DESCRIPTION_LENGTH)}`);
    }

    return lines.join('\n');
  });

  return `Estimate these assignments:\n\n${blocks.join('\n\n')}`;
}

function isKind(value: unknown): value is AssignmentKind {
  return typeof value === 'string' && (ASSIGNMENT_KINDS as readonly string[]).includes(value);
}

/**
 * Keep only estimates for assignments we asked about, with times the
 * database accepts, rounded to 5 minutes.
 */
export function readEstimates(
  estimates: { id: unknown; minutes: unknown; kind: unknown }[],
  requestedIds: string[],
): SavedEstimate[] {
  const remaining = new Set(requestedIds);
  const saved: SavedEstimate[] = [];

  for (const estimate of estimates) {
    if (typeof estimate.id !== 'string' || !remaining.has(estimate.id)) continue;
    if (typeof estimate.minutes !== 'number' || !Number.isFinite(estimate.minutes)) continue;
    if (!isKind(estimate.kind)) continue;

    const rounded = Math.round(estimate.minutes / 5) * 5;
    const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, rounded));

    // Ignore a second answer for the same assignment.
    remaining.delete(estimate.id);
    saved.push({ id: estimate.id, minutes, kind: estimate.kind });
  }

  return saved;
}
