// Backend for the RISE Canvas browser extension (#22).
//
// POST { action: 'pair', email, code }             → { token }
// POST { action: 'courses', canvasDomain, courses } → { courses } with colors and sync choices
// POST { action: 'saveCourseChoices', choices }     → { saved }
// POST { action: 'sync', ...canvas data }           → { courses, assignments, removed, syncedAt }
//   (canvas data includes studentName, saved for the greeting if unset)
// POST { action: 'disconnect' }                     → { disconnected: true }
//
// After pairing, the extension sends its token in the x-rise-extension-token
// header. JWT verification is off for this function (see config.toml) because
// the extension has no Supabase session of its own.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  findRemovedAssignmentIds,
  InvalidPayloadError,
  isPairingCode,
  parseCourseChoices,
  parseSyncPayload,
  pickColorsForNewCourses,
  type SyncedCourse,
} from './canvasSync.ts';

// A code stops working after this many wrong guesses.
const MAX_PAIRING_ATTEMPTS = 5;

// Rows per upsert request.
const UPSERT_BATCH_SIZE = 500;

const PAIRING_FAILED_MESSAGE =
  "That email and code don't match. Check the code in the Rise app and try again.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-rise-extension-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A random URL-safe token for the extension to keep. */
function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

/**
 * Checks the email and code the student typed into the extension. The email
 * is only compared with the account that made the code; it isn't stored again.
 */
async function pairExtension(supabase: SupabaseClient, body: Record<string, unknown>) {
  const { email, code } = body;

  if (typeof email !== 'string' || !email.includes('@') || !isPairingCode(code)) {
    return jsonResponse({ error: 'Enter your email and the 6-digit code from the Rise app.' }, 400);
  }

  const { data: userId, error: lookupError } = await supabase.rpc('find_user_id_by_email', {
    lookup_email: email,
  });

  if (lookupError) {
    throw lookupError;
  }

  if (!userId) {
    return jsonResponse({ error: PAIRING_FAILED_MESSAGE }, 401);
  }

  const { data: pairingCode, error: codeError } = await supabase
    .from('extension_pairing_codes')
    .select('id, code_hash, failed_attempts')
    .eq('user_id', userId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError) {
    throw codeError;
  }

  if (!pairingCode) {
    return jsonResponse({ error: PAIRING_FAILED_MESSAGE }, 401);
  }

  if ((await sha256Hex(`${userId}:${code}`)) !== pairingCode.code_hash) {
    const failedAttempts = pairingCode.failed_attempts + 1;

    await supabase
      .from('extension_pairing_codes')
      .update({
        failed_attempts: failedAttempts,
        // Too many wrong guesses: expire the code so it can't be brute-forced.
        ...(failedAttempts >= MAX_PAIRING_ATTEMPTS ? { expires_at: new Date().toISOString() } : {}),
      })
      .eq('id', pairingCode.id);

    return jsonResponse({ error: PAIRING_FAILED_MESSAGE }, 401);
  }

  const token = createToken();

  const { error: useCodeError } = await supabase
    .from('extension_pairing_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', pairingCode.id);

  if (useCodeError) {
    throw useCodeError;
  }

  const { error: tokenError } = await supabase
    .from('extension_tokens')
    .insert({ user_id: userId, token_hash: await sha256Hex(token) });

  if (tokenError) {
    throw tokenError;
  }

  // Keeps an existing row (and its on/off setting) if the student reconnects.
  const { error: connectionError } = await supabase
    .from('canvas_connections')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (connectionError) {
    throw connectionError;
  }

  return jsonResponse({ token });
}

