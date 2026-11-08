import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse(
        {
          error: 'Method not allowed',
        },
        405,
      );
    }

    const authorization =
      req.headers.get('Authorization');

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      return jsonResponse(
        {
          error: 'Authentication required.',
        },
        401,
      );
    }

    const accessToken =
      authorization
        .slice('Bearer '.length)
        .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          error: 'Authentication required.',
        },
        401,
      );
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        'Supabase environment variables are missing.',
      );
    }

    /*
     * The service-role key must remain inside this Edge Function.
     * It must never be exposed to the mobile application.
     */
    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );

    /*
     * Validate the caller's JWT and obtain the authenticated
     * user directly from Supabase Auth.
     *
     * The function intentionally does not accept a user ID
     * from the request body. A student can therefore delete
     * only the account represented by their own access token.
     */
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken,
      );

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          error: 'Authentication required.',
        },
        401,
      );
    }

    /*
     * Hard-delete the authenticated RISE account.
     *
     * Tables that reference auth.users(id) with ON DELETE
     * CASCADE remove that student's RISE-owned data.
     *
     * This operation does NOT call Apple Calendar, Google
     * Calendar, or Canvas APIs, so data in those external
     * services is left untouched.
     */
    const {
      error: deleteError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        user.id,
      );

    if (deleteError) {
      throw deleteError;
    }

    return jsonResponse(
      {
        deleted: true,
      },
      200,
    );
  } catch (error) {
    console.error(
      'delete-account error:',
      error,
    );

    return jsonResponse(
      {
        error: 'Unable to delete account.',
      },
      500,
    );
  }
});
