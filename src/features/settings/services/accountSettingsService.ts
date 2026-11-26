import { supabase } from '../../../lib/supabase';

import {
  checkSchoolEmailExists,
} from '../../auth/services/authService';

const EMAIL_REDIRECT_URL =
  'rise://auth/callback';

export type DisplayNameSource =
  'canvas' | 'custom';

export type AccountSettings = {
  displayName: string | null;
  canvasDisplayName: string | null;
  customDisplayName: string | null;
  displayNameSource: DisplayNameSource;
  email: string;
};

export const MAX_CUSTOM_DISPLAY_NAME_LENGTH = 15;

export function normalizeCustomDisplayName(
  value: string,
): string {
  return value.trim();
}

export function validateCustomDisplayName(
  value: string,
): string {
  const normalized =
    normalizeCustomDisplayName(value);

  if (!normalized) {
    throw new Error(
      'DISPLAY_NAME_REQUIRED',
    );
  }

  if (
    normalized.length >
    MAX_CUSTOM_DISPLAY_NAME_LENGTH
  ) {
    throw new Error(
      'DISPLAY_NAME_TOO_LONG',
    );
  }

  if (
    !/^[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*$/u.test(
      normalized,
    )
  ) {
    throw new Error(
      'DISPLAY_NAME_INVALID',
    );
  }

  return normalized;
}

export function normalizeSchoolEmail(
  value: string,
): string {
  return value.trim().toLowerCase();
}

export function validateSchoolEmail(
  value: string,
): string {
  const normalized =
    normalizeSchoolEmail(value);

  if (!normalized) {
    throw new Error(
      'EMAIL_REQUIRED',
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'EMAIL_INVALID',
    );
  }

  if (!normalized.endsWith('.edu')) {
    throw new Error(
      'EMAIL_NOT_SCHOOL',
    );
  }

  return normalized;
}

export async function fetchAccountSettings():
Promise<AccountSettings> {
  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user || !user.email) {
    throw new Error(
      'No signed-in user was found.',
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(
        'display_name, canvas_display_name, custom_display_name, display_name_source',
      )
      .eq('id', user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const source: DisplayNameSource =
    profile?.display_name_source ===
    'custom'
      ? 'custom'
      : 'canvas';

  return {
    displayName:
      profile?.display_name ?? null,
    canvasDisplayName:
      profile?.canvas_display_name ??
      (
        source === 'canvas'
          ? profile?.display_name ?? null
          : null
      ),
    customDisplayName:
      profile?.custom_display_name ??
      null,
    displayNameSource: source,
    email: user.email,
  };
}

export async function saveDisplayNamePreference(
  source: DisplayNameSource,
  customName?: string,
): Promise<string> {
  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      'No signed-in user was found.',
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(
        'display_name, canvas_display_name',
      )
      .eq('id', user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const updatedAt =
    new Date().toISOString();

  if (source === 'custom') {
    const normalized =
      validateCustomDisplayName(
        customName ?? '',
      );

    const { error } =
      await supabase
        .from('profiles')
        .update({
          custom_display_name:
            normalized,
          display_name_source:
            'custom',
          display_name:
            normalized,
          updated_at: updatedAt,
        })
        .eq('id', user.id);

    if (error) {
      throw error;
    }

    return normalized;
  }

  const canvasName =
    profile?.canvas_display_name ??
    profile?.display_name ??
    null;

  if (!canvasName) {
    throw new Error(
      'CANVAS_DISPLAY_NAME_UNAVAILABLE',
    );
  }

  const { error } =
    await supabase
      .from('profiles')
      .update({
        display_name_source:
          'canvas',
        display_name:
          canvasName,
        updated_at: updatedAt,
      })
      .eq('id', user.id);

  if (error) {
    throw error;
  }

  return canvasName;
}

export async function requestEmailChange(
  email: string,
): Promise<{
  changed: boolean;
  email: string;
}> {
  const normalized =
    validateSchoolEmail(email);

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user || !user.email) {
    throw new Error(
      'No signed-in user was found.',
    );
  }

  const currentEmail =
    normalizeSchoolEmail(user.email);

  if (normalized === currentEmail) {
    return {
      changed: false,
      email: currentEmail,
    };
  }

  const emailStatus =
    await checkSchoolEmailExists(
      normalized,
    );

  if (
    emailStatus.exists &&
    emailStatus.verified
  ) {
    throw new Error(
      'EMAIL_ALREADY_REGISTERED',
    );
  }

  const { error } =
    await supabase.auth.updateUser(
      {
        email: normalized,
      },
      {
        emailRedirectTo:
          EMAIL_REDIRECT_URL,
      },
    );

  if (error) {
    throw error;
  }

  return {
    changed: true,
    email: normalized,
  };
}
