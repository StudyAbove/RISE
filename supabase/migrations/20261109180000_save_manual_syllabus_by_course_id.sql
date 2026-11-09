create or replace function public.save_manual_syllabus_by_course_id(
    p_user_id uuid,
    p_course_id uuid,
    p_info jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_syllabus_id uuid;
begin
    if not exists (
        select 1 from public.courses c
        where c.id = p_course_id and c.user_id = p_user_id
    ) then
        raise exception 'No class matched this RISE course ID.';
    end if;

    insert into public.syllabi (
        course_id, late_work, professor_name, professor_email, class_location, updated_at
    ) values (
        p_course_id,
        nullif(p_info ->> 'late_work', ''),
        nullif(p_info ->> 'professor_name', ''),
        nullif(p_info ->> 'professor_email', ''),
        nullif(p_info ->> 'class_location', ''),
        now()
    )
    on conflict (course_id) do update set
        late_work = excluded.late_work,
        professor_name = excluded.professor_name,
        professor_email = excluded.professor_email,
        class_location = excluded.class_location,
        updated_at = now()
    returning id into v_syllabus_id;

    update public.courses
    set syllabus_info_confirmed_at = now()
    where id = p_course_id and user_id = p_user_id;

    return v_syllabus_id;
end;
$$;

revoke all on function public.save_manual_syllabus_by_course_id(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_manual_syllabus_by_course_id(uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
