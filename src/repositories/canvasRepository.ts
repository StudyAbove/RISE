import { supabase } from '../lib/supabase';
import type { CourseColorKey } from '../theme/courseColors';

export type ExtensionPairingCode = {
  code: string;
  expiresAt: Date;
};

export type CanvasConnection = {
  lastSyncedAt: Date | null;
  lastSyncStatus: 'success' | 'error' | null;
};

/**
 * A new 6-digit code the student types into the Canvas extension, with their
 * email, to connect it to this account. Replaces any earlier unused code.
 */
export async function createExtensionPairingCode(): Promise<ExtensionPairingCode> {
  const { data, error } = await supabase.rpc('create_extension_pairing_code');

  if (error) {
    throw error;
  }

  const [row] = data as { pairing_code: string; code_expires_at: string }[];

  return { code: row.pairing_code, expiresAt: new Date(row.code_expires_at) };
}

/** The student's Canvas sync status, or null if the extension was never connected. */
export async function fetchCanvasConnection(): Promise<CanvasConnection | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const { data, error } = await supabase
    .from('canvas_connections')
    .select('last_synced_at, last_sync_status')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
    lastSyncStatus: data.last_sync_status,
  };
}

export type CanvasCourse = {
  id: string;
  name: string;
  code: string | null;
  color: CourseColorKey;
  syncEnabled: boolean;
};

/** The student's synced Canvas classes, with their colors and sync choices. */
export async function fetchCanvasCourses(): Promise<CanvasCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, code, color, sync_enabled')
    .not('canvas_course_id', 'is', null)
    .order('name');

  if (error) {
    throw error;
  }

  return (data ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    color: (course.color ?? 'sage') as CourseColorKey,
    syncEnabled: course.sync_enabled,
  }));
}

/**
 * Changes a class's color or whether it syncs. Turning sync off hides the
 * class's assignments at the next Canvas sync.
 */
export async function updateCanvasCourse(
  courseId: string,
  changes: { color?: CourseColorKey; syncEnabled?: boolean },
) {
  const { error } = await supabase
    .from('courses')
    .update({
      ...(changes.color !== undefined ? { color: changes.color } : {}),
      ...(changes.syncEnabled !== undefined ? { sync_enabled: changes.syncEnabled } : {}),
    })
    .eq('id', courseId);

  if (error) {
    throw error;
  }
}
