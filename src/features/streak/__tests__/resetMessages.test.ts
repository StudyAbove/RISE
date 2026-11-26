import { getResetMessage, RESET_MESSAGES } from '../utils/resetMessages';

describe('getResetMessage', () => {
  it('stays the same all day', () => {
    expect(getResetMessage(new Date(2026, 10, 11, 0, 5))).toBe(
      getResetMessage(new Date(2026, 10, 11, 23, 55)),
    );
  });

  it('moves to the next message each day and uses all 5', () => {
    const week = Array.from({ length: 5 }, (_, index) =>
      getResetMessage(new Date(2026, 10, 11 + index, 12, 0)),
    );

    expect(new Set(week).size).toBe(RESET_MESSAGES.length);
    expect(getResetMessage(new Date(2026, 10, 16, 12, 0))).toBe(week[0]);
  });

  it('works for dates before the first day', () => {
    expect(RESET_MESSAGES).toContain(getResetMessage(new Date(2025, 5, 1)));
  });
});
