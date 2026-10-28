import { isAssignmentUrgent } from '../isAssignmentUrgent';

describe('isAssignmentUrgent', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  it('marks an assignment due within 24 hours as urgent', () => {
    const dueAt = new Date('2026-10-29T11:00:00Z');

    expect(isAssignmentUrgent(dueAt, false, now)).toBe(true);
  });

  it('includes the exact 24-hour boundary', () => {
    const dueAt = new Date('2026-10-29T12:00:00Z');

    expect(isAssignmentUrgent(dueAt, false, now)).toBe(true);
  });

  it('does not mark an assignment just beyond 24 hours as urgent', () => {
    const dueAt = new Date('2026-10-29T12:00:00.001Z');

    expect(isAssignmentUrgent(dueAt, false, now)).toBe(false);
  });

  it('keeps overdue assignments urgent', () => {
    const dueAt = new Date('2026-10-27T12:00:00Z');

    expect(isAssignmentUrgent(dueAt, false, now)).toBe(true);
  });

  it('does not mark completed assignments as urgent', () => {
    const dueSoon = new Date('2026-10-28T13:00:00Z');
    const overdue = new Date('2026-10-27T12:00:00Z');

    expect(isAssignmentUrgent(dueSoon, true, now)).toBe(false);
    expect(isAssignmentUrgent(overdue, true, now)).toBe(false);
  });

  it('handles missing or invalid dates', () => {
    expect(isAssignmentUrgent(null, false, now)).toBe(false);
    expect(isAssignmentUrgent(new Date('invalid'), false, now)).toBe(false);
    expect(isAssignmentUrgent(now, false, new Date('invalid'))).toBe(false);
  });

  it('recalculates urgency when the saved due date changes', () => {
    const originalDueAt = new Date('2026-10-31T12:00:00Z');
    const updatedDueAt = new Date('2026-10-28T18:00:00Z');

    expect(isAssignmentUrgent(originalDueAt, false, now)).toBe(false);
    expect(isAssignmentUrgent(updatedDueAt, false, now)).toBe(true);
    expect(isAssignmentUrgent(originalDueAt, false, now)).toBe(false);
  });

  it('becomes urgent as time reaches the 24-hour window', () => {
    const dueAt = new Date('2026-10-29T13:00:00Z');
    const later = new Date('2026-10-28T13:00:00Z');

    expect(isAssignmentUrgent(dueAt, false, now)).toBe(false);
    expect(isAssignmentUrgent(dueAt, false, later)).toBe(true);
  });
});