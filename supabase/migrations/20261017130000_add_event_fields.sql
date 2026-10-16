-- ============================================
-- Add Event (#31)
-- ============================================
-- Optional details from the Add Event form. Safe to run more than once: the
-- columns are only added if they don't exist yet.
--
-- Saving events also needs signed-in users to be able to insert into
-- calendar_events; that grant comes from 20261015151651_calendar_event_sync_support.sql.

alter table public.calendar_events
    add column if not exists event_type text
        check (event_type in ('class', 'assignment', 'study', 'personal', 'wellness')),
    add column if not exists reminder_minutes integer
        check (reminder_minutes > 0);

comment on column public.calendar_events.event_type is
    'Type chosen in the Add Event form: class, assignment, study, personal, or wellness.';
comment on column public.calendar_events.reminder_minutes is
    'How many minutes before start_at to remind the student (e.g. 1440 = 1 day). Saved now; notifications come later (#27).';
