-- ============================================
-- Calendar Event Link Writability
-- ============================================
-- External calendars such as holidays or subscribed calendars
-- may be readable but not editable.
--
-- Store that permission on the provider link because writability
-- belongs to the Apple/Google copy, not to the shared RISE event.

alter table public.calendar_event_links
add column is_writable boolean not null default true;
