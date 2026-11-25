import {
  fetchAccountSettings,
  normalizeCustomDisplayName,
  requestEmailChange,
  saveDisplayNamePreference,
  MAX_CUSTOM_DISPLAY_NAME_LENGTH,
  validateCustomDisplayName,
  validateSchoolEmail,
} from '../services/accountSettingsService';

import {
  checkSchoolEmailExists,
} from '../../auth/services/authService';

import {
  supabase,
} from '../../../lib/supabase';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock(
  '../../auth/services/authService',
  () => ({
    checkSchoolEmailExists:
      jest.fn(),
  }),
);

const mockGetUser =
  supabase.auth.getUser as jest.Mock;

const mockUpdateUser =
  supabase.auth.updateUser as jest.Mock;

const mockFrom =
  supabase.from as jest.Mock;

const mockCheckSchoolEmailExists =
  checkSchoolEmailExists as jest.Mock;

function mockProfileSelect(
  profile: Record<string, unknown> | null,
  error: unknown = null,
) {
  const maybeSingle =
    jest.fn().mockResolvedValue({
      data: profile,
      error,
    });

  const eq =
    jest.fn().mockReturnValue({
      maybeSingle,
    });

  const select =
    jest.fn().mockReturnValue({
      eq,
    });

  return {
    select,
    eq,
    maybeSingle,
  };
}

function mockProfileUpdate(
  error: unknown = null,
) {
  const eq =
    jest.fn().mockResolvedValue({
      error,
    });

  const update =
    jest.fn().mockReturnValue({
      eq,
    });

  return {
    update,
    eq,
  };
}

