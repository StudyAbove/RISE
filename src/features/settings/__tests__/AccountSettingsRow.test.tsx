import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import {
  AccountSettingsRow,
} from '../components/AccountSettingsRow';

import {
  fetchAccountSettings,
  requestEmailChange,
  saveDisplayNamePreference,
} from '../services/accountSettingsService';

jest.mock(
  '../services/accountSettingsService',
  () => ({
    MAX_CUSTOM_DISPLAY_NAME_LENGTH: 15,

    fetchAccountSettings:
      jest.fn(),

    saveDisplayNamePreference:
      jest.fn(),

    requestEmailChange:
      jest.fn(),

    validateCustomDisplayName:
      jest.fn(
        (value: string) =>
          value.trim(),
      ),

    validateSchoolEmail:
      jest.fn(
        (value: string) =>
          value
            .trim()
            .toLowerCase(),
      ),
  }),
);

const mockFetchAccountSettings =
  fetchAccountSettings as jest.Mock;

const mockSaveDisplayNamePreference =
  saveDisplayNamePreference as jest.Mock;

const mockRequestEmailChange =
  requestEmailChange as jest.Mock;

describe(
  'AccountSettingsRow',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockFetchAccountSettings
        .mockResolvedValue({
          displayName:
            'Canvas Student',
          canvasDisplayName:
            'Canvas Student',
          customDisplayName:
            null,
          displayNameSource:
            'canvas',
          email:
            'student@csulb.edu',
        });

      mockSaveDisplayNamePreference
        .mockResolvedValue(
          'Canvas Student',
        );

      mockRequestEmailChange
        .mockResolvedValue({
          changed: false,
          email:
            'student@csulb.edu',
        });
    });

    it(
      'shows the Account option',
      async () => {
        const {
          getByRole,
        } = await render(
          <AccountSettingsRow />,
        );

        expect(
          getByRole(
            'button',
            {
              name: 'Account',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'loads the Canvas name and current email when opened',
      async () => {
        const {
          getByRole,
          getByText,
          getByDisplayValue,
        } = await render(
          <AccountSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name: 'Account',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByText(
              'Account Settings',
            ),
          ).toBeOnTheScreen();

          expect(
            getByDisplayValue(
              'Canvas',
            ),
          ).toBeOnTheScreen();

          expect(
            getByDisplayValue(
              'student@csulb.edu',
            ),
          ).toBeOnTheScreen();
        });
      },
    );

    it(
      'defaults to Student as a custom name when Canvas has not synced yet',
      async () => {
        mockFetchAccountSettings
          .mockResolvedValueOnce({
            displayName: null,
            canvasDisplayName: null,
            customDisplayName: null,
            displayNameSource:
              'canvas',
            email:
              'student@csulb.edu',
          });

        const {
          getByRole,
          getByDisplayValue,
        } = await render(
          <AccountSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name: 'Account',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByDisplayValue(
              'Student',
            ),
          ).toBeOnTheScreen();

          expect(
            getByRole(
              'radio',
              {
                name:
                  'Use custom name',
              },
            ).props.accessibilityState,
          ).toEqual(
            expect.objectContaining({
              checked: true,
            }),
          );

          expect(
            getByRole(
              'radio',
              {
                name:
                  'Use Canvas name',
              },
            ).props.accessibilityState,
          ).toEqual(
            expect.objectContaining({
              checked: false,
              disabled: true,
            }),
          );
        });
      },
    );

    it(
      'saves a custom display name',
      async () => {
        const {
          getByRole,
          getByText,
          getByLabelText,
        } = await render(
          <AccountSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name: 'Account',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByText(
              'Account Settings',
            ),
          ).toBeOnTheScreen();
        });

        await act(async () => {
          fireEvent.press(
            getByRole(
              'radio',
              {
                name:
                  'Use custom name',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByLabelText(
              'Display name',
            ),
          ).toBeOnTheScreen();
        });

        await act(async () => {
          fireEvent.changeText(
            getByLabelText(
              'Display name',
            ),
            'Rise-Student',
          );
        });

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name:
                  'Confirm account settings',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            mockSaveDisplayNamePreference,
          ).toHaveBeenCalledWith(
            'custom',
            'Rise-Student',
          );

          expect(
            mockRequestEmailChange,
          ).toHaveBeenCalledWith(
            'student@csulb.edu',
          );
        });
      },
    );

    it(
      'keeps the popup open with verification guidance after requesting an email change',
      async () => {
        mockRequestEmailChange
          .mockResolvedValueOnce({
            changed: true,
            email:
              'new@csulb.edu',
          });

        const {
          getByRole,
          getByDisplayValue,
          getByLabelText,
          getByText,
        } = await render(
          <AccountSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name: 'Account',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByDisplayValue(
              'student@csulb.edu',
            ),
          ).toBeOnTheScreen();
        });

        await act(async () => {
          fireEvent.changeText(
            getByLabelText(
              'School email',
            ),
            'new@csulb.edu',
          );
        });

        await act(async () => {
          fireEvent.press(
            getByRole(
              'button',
              {
                name:
                  'Confirm account settings',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            getByText(
              /account email stays unchanged until verification is complete/i,
            ),
          ).toBeOnTheScreen();
        });
      },
    );
  },
);
