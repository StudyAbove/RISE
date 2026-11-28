import { DEV_SKIP_AUTH } from '../lib/devFlags';
import { supabase } from '../lib/supabase';

export type BreakSessionInput = {
  clientSessionId: string;
  assignmentId: string;
  breakType: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

export type BreakSession = {
  id: string;
  assignmentId: string | null;
  assignmentKind: string | null;
  breakType: string;
  startedAt: string;
  durationSeconds: number;
};

type BreakSessionRow = {
  id: string;
  assignment_id: string | null;
  assignment_kind: string | null;
  break_type: string;
  started_at: string;
  duration_seconds: number;
};

/** Save actual break time. Repeated saves of the same break are ignored. */
export async function recordBreakSession(
  session: BreakSessionInput,
): Promise<boolean> {
  if (DEV_SKIP_AUTH) return false;

  const seconds = Math.floor(session.durationSeconds);
  const started = session.startedAt.getTime();
  const ended = session.endedAt.getTime();

  if (
    !Number.isFinite(started) ||
    !Number.isFinite(ended) ||
    ended < started ||
    !Number.isFinite(seconds) ||
    seconds > 360000 ||
    seconds > (ended - started) / 1000 + 1 ||
    !session.clientSessionId.trim() ||
    session.clientSessionId.length > 200 ||
    !session.assignmentId.trim() ||
    !session.breakType.trim() ||
    session.breakType.length > 80
  ) {
    throw new Error('Invalid break session.');
  }

  // Opening and immediately leaving a break adds no recorded time.
  if (seconds < 1) return false;

  const { error } = await supabase.from('break_sessions').upsert(
    {
      client_session_id: session.clientSessionId,
      assignment_id: session.assignmentId,
      break_type: session.breakType,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt.toISOString(),
      duration_seconds: seconds,
    },
    {
      onConflict: 'user_id,client_session_id',
      ignoreDuplicates: true,
    },
  );

  if (error) throw error;

  return true;
}

/** Read every matching record, including when there are over 500 breaks. */
export async function getBreakSessions(
  since?: Date,
): Promise<BreakSession[]> {
  if (DEV_SKIP_AUTH) return [];

  const rows: BreakSessionRow[] = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('break_sessions')
      .select(
        'id, assignment_id, assignment_kind, break_type, started_at, duration_seconds',
      )
      .order('started_at', { ascending: true })
      .order('id', { ascending: true });

    if (since) query = query.gte('started_at', since.toISOString());

    const { data, error } = await query.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) throw error;

    const batch = (data ?? []) as BreakSessionRow[];
    rows.push(...batch);

    if (batch.length < pageSize) break;
  }

  return rows.map((row) => ({
    id: row.id,
    assignmentId: row.assignment_id,
    assignmentKind: row.assignment_kind,
    breakType: row.break_type,
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
  }));
}