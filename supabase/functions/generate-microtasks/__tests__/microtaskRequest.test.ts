import { describe, expect, it } from '@jest/globals';
import {
  buildMicrotaskPrompt,
  InvalidMicrotaskPlanError,
  readMicrotaskPlan,
} from '../microtaskRequest';

// Sample AI responses are used only by the tests.
function validPlan() {
  return {
    status: 'ready',
    tasks: [
      { title: 'Organize experimental data', minutes: 15 },
      { title: 'Create graphs and tables', minutes: 20 },
      { title: 'Write the results section', minutes: 25 },
      { title: 'Write the conclusion and proofread', minutes: 20 },
    ],
  };
}

describe('buildMicrotaskPrompt', () => {
  it('includes the actual assignment information and saved estimate', () => {
    const assignment = {
      title: 'Osmosis Lab Report',
      description: 'Explain the results using the collected measurements.',
      courseName: 'Cell Biology',
      courseCode: 'BIO 200',
      estimatedMinutes: 80,
    };

    const prompt = buildMicrotaskPrompt(assignment);
    const jsonStart = prompt.indexOf('{');

    expect(JSON.parse(prompt.slice(jsonStart))).toEqual(assignment);
  });

  it('preserves missing information instead of inventing it', () => {
    const prompt = buildMicrotaskPrompt({
      title: 'Week 4',
      description: null,
      courseName: null,
      courseCode: null,
      estimatedMinutes: 30,
    });

    const jsonStart = prompt.indexOf('{');

    expect(JSON.parse(prompt.slice(jsonStart))).toMatchObject({
      description: null,
      courseName: null,
      courseCode: null,
    });
  });

  it.each([0, 4, 6001, 30.5, NaN, Infinity])(
    'rejects an invalid saved estimate: %s',
    (estimatedMinutes) => {
      expect(() =>
        buildMicrotaskPrompt({
          title: 'Assignment',
          description: null,
          courseName: null,
          courseCode: null,
          estimatedMinutes,
        }),
      ).toThrow(InvalidMicrotaskPlanError);
    },
  );
});

describe('readMicrotaskPlan', () => {
  it('accepts an ordered plan whose minutes match the saved total', () => {
    const result = readMicrotaskPlan(validPlan(), 80);

    expect(result).toEqual(validPlan());
  });

  it('accepts one task for a small assignment', () => {
    const plan = {
      status: 'ready',
      tasks: [{ title: 'Review and submit the response', minutes: 5 }],
    };

    expect(readMicrotaskPlan(plan, 5)).toEqual(plan);
  });

  it('accepts exactly 12 tasks', () => {
    const plan = {
      status: 'ready',
      tasks: Array.from({ length: 12 }, (_, index) => ({
        title: `Complete project stage ${index + 1}`,
        minutes: 10,
      })),
    };

    expect(readMicrotaskPlan(plan, 120)).toEqual(plan);
  });

  it('rejects more than 12 tasks', () => {
    const plan = {
      status: 'ready',
      tasks: Array.from({ length: 13 }, (_, index) => ({
        title: `Complete stage ${index + 1}`,
        minutes: 10,
      })),
    };

    expect(() => readMicrotaskPlan(plan, 130)).toThrow(
      InvalidMicrotaskPlanError,
    );
  });

  it('rejects a ready plan with no tasks', () => {
    expect(() =>
      readMicrotaskPlan({ status: 'ready', tasks: [] }, 80),
    ).toThrow(InvalidMicrotaskPlanError);
  });

  it.each([79, 81])(
    'rejects task totals that do not match the saved estimate of %s',
    (totalMinutes) => {
      expect(() => readMicrotaskPlan(validPlan(), totalMinutes)).toThrow(
        InvalidMicrotaskPlanError,
      );
    },
  );

  it.each([0, -5, 2.5, NaN, Infinity, 6001, '20', null])(
    'rejects an invalid task duration: %s',
    (minutes) => {
      const plan = {
        status: 'ready',
        tasks: [{ title: 'Review the instructions', minutes }],
      };

      expect(() => readMicrotaskPlan(plan, 20)).toThrow(
        InvalidMicrotaskPlanError,
      );
    },
  );

  it('cleans spacing while preserving task order', () => {
    const result = readMicrotaskPlan(
      {
        status: 'ready',
        tasks: [
          { title: '  Organize   data  ', minutes: 10 },
          { title: 'Write the conclusion', minutes: 20 },
        ],
      },
      30,
    );

    expect(result.tasks).toEqual([
      { title: 'Organize data', minutes: 10 },
      { title: 'Write the conclusion', minutes: 20 },
    ]);
  });

  it('rejects duplicate titles despite capitalization or spacing', () => {
    expect(() =>
      readMicrotaskPlan(
        {
          status: 'ready',
          tasks: [
            { title: 'Review the instructions', minutes: 10 },
            { title: '  REVIEW   THE INSTRUCTIONS ', minutes: 10 },
          ],
        },
        20,
      ),
    ).toThrow(InvalidMicrotaskPlanError);
  });

  it.each(['', '   ', 'a'.repeat(201), null, 123])(
    'rejects invalid task titles',
    (title) => {
      expect(() =>
        readMicrotaskPlan(
          {
            status: 'ready',
            tasks: [{ title, minutes: 20 }],
          },
          20,
        ),
      ).toThrow(InvalidMicrotaskPlanError);
    },
  );

  it('accepts an insufficient-information response with no tasks', () => {
    expect(
      readMicrotaskPlan(
        { status: 'insufficient_information', tasks: [] },
        80,
      ),
    ).toEqual({
      status: 'insufficient_information',
      tasks: [],
    });
  });

  it('rejects tasks attached to an insufficient-information response', () => {
    expect(() =>
      readMicrotaskPlan(
        {
          status: 'insufficient_information',
          tasks: [{ title: 'Invented task', minutes: 80 }],
        },
        80,
      ),
    ).toThrow(InvalidMicrotaskPlanError);
  });

  it.each([
    null,
    [],
    {},
    { status: 'ready', tasks: null },
    { status: 'unknown', tasks: [] },
    { status: 'ready', tasks: [null] },
  ])('rejects malformed responses', (response) => {
    expect(() => readMicrotaskPlan(response, 80)).toThrow(
      InvalidMicrotaskPlanError,
    );
  });

  it('accepts longer stages when needed for a large assignment', () => {
    const plan = {
      status: 'ready',
      tasks: [
        { title: 'Research and organize the project', minutes: 2400 },
        { title: 'Develop the project deliverables', minutes: 3000 },
        { title: 'Review and prepare the final submission', minutes: 600 },
      ],
    };

    expect(readMicrotaskPlan(plan, 6000)).toEqual(plan);
  });
});