// Backend for the RISE Canvas browser extension (#22).
//
// POST { action: 'pair', email, code }             → { token }
// POST { action: 'courses', canvasDomain, courses } → { courses } with colors and sync choices
// POST { action: 'saveCourseChoices', choices }     → { saved }
// POST { action: 'sync', ...canvas data }           → { courses, assignments, removed, syncedAt }
// multipart + x-rise-extension-action: extractSyllabusDocument → { syllabusInfo }
// Prototype actions require the paired extension token and save isolated test runs.
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
  parseSyllabusReview,
  parseSyncPayload,
  pickColorsForNewCourses,
  type SavedSyllabusReview,
  type SyncedCourse,
} from './canvasSync.ts';
import { extractSyllabusDocument as extractSyllabusFile, extractSyllabusInfo } from './syllabusAi.ts';

// A code stops working after this many wrong guesses.
const MAX_PAIRING_ATTEMPTS = 5;

// Rows per upsert request.
const UPSERT_BATCH_SIZE = 500;

const PAIRING_FAILED_MESSAGE =
  "That email and code don't match. Check the code in the Rise app and try again.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-rise-extension-token, x-rise-extension-action',
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
      courseId: course.id,
      canvasCourseId: course.canvas_course_id,
      name: course.name,
      code: course.code,
      term: course.term,
      color: course.color,
      syncEnabled: course.sync_enabled,
    })),
  });
}

