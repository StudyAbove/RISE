import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { email } = await req.json();

    if (
      typeof email !== 'string' ||
      !email.trim().toLowerCase().endsWith('.edu')
    ) {
      return new Response(
        JSON.stringify({
          error: 'A valid .edu email is required.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY'
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase environment variables are missing.'
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let page = 1;
    const perPage = 1000;

    let emailExists = false;
    let emailVerified = false;

    while (true) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

      if (error) {
        throw error;
      }

      const matchingUser = data.users.find(
        (user) =>
          user.email?.toLowerCase() === normalizedEmail
      );

      if (matchingUser) {
        emailExists = true;
        emailVerified = Boolean(
          matchingUser.email_confirmed_at
        );
        break;
      }

      if (data.users.length < perPage) {
        break;
      }

      page += 1;
    }

    return new Response(
      JSON.stringify({
        exists: emailExists,
        verified: emailVerified,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('check-email-exists error:', error);

    return new Response(
      JSON.stringify({
        error: 'Unable to check email.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});