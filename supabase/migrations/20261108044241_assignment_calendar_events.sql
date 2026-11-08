-- ============================================
-- Assignments on the Calendar (#159)
-- ============================================
-- Each assignment with a due date gets a calendar event, so it shows on the
-- calendar and can be filtered by course. A trigger keeps the event in step
-- with its assignment, whoever writes it (today the Canvas sync), so the
-- canvas-extension Edge Function doesn't need to change.
--
-- The event ends at the due time and starts an hour earlier. It's removed when
-- the assignment loses its due date or disappears from Canvas (removed_at),
-- and deleted along with the assignment. Completed assignments keep theirs.
--
-- These events are read-only and stay in RISE: students can't change or
-- delete them (the policies at the end), and they're never sent to Apple or
-- Google Calendar, which only receive events created with Add Event.

alter table public.calendar_events
    -- The assignment this event shows. Unique: one event per assignment.
    add column assignment_id uuid unique
        references public.assignments(id)
        on delete cascade,

    -- The course the event belongs to, for the calendar's course filter.
    add column course_id uuid
        references public.courses(id)
        on delete set null;

create index calendar_events_course_id_idx
on public.calendar_events(course_id);

comment on column public.calendar_events.assignment_id is
    'Set on events copied from an assignment. Read-only for students; the assignment is the source of truth.';
comment on column public.calendar_events.course_id is
    'The course this event belongs to, used by the calendar course filter. Empty for events with no course.';

-- ============================================
-- Keeping Each Event in Step with Its Assignment
-- ============================================

-- Runs as the function's owner (security definer) so it can write these
-- events even though students can't. It only ever touches the event for the
-- assignment that fired it, with that assignment's own user_id.
create or replace function public.sync_assignment_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.due_at is null or new.removed_at is not null then
        delete from public.calendar_events
        where assignment_id = new.id;

        return new;
    end if;

    insert into public.calendar_events as event (
        user_id, title, start_at, end_at, source, description,
        event_type, course_id, assignment_id
    )
    values (
        new.user_id, new.title, new.due_at - interval '1 hour', new.due_at, new.source, new.description,
        'assignment', new.course_id, new.id
    )
    on conflict (assignment_id) do update
    set
        title = excluded.title,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        source = excluded.source,
        description = excluded.description,
        course_id = excluded.course_id,
        updated_at = now()
    -- Each Canvas sync rewrites every assignment; only touch events that
    -- actually changed, so updated_at means something.
    where (
        event.title,
        event.start_at,
        event.end_at,
        event.source,
        event.description,
        event.course_id
    ) is distinct from (
        excluded.title,
        excluded.start_at,
        excluded.end_at,
        excluded.source,
        excluded.description,
        excluded.course_id
    );

    return new;
end;
$$;

-- Only the columns the event copies; marking an assignment complete doesn't
-- fire it.
drop trigger if exists on_assignment_saved on public.assignments;

create trigger on_assignment_saved
after insert or update of title, description, due_at, source, course_id, removed_at
on public.assignments
for each row
execute function public.sync_assignment_calendar_event();

-- ============================================
-- Events for Assignments That Already Exist
-- ============================================

insert into public.calendar_events (
    user_id, title, start_at, end_at, source, description,
    event_type, course_id, assignment_id
)
select
    user_id, title, due_at - interval '1 hour', due_at, source, description,
    'assignment', course_id, id
from public.assignments
where due_at is not null
  and removed_at is null
on conflict (assignment_id) do nothing;

-- ============================================
-- Assignment Events Are Read-Only
-- ============================================

-- Restrictive policies narrow the existing "own calendar events" ones: a
-- student still manages their own events, just not ones from an assignment.
-- The trigger above writes them as the function's owner, and deleting an
-- assignment removes its event through the foreign key; neither is limited.

create policy "Students can't add assignment events"
on public.calendar_events
as restrictive
for insert
to authenticated
with check (assignment_id is null);

create policy "Students can't change assignment events"
on public.calendar_events
as restrictive
for update
to authenticated
using (assignment_id is null)
with check (assignment_id is null);

create policy "Students can't delete assignment events"
on public.calendar_events
as restrictive
for delete
to authenticated
using (assignment_id is null);

-- Only the trigger runs this function; no one calls it directly.
revoke all on function public.sync_assignment_calendar_event() from public, anon, authenticated;
