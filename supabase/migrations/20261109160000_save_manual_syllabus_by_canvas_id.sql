create or replace function public.save_manual_syllabus_by_canvas_id(
    p_user_id uuid,
    p_canvas_course_id text,
    p_info jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_course_id uuid;
    v_syllabus_id uuid;
begin
    select c.id into v_course_id
    from public.courses c
    where c.user_id = p_user_id and c.canvas_course_id = p_canvas_course_id;

    if not found then
        raise exception 'No class matched this Canvas course ID.';
    end if;

    insert into public.syllabi (
        course_id, late_work, professor_name, professor_email, class_location, updated_at
    ) values (
        v_course_id,
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
    where id = v_course_id and user_id = p_user_id;

    return v_syllabus_id;
end;
$$;

revoke all on function public.save_manual_syllabus_by_canvas_id(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_manual_syllabus_by_canvas_id(uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
