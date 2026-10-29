// Estimates how long the student's assignments will take (#57).
//
// POST (no body) → { estimated, remaining }
//
// Finds the signed-in student's unfinished assignments that don't have an
// estimate yet, asks Claude for each one's time and kind, and saves them on
// the assignment. Each call handles one batch; `remaining` says whether to
// call again. The app shows its own guess for anything not estimated yet.
//
// Needs the ANTHROPIC_API_KEY secret:
//   npx supabase secrets set ANTHROPIC_API_KEY=...

import Anthropic from 'npm:@anthropic-ai/sdk@0.134.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.134.0/helpers/zod';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';

import {
  ASSIGNMENT_KINDS,
  buildEstimatePrompt,
  ESTIMATE_SYSTEM_PROMPT,
  readEstimates,
  type AssignmentToEstimate,
} from './estimateRequest.ts';

// Cheap and quick, and plenty for sizing up an assignment.
const MODEL = 'claude-haiku-5-5';

// Assignments per Claude request.
const BATCH_SIZE = 25;

const EstimatesSchema = z.object({
  estimates: z.array(
    z.object({
      id: z.string(),
      minutes: z.number(),
      kind: z.enum(ASSIGNMENT_KINDS),
    }),
  ),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  courses: { name: string; code: string | null } | null;
};

async function askClaude(anthropic: Anthropic, assignments: AssignmentToEstimate[]) {
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      effort: 'low',
      format: zodOutputFormat(EstimatesSchema),
    },
    system: ESTIMATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildEstimatePrompt(assignments) }],
  });

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(`Claude returned no estimates (stop reason: ${response.stop_reason})`);
  }

  return response.parsed_output.estimates;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!apiKey) {
    return jsonResponse({ error: 'Estimates are not set up yet.', code: 'ai_unavailable' }, 503);
  }

  try {
    // Act as the student, so row-level security limits this to their own
    // assignments.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sign in to RISE first.' }, 401);
    }

    // Soonest due first, so what's coming up gets a real estimate first.
    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, description, courses(name, code)')
      .is('estimated_minutes', null)
      .is('removed_at', null)
      .eq('completed', false)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(BATCH_SIZE + 1);

    if (error) throw error;

    const rows = (data ?? []) as unknown as AssignmentRow[];
    const batch = rows.slice(0, BATCH_SIZE);

    if (batch.length === 0) {
      return jsonResponse({ estimated: 0, remaining: false });
    }

    const estimates = readEstimates(
      await askClaude(
        new Anthropic({ apiKey }),
        batch.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          courseName: row.courses?.name ?? null,
          courseCode: row.courses?.code ?? null,
        })),
      ),
      batch.map((row) => row.id),
    );

    const estimatedAt = new Date().toISOString();

    for (const estimate of estimates) {
      const { error: updateError } = await supabase
        .from('assignments')
        .update({ estimated_minutes: estimate.minutes, kind: estimate.kind, estimated_at: estimatedAt })
        .eq('id', estimate.id);

      if (updateError) throw updateError;
    }

    return jsonResponse({ estimated: estimates.length, remaining: rows.length > BATCH_SIZE });
  } catch (error) {
    console.error('estimate-assignments failed:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
