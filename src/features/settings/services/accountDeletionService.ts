import {
  supabase,
} from '../../../lib/supabase';

import {
  clearAppleCalendarConnectionState,
} from '../../calendar/services/appleCalendarConnectionStateService';

import {
  clearGoogleAccessToken,
} from '../../calendar/services/googleTokenService';

/**
 * Permanently deletes the currently authenticated RISE account.
 *
 * Server-side deletion removes the Auth user and the RISE database
 * rows that reference that user through ON DELETE CASCADE.
 *
 * External Apple Calendar, Google Calendar, and Canvas data is not
 * deleted. Only RISE's copies, connections, and locally stored
 * credentials/state are removed.
 */
export async function deleteCurrentAccount():
Promise<void> {
  const {
    data: {
      session,
    },
    error: sessionError,
  } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error(
      'No signed-in user was found.',
    );
  }

  /*
   * supabase.functions.invoke sends the signed-in user's JWT.
   * The Edge Function validates that JWT again and deletes only
   * the authenticated caller.
   */
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'delete-account',
      {
        method: 'POST',
      },
    );

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.deleted !== true
  ) {
    throw new Error(
      'Account deletion was not confirmed.',
    );
  }

  /*
   * The account is now gone server-side.
   *
   * Remove provider credentials and connection state stored
   * only on this device. This does not modify Apple Calendar
   * or Google Calendar themselves.
   */
  const localCleanupResults =
    await Promise.allSettled([
      clearGoogleAccessToken(),
      clearAppleCalendarConnectionState(),
    ]);

  for (const result of localCleanupResults) {
    if (result.status === 'rejected') {
      console.log(
        'Post-deletion local cleanup failed:',
        result.reason,
      );
    }
  }

  /*
   * Always remove Supabase's persisted session after the
   * server confirms deletion, even if one local provider
   * cleanup operation failed.
   *
   * The Auth user has already been deleted, so only local
   * session cleanup is needed here.
   */
  const {
    error: signOutError,
  } =
    await supabase.auth.signOut({
      scope: 'local',
    });

  if (signOutError) {
    throw signOutError;
  }
}
