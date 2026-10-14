const GOOGLE_CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar';

export type GoogleUserInfo = {
  email: string;
  name?: string;
  picture?: string;
};

type GoogleTokenInfo = {
  scope?: string;
};

export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      'Could not load Google account information.',
    );
  }

  const data = await response.json();

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

export async function hasGoogleCalendarAccess(
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v2/tokeninfo?access_token=${encodeURIComponent(
      accessToken,
    )}`,
  );

  if (!response.ok) {
    throw new Error(
      'Could not verify Google Calendar permissions.',
    );
  }

  const data: GoogleTokenInfo =
    await response.json();

  const grantedScopes =
    data.scope
      ?.split(' ')
      .filter(Boolean) ?? [];

  return grantedScopes.includes(
    GOOGLE_CALENDAR_SCOPE,
  );
}