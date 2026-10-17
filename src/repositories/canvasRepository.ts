import { supabase } from '../lib/supabase';

export type ExtensionPairingCode = {
  code: string;
  expiresAt: Date;
};

export type CanvasConnection = {
  lastSyncedAt: Date | null;
  lastSyncStatus: 'success' | 'error' | null;
};

/**
 * A new 6-digit code the student types into the Canvas extension, with their
 * email, to connect it to this account. Replaces any earlier unused code.
 */
export async function createExtensionPairingCode(): Promise<ExtensionPairingCode> {
  const { data, error } = await supabase.rpc('create_extension_pairing_code');

  if (error) {
    throw error;
  }

  const [row] = data as { pairing_code: string; code_expires_at: string }[];

  return { code: row.pairing_code, expiresAt: new Date(row.code_expires_at) };
}

/** The student's Canvas sync status, or null if the extension was never connected. */
export async function fetchCanvasConnection(): Promise<CanvasConnection | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const { data, error } = await supabase
    .from('canvas_connections')
    .select('last_synced_at, last_sync_status')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
    lastSyncStatus: data.last_sync_status,
  };
}