describe(
  'accountSettingsService',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email:
              'student@csulb.edu',
          },
        },
        error: null,
      });

      mockUpdateUser.mockResolvedValue({
        data: {
          user: {},
        },
        error: null,
      });

      mockCheckSchoolEmailExists
        .mockResolvedValue({
          exists: false,
          verified: false,
        });
    });

    it(
      'trims surrounding spaces in a custom display name',
      () => {
        expect(
          normalizeCustomDisplayName(
            '  Mary-Jane  ',
          ),
        ).toBe('Mary-Jane');
      },
    );

    it.each([
      ['José', 'José'],
      ["O'Connor", "O'Connor"],
      ['Mary-Jane', 'Mary-Jane'],
      ['Dybala', 'Dybala'],
    ])(
      'accepts the normal name %p',
      (input, expected) => {
        expect(
          validateCustomDisplayName(
            input,
          ),
        ).toBe(expected);
      },
    );

    it.each([
      [
        '',
        'DISPLAY_NAME_REQUIRED',
      ],
      [
        '12345',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'Student 😊',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'Jesus Vaquero',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'Mary Jane',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'J. Smith',
        'DISPLAY_NAME_INVALID',
      ],
      [
        '-Jesus',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'Jesus-',
        'DISPLAY_NAME_INVALID',
      ],
      [
        'A'.repeat(
          MAX_CUSTOM_DISPLAY_NAME_LENGTH + 1,
        ),
        'DISPLAY_NAME_TOO_LONG',
      ],
    ])(
      'rejects invalid custom name %p',
      (input, errorCode) => {
        expect(() =>
          validateCustomDisplayName(
            input,
          ),
        ).toThrow(errorCode);
      },
    );

    it(
      'loads the current email and display-name choices',
      async () => {
        const query =
          mockProfileSelect({
            display_name:
              'Rise Name',
            canvas_display_name:
              'Canvas Name',
            custom_display_name:
              'Rise Name',
            display_name_source:
              'custom',
          });

        mockFrom.mockReturnValue(
          query,
        );

        await expect(
          fetchAccountSettings(),
        ).resolves.toEqual({
          displayName:
            'Rise Name',
          canvasDisplayName:
            'Canvas Name',
          customDisplayName:
            'Rise Name',
          displayNameSource:
            'custom',
          email:
            'student@csulb.edu',
        });
      },
    );

    it(
      'saves a validated custom name as the effective greeting',
      async () => {
        const query =
          mockProfileSelect({
            display_name:
              'Canvas Name',
            canvas_display_name:
              'Canvas Name',
          });

        const update =
          mockProfileUpdate();

        mockFrom
          .mockReturnValueOnce(query)
          .mockReturnValueOnce(update);

        await expect(
          saveDisplayNamePreference(
            'custom',
            '  Mary-Jane  ',
          ),
        ).resolves.toBe(
          'Mary-Jane',
        );

        expect(
          update.update,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            custom_display_name:
              'Mary-Jane',
            display_name_source:
              'custom',
            display_name:
              'Mary-Jane',
          }),
        );
      },
    );

    it(
      'switches back to the saved Canvas name',
      async () => {
        const query =
          mockProfileSelect({
            display_name:
              'Custom Name',
            canvas_display_name:
              'Canvas Name',
          });

        const update =
          mockProfileUpdate();

        mockFrom
          .mockReturnValueOnce(query)
          .mockReturnValueOnce(update);

        await expect(
          saveDisplayNamePreference(
            'canvas',
          ),
        ).resolves.toBe(
          'Canvas Name',
        );

        expect(
          update.update,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            display_name_source:
              'canvas',
            display_name:
              'Canvas Name',
          }),
        );
      },
    );

    it(
      'does not switch to Canvas when no Canvas name is available',
      async () => {
        const query =
          mockProfileSelect({
            display_name: null,
            canvas_display_name:
              null,
          });

        mockFrom.mockReturnValue(
          query,
        );

        await expect(
          saveDisplayNamePreference(
            'canvas',
          ),
        ).rejects.toThrow(
          'CANVAS_DISPLAY_NAME_UNAVAILABLE',
        );
      },
    );

    it.each([
      [
        'not-an-email',
        'EMAIL_INVALID',
      ],
      [
        'student@gmail.com',
        'EMAIL_NOT_SCHOOL',
      ],
    ])(
      'rejects invalid school email %p',
      (input, errorCode) => {
        expect(() =>
          validateSchoolEmail(
            input,
          ),
        ).toThrow(errorCode);
      },
    );

    it(
      'normalizes a valid school email',
      () => {
        expect(
          validateSchoolEmail(
            ' STUDENT@CSULB.EDU ',
          ),
        ).toBe(
          'student@csulb.edu',
        );
      },
    );

    it(
      'does not send verification when the email is unchanged',
      async () => {
        await expect(
          requestEmailChange(
            ' STUDENT@CSULB.EDU ',
          ),
        ).resolves.toEqual({
          changed: false,
          email:
            'student@csulb.edu',
        });

        expect(
          mockCheckSchoolEmailExists,
        ).not.toHaveBeenCalled();

        expect(
          mockUpdateUser,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects an email already used by another verified account',
      async () => {
        mockCheckSchoolEmailExists
          .mockResolvedValue({
            exists: true,
            verified: true,
          });

        await expect(
          requestEmailChange(
            'other@csulb.edu',
          ),
        ).rejects.toThrow(
          'EMAIL_ALREADY_REGISTERED',
        );

        expect(
          mockUpdateUser,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'requests a verified email change with the RISE callback',
      async () => {
        await expect(
          requestEmailChange(
            ' NEW@CSULB.EDU ',
          ),
        ).resolves.toEqual({
          changed: true,
          email:
            'new@csulb.edu',
        });

        expect(
          mockCheckSchoolEmailExists,
        ).toHaveBeenCalledWith(
          'new@csulb.edu',
        );

        expect(
          mockUpdateUser,
        ).toHaveBeenCalledWith(
          {
            email:
              'new@csulb.edu',
          },
          {
            emailRedirectTo:
              'rise://auth/callback',
          },
        );
      },
    );
  },
);
