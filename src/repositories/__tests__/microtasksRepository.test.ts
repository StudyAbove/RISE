import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { FunctionsHttpError } from '@supabase/supabase-js';

import {
  fetchMicrotasks,
  MicrotaskGenerationError,
  requestMicrotaskGeneration,
  setMicrotaskCompleted,
} from '../microtasksRepository';

const mockQueryResult = jest.fn<() => {
  data: unknown;
  error: unknown;
}>();

const mockInvoke = jest.fn<
  (...args: unknown[]) => Promise<{
    data: unknown;
    error: unknown;
  }>
>();

const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockUpdate = jest.fn();

// These tests do not access Supabase or make real AI requests.
jest.mock('../../lib/supabase', () => {
  const query = {
    update: (values: { completed: boolean }) => {
      mockUpdate(values);
      return query;
    },
    maybeSingle: () => Promise.resolve(mockQueryResult()),
    select: () => query,
    eq: (column: string, value: string) => {
      mockEq(column, value);
      return query;
    },
    order: (column: string, options: unknown) => {
      mockOrder(column, options);
      return Promise.resolve(mockQueryResult());
    },
  };

  return {
    supabase: {
      from: () => query,
      functions: {
        invoke: (...args: unknown[]) => mockInvoke(...args),
      },
    },
  };
});

// Sample saved task, used only by the tests.
function taskRow() {
  return {
    id: 'task-1',
    assignment_id: 'assignment-1',
    title: 'Organize experimental data',
    position: 1,
    estimated_minutes: 15,
    completed: false,
    source_basis: 'sample-instructions-fingerprint',
    plan_total_minutes: 80,
  };
}

beforeEach(() => {
  mockQueryResult.mockReset();
  mockInvoke.mockReset();
  mockEq.mockReset();
  mockOrder.mockReset();
  mockUpdate.mockReset();

  mockQueryResult.mockReturnValue({
    data: [],
    error: null,
  });

  mockInvoke.mockResolvedValue({
    data: { status: 'ready', created: true },
    error: null,
  });
});

describe('fetchMicrotasks', () => {
  it('reads the selected assignment and requests tasks in order', async () => {
    mockQueryResult.mockReturnValue({
      data: [taskRow()],
      error: null,
    });

    const tasks = await fetchMicrotasks('assignment-1');

    expect(mockEq).toHaveBeenCalledWith(
      'assignment_id',
      'assignment-1',
    );

    expect(mockOrder).toHaveBeenCalledWith(
      'position',
      { ascending: true },
    );

    expect(tasks).toEqual([
      {
        id: 'task-1',
        assignmentId: 'assignment-1',
        title: 'Organize experimental data',
        position: 1,
        estimatedMinutes: 15,
        completed: false,
        sourceBasis: 'sample-instructions-fingerprint',
        planTotalMinutes: 80,
      },
    ]);
  });

  it('preserves the saved completion status', async () => {
    mockQueryResult.mockReturnValue({
      data: [{ ...taskRow(), completed: true }],
      error: null,
    });

    const tasks = await fetchMicrotasks('assignment-1');

    expect(tasks[0].completed).toBe(true);
  });

  it('returns an empty list when no tasks exist', async () => {
    await expect(fetchMicrotasks('assignment-1')).resolves.toEqual([]);
  });

  it('reports database errors instead of pretending there are no tasks', async () => {
    const error = new Error('Could not load tasks');

    mockQueryResult.mockReturnValue({
      data: null,
      error,
    });

    await expect(fetchMicrotasks('assignment-1')).rejects.toBe(error);
  });
});

