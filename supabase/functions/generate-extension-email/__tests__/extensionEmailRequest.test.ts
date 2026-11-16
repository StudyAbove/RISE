import {
  buildEmailPrompt,
  EXTENSION_EMAIL_SYSTEM_PROMPT,
  InvalidEmailRequestError,
  parseEmailRequest,
  readEmail,
} from '../extensionEmailRequest';

describe('parseEmailRequest', () => {
  it('reads the course, class, assignment, due date, reason and time zone', () => {
    expect(
      parseEmailRequest({
        courseId: '6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b',
        className: ' CECS 491B ',
        assignmentTitle: 'Milestone 4 report',
        dueAt: '2026-11-14T07:59:00Z',
        reason: 'I was sick this week.',
        timeZone: 'America/Los_Angeles',
      }),
    ).toEqual({
      courseId: '6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b',
      className: 'CECS 491B',
      assignmentTitle: 'Milestone 4 report',
      dueAt: '2026-11-14T07:59:00Z',
      reason: 'I was sick this week.',
      timeZone: 'America/Los_Angeles',
    });
  });

  it('leaves out an empty reason and a bad due date', () => {
    expect(
      parseEmailRequest({ className: 'BIO 200', assignmentTitle: 'Lab', reason: '   ', dueAt: 'soon' }),
    ).toMatchObject({ reason: null, dueAt: null });
  });

  it('ignores a course ID that isn’t a UUID', () => {
    expect(parseEmailRequest({ courseId: 'c1', className: 'BIO 200', assignmentTitle: 'Lab' })).toMatchObject({
      courseId: null,
    });
  });

  it.each([
    [{ assignmentTitle: 'Lab' }, 'Add the class first.'],
    [{ className: 'BIO 200', assignmentTitle: ' ' }, 'Add the assignment first.'],
  ])('asks for a missing field', (body, message) => {
    expect(() => parseEmailRequest(body)).toThrow(new InvalidEmailRequestError(message));
  });

  it('rejects text that is far too long', () => {
    expect(() =>
      parseEmailRequest({ className: 'BIO 200', assignmentTitle: 'Lab', reason: 'x'.repeat(501) }),
    ).toThrow(InvalidEmailRequestError);
  });
});

describe('buildEmailPrompt', () => {
  it('gives Claude every detail, with the due date in the student’s time zone', () => {
    const prompt = buildEmailPrompt(
      {
        className: 'CECS 491B',
        assignmentTitle: 'Milestone 4 report',
        // Saturday in UTC, still Friday night in California.
        dueAt: '2026-11-14T07:59:00Z',
        reason: 'I was sick this week.',
        professorName: 'Dr. Jane Smith',
        studentName: 'Julia Matinyan',
      },
      'America/Los_Angeles',
    );

    expect(prompt).toBe(
      [
        'Class: CECS 491B',
        "Professor's name: Dr. Jane Smith",
        'Assignment: Milestone 4 report',
        'Due: Friday, November 13',
        'Reason: I was sick this week.',
        "Student's name: Julia Matinyan",
      ].join('\n'),
    );
  });

  it('says when a detail was not given, so Claude doesn’t make one up', () => {
    const prompt = buildEmailPrompt({
      className: 'BIO 200',
      assignmentTitle: 'Lab 3',
      dueAt: null,
      reason: null,
      professorName: null,
      studentName: null,
    });

    expect(prompt).toContain("Professor's name: not given");
    expect(prompt).toContain('Due: not given');
    expect(prompt).toContain('Reason: not given');
    expect(prompt).toContain("Student's name: not given");
  });
});

describe('EXTENSION_EMAIL_SYSTEM_PROMPT', () => {
  it('keeps the email short, polite and honest', () => {
    expect(EXTENSION_EMAIL_SYSTEM_PROMPT).toContain('"Dear Professor Smith,"');
    expect(EXTENSION_EMAIL_SYSTEM_PROMPT).toContain('If no name is given, start with "Dear Professor,"');
    expect(EXTENSION_EMAIL_SYSTEM_PROMPT).toContain('under 120 words');
    expect(EXTENSION_EMAIL_SYSTEM_PROMPT).toContain('never call it "this Wednesday"');
    expect(EXTENSION_EMAIL_SYSTEM_PROMPT).toContain('Never invent a reason');
  });
});

describe('readEmail', () => {
  it('trims the subject and message', () => {
    expect(readEmail({ subject: ' Extension request ', body: '\nDear Professor,\n' })).toEqual({
      subject: 'Extension request',
      body: 'Dear Professor,',
    });
  });

  it('rejects an empty email', () => {
    expect(() => readEmail({ subject: '', body: 'Dear Professor,' })).toThrow();
  });
});
