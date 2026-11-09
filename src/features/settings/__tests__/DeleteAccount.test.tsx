import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import { SettingsScreen } from '../screens/SettingsScreen';

const mockDeleteCurrentAccount =
  jest.fn();

jest.mock(
  '../services/accountDeletionService',
  () => ({
    deleteCurrentAccount: () =>
      mockDeleteCurrentAccount(),
  }),
);

jest.mock(
  'react-native-safe-area-context',
  () => ({
    useSafeAreaInsets: () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }),
  }),
);

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession:
    jest.fn(),
}));

jest.mock(
  'expo-auth-session/providers/google',
  () => ({
    useAuthRequest: () => [
      {
        redirectUri:
          'com.anonymous.rise:/oauthredirect',
      },
      null,
      jest.fn(),
    ],
  }),
);

jest.mock(
  '../../calendar/services/calendarService',
  () => ({
    getAppleCalendarAccess:
      jest
        .fn()
        .mockResolvedValue(
          'denied',
        ),

    requestAppleCalendarFullAccess:
      jest
        .fn()
        .mockResolvedValue({
          status: 'denied',
        }),
  }),
);

jest.mock(
  '../../calendar/services/calendarConnectionService',
  () => ({
    getCalendarConnection:
      jest
        .fn()
        .mockResolvedValue(
          null,
        ),

    saveCalendarConnection:
      jest.fn(),
  }),
);

jest.mock(
  '../../calendar/services/googleCalendarService',
  () => ({
    getGoogleUserInfo:
      jest.fn(),

    hasGoogleCalendarAccess:
      jest.fn(),
  }),
);

jest.mock(
  '../../../lib/supabase',
  () => ({
    supabase: {
      auth: {
        signOut:
          jest
            .fn()
            .mockResolvedValue({
              error: null,
            }),
      },
    },
  }),
);

jest.mock(
  '../../../components/BackButton',
  () => ({
    BackButton: () => null,
  }),
);

describe(
  'Delete Account',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockDeleteCurrentAccount
        .mockResolvedValue(
          undefined,
        );
    });

    it(
      'shows the Delete Account option in Settings',
      async () => {
        const {
          getByRole,
        } =
          await render(
            <SettingsScreen />,
          );

        expect(
          getByRole(
            'button',
            {
              name:
                'Delete Account',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'opens the confirmation popup without deleting immediately',
      async () => {
        const {
          getByRole,
          getByText,
        } =
          await render(
            <SettingsScreen />,
          );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Delete Account',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              getByText(
                'Delete Account?',
              ),
            ).toBeOnTheScreen();
          },
        );

        expect(
          getByText(
            'This will permanently delete your account and all associated data. This action cannot be undone.',
          ),
        ).toBeOnTheScreen();

        expect(
          mockDeleteCurrentAccount,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'closes the popup without deleting when Cancel is selected',
      async () => {
        const {
          getByRole,
          getByText,
          queryByText,
        } =
          await render(
            <SettingsScreen />,
          );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Delete Account',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              getByText(
                'Delete Account?',
              ),
            ).toBeOnTheScreen();
          },
        );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Cancel account deletion',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              queryByText(
                'Delete Account?',
              ),
            ).not.toBeOnTheScreen();
          },
        );

        expect(
          mockDeleteCurrentAccount,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'deletes only after Confirm is selected',
      async () => {
        const {
          getByRole,
          getByText,
          queryByText,
        } =
          await render(
            <SettingsScreen />,
          );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Delete Account',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              getByText(
                'Delete Account?',
              ),
            ).toBeOnTheScreen();
          },
        );

        expect(
          mockDeleteCurrentAccount,
        ).not.toHaveBeenCalled();

        await act(
          async () => {
            fireEvent.press(
              getByRole(
                'button',
                {
                  name:
                    'Confirm account deletion',
                },
              ),
            );
          },
        );

        await waitFor(
          () => {
            expect(
              mockDeleteCurrentAccount,
            ).toHaveBeenCalledTimes(
              1,
            );
          },
        );

        await waitFor(
          () => {
            expect(
              queryByText(
                'Delete Account?',
              ),
            ).not.toBeOnTheScreen();
          },
        );
      },
    );

    it(
      'keeps the popup open when deletion fails',
      async () => {
        mockDeleteCurrentAccount
          .mockRejectedValue(
            new Error(
              'DELETE_FAILED',
            ),
          );

        const {
          getByRole,
          getByText,
        } =
          await render(
            <SettingsScreen />,
          );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Delete Account',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              getByText(
                'Delete Account?',
              ),
            ).toBeOnTheScreen();
          },
        );

        await act(
          async () => {
            fireEvent.press(
              getByRole(
                'button',
                {
                  name:
                    'Confirm account deletion',
                },
              ),
            );
          },
        );

        await waitFor(
          () => {
            expect(
              mockDeleteCurrentAccount,
            ).toHaveBeenCalledTimes(
              1,
            );
          },
        );

        await waitFor(
          () => {
            expect(
              getByText(
                'Delete Account?',
              ),
            ).toBeOnTheScreen();
          },
        );
      },
    );
  },
);
