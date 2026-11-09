-- ============================================
-- Recorded Study Sessions (#49)
-- ============================================
-- When a focus session ends, the app records how long the student actually
-- focused, so progress and analytics (#29) use real study time. Sessions
-- under a minute aren't recorded.
--
-- started_at and ended_at give each sitting's place in the day and week;
-- focused_seconds leaves out pauses and breaks within it.

create table public.study_sessions (
    id uuid primary key default gen_random_uuid(),

    -- Filled in with the signed-in student, so the app doesn't send it.
    user_id uuid not null
        default auth.uid()
        references auth.users(id)
        on delete cascade,

    -- The assignment the session was started from. Kept as empty if the
    -- assignment is deleted, so the time still counts toward totals.
    assignment_id uuid
        references public.assignments(id)
        on delete set null,

    started_at timestamptz not null,
    ended_at timestamptz not null,

    -- At least a minute, and no more than a day.
    focused_seconds integer not null
        check (focused_seconds between 60 and 86400),

    created_at timestamptz not null default now(),

    check (ended_at >= started_at)
);

create index study_sessions_user_started_idx
on public.study_sessions(user_id, started_at);

create index study_sessions_assignment_id_idx
on public.study_sessions(assignment_id);

-- ============================================
-- Row Level Security
-- ============================================

-- Students read and record their own sessions, for their own assignments.
-- Sessions are a record of what happened, so they aren't changed or deleted.
alter table public.study_sessions enable row level security;

create policy "Users can view their own study sessions"
on public.study_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can record their own study sessions"
on public.study_sessions
for insert
to authenticated
with check (
    user_id = (select auth.uid())
    and (
        assignment_id is null
        or exists (
            select 1
            from public.assignments as assignment
            where assignment.id = study_sessions.assignment_id
              and assignment.user_id = (select auth.uid())
        )
    )
);

revoke all on table public.study_sessions
from public, anon, authenticated;

grant select, insert on table public.study_sessions
to authenticated;

grant all on table public.study_sessions
to service_role;
