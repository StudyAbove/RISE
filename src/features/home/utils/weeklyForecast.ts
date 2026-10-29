import { addDays, format, isSameDay, startOfDay } from 'date-fns';

import {
  getAssignmentEstimate,
  type AssignmentKind,
} from '../../assignments/utils/assignmentEstimate';
import { getStartBy } from '../../assignments/utils/startBy';
import type { Assignment } from '../../../repositories/assignmentsRepository';

/**
 * The Weekly Forecast card on Home (#57): how busy the next 7 days look and
 * which assignments to start first.
 *
 * Works on assignments for now. Once microtasks exist (#42, #43), they can
 * become work items here instead, with their own times and due dates.
 */

export type ForecastLevel = 'clear' | 'light' | 'medium' | 'heavy';

export type ForecastItem = {
  id: string;
  title: string;
  /** "EE 381" or the class name, when the assignment has a class. */
  courseLabel: string | null;
  courseColor: string;
  dueAt: Date;
  minutes: number;
  kind: AssignmentKind;
};

export type WeeklyForecast = {
  level: ForecastLevel;
  title: string;
  summary: string;
  /** Up to 3 assignments to start first, most urgent first. */
  recommended: ForecastItem[];
  totalMinutes: number;
};

const FORECAST_DAYS = 7;
const MAX_RECOMMENDED = 3;

// Week levels, in hours of work due in the next 7 days.
const MEDIUM_WEEK_MINUTES = 5 * 60;
const HEAVY_WEEK_MINUTES = 10 * 60;

const LEVEL_TITLES: Record<ForecastLevel, string> = {
  clear: 'Your week looks clear',
  light: 'Light week ahead',
  medium: 'Medium week ahead',
  heavy: 'Heavy week ahead',
};

/** Unfinished assignments due in the next 7 days, counting their due times. */
function getWeekItems(assignments: Assignment[], now: Date): ForecastItem[] {
  const weekEnd = now.getTime() + FORECAST_DAYS * 24 * 60 * 60 * 1000;

  return assignments.flatMap((assignment) => {
    const { dueAt } = assignment;

    if (assignment.completed || !dueAt) return [];

    const dueTime = dueAt.getTime();
    if (dueTime <= now.getTime() || dueTime > weekEnd) return [];

    const { minutes, kind } = getAssignmentEstimate(assignment);

    return [
      {
        id: assignment.id,
        title: assignment.title,
        courseLabel: assignment.courseCode ?? assignment.courseName,
        courseColor: assignment.courseColor,
        dueAt,
        minutes,
        kind,
      },
    ];
  });
}

/**
 * Light under 5 hours, medium from 5, heavy from 10. An exam makes the week
 * at least medium, and an exam plus 5 hours of other work makes it heavy.
 */
export function getForecastLevel(items: ForecastItem[]): ForecastLevel {
  if (items.length === 0) return 'clear';

  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
  const exams = items.filter((item) => item.kind === 'exam');
  const otherMinutes = items
    .filter((item) => item.kind !== 'exam')
    .reduce((sum, item) => sum + item.minutes, 0);

  if (totalMinutes >= HEAVY_WEEK_MINUTES) return 'heavy';
  if (exams.length > 0 && otherMinutes >= MEDIUM_WEEK_MINUTES) return 'heavy';
  if (totalMinutes >= MEDIUM_WEEK_MINUTES || exams.length > 0) return 'medium';
  return 'light';
}

function startBy(item: ForecastItem): number {
  return getStartBy(item.dueAt, item.minutes).getTime();
}

/** What to start first: whatever must be started soonest, then bigger work. */
export function rankForecastItems(items: ForecastItem[]): ForecastItem[] {
  return [...items].sort(
    (a, b) => startBy(a) - startBy(b) || b.minutes - a.minutes,
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** "Today", "Tomorrow", or the weekday, e.g. "Thursday". */
function dayName(date: Date, now: Date) {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  return format(date, 'EEEE');
}

/** The day with the most work due, when the work is spread over several days. */
function getBusiestDay(items: ForecastItem[]): Date | null {
  const minutesByDay = new Map<number, number>();

  for (const item of items) {
    const day = startOfDay(item.dueAt).getTime();
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + item.minutes);
  }

  if (minutesByDay.size < 2) return null;

  const [busiestDay] = [...minutesByDay].reduce((busiest, day) =>
    day[1] > busiest[1] ? day : busiest,
  );

  return new Date(busiestDay);
}

function getSummary(items: ForecastItem[], now: Date) {
  if (items.length === 0) {
    return 'Nothing is due in the next 7 days. Enjoy the breathing room!';
  }

  const examCount = items.filter((item) => item.kind === 'exam').length;
  const assignmentCount = items.length - examCount;

  const counts = [
    assignmentCount > 0 && `${plural(assignmentCount, 'assignment')} due`,
    examCount > 0 && `${plural(examCount, 'exam')} coming up`,
  ]
    .filter(Boolean)
    .join(' and ');

  const busiestDay = getBusiestDay(items);
  const callout = busiestDay
    ? `${dayName(busiestDay, now)} is your busiest day.`
    : 'Let’s get ahead!';

  return `You have ${counts}. ${callout}`;
}

export function buildWeeklyForecast(
  assignments: Assignment[],
  now: Date,
): WeeklyForecast {
  const items = getWeekItems(assignments, now);
  const level = getForecastLevel(items);

  return {
    level,
    title: LEVEL_TITLES[level],
    summary: getSummary(items, now),
    recommended: rankForecastItems(items).slice(0, MAX_RECOMMENDED),
    totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
  };
}

/** "Fri 11:59 PM", or "Today 11:59 PM". */
export function formatForecastDue(dueAt: Date, now: Date): string {
  const day = isSameDay(dueAt, now) ? 'Today' : format(dueAt, 'EEE');
  return `${day} ${format(dueAt, 'h:mm a')}`;
}
