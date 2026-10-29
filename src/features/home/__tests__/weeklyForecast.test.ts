import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  buildWeeklyForecast,
  formatForecastDue,
  getForecastLevel,
  type ForecastItem,
} from '../utils/weeklyForecast';

// Monday, November 9, 2026 at 9 AM, local time.
const now = new Date(2026, 10, 9, 9, 0);

let nextId = 1;

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: `a${nextId++}`,
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 13, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: 'Electrical Engineering',
    courseCode: 'EE 381',
    courseColor: '#8FA8F0',
    courseTint: '#E3E9FC',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
    ...overrides,
  };
}

function item(minutes: number, kind: ForecastItem['kind'] = 'homework'): ForecastItem {
  return {
    id: `i${nextId++}`,
    title: 'Work',
    courseLabel: null,
    courseColor: '#8FA8F0',
    dueAt: new Date(2026, 10, 12, 12, 0),
    minutes,
    kind,
  };
}

describe('getForecastLevel', () => {
  it('is light under 5 hours, medium from 5, and heavy from 10', () => {
    expect(getForecastLevel([item(4 * 60 + 55)])).toBe('light');
    expect(getForecastLevel([item(5 * 60)])).toBe('medium');
    expect(getForecastLevel([item(9 * 60), item(55)])).toBe('medium');
    expect(getForecastLevel([item(10 * 60)])).toBe('heavy');
  });

  it('makes a week with an exam at least medium', () => {
    expect(getForecastLevel([item(60, 'exam')])).toBe('medium');
    expect(getForecastLevel([item(60, 'exam'), item(60)])).toBe('medium');
  });

  it('makes an exam plus 5 hours of other work heavy', () => {
    expect(getForecastLevel([item(4 * 60, 'exam'), item(5 * 60)])).toBe('heavy');
  });

  it('is clear with nothing to do', () => {
    expect(getForecastLevel([])).toBe('clear');
  });
});

describe('buildWeeklyForecast', () => {
  it('says the week looks clear when nothing is due in the next 7 days', () => {
    const forecast = buildWeeklyForecast(
      [
        assignment({ dueAt: new Date(2026, 10, 17, 9, 1) }),
        assignment({ dueAt: new Date(2026, 10, 10), completed: true }),
        assignment({ dueAt: null }),
      ],
      now,
    );

    expect(forecast).toMatchObject({
      level: 'clear',
      title: 'Your week looks clear',
      summary: 'Nothing is due in the next 7 days. Enjoy the breathing room!',
      recommended: [],
    });
  });

  it('uses due times, not just dates, for the 7 days', () => {
    const forecast = buildWeeklyForecast(
      [
        // Due earlier today, so it's already passed.
        assignment({ title: 'Earlier today', dueAt: new Date(2026, 10, 9, 8, 0) }),
        assignment({ title: 'Later today', dueAt: new Date(2026, 10, 9, 23, 59) }),
        // Exactly 7 days from now counts; a minute later doesn't.
        assignment({ title: 'Last minute', dueAt: new Date(2026, 10, 16, 9, 0) }),
        assignment({ title: 'Too late', dueAt: new Date(2026, 10, 16, 9, 1) }),
      ],
      now,
    );

    expect(forecast.recommended.map((entry) => entry.title)).toEqual([
      'Later today',
      'Last minute',
    ]);
  });

  it('counts assignments and exams and calls out the busiest day', () => {
    const forecast = buildWeeklyForecast(
      [
        assignment({ dueAt: new Date(2026, 10, 10, 23, 59), estimatedMinutes: 30 }),
        assignment({ dueAt: new Date(2026, 10, 12, 10, 0), estimatedMinutes: 90 }),
        assignment({ dueAt: new Date(2026, 10, 12, 23, 59), estimatedMinutes: 60 }),
        assignment({
          title: 'Midterm',
          dueAt: new Date(2026, 10, 13, 9, 0),
          estimatedMinutes: 120,
          kind: 'exam',
        }),
      ],
      now,
    );

    expect(forecast.level).toBe('medium');
    expect(forecast.title).toBe('Medium week ahead');
    expect(forecast.summary).toBe(
      'You have 3 assignments due and 1 exam coming up. Thursday is your busiest day.',
    );
  });

  it('shows only the top 3, starting with what needs the earliest start', () => {
    const forecast = buildWeeklyForecast(
      [
        assignment({ title: 'Short quiz', dueAt: new Date(2026, 10, 11, 9, 0), estimatedMinutes: 30 }),
        // Due later but needs 3 days of work, so it should be started first.
        assignment({ title: 'Big project', dueAt: new Date(2026, 10, 13, 9, 0), estimatedMinutes: 300 }),
        assignment({ title: 'Reading', dueAt: new Date(2026, 10, 14, 9, 0), estimatedMinutes: 30 }),
        assignment({ title: 'Lab', dueAt: new Date(2026, 10, 12, 9, 0), estimatedMinutes: 120 }),
      ],
      now,
    );

    expect(forecast.recommended.map((entry) => entry.title)).toEqual([
      'Big project',
      'Short quiz',
      'Lab',
    ]);
  });

  it('guesses a time for assignments that have no estimate yet', () => {
    const forecast = buildWeeklyForecast(
      [assignment({ title: 'Final Exam', estimatedMinutes: null, kind: null })],
      now,
    );

    expect(forecast.recommended[0]).toMatchObject({ minutes: 240, kind: 'exam' });
    expect(forecast.summary).toBe('You have 1 exam coming up. Let’s get ahead!');
  });

  it('shows the class code, or the class name when there is no code', () => {
    const forecast = buildWeeklyForecast(
      [
        assignment({ courseCode: null, courseName: 'Cell Biology' }),
        assignment({ courseCode: null, courseName: null }),
      ],
      now,
    );

    expect(forecast.recommended.map((entry) => entry.courseLabel)).toEqual([
      'Cell Biology',
      null,
    ]);
  });
});

describe('formatForecastDue', () => {
  it('shows the weekday and time, or Today', () => {
    expect(formatForecastDue(new Date(2026, 10, 13, 23, 59), now)).toBe('Fri 11:59 PM');
    expect(formatForecastDue(new Date(2026, 10, 9, 17, 0), now)).toBe('Today 5:00 PM');
  });
});
