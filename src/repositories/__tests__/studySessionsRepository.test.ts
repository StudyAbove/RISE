import {
  getStudySecondsForAssignment,
  getTotalStudySeconds,
  recordStudySession,
} from '../studySessionsRepository';

// Lets each test turn the dev login skip on or off.
const mockDevFlags = { skipAuth: false };

jest.mock('../../lib/devFlags', () => ({
  get DEV_SKIP_AUTH() {
    return mockDevFlags.skipAuth;
  },
}));

// Records each step of the query; awaiting it gives mockResult.
let mockResult: { data: unknown; error: unknown } = { data: null, error: null };
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();

jest.mock('../../lib/supabase', () => {
  const query = {
    insert: (values: unknown) => {
      mockInsert(values);
      return query;
    },
    select: (columns: string) => {
      mockSelect(columns);
      return query;
    },
    eq: (column: string, value: string) => {
      mockEq(column, value);
      return query;
    },
    gte: (column: string, value: string) => {
      mockGte(column, value);
      return query;
    },
    then: (resolve: (value: unknown) => unknown) => resolve(mockResult),
  };

  return {
    supabase: {
      from: (table: string) => {
        mockFrom(table);
        return query;
      },
    },
  };
});

const session = {
  assignmentId: 'assignment-1',
  startedAt: new Date('2026-11-08T17:00:00.000Z'),
  endedAt: new Date('2026-11-08T17:50:00.000Z'),
  focusedSeconds: 2700.6,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDevFlags.skipAuth = false;
  mockResult = { data: null, error: null };
});

describe('recordStudySession (#49)', () => {
  it('saves the session for its assignment, in whole seconds (AC1, AC2)', async () => {
    await expect(recordStudySession(session)).resolves.toBe(true);

    expect(mockFrom).toHaveBeenCalledWith('study_sessions');
    expect(mockInsert).toHaveBeenCalledWith({
      assignment_id: 'assignment-1',
      started_at: '2026-11-08T17:00:00.000Z',
      ended_at: '2026-11-08T17:50:00.000Z',
      focused_seconds: 2700,
    });
  });

  it.each([59, 0, Number.NaN])('skips a session of %s seconds', async (focusedSeconds) => {
    await expect(recordStudySession({ ...session, focusedSeconds })).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('records exactly a minute', async () => {
    await expect(recordStudySession({ ...session, focusedSeconds: 60 })).resolves.toBe(true);
  });

  it('throws the Supabase error', async () => {
    const saveError = { message: 'new row violates row-level security policy' };
    mockResult = { data: null, error: saveError };

    await expect(recordStudySession(session)).rejects.toBe(saveError);
  });

  it('does not save while the login skip is on', async () => {
    mockDevFlags.skipAuth = true;

    await expect(recordStudySession(session)).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('study time totals (#49, AC3)', () => {
  it('adds up one assignment\'s sessions', async () => {
    mockResult = { data: [{ focused_seconds: 1500 }, { focused_seconds: 2700 }], error: null };

    await expect(getStudySecondsForAssignment('assignment-1')).resolves.toBe(4200);
    expect(mockSelect).toHaveBeenCalledWith('focused_seconds');
    expect(mockEq).toHaveBeenCalledWith('assignment_id', 'assignment-1');
  });

  it('adds up every session', async () => {
    mockResult = { data: [{ focused_seconds: 60 }, { focused_seconds: 3600 }], error: null };

    await expect(getTotalStudySeconds()).resolves.toBe(3660);
    expect(mockEq).not.toHaveBeenCalled();
    expect(mockGte).not.toHaveBeenCalled();
  });

  it('adds up only the sessions started since a date, e.g. this week', async () => {
    mockResult = { data: [{ focused_seconds: 1800 }], error: null };

    await expect(getTotalStudySeconds(new Date('2026-11-09T08:00:00.000Z'))).resolves.toBe(1800);
    expect(mockGte).toHaveBeenCalledWith('started_at', '2026-11-09T08:00:00.000Z');
  });

  it('is 0 with no sessions', async () => {
    mockResult = { data: [], error: null };

    await expect(getTotalStudySeconds()).resolves.toBe(0);
  });

  it('throws the Supabase error', async () => {
    const readError = { message: 'permission denied for table study_sessions' };
    mockResult = { data: null, error: readError };

    await expect(getStudySecondsForAssignment('assignment-1')).rejects.toBe(readError);
  });

  it('is 0 without asking Supabase while the login skip is on', async () => {
    mockDevFlags.skipAuth = true;

    await expect(getTotalStudySeconds()).resolves.toBe(0);
    await expect(getStudySecondsForAssignment('assignment-1')).resolves.toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
