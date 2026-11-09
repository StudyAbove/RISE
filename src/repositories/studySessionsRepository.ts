import { DEV_SKIP_AUTH } from '../lib/devFlags';
import { supabase } from '../lib/supabase';

/** Sessions shorter than this aren't recorded, e.g. opening and backing out (#49). */
export const MIN_RECORDED_SECONDS = 60;

export type StudySessionInput = {
  /** The assignment the session was started from. */
  assignmentId: string;
  startedAt: Date;
  endedAt: Date;
  /** Time actually spent focusing, without pauses or breaks. */
  focusedSeconds: number;
};

/**
 * Saves a finished focus session (#49). Returns false when it's too short to
 * record. Supabase fills in the student, and row-level security only allows
 * their own assignments.
 */
export async function recordStudySession(session: StudySessionInput): Promise<boolean> {
  const focusedSeconds = Math.floor(session.focusedSeconds);

  // With the dev login skip on, no one is signed in to save it for.
  if (DEV_SKIP_AUTH || !(focusedSeconds >= MIN_RECORDED_SECONDS)) {
    return false;
  }

  const { error } = await supabase.from('study_sessions').insert({
    assignment_id: session.assignmentId,
    started_at: session.startedAt.toISOString(),
    ended_at: session.endedAt.toISOString(),
    focused_seconds: focusedSeconds,
  });

  if (error) {
    throw error;
  }

  return true;
}

/** Total recorded study time for one assignment, in seconds. */
export async function getStudySecondsForAssignment(assignmentId: string): Promise<number> {
  if (DEV_SKIP_AUTH) {
    return 0;
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .select('focused_seconds')
    .eq('assignment_id', assignmentId);

  if (error) {
    throw error;
  }

  return sumFocusedSeconds(data);
}

/**
 * Total recorded study time, in seconds: every session, or only those started
 * on or after `since` (e.g. this week).
 */
export async function getTotalStudySeconds(since?: Date): Promise<number> {
  if (DEV_SKIP_AUTH) {
    return 0;
  }

  const query = supabase.from('study_sessions').select('focused_seconds');
  const { data, error } = await (since ? query.gte('started_at', since.toISOString()) : query);

  if (error) {
    throw error;
  }

  return sumFocusedSeconds(data);
}

function sumFocusedSeconds(rows: { focused_seconds: number }[] | null): number {
  return (rows ?? []).reduce((total, row) => total + row.focused_seconds, 0);
}
