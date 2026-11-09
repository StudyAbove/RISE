import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

export type Microtask = {
  id: string;
  assignmentId: string;
  title: string;
  position: number;
  estimatedMinutes: number;
  completed: boolean;
  sourceBasis: string;
  planTotalMinutes: number;
};

type MicrotaskRow = {
  id: string;
  assignment_id: string;
  title: string;
  position: number;
  estimated_minutes: number;
  completed: boolean;
  source_basis: string;
  plan_total_minutes: number;
};

export type MicrotaskGenerationResult = {
  status: 'ready' | 'outdated' | 'insufficient_information';
  created: boolean;
};

// A code lets the screen distinguish a missing estimate from other errors.
export class MicrotaskGenerationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super('Could not generate microtasks.');
    this.name = 'MicrotaskGenerationError';
    this.code = code;
  }
}

/**
 * Read the selected assignment's saved tasks in their intended order.
 * Supabase's row-level security limits access to the student's own tasks.
 */
export async function fetchMicrotasks(
  assignmentId: string,
): Promise<Microtask[]> {
  const { data, error } = await supabase
    .from('assignment_microtasks')
    .select(
      'id, assignment_id, title, position, estimated_minutes, completed, source_basis, plan_total_minutes',
    )
    .eq('assignment_id', assignmentId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MicrotaskRow[]).map((row) => ({
    id: row.id,
    assignmentId: row.assignment_id,
    title: row.title,
    position: row.position,
    estimatedMinutes: row.estimated_minutes,
    completed: row.completed,
    sourceBasis: row.source_basis,
    planTotalMinutes: row.plan_total_minutes,
  }));
}

/**
 * Ask the backend to generate and save a plan for this assignment.
 * Only the ID is sent; the backend reads the actual saved instructions.
 * Existing plans are preserved rather than replaced.
 */
export async function requestMicrotaskGeneration(
  assignmentId: string,
): Promise<MicrotaskGenerationResult> {
  const { data, error } = await supabase.functions.invoke(
    'generate-microtasks',
    {
      method: 'POST',
      body: { assignmentId },
    },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const details = await error.context.json();

        if (typeof details?.code === 'string') {
          throw new MicrotaskGenerationError(details.code);
        }
      } catch (responseError) {
        if (responseError instanceof MicrotaskGenerationError) {
          throw responseError;
        }

        // An unreadable error response uses the generic failure below.
      }
    }

    throw new MicrotaskGenerationError('generation_failed');
  }

  if (
    !data ||
    !['ready', 'outdated', 'insufficient_information'].includes(data.status) ||
    typeof data.created !== 'boolean'
  ) {
    throw new MicrotaskGenerationError('invalid_response');
  }

  return {
    status: data.status,
    created: data.created,
  };
}
/**
 * Save an explicit completion choice, including undo.
 * Only completion changes; task details and assignment completion stay intact.
 * Supabase permissions and row-level security enforce ownership.
 */
export async function setMicrotaskCompleted(
  assignmentId: string,
  microtaskId: string,
  completed: boolean,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('assignment_microtasks')
    .update({ completed })
    .eq('assignment_id', assignmentId)
    .eq('id', microtaskId)
    .select('completed')
    .maybeSingle();

  if (error) {
    throw error;
  }

  // No returned row means the task was missing or unavailable to this user.
  // Never show a successful completion when nothing was saved.
  if (!data || data.completed !== completed) {
    throw new Error('Could not save task completion. Please try again.');
  }

  return data.completed;
}