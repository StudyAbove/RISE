import { getCalendarEventsInRange } from '../calendarEventsRepository';

// Lets each test turn the dev login skip on or off.
const mockDevFlags = { skipAuth: false };
jest.mock('../../lib/devFlags', () => ({
  get DEV_SKIP_AUTH() {
    return mockDevFlags.skipAuth;
  },
}));

// Records each step of the Supabase query so the filters can be checked.
const mockQuery = {
  from: jest.fn(),
  select: jest.fn(),
  lt: jest.fn(),
  gt: jest.fn(),
  order: jest.fn(),
};
jest.mock('../../lib/supabase', () => ({
  supabase: { from: (table: string) => mockQuery.from(table) },
}));

const rangeStart = new Date('2026-11-08T08:00:00.000Z');
const rangeEnd = new Date('2026-11-15T08:00:00.000Z');

function mockSupabaseResult(result: { data: unknown; error: unknown }) {
  mockQuery.from.mockReturnValue(mockQuery);
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.lt.mockReturnValue(mockQuery);
  mockQuery.gt.mockReturnValue(mockQuery);
  mockQuery.order.mockResolvedValue(result);
}

beforeEach(() => {
  mockDevFlags.skipAuth = false;
  jest.clearAllMocks();
});

describe('getCalendarEventsInRange', () => {
  it('asks Supabase for events that overlap the range, earliest first', async () => {
    mockSupabaseResult({ data: [], error: null });

    await getCalendarEventsInRange(rangeStart, rangeEnd);

    expect(mockQuery.from).toHaveBeenCalledWith('calendar_events');
    expect(mockQuery.lt).toHaveBeenCalledWith('start_at', '2026-11-15T08:00:00.000Z');
    expect(mockQuery.gt).toHaveBeenCalledWith('end_at', '2026-11-08T08:00:00.000Z');
    expect(mockQuery.order).toHaveBeenCalledWith('start_at');
  });

  it('converts database rows into CalendarEvent objects', async () => {
    mockSupabaseResult({
      data: [
        {
          id: 'event-1',
          user_id: 'user-1',
          title: 'Biology Lecture',
          start_at: '2026-11-13T17:00:00+00:00',
          end_at: '2026-11-13T18:30:00+00:00',
          source: 'google',
          location: null,
          description: 'Room 204',
        },
      ],
      error: null,
    });

    await expect(getCalendarEventsInRange(rangeStart, rangeEnd)).resolves.toEqual([
      {
        id: 'event-1',
        userId: 'user-1',
        title: 'Biology Lecture',
        startAt: '2026-11-13T17:00:00+00:00',
        endAt: '2026-11-13T18:30:00+00:00',
        source: 'google',
        location: undefined,
        description: 'Room 204',
      },
    ]);
  });

  it('throws the Supabase error so the screen can show an error state', async () => {
    const permissionError = { message: 'permission denied for table calendar_events' };
    mockSupabaseResult({ data: null, error: permissionError });

    await expect(getCalendarEventsInRange(rangeStart, rangeEnd)).rejects.toBe(permissionError);
  });

  it('returns sample events instead of querying Supabase while the login skip is on', async () => {
    mockDevFlags.skipAuth = true;
    const today = new Date();
    const weekAround = (days: number) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const events = await getCalendarEventsInRange(weekAround(-7), weekAround(7));

    expect(mockQuery.from).not.toHaveBeenCalled();
    expect(events.map((event) => event.title)).toContain('Biology Lecture');
    expect(events.every((event) => event.id.startsWith('mock-event-'))).toBe(true);
  });
});