/** Selected classes without a normalized syllabus record. */
async function listMissingSyllabusCourses(supabase: SupabaseClient, userId: string) {
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, canvas_course_id, name, code, term')
    .eq('user_id', userId)
    .eq('sync_enabled', true)
    .order('name');

  if (courseError) throw courseError;
  if (!courses?.length) return jsonResponse({ courses: [] });

  const { data: syllabi, error: syllabusError } = await supabase
    .from('syllabi')
    .select('course_id')
    .in('course_id', courses.map((course) => course.id));

  if (syllabusError) throw syllabusError;

  const coursesWithSyllabi = new Set((syllabi ?? []).map((syllabus) => syllabus.course_id));
  return jsonResponse({
    courses: courses
      .filter((course) => !coursesWithSyllabi.has(course.id))
      .map((course) => ({
        courseId: course.id,
        canvasCourseId: course.canvas_course_id,
        name: course.name,
        code: course.code,
        term: course.term,
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

    const syllabusReviews = await getSyllabusReviews(
      supabase,
      userId,
      savedCourses.filter((course) => course.sync_enabled),
      payload.courses,
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
      syllabusReviews,
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

type ReviewCourse = Pick<SavedCourse, 'id' | 'canvas_course_id' | 'name'>;

async function mapWithLimit<T, R>(items: T[], limit: number, mapItem: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapItem(items[index]);
      }
    }),
  );

  return results;
}

/** Returns AI suggestions only for courses the student has not confirmed yet. */
async function getSyllabusReviews(
  supabase: SupabaseClient,
  userId: string,
  courses: ReviewCourse[],
  incomingCourses: SyncedCourse[],
) {
  if (courses.length === 0) {
    return [];
  }

  const { data: reviewState, error } = await supabase
    .from('courses')
    .select('id, canvas_course_id, syllabus_info_confirmed_at')
    .eq('user_id', userId)
    .in('id', courses.map((course) => course.id));

  if (error) {
    throw error;
  }

  const incomingByCanvasId = new Map(incomingCourses.map((course) => [course.canvasCourseId, course]));
  const confirmedIds = new Set(
    (reviewState ?? [])
      .filter((course) => course.syllabus_info_confirmed_at)
      .map((course) => course.canvas_course_id),
  );

  return await mapWithLimit(
    courses.filter((course) => !confirmedIds.has(course.canvas_course_id)),
    4,
    async (course) => {
        const incoming = incomingByCanvasId.get(course.canvas_course_id);
        const syllabusText = incoming?.syllabusText;
        let syllabusInfo = null;
        let processingError: string | null = null;

        if (syllabusText) {
          try {
            syllabusInfo = await extractSyllabusInfo(syllabusText, course.name);
          } catch {
            processingError = 'RISE could not process this syllabus. Add or correct the details below.';
          }
        }

        return {
          courseId: course.id,
          courseName: course.name,
          hasSyllabus: Boolean(syllabusText),
          syllabusInfo,
          ...(processingError ? { processingError } : {}),
        };
    },
  );
}

/** Writes only a student-confirmed review to that student's own course. */
async function saveSyllabusReview(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
) {
  const review: SavedSyllabusReview = parseSyllabusReview(body);
  const { error } = await supabase.rpc('save_course_syllabus_review', {
    p_user_id: userId,
    p_course_id: review.courseId,
    p_review: {
      professor_name: review.professor_name,
      professor_email: review.professor_email,
      class_location: review.class_location,
      grading_method: review.grading_method,
      late_work: review.late_work,
      office_hours: review.office_hours,
      topics: review.topics,
    },
  });

  if (error) {
    throw error;
  }

  return jsonResponse({ saved: true });
}

/** Parses an uploaded Canvas syllabus document without storing the file. */
async function extractSyllabusDocument(
  supabase: SupabaseClient,
  userId: string,
  form: FormData,
) {
  const courseId = form.get('courseId');
  const sourceContext = typeof form.get('sourceContext') === 'string'
    ? String(form.get('sourceContext')).slice(0, 9_000)
    : '';
  const uploadedFile = form.get('file');
  if (typeof courseId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
    return jsonResponse({ error: 'A valid RISE course ID is required.' }, 400);
  }
  if (!(uploadedFile instanceof File)) {
    return jsonResponse({ error: 'Upload a PDF or DOCX syllabus file.' }, 400);
  }
  if (uploadedFile.size === 0 || uploadedFile.size > 8 * 1024 * 1024) {
    return jsonResponse({ error: 'The syllabus document must be between 1 byte and 8 MB.' }, 413);
  }

  const filename = uploadedFile.name.replace(/[\\/\0]/g, '_').slice(0, 120);
  const extension = filename.toLowerCase().split('.').pop();
  const contentType = extension === 'pdf'
    ? 'application/pdf'
    : extension === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : null;
  if (!contentType) {
    return jsonResponse({ error: 'Only PDF and DOCX syllabus documents are supported.' }, 415);
  }

  const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
  const isPdf = contentType === 'application/pdf' && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  const isDocx = contentType.includes('wordprocessingml') && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isPdf && !isDocx) {
    return jsonResponse({ error: 'The file contents do not match a PDF or DOCX document.' }, 415);
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('user_id', userId)
    .eq('id', courseId)
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) return jsonResponse({ error: 'That course is not connected to this RISE account.' }, 404);

  const document = new File([bytes], filename, { type: contentType });
  const syllabusInfo = await extractSyllabusFile(document, course.name, sourceContext);
  return jsonResponse({ syllabusInfo });
}

/** Extracts syllabus HTML/text without saving until the student reviews it. */
async function extractSyllabusText(supabase: SupabaseClient, userId: string, body: Record<string, unknown>) {
  const courseId = typeof body.courseId === 'string' ? body.courseId : '';
  const syllabusText = body.syllabusText;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
    return jsonResponse({ error: 'A valid RISE course ID is required.' }, 400);
  }
  if (typeof syllabusText !== 'string' || !syllabusText.trim() || syllabusText.length > 50_000) {
    return jsonResponse({ error: 'Provide syllabus text between 1 and 50,000 characters.' }, 400);
  }
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!course) return jsonResponse({ error: 'That course is not connected to this RISE account.' }, 404);

  const syllabusInfo = await extractSyllabusInfo(syllabusText, course.name);
  return jsonResponse({ syllabusInfo });
}