describe('requestMicrotaskGeneration', () => {
  it('sends only the selected assignment ID to the backend', async () => {
    const result = await requestMicrotaskGeneration('assignment-1');

    expect(mockInvoke).toHaveBeenCalledWith(
      'generate-microtasks',
      {
        method: 'POST',
        body: { assignmentId: 'assignment-1' },
      },
    );

    expect(result).toEqual({
      status: 'ready',
      created: true,
    });
  });

  it('accepts an existing plan without requiring new tasks', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ready', created: false },
      error: null,
    });

    await expect(
      requestMicrotaskGeneration('assignment-1'),
    ).resolves.toEqual({
      status: 'ready',
      created: false,
    });
  });

  it.each(['outdated', 'insufficient_information'])(
    'preserves the backend status: %s',
    async (status) => {
      mockInvoke.mockResolvedValue({
        data: { status, created: false },
        error: null,
      });

      await expect(
        requestMicrotaskGeneration('assignment-1'),
      ).resolves.toEqual({
        status,
        created: false,
      });
    },
  );

  it('preserves the missing-estimate error code for the screen', async () => {
    const error = new FunctionsHttpError({
      json: async () => ({
        code: 'estimate_required',
      }),
    });

    mockInvoke.mockResolvedValue({
      data: null,
      error,
    });

    await expect(
      requestMicrotaskGeneration('assignment-1'),
    ).rejects.toMatchObject({
      name: 'MicrotaskGenerationError',
      code: 'estimate_required',
    });
  });

  it('handles an unreadable backend error response', async () => {
    const error = new FunctionsHttpError({
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    mockInvoke.mockResolvedValue({
      data: null,
      error,
    });

    await expect(
      requestMicrotaskGeneration('assignment-1'),
    ).rejects.toMatchObject({
      code: 'generation_failed',
    });
  });

  it('handles connection failures', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('Connection failed'),
    });

    await expect(
      requestMicrotaskGeneration('assignment-1'),
    ).rejects.toBeInstanceOf(MicrotaskGenerationError);
  });

  it.each([
    null,
    {},
    { status: 'unexpected', created: false },
    { status: 'ready', created: 'yes' },
  ])('rejects malformed success responses', async (data) => {
    mockInvoke.mockResolvedValue({
      data,
      error: null,
    });

    await expect(
      requestMicrotaskGeneration('assignment-1'),
    ).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});
  describe('setMicrotaskCompleted', () => {
  it.each([true, false])(
    'saves completion as %s for the selected task and assignment',
    async (completed) => {
      mockQueryResult.mockReturnValue({
        data: { completed },
        error: null,
      });

      await expect(
        setMicrotaskCompleted('assignment-1', 'task-1', completed),
      ).resolves.toBe(completed);

      expect(mockUpdate).toHaveBeenCalledWith({ completed });

      expect(mockEq).toHaveBeenCalledWith(
        'assignment_id',
        'assignment-1',
      );

      expect(mockEq).toHaveBeenCalledWith('id', 'task-1');
    },
  );

  it('allows the same completion choice to be retried safely', async () => {
    mockQueryResult.mockReturnValue({
      data: { completed: true },
      error: null,
    });

    await setMicrotaskCompleted('assignment-1', 'task-1', true);
    await setMicrotaskCompleted('assignment-1', 'task-1', true);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { completed: true });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { completed: true });
  });

  it('reports database errors so the screen can offer a retry', async () => {
    const error = new Error('Connection failed');

    mockQueryResult.mockReturnValue({
      data: null,
      error,
    });

    await expect(
      setMicrotaskCompleted('assignment-1', 'task-1', true),
    ).rejects.toBe(error);
  });

  it('does not claim success when the task is unavailable', async () => {
    mockQueryResult.mockReturnValue({
      data: null,
      error: null,
    });

    await expect(
      setMicrotaskCompleted('assignment-1', 'task-1', true),
    ).rejects.toThrow('Could not save task completion');
  });

  it('rejects a response that does not match the requested completion', async () => {
    mockQueryResult.mockReturnValue({
      data: { completed: false },
      error: null,
    });

    await expect(
      setMicrotaskCompleted('assignment-1', 'task-1', true),
    ).rejects.toThrow('Could not save task completion');
  });
});