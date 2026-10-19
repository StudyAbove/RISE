-- ============================================
-- Calendar Event Conflict Deletions
-- Story #85 - Data Redundancy Differ Calendars
-- ============================================

-- A provider version may represent an event that was deleted from
-- Apple or Google Calendar instead of an edited event.
--
-- Existing conflicts are normal "present" versions, so false is
-- the safe default for all existing rows.
alter table public.calendar_event_conflicts
add column provider_deleted boolean not null default false;
