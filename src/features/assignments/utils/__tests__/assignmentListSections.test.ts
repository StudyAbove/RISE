import { describe, expect, it } from '@jest/globals';

import type { Assignment } from '../../../../repositories/assignmentsRepository';
import { getAssignmentListSections } from '../assignmentListSections';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-10T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assignment-1',
    title: 'Lab Report',
    description: null,
    dueAt: new Date('2026-11-12T12:00:00Z'),
    completed: false,
    completedAt: null,
    source: 'canvas',
    courseName: 'Biology',
    courseCode: 'BIO 200',
    courseColor: '#A8BEA3',
    courseTint: '#EAF0E8',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'lab',
    ...overrides,
  };
}

describe('getAssignmentListSections', () => {
  it('puts recent overdue work before upcoming work and undated work', () => {
    const upcoming = assignment({ id: 'upcoming' });
    const undated = assignment({ id: 'undated', dueAt: null });
    const overdue = assignment({ id: 'overdue', dueAt: daysAgo(1) });

    const result = getAssignmentListSections(
      [upcoming, undated, overdue],
      now,
    );

    expect(result.currentAssignments.map((item) => item.id)).toEqual([
      'overdue',
      'upcoming',
      'undated',
    ]);
    expect(result.pastAssignments).toEqual([]);
  });

  it('keeps unfinished work in the main list until exactly 2 days overdue', () => {
    const task = assignment({
      dueAt: new Date(now.getTime() - 2 * DAY_MS + 1),
    });

    expect(
      getAssignmentListSections([task], now).currentAssignments,
    ).toEqual([task]);
  });

  it('moves unfinished work to Past at exactly 2 days overdue', () => {
    const task = assignment({ dueAt: daysAgo(2) });
    const result = getAssignmentListSections([task], now);

    expect(result.currentAssignments).toEqual([]);
    expect(result.pastAssignments).toEqual([task]);
  });

  it('keeps overdue work for 14 days after it enters Past', () => {
    const task = assignment({
      dueAt: new Date(now.getTime() - 16 * DAY_MS + 1),
    });

    expect(
      getAssignmentListSections([task], now).pastAssignments,
    ).toEqual([task]);
  });

  it('hides unfinished work after exactly 14 days in Past', () => {
    const task = assignment({ dueAt: daysAgo(16) });
    const result = getAssignmentListSections([task], now);

    expect(result.currentAssignments).toEqual([]);
    expect(result.pastAssignments).toEqual([]);
  });

  it('moves completed work directly to Past even before its due date', () => {
    const task = assignment({
      completed: true,
      completedAt: now,
    });
    const result = getAssignmentListSections([task], now);

    expect(result.currentAssignments).toEqual([]);
    expect(result.pastAssignments).toEqual([task]);
  });

  it('keeps completed work until 14 days after completion', () => {
    const task = assignment({
      completed: true,
      completedAt: new Date(now.getTime() - 14 * DAY_MS + 1),
    });

    expect(
      getAssignmentListSections([task], now).pastAssignments,
    ).toEqual([task]);
  });

  it('hides completed work at exactly 14 days after completion', () => {
    const task = assignment({
      completed: true,
      completedAt: daysAgo(14),
    });
    const result = getAssignmentListSections([task], now);

    expect(result.currentAssignments).toEqual([]);
    expect(result.pastAssignments).toEqual([]);
  });

  it('uses completion time instead of an old due date for completed work', () => {
    const task = assignment({
      completed: true,
      completedAt: daysAgo(1),
      dueAt: daysAgo(90),
    });

    expect(
      getAssignmentListSections([task], now).pastAssignments,
    ).toEqual([task]);
  });

  it('keeps completed work in Past if its completion date is unavailable', () => {
    const task = assignment({
      completed: true,
      completedAt: null,
    });
    const result = getAssignmentListSections([task], now);

    expect(result.currentAssignments).toEqual([]);
    expect(result.pastAssignments).toEqual([task]);
  });

  it('orders Past by when assignments entered it, newest first', () => {
    const older = assignment({
      id: 'older',
      completed: true,
      completedAt: daysAgo(5),
    });
    const recentOverdue = assignment({
      id: 'recent-overdue',
      dueAt: daysAgo(3),
    });
    const newest = assignment({
      id: 'newest',
      completed: true,
      completedAt: now,
    });

    const result = getAssignmentListSections(
      [older, recentOverdue, newest],
      now,
    );

    expect(result.pastAssignments.map((item) => item.id)).toEqual([
      'newest',
      'recent-overdue',
      'older',
    ]);
  });

  it('does not delete or change the supplied assignments', () => {
    const expired = assignment({
      completed: true,
      completedAt: daysAgo(20),
    });
    const assignments = [expired];

    getAssignmentListSections(assignments, now);

    expect(assignments).toEqual([expired]);
    expect(expired.completed).toBe(true);
    expect(expired.completedAt).toEqual(daysAgo(20));
  });
});