/** The student the extension token belongs to, or null if it isn't valid. */
async function findTokenUser(supabase: SupabaseClient, token: string | null) {
  if (!token) {
    return null;
  }

  const { data, error } = await supabase
    .from('extension_tokens')
    .select('id, user_id')
    .eq('token_hash', await sha256Hex(token))
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  await supabase
    .from('extension_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { tokenId: data.id as string, userId: data.user_id as string };
}

type SavedCourse = {
  id: string;
  canvas_course_id: string;
  name: string;
  code: string | null;
  term: string | null;
  color: string | null;
  sync_enabled: boolean;
};

/** Returns a 403 response when the student turned Canvas sync off in the app. */
async function checkSyncEnabled(supabase: SupabaseClient, userId: string) {
  const { data: connection, error } = await supabase
    .from('canvas_connections')
    .select('enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (connection && !connection.enabled) {
    return jsonResponse(
      { error: 'Canvas sync is turned off in the Rise app.', code: 'sync_disabled' },
      403,
    );
  }

  return null;
}

/**
 * Saves the student's Canvas classes, keeping the colors and sync choices
 * they already made, and gives new classes a color of their own.
 */
async function saveCourses(supabase: SupabaseClient, userId: string, courses: SyncedCourse[]) {
  const { data, error } = await supabase
    .from('courses')
    .upsert(
      courses.map((course) => ({
        user_id: userId,
        canvas_course_id: course.canvasCourseId,
        name: course.name,
        code: course.code,
        term: course.term,
      })),
      { onConflict: 'user_id,canvas_course_id' },
    )
    .select('id, canvas_course_id, name, code, term, color, sync_enabled');

  if (error) {
    throw error;
  }

  const savedCourses = (data ?? []) as SavedCourse[];
  const uncolored = savedCourses.filter((course) => !course.color);

  if (uncolored.length > 0) {
    const { data: colored, error: colorsError } = await supabase
      .from('courses')
      .select('color')
      .eq('user_id', userId)
      .not('color', 'is', null);

    if (colorsError) {
      throw colorsError;
    }

    const newColors = pickColorsForNewCourses(
      (colored ?? []).map((course) => course.color),
      uncolored.length,
    );

    for (const [index, course] of uncolored.entries()) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ color: newColors[index] })
        .eq('id', course.id);

      if (updateError) {
        throw updateError;
      }

      course.color = newColors[index];
    }
  }

  return savedCourses;
}

/** The class list for the extension's "Choose your classes" screen. */
async function listCourses(supabase: SupabaseClient, userId: string, body: unknown) {
  const disabledResponse = await checkSyncEnabled(supabase, userId);

  if (disabledResponse) {
    return disabledResponse;
  }

  const payload = parseSyncPayload({ ...(body as Record<string, unknown>), assignments: [] });
  const savedCourses = await saveCourses(supabase, userId, payload.courses);

  return jsonResponse({
    courses: savedCourses.map((course) => ({
      canvasCourseId: course.canvas_course_id,
      name: course.name,
      code: course.code,
      term: course.term,
      color: course.color,
      syncEnabled: course.sync_enabled,
    })),
  });
}

async function saveCourseChoices(supabase: SupabaseClient, userId: string, body: unknown) {
  const choices = parseCourseChoices(body);

  for (const choice of choices) {
    const { error } = await supabase
      .from('courses')
      .update({ color: choice.color, sync_enabled: choice.syncEnabled })
      .eq('user_id', userId)
      .eq('canvas_course_id', choice.canvasCourseId);

    if (error) {
      throw error;
    }
  }

  return jsonResponse({ saved: choices.length });
}

/**
 * Saves the student's Canvas name for the Home greeting (#56), but only if
 * their profile doesn't have a name yet, so it never replaces one they set.
 * A failure here shouldn't fail the sync.
 */
async function saveStudentName(supabase: SupabaseClient, userId: string, name: string | null) {
  if (!name) return;

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .is('display_name', null);

  if (error) {
    console.error('Could not save the Canvas name:', error);
  }
}

