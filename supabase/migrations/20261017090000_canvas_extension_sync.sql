-- ============================================
-- Canvas Sync Through the RISE Browser Extension (#22)
-- ============================================

-- The extension reads Canvas with the student's own Canvas login and sends
-- their courses and assignments to the canvas-extension Edge Function, which
-- writes them here with the service role.

-- Allow signed-in users to work with their courses and assignments.
-- Row Level Security still limits each user to their own rows.
grant select, insert, update, delete
on table public.courses, public.assignments
to authenticated;

-- ============================================
-- Canvas IDs on Courses and Assignments
-- ============================================

alter table public.courses
    add column canvas_course_id text,
    add column term text;

-- One row per Canvas course per student, so a sync updates instead of
-- duplicating. Courses made in RISE have no Canvas ID and are unaffected.
alter table public.courses
    add constraint courses_user_canvas_course_key
    unique (user_id, canvas_course_id);

alter table public.assignments
    add column canvas_assignment_id text,
    add column points_possible numeric,
    add column html_url text,
    -- Set when an assignment disappears from Canvas, instead of deleting it.
    add column removed_at timestamptz;

alter table public.assignments
    add constraint assignments_user_canvas_assignment_key
    unique (user_id, canvas_assignment_id);

-- ============================================
-- Canvas Connection Status
-- ============================================

create table public.canvas_connections (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    canvas_domain text,

    -- The Canvas Integration toggle in Settings (#81).
    enabled boolean not null default true,

    last_synced_at timestamptz,

    last_sync_status text
        check (last_sync_status in ('success', 'error')),

    last_sync_error text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.canvas_connections enable row level security;

create policy "Users can view their own Canvas connection"
on public.canvas_connections
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can turn their own Canvas sync on or off"
on public.canvas_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select on table public.canvas_connections to authenticated;
grant update (enabled) on table public.canvas_connections to authenticated;

-- ============================================
-- Extension Sign-In
-- ============================================

-- The app shows a short-lived code. The student types their email and that
-- code into the extension, and the Edge Function checks both. Only the Edge
-- Function reads these tables, so they have no policies.

create table public.extension_pairing_codes (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    -- sha256 of "<user id>:<code>". The code itself is never stored.
    code_hash text not null,

    failed_attempts integer not null default 0,

    expires_at timestamptz not null,

    used_at timestamptz,

    created_at timestamptz not null default now()
);

create index extension_pairing_codes_user_id_idx
on public.extension_pairing_codes(user_id);

alter table public.extension_pairing_codes enable row level security;

create table public.extension_tokens (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    -- sha256 of the token the extension keeps. The token itself is never stored.
    token_hash text not null unique,

    created_at timestamptz not null default now(),

    last_used_at timestamptz,

    revoked_at timestamptz
);

alter table public.extension_tokens enable row level security;

-- Called by the signed-in app to show a new code. Replaces any unused code.
create or replace function public.create_extension_pairing_code()
returns table (pairing_code text, code_expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    random_bytes bytea := gen_random_bytes(3);
    new_code text;
    new_expires_at timestamptz := now() + interval '10 minutes';
begin
    if auth.uid() is null then
        raise exception 'Sign in to get a code.';
    end if;

    -- Six digits from 3 random bytes.
    new_code := lpad(
        (
            (get_byte(random_bytes, 0) * 65536
                + get_byte(random_bytes, 1) * 256
                + get_byte(random_bytes, 2)) % 1000000
        )::text,
        6,
        '0'
    );

    delete from public.extension_pairing_codes
    where user_id = auth.uid()
        and used_at is null;

    insert into public.extension_pairing_codes (user_id, code_hash, expires_at)
    values (
        auth.uid(),
        encode(digest(auth.uid()::text || ':' || new_code, 'sha256'), 'hex'),
        new_expires_at
    );

    return query select new_code, new_expires_at;
end;
$$;

revoke all on function public.create_extension_pairing_code() from public, anon;
grant execute on function public.create_extension_pairing_code() to authenticated;

-- Lets the Edge Function look up the account for the email the student typed,
-- without listing every user.
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select id
    from auth.users
    where lower(email) = lower(trim(lookup_email))
    limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
