import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

/** An unfinished assignment the student can ask for more time on. */
export type OpenAssignment = {
  id: string;
  title: string;
  dueAt: Date | null;
};

export type ExtensionEmail = {
  subject: string;
  body: string;
};

export type ExtensionEmailRequest = {
  /** So the function can find the professor's name in the class's syllabus. */
  courseId: string;
  className: string;
  assignmentTitle: string;
  dueAt: Date | null;
  reason: string | null;
};

// A code lets the screen tell "not set up" apart from other errors.
export class ExtensionEmailError extends Error {
  readonly code: string;

  constructor(code: string, message = 'Could not write the email.') {
    super(message);
    this.name = 'ExtensionEmailError';
    this.code = code;
  }
}

/**
 * One class's unfinished assignments, soonest due first, for the extension
 * email's Assignment dropdown (#72). Row-level security limits this to the
 * student's own assignments.
 */
export async function fetchOpenAssignmentsForCourse(courseId: string): Promise<OpenAssignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, due_at')
    .eq('course_id', courseId)
    .eq('completed', false)
    .is('removed_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const dueAt = row.due_at ? new Date(row.due_at) : null;

    return {
      id: row.id,
      title: row.title,
      dueAt: dueAt && Number.isFinite(dueAt.getTime()) ? dueAt : null,
    };
  });
}

/**
 * Asks the generate-extension-email function to write the email with Claude.
 * Nothing is saved or sent; the student copies it and sends it themselves.
 */
export async function requestExtensionEmail(request: ExtensionEmailRequest): Promise<ExtensionEmail> {
  const { data, error } = await supabase.functions.invoke('generate-extension-email', {
    method: 'POST',
    body: {
      courseId: request.courseId,
      className: request.className,
      assignmentTitle: request.assignmentTitle,
      dueAt: request.dueAt?.toISOString() ?? null,
      reason: request.reason,
      // So the email names the due date the student sees.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);

      if (typeof details?.code === 'string') {
        throw new ExtensionEmailError(details.code, details.error);
      }
    }

    throw new ExtensionEmailError('generation_failed');
  }

  if (typeof data?.subject !== 'string' || typeof data?.body !== 'string') {
    throw new ExtensionEmailError('invalid_response');
  }

  return { subject: data.subject, body: data.body };
}
