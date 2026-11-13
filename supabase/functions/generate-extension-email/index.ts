// Writes an extension request email for the signed-in student (#72).
//
// POST { courseId?, className, assignmentTitle, dueAt?, reason?, timeZone? } → { subject, body }
//
// Claude writes a short, polite email to the class's professor. Nothing is
// saved or sent; the student copies the email and sends it themselves.
//
// Needs the ANTHROPIC_API_KEY secret (already set for estimate-assignments):
//   npx supabase secrets set ANTHROPIC_API_KEY=...

import Anthropic from 'npm:@anthropic-ai/sdk@0.134.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.134.0/helpers/zod';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'npm:zod@4.6.7';

import {
  buildEmailPrompt,
  EXTENSION_EMAIL_SYSTEM_PROMPT,
  InvalidEmailRequestError,
  parseEmailRequest,
  readEmail,
} from './extensionEmailRequest.ts';

// Same model as estimate-assignments: quick, and plenty for a short email.
const MODEL = 'claude-haiku-5-5';

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!apiKey) {
    return jsonResponse({ error: 'Email writing is not set up yet.', code: 'ai_unavailable' }, 503);
  }

  try {
    const request = parseEmailRequest(await req.json().catch(() => null));

    // Act as the student, so row-level security limits this to their profile.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sign in to RISE first.' }, 401);
    }

    // The sign-off. Without a name, Claude leaves "[Your name]" to fill in.
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userData.user.id)
      .maybeSingle();

    // The greeting. Mo's syllabus sync (#91) saves the professor per class;
    // without a syllabus, Claude writes "Dear Professor,".
    const { data: syllabus } = request.courseId
      ? await supabase.from('syllabi').select('professor_name').eq('course_id', request.courseId).maybeSingle()
      : { data: null };

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(EmailSchema),
      },
      system: EXTENSION_EMAIL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildEmailPrompt(
            {
              ...request,
              professorName: syllabus?.professor_name?.trim() || null,
              studentName: profile?.display_name?.trim() || null,
            },
            request.timeZone,
          ),
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      throw new Error(`Claude returned no email (stop reason: ${response.stop_reason})`);
    }

    return jsonResponse(readEmail(response.parsed_output));
  } catch (error) {
    if (error instanceof InvalidEmailRequestError) {
      return jsonResponse({ error: error.message, code: 'invalid_request' }, 400);
    }

    console.error('generate-extension-email failed:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
