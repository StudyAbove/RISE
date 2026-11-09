-- The syllabus-level location describes the course/class. Office location is
-- stored separately on each office_hours row.
alter table public.syllabi rename column office_location to class_location;

drop function if exists public.set_syllabus_office_location(uuid, text, text);

create or replace function public.set_syllabus_class_location(
    p_user_id uuid,
    p_course_code text,
    p_class_location text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_syllabus_id uuid;
begin
    select s.id into v_syllabus_id
    from public.syllabi s
    join public.courses c on c.id = s.course_id
    where c.user_id = p_user_id
      and lower(btrim(c.code)) = lower(btrim(p_course_code));

    if not found then
        raise exception 'No syllabus matched this user and course code.';
    end if;

    update public.syllabi
    set class_location = nullif(btrim(p_class_location), ''), updated_at = now()
    where id = v_syllabus_id;
end;
$$;

revoke all on function public.set_syllabus_class_location(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_syllabus_class_location(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
