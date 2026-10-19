-- ============================================
-- Calendar Event Conflicts
-- Story #85 - Data Redundancy Differ Calendars
-- ============================================

create table public.calendar_event_conflicts (
    id uuid primary key default gen_random_uuid(),

    calendar_event_id uuid not null
        references public.calendar_events(id)
        on delete cascade,

    calendar_event_link_id uuid not null
        references public.calendar_event_links(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    provider text not null
        check (provider in ('apple', 'google')),

    -- ============================================
    -- RISE version preserved when conflict occurs
    -- ============================================

    rise_title text not null,

    rise_start_at timestamptz not null,

    rise_end_at timestamptz not null,

    rise_location text,

    rise_description text,

    rise_updated_at timestamptz,

    -- ============================================
    -- Connected calendar version preserved when
    -- conflict occurs
    -- ============================================

    provider_title text not null,

    provider_start_at timestamptz not null,

    provider_end_at timestamptz not null,

    provider_location text,

    provider_description text,

    provider_updated_at timestamptz,

    -- ============================================
    -- Resolution state
    -- ============================================

    status text not null default 'unresolved'
        check (status in ('unresolved', 'resolved')),

    resolution text
        check (resolution in ('rise', 'apple', 'google')),

    created_at timestamptz not null default now(),

    resolved_at timestamptz,

    -- An unresolved conflict has not chosen a winner yet.
    -- A resolved conflict must record which version won.
    check (
        (status = 'unresolved'
            and resolution is null
            and resolved_at is null)
        or
        (status = 'resolved'
            and resolution is not null
            and resolved_at is not null)
    )
);

-- ============================================
-- Indexes
-- ============================================

create index calendar_event_conflicts_user_id_idx
on public.calendar_event_conflicts(user_id);

create index calendar_event_conflicts_event_id_idx
on public.calendar_event_conflicts(calendar_event_id);

create index calendar_event_conflicts_link_id_idx
on public.calendar_event_conflicts(calendar_event_link_id);

create index calendar_event_conflicts_status_idx
on public.calendar_event_conflicts(status);

-- A provider link should have at most one active conflict.
-- Once that conflict is resolved, a later conflict may be
-- created for the same linked event.
create unique index calendar_event_conflicts_unresolved_link_idx
on public.calendar_event_conflicts(calendar_event_link_id)
where status = 'unresolved';

-- ============================================
-- Row Level Security
-- ============================================

alter table public.calendar_event_conflicts
enable row level security;

create policy "Users can view their own calendar event conflicts"
on public.calendar_event_conflicts
for select
using (auth.uid() = user_id);

create policy "Users can create their own calendar event conflicts"
on public.calendar_event_conflicts
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own calendar event conflicts"
on public.calendar_event_conflicts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own calendar event conflicts"
on public.calendar_event_conflicts
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete
on table public.calendar_event_conflicts
to authenticated;
