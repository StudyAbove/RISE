-- Earlier prototype builds stored a single office location on the syllabus.
-- Carry it to each existing office-hours row that has no location yet.
update public.office_hours oh
set office_location = s.office_location
from public.syllabi s
where s.id = oh.syllabus_id
  and oh.office_location is null
  and nullif(btrim(s.office_location), '') is not null;

notify pgrst, 'reload schema';
