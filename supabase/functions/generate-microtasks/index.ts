// Generates and saves an assignment's microtasks (#42).
//
// POST { assignmentId }
// Returns { status, created }.
//
// Reads assignments using the student's session.
// Uses backend-only credentials solely to save a validated plan.

import Anthropic from 'npm:@anthropic-ai/sdk@0.134.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.134.0/helpers/zod';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';

import {
  buildMicrotaskPrompt,
  InvalidMicrotaskPlanError,
  MICROTASK_SYSTEM_PROMPT,
  readMicrotaskPlan,
  type AssignmentToBreakDown,
  type MicrotaskPlan,
} from './microtaskRequest.ts';

// Match the model used by the existing assignment-estimate function.
// A backend environment variable can override it if the team changes models.
const MODEL =
  Deno.env.get('MICROTASK_MODEL') ?? 'claude-haiku-5-5';

const PlanSchema = z.object({
  status: z.enum(['ready', 'insufficient_information']),
  tasks: z.array(
    z.object({
      title: z.string(),
      minutes: z.number(),
    }),
  ),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  estimated_minutes: number | null;
  courses: {
    name: string;
    code: string | null;
    sync_enabled: boolean;
  } | null;
};

type ExistingTask = {
  source_basis: string;
  plan_total_minutes: number;
};

// Try once more if the returned plan fails our numeric/content checks.
// Transport failures and refusals do not trigger another automatic request.
async function askClaude(
  anthropic: Anthropic,
  assignment: AssignmentToBreakDown,
): Promise<MicrotaskPlan> {
  let correction = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(PlanSchema),
      },
      system: MICROTASK_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            buildMicrotaskPrompt(assignment),
            correction,
          ].filter(Boolean).join('\n\n'),
        },
      ],
    });

    if (
      response.stop_reason === 'refusal' ||
      !response.parsed_output
    ) {
      throw new Error('No microtask plan was returned.');
    }

    try {
      return readMicrotaskPlan(
        response.parsed_output,
        assignment.estimatedMinutes,
      );
    } catch (error) {
      if (!(error instanceof InvalidMicrotaskPlanError)) {
        throw error;
      }

      if (attempt === 1) {
        throw error;
      }

      correction =
        `The previous response was invalid: ${error.message} ` +
        `Create a corrected plan totaling exactly ` +
        `${assignment.estimatedMinutes} minutes.`;
    }
  }

  throw new InvalidMicrotaskPlanError('No valid plan was returned.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !anonKey) {
      return jsonResponse({
        error: 'Microtasks are not set up yet.',
        code: 'not_configured',
      }, 503);
    }

    // This client acts as the student and respects row-level security.
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sign in to RISE first.' }, 401);
    }

    // Only an assignment ID comes from the app.
    // Instructions, ownership, and time estimates come from the database.
    const rawBody = await req.text();

    if (rawBody.length > 1024) {
      return jsonResponse({ error: 'Request is too large.' }, 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Expected a valid JSON request.' }, 400);
    }

    const assignmentId =
      typeof body === 'object' && body !== null &&
      'assignmentId' in body
        ? body.assignmentId
        : null;

    if (
      typeof assignmentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        .test(assignmentId)
    ) {
      return jsonResponse({ error: 'A valid assignment ID is required.' }, 400);
    }

    const { data, error } = await supabase
      .from('assignments')
      .select(
        'id, title, description, completed, estimated_minutes, courses(name, code, sync_enabled)',
      )
      .eq('id', assignmentId)
      .eq('user_id', userData.user.id)
      .is('removed_at', null)
      .maybeSingle();

    if (error) throw error;

    const assignment = data as unknown as AssignmentRow | null;

    if (!assignment || assignment.courses?.sync_enabled === false) {
      return jsonResponse({ error: 'Assignment is unavailable.' }, 404);
    }

    const { data: existingData, error: existingError } = await supabase
      .from('assignment_microtasks')
      .select('source_basis, plan_total_minutes')
      .eq('assignment_id', assignmentId)
      .order('position');

    if (existingError) throw existingError;

    const existingTasks =
      (existingData ?? []) as ExistingTask[];

    // Saved plans do not require another AI request.
    // Changed assignments are flagged without deleting completed work.
    if (existingTasks.length > 0) {
      const { data: basis, error: basisError } = await supabase.rpc(
        'assignment_estimate_basis',
        {
          title: assignment.title,
          description: assignment.description,
        },
      );

      if (basisError) throw basisError;
      if (typeof basis !== 'string') {
        throw new Error('Could not check the saved plan.');
      }

      const outdated = existingTasks.some(
        (task) =>
          task.source_basis !== basis ||
          task.plan_total_minutes !== assignment.estimated_minutes,
      );

      return jsonResponse({
        status: outdated ? 'outdated' : 'ready',
        created: false,
      });
    }

    if (assignment.completed) {
      return jsonResponse({
        error: 'This assignment is already completed.',
        code: 'assignment_completed',
      }, 409);
    }

    const totalMinutes = assignment.estimated_minutes;

    if (
      totalMinutes === null ||
      !Number.isInteger(totalMinutes) ||
      totalMinutes < 5 ||
      totalMinutes > 6000
    ) {
      return jsonResponse({
        error: 'This assignment needs a saved time estimate first.',
        code: 'estimate_required',
      }, 409);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !serviceRoleKey) {
      return jsonResponse({
        error: 'Microtask generation is not set up yet.',
        code: 'ai_unavailable',
      }, 503);
    }

    const plan = await askClaude(
      new Anthropic({
        apiKey,
        maxRetries: 0,
        timeout: 60_000,
      }),
      {
        title: assignment.title,
        description: assignment.description,
        courseName: assignment.courses?.name ?? null,
        courseCode: assignment.courses?.code ?? null,
        estimatedMinutes: totalMinutes,
      },
    );

    if (plan.status === 'insufficient_information') {
      return jsonResponse({
        status: 'insufficient_information',
        created: false,
      });
    }

    // This client is backend-only. Never send its key to the mobile app.
    // The save function checks ownership again and saves the whole plan.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: created, error: saveError } = await admin.rpc(
      'save_assignment_microtasks',
      {
        p_assignment_id: assignmentId,
        p_user_id: userData.user.id,
        p_title: assignment.title,
        p_description: assignment.description,
        p_total_minutes: totalMinutes,
        p_tasks: plan.tasks,
      },
    );

    if (saveError) throw saveError;

    // False means another request already saved a plan.
    // The app reads the saved tasks afterward in either case.
    return jsonResponse({
      status: 'ready',
      created: created === true,
    });
  } catch (error) {
    // Do not log student instructions or credential values.
    console.error(
      'generate-microtasks failed:',
      error instanceof Error ? error.name : 'UnknownError',
    );

    return jsonResponse({
      error: 'Couldn’t create microtasks. Please try again.',
      code:
        error instanceof InvalidMicrotaskPlanError
          ? 'invalid_plan'
          : 'generation_failed',
    }, error instanceof InvalidMicrotaskPlanError ? 502 : 500);
  }
});