async function savePrototypeRun(
  supabase: SupabaseClient,
  values: {
    canvasCourseId: string | null;
    courseName: string;
    sourceType: 'text' | 'pdf' | 'docx';
    sourceName: string | null;
    inputCharacterCount: number;
    syllabusInfo: Awaited<ReturnType<typeof extractSyllabusInfo>>;
  },
) {
  const { data, error } = await supabase
    .from('syllabus_prototype_runs')
    .insert({
      canvas_course_id: values.canvasCourseId,
      course_name: values.courseName,
      source_type: values.sourceType,
      source_name: values.sourceName,
      input_character_count: values.inputCharacterCount,
      extracted_info: values.syllabusInfo,
    })
    .select('id, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function saveExtractedSyllabus(supabase: SupabaseClient, userId: string, courseCode: string, syllabusInfo: Awaited<ReturnType<typeof extractSyllabusInfo>>) {
  const { data: syllabusId, error } = await supabase.rpc('save_extracted_syllabus', {
    p_user_id: userId,
    p_course_code: courseCode,
    p_info: syllabusInfo,
  });
  if (error) throw error;
  return syllabusId as string;
}

async function saveManualSyllabus(supabase: SupabaseClient, userId: string, body: Record<string, unknown>) {
  const courseId = typeof body.courseId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.courseId)
    ? body.courseId
    : '';
  const source = body.syllabusInfo;
  if (!courseId || !source || typeof source !== 'object' || Array.isArray(source)) {
    return jsonResponse({ error: 'A RISE course ID and syllabus details are required.' }, 400);
  }
  const info = source as Record<string, unknown>;
  const text = (key: string, max: number) => typeof info[key] === 'string' ? (info[key] as string).trim().slice(0, max) || null : null;
  const gradingMethod = ['weighted_categories', 'points', 'other'].includes(String(info.grading_method))
    ? String(info.grading_method)
    : 'points';
  const officeHours = Array.isArray(info.office_hours) ? info.office_hours.map((entry) => {
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    const day = item.day_of_week;
    const dayOfWeek = typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6 ? day : null;
    const time = (key: string) => typeof item[key] === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(item[key] as string)
      ? (item[key] as string).slice(0, 8)
      : null;
    return {
      day_of_week: dayOfWeek,
      start_time: time('start_time'),
      end_time: time('end_time'),
      office_location: typeof item.office_location === 'string' ? item.office_location.trim().slice(0, 500) || null : null,
      required_booking: item.required_booking === true,
      booking_link: typeof item.booking_link === 'string' ? item.booking_link.trim().slice(0, 2000) || null : null,
    };
  }) : [];
  if (officeHours.some((item) => {
    const appointmentOnly = item.required_booking && item.day_of_week == null && !item.start_time && !item.end_time;
    return !appointmentOnly && (item.day_of_week == null || !item.start_time || !item.end_time);
  })) {
    return jsonResponse({ error: 'Each office-hours entry needs a day, start time, and end time, unless it is by appointment.' }, 400);
  }
  const topics = gradingMethod === 'weighted_categories' && Array.isArray(info.topics)
    ? info.topics.map((entry) => {
      const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
      const percentage = typeof item.percentage === 'number' && item.percentage >= 0 && item.percentage <= 100 ? item.percentage : null;
      const totalCount = typeof item.total_count === 'number' && Number.isInteger(item.total_count) && item.total_count > 0 ? item.total_count : null;
      return {
        title: typeof item.title === 'string' ? item.title.trim().slice(0, 100) || null : null,
        percentage,
        total_count: totalCount,
      };
    })
    : [];
  if (topics.some((item) => !item.title || item.percentage == null)) {
    return jsonResponse({ error: 'Each grading topic needs a title and a percentage from 0 to 100.' }, 400);
  }
  const { data: syllabusId, error } = await supabase.rpc('save_manual_syllabus_by_course_id', {
    p_user_id: userId,
    p_course_id: courseId,
    p_info: {
      late_work: text('late_work', 10000),
      professor_name: text('professor_name', 200),
      professor_email: text('professor_email', 254),
      class_location: text('class_location', 500),
      grading_method: gradingMethod,
      office_hours: officeHours,
      topics,
    },
  });
  if (error) throw error;
  return jsonResponse({ saved: true, syllabusId });
}

async function extractPrototypeText(supabase: SupabaseClient, userId: string, body: Record<string, unknown>) {
  const syllabusText = body.syllabusText;
  const courseName = typeof body.courseName === 'string' ? body.courseName.trim().slice(0, 500) : '';
  const canvasCourseId = typeof body.canvasCourseId === 'string'
    ? body.canvasCourseId.slice(0, 100)
    : null;
  const sourceName = typeof body.sourceName === 'string' ? body.sourceName.slice(0, 120) : null;
  const courseCode = typeof body.courseCode === 'string' ? body.courseCode.trim().slice(0, 100) : '';
  if (typeof syllabusText !== 'string' || !syllabusText.trim() || syllabusText.length > 50_000) {
    return jsonResponse({ error: 'Provide syllabus text between 1 and 50,000 characters.' }, 400);
  }
  if (!courseName) return jsonResponse({ error: 'A course name is required.' }, 400);
  if (!courseCode) return jsonResponse({ error: 'A course code is required to link this syllabus to your course.' }, 400);

  const syllabusInfo = await extractSyllabusInfo(syllabusText, courseName);
  const syllabusId = await saveExtractedSyllabus(supabase, userId, courseCode, syllabusInfo);
  const run = await savePrototypeRun(supabase, {
    canvasCourseId,
    courseName,
    sourceType: 'text',
    sourceName,
    inputCharacterCount: syllabusText.length,
    syllabusInfo,
  });
  return jsonResponse({ run, syllabusId, syllabusInfo });
}

