import {
  deleteCurrentAccount,
} from '../services/accountDeletionService';

import {
  supabase,
} from '../../../lib/supabase';

import {
  clearAppleCalendarConnectionState,
} from '../../calendar/services/appleCalendarConnectionStateService';

import {
  clearGoogleAccessToken,
} from '../../calendar/services/googleTokenService';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },

    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock(
  '../../calendar/services/appleCalendarConnectionStateService',
  () => ({
    clearAppleCalendarConnectionState:
      jest.fn(),
  }),
);

jest.mock(
  '../../calendar/services/googleTokenService',
  () => ({
    clearGoogleAccessToken:
      jest.fn(),
  }),
);

const mockGetSession =
  supabase.auth.getSession as jest.Mock;

const mockSignOut =
  supabase.auth.signOut as jest.Mock;

const mockInvoke =
  supabase.functions.invoke as jest.Mock;

const mockClearAppleCalendarConnectionState =
  clearAppleCalendarConnectionState as jest.Mock;

const mockClearGoogleAccessToken =
  clearGoogleAccessToken as jest.Mock;

describe('accountDeletionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
          },
        },
      },
      error: null,
    });

    mockInvoke.mockResolvedValue({
      data: {
        deleted: true,
      },
      error: null,
    });

    mockClearAppleCalendarConnectionState
      .mockResolvedValue(undefined);

    mockClearGoogleAccessToken
      .mockResolvedValue(undefined);

    mockSignOut.mockResolvedValue({
      error: null,
    });
  });

  it(
    'deletes the authenticated account and clears local account state',
    async () => {
      await deleteCurrentAccount();

      expect(
        mockInvoke,
      ).toHaveBeenCalledWith(
        'delete-account',
        {
          method: 'POST',
        },
      );

      expect(
        mockClearGoogleAccessToken,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClearAppleCalendarConnectionState,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockSignOut,
      ).toHaveBeenCalledWith({
        scope: 'local',
      });
    },
  );

  it(
    'does not begin deletion when there is no signed-in session',
    async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
        error: null,
      });

      await expect(
        deleteCurrentAccount(),
      ).rejects.toThrow(
        'No signed-in user was found.',
      );

      expect(
        mockInvoke,
      ).not.toHaveBeenCalled();

      expect(
        mockClearGoogleAccessToken,
      ).not.toHaveBeenCalled();

      expect(
        mockClearAppleCalendarConnectionState,
      ).not.toHaveBeenCalled();

      expect(
        mockSignOut,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'does not clear local state when server deletion fails',
    async () => {
      const deletionError =
        new Error(
          'DELETE_FAILED',
        );

      mockInvoke.mockResolvedValue({
        data: null,
        error: deletionError,
      });

      await expect(
        deleteCurrentAccount(),
      ).rejects.toBe(
        deletionError,
      );

      expect(
        mockClearGoogleAccessToken,
      ).not.toHaveBeenCalled();

      expect(
        mockClearAppleCalendarConnectionState,
      ).not.toHaveBeenCalled();

      expect(
        mockSignOut,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'requires the server to confirm that the account was deleted',
    async () => {
      mockInvoke.mockResolvedValue({
        data: {
          deleted: false,
        },
        error: null,
      });

      await expect(
        deleteCurrentAccount(),
      ).rejects.toThrow(
        'Account deletion was not confirmed.',
      );

      expect(
        mockClearGoogleAccessToken,
      ).not.toHaveBeenCalled();

      expect(
        mockClearAppleCalendarConnectionState,
      ).not.toHaveBeenCalled();

      expect(
        mockSignOut,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'still signs out after server deletion when provider cleanup fails',
    async () => {
      mockClearGoogleAccessToken
        .mockRejectedValue(
          new Error(
            'LOCAL_CLEANUP_FAILED',
          ),
        );

      await deleteCurrentAccount();

      expect(
        mockClearGoogleAccessToken,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClearAppleCalendarConnectionState,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockSignOut,
      ).toHaveBeenCalledWith({
        scope: 'local',
      });
    },
  );

  it(
    'propagates a session lookup error before deletion starts',
    async () => {
      const sessionError =
        new Error(
          'SESSION_FAILED',
        );

      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
        error: sessionError,
      });

      await expect(
        deleteCurrentAccount(),
      ).rejects.toBe(
        sessionError,
      );

      expect(
        mockInvoke,
      ).not.toHaveBeenCalled();
    },
  );
});
