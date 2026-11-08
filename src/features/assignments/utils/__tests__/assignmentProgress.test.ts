import {
  getAssignmentProgressPercent,
  getMicrotaskProgress,
  getRemainingWorkLabel,
} from '../assignmentProgress';

const task = (estimatedMinutes: number, completed = false) => ({
  estimatedMinutes,
  completed,
});

describe('getMicrotaskProgress', () => {
  it('is 0% with no tasks', () => {
    expect(getMicrotaskProgress([])).toEqual({
      percent: 0,
      completedCount: 0,
      totalCount: 0,
      remainingCount: 0,
      remainingMinutes: 0,
    });
  });

  it('weights each completed task by its estimated time', () => {
    const progress = getMicrotaskProgress([task(60, true), task(30)]);

    expect(progress.percent).toBe(67);
    expect(progress.completedCount).toBe(1);
    expect(progress.remainingCount).toBe(1);
    expect(progress.remainingMinutes).toBe(30);
  });

  it('adds up several completed tasks', () => {
    const progress = getMicrotaskProgress([
      task(20, true),
      task(30, true),
      task(50),
    ]);

    expect(progress.percent).toBe(50);
    expect(progress.completedCount).toBe(2);
  });

  it('is 100% only when every task is done', () => {
    expect(getMicrotaskProgress([task(10, true), task(20, true)]).percent).toBe(100);
    expect(getMicrotaskProgress([task(999, true), task(1)]).percent).toBe(99);
  });

  it('shows at least 1% once any work is done', () => {
    expect(getMicrotaskProgress([task(1, true), task(999)]).percent).toBe(1);
  });

  it('still counts tasks with a missing estimate', () => {
    expect(getMicrotaskProgress([task(0, true), task(Number.NaN)]).percent).toBe(50);
  });
});

describe('getAssignmentProgressPercent', () => {
  it('is 100% for a completed assignment', () => {
    expect(
      getAssignmentProgressPercent({ completed: true, microtasks: [task(30)] }),
    ).toBe(100);
  });

  it('is 0% for an unfinished assignment without microtasks', () => {
    expect(getAssignmentProgressPercent({ completed: false })).toBe(0);
  });

  it('uses microtask progress for an unfinished assignment', () => {
    expect(
      getAssignmentProgressPercent({
        completed: false,
        microtasks: [task(15, true), task(45)],
      }),
    ).toBe(25);
  });
});

describe('getRemainingWorkLabel', () => {
  it('shows how many tasks and how much time are left', () => {
    const progress = getMicrotaskProgress([task(20, true), task(30), task(45)]);

    expect(getRemainingWorkLabel(progress)).toBe('2 tasks left · about 1h 15m');
  });

  it('uses "task" for one task left', () => {
    const progress = getMicrotaskProgress([task(20, true), task(25)]);

    expect(getRemainingWorkLabel(progress)).toBe('1 task left · about 25m');
  });

  it('says all tasks are done when none are left', () => {
    const progress = getMicrotaskProgress([task(20, true)]);

    expect(getRemainingWorkLabel(progress)).toBe('All tasks done');
  });
});
