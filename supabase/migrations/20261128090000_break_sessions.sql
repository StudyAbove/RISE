-- Actual break time for Analytics (#69).
create table public.break_sessions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        default auth.uid()
        references auth.users(id)
        on delete cascade,

    -- Prevent recording the same break twice.
    client_session_id text not null
        check (char_length(client_session_id) between 1 and 200),

    assignment_id uuid
        references public.assignments(id)
        on delete set null,

    -- Snapshot of the assignment type when the break was recorded.
    assignment_kind text,

    break_type text not null
        check (char_length(break_type) between 1 and 80),

    started_at timestamptz not null,
    ended_at timestamptz not null,

    duration_seconds integer not null
        check (duration_seconds between 1 and 360000),

    created_at timestamptz not null default now(),

    unique (user_id, client_session_id),
    check (ended_at >= started_at),
    check (
        duration_seconds <=
        extract(epoch from (ended_at - started_at)) + 1
    )
);

create index break_sessions_user_started_idx
on public.break_sessions(user_id, started_at);

create index break_sessions_assignment_idx
on public.break_sessions(assignment_id);

-- Capture the assignment's type from the student's own assignment.
create function public.set_break_assignment_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.assignment_kind := null;

    if new.assignment_id is not null then
        select assignment.kind::text
        into new.assignment_kind
        from public.assignments as assignment
        where assignment.id = new.assignment_id
          and assignment.user_id = new.user_id;
    end if;

    return new;
end;
$$;

create trigger set_break_assignment_kind
before insert on public.break_sessions
for each row execute function public.set_break_assignment_kind();

alter table public.break_sessions enable row level security;

create policy "Users can view their own break sessions"
on public.break_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can record their own break sessions"
on public.break_sessions
for insert
to authenticated
with check (
    user_id = (select auth.uid())
    and (
        assignment_id is null
        or exists (
            select 1
            from public.assignments as assignment
            where assignment.id = break_sessions.assignment_id
              and assignment.user_id = (select auth.uid())
        )
    )
);

revoke all on table public.break_sessions
from public, anon, authenticated;

grant select, insert on table public.break_sessions
to authenticated;

grant all on table public.break_sessions
to service_role;