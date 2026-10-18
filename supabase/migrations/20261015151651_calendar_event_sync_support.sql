-- ============================================
-- Calendar Event Sync Support
-- ============================================

-- Allow signed-in users to work with calendar_events.
-- Row Level Security still limits each user to their own rows.
grant select, insert, update, delete
on table public.calendar_events
to authenticated;

-- ============================================
-- External Calendar Event Links
-- ============================================

create table public.calendar_event_links (
    id uuid primary key default gen_random_uuid(),

    calendar_event_id uuid not null
        references public.calendar_events(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    provider text not null
        check (provider in ('apple', 'google')),

    external_event_id text not null,

    external_calendar_id text,

    last_synced_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (calendar_event_id, provider)
);

create index calendar_event_links_user_id_idx
on public.calendar_event_links(user_id);

create index calendar_event_links_event_id_idx
on public.calendar_event_links(calendar_event_id);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.calendar_event_links
enable row level security;

create policy "Users can view their own calendar event links"
on public.calendar_event_links
for select
using (auth.uid() = user_id);

create policy "Users can create their own calendar event links"
on public.calendar_event_links
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own calendar event links"
on public.calendar_event_links
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own calendar event links"
on public.calendar_event_links
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete
on table public.calendar_event_links
to authenticated;