async function syncCanvas(supabase: SupabaseClient, userId: string, body: unknown) {
  const disabledResponse = await checkSyncEnabled(supabase, userId);

  if (disabledResponse) {
    return disabledResponse;
  }

  const payload = parseSyncPayload(body);
  const syncedAt = new Date().toISOString();

  try {
    const savedCourses = await saveCourses(supabase, userId, payload.courses);

    const courseIdByCanvasId = new Map(savedCourses.map((course) => [course.canvas_course_id, course.id]));
    const enabledCanvasIds = new Set(
      savedCourses.filter((course) => course.sync_enabled).map((course) => course.canvas_course_id),
    );

    // Only the classes the student chose to sync.
    const assignments = payload.assignments.filter((assignment) =>
      enabledCanvasIds.has(assignment.canvasCourseId),
    );

    const assignmentRows = assignments.map((assignment) => ({
      user_id: userId,
      course_id: courseIdByCanvasId.get(assignment.canvasCourseId) ?? null,
      canvas_assignment_id: assignment.canvasAssignmentId,
      title: assignment.title,
      description: assignment.description,
      due_at: assignment.dueAt,
      points_possible: assignment.pointsPossible,
      html_url: assignment.htmlUrl,
      source: 'canvas',
      removed_at: null,
      updated_at: syncedAt,
      // Only mark work done when Canvas says it was submitted, so a sync never
      // un-checks something the student finished in RISE.
      ...(assignment.submitted ? { completed: true } : {}),
    }));

    // Rows in one upsert need the same columns, so submitted and unsubmitted
    // assignments go in separate batches.
    const submittedRows = assignmentRows.filter((row) => 'completed' in row);
    const otherRows = assignmentRows.filter((row) => !('completed' in row));

    for (const batch of [...chunk(submittedRows, UPSERT_BATCH_SIZE), ...chunk(otherRows, UPSERT_BATCH_SIZE)]) {
      const { error } = await supabase
        .from('assignments')
        .upsert(batch, { onConflict: 'user_id,canvas_assignment_id' });

      if (error) {
        throw error;
      }
    }

    // Hide assignments that left Canvas, and ones from classes the student
    // stopped syncing. They come back if the class is turned on again.
    const syncedCourseIds = savedCourses.map((course) => course.id);
    let removedIds: string[] = [];

    if (syncedCourseIds.length > 0) {
      const { data: savedAssignments, error: savedError } = await supabase
        .from('assignments')
        .select('id, canvas_assignment_id')
        .eq('user_id', userId)
        .eq('source', 'canvas')
        .is('removed_at', null)
        .in('course_id', syncedCourseIds);

      if (savedError) {
        throw savedError;
      }

      removedIds = findRemovedAssignmentIds(
        savedAssignments ?? [],
        new Set(assignments.map((assignment) => assignment.canvasAssignmentId)),
      );

      for (const batch of chunk(removedIds, UPSERT_BATCH_SIZE)) {
        const { error } = await supabase
          .from('assignments')
          .update({ removed_at: syncedAt })
          .in('id', batch);

        if (error) {
          throw error;
        }
      }
    }

    await saveStudentName(supabase, userId, payload.studentName);

    await supabase.from('canvas_connections').upsert({
      user_id: userId,
      canvas_domain: payload.canvasDomain,
      last_synced_at: syncedAt,
      last_sync_status: 'success',
      last_sync_error: null,
      updated_at: syncedAt,
    });

    return jsonResponse({
      courses: enabledCanvasIds.size,
      assignments: assignments.length,
      removed: removedIds.length,
      syncedAt,
    });
  } catch (error) {
    await supabase.from('canvas_connections').upsert({
      user_id: userId,
      last_sync_status: 'error',
      last_sync_error: error instanceof Error ? error.message : 'Sync failed',
      updated_at: new Date().toISOString(),
    });

    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const supabase = createAdminClient();

    if (body?.action === 'pair') {
      return await pairExtension(supabase, body);
    }

    const tokenUser = await findTokenUser(supabase, req.headers.get('x-rise-extension-token'));

    if (!tokenUser) {
      return jsonResponse(
        { error: 'Reconnect the extension to your Rise account.', code: 'reconnect_required' },
        401,
      );
    }

    if (body?.action === 'sync') {
      return await syncCanvas(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'courses') {
      return await listCourses(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'saveCourseChoices') {
      return await saveCourseChoices(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'disconnect') {
      const { error } = await supabase
        .from('extension_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', tokenUser.tokenId);

      if (error) {
        throw error;
      }

      return jsonResponse({ disconnected: true });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    if (error instanceof InvalidPayloadError) {
      return jsonResponse({ error: error.message }, 400);
    }

    console.error('canvas-extension failed:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