async function extractPrototypeDocument(supabase: SupabaseClient, userId: string, form: FormData) {
  const courseNameValue = form.get('courseName');
  const courseName = typeof courseNameValue === 'string' ? courseNameValue.trim().slice(0, 500) : '';
  const courseIdValue = form.get('canvasCourseId');
  const canvasCourseId = typeof courseIdValue === 'string' ? courseIdValue.slice(0, 100) : null;
  const courseCodeValue = form.get('courseCode');
  const courseCode = typeof courseCodeValue === 'string' ? courseCodeValue.trim().slice(0, 100) : '';
  const uploadedFile = form.get('file');
  if (!courseName) return jsonResponse({ error: 'A course name is required.' }, 400);
  if (!courseCode) return jsonResponse({ error: 'A course code is required to link this syllabus to your course.' }, 400);
  if (!(uploadedFile instanceof File)) {
    return jsonResponse({ error: 'Upload a PDF or DOCX syllabus file.' }, 400);
  }
  if (uploadedFile.size === 0 || uploadedFile.size > 8 * 1024 * 1024) {
    return jsonResponse({ error: 'The syllabus document must be between 1 byte and 8 MB.' }, 413);
  }

  const filename = uploadedFile.name.replace(/[\\/\0]/g, '_').slice(0, 120);
  const extension = filename.toLowerCase().split('.').pop();
  const contentType = extension === 'pdf'
    ? 'application/pdf'
    : extension === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : null;
  if (!contentType) return jsonResponse({ error: 'Only PDF and DOCX files are supported.' }, 415);

  const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
  const isPdf = contentType === 'application/pdf' && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  const isDocx = contentType.includes('wordprocessingml') && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isPdf && !isDocx) {
    return jsonResponse({ error: 'The file contents do not match a PDF or DOCX document.' }, 415);
  }

  const document = new File([bytes], filename, { type: contentType });
  const syllabusInfo = await extractSyllabusFile(document, courseName);
  const syllabusId = await saveExtractedSyllabus(supabase, userId, courseCode, syllabusInfo);
  const run = await savePrototypeRun(supabase, {
    canvasCourseId,
    courseName,
    sourceType: extension as 'pdf' | 'docx',
    sourceName: filename,
    inputCharacterCount: 0,
    syllabusInfo,
  });
  return jsonResponse({ run, syllabusId, syllabusInfo });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createAdminClient();
    const documentAction = req.headers.get('x-rise-extension-action');
    if (documentAction === 'prototypeExtractSyllabusDocument') {
      const tokenUser = await findTokenUser(supabase, req.headers.get('x-rise-extension-token'));
      if (!tokenUser) {
        return jsonResponse({ error: 'Reconnect the extension to your Rise account.', code: 'reconnect_required' }, 401);
      }
      if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
        return jsonResponse({ error: 'Upload the document as multipart form data.' }, 400);
      }
      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > 9 * 1024 * 1024) {
        return jsonResponse({ error: 'The document upload exceeds the 8 MB limit.' }, 413);
      }
      return await extractPrototypeDocument(supabase, tokenUser.userId, await req.formData());
    }
    if (documentAction === 'extractSyllabusDocument') {
      if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
        return jsonResponse({ error: 'Upload the document as multipart form data.' }, 400);
      }
      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > 9 * 1024 * 1024) {
        return jsonResponse({ error: 'The document upload exceeds the 8 MB limit.' }, 413);
      }
      const tokenUser = await findTokenUser(supabase, req.headers.get('x-rise-extension-token'));
      if (!tokenUser) {
        return jsonResponse(
          { error: 'Reconnect the extension to your Rise account.', code: 'reconnect_required' },
          401,
        );
      }
      return await extractSyllabusDocument(supabase, tokenUser.userId, await req.formData());
    }

    const body = await req.json();

    if (body?.action === 'prototypeExtractSyllabusText') {
      const tokenUser = await findTokenUser(supabase, req.headers.get('x-rise-extension-token'));
      if (!tokenUser) {
        return jsonResponse({ error: 'Reconnect the extension to your Rise account.', code: 'reconnect_required' }, 401);
      }
      return await extractPrototypeText(supabase, tokenUser.userId, body);
    }

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

    if (body?.action === 'extractSyllabusText') {
      return await extractSyllabusText(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'saveManualSyllabus') {
      return await saveManualSyllabus(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'courses') {
      return await listCourses(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'missingSyllabusCourses') {
      return await listMissingSyllabusCourses(supabase, tokenUser.userId);
    }

    if (body?.action === 'saveCourseChoices') {
      return await saveCourseChoices(supabase, tokenUser.userId, body);
    }

    if (body?.action === 'saveSyllabusReview') {
      return await saveSyllabusReview(supabase, tokenUser.userId, body);
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
