import { formatEmailForCopy, getMissingFieldsMessage } from '../extensionEmail';

describe('getMissingFieldsMessage', () => {
  it('asks for whatever is missing', () => {
    expect(getMissingFieldsMessage(false, '')).toBe('Choose a class and an assignment first.');
    expect(getMissingFieldsMessage(false, 'Lab 5')).toBe('Choose a class first.');
    expect(getMissingFieldsMessage(true, '   ')).toBe('Choose or type the assignment first.');
  });

  it('is null when the class and assignment are filled in', () => {
    expect(getMissingFieldsMessage(true, 'Lab 5')).toBeNull();
  });
});

describe('formatEmailForCopy', () => {
  it('puts the subject above the message', () => {
    expect(formatEmailForCopy({ subject: 'Extension request', body: 'Dear Professor,' })).toBe(
      'Subject: Extension request\n\nDear Professor,',
    );
  });
});
