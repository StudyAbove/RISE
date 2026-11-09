do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'syllabi' and column_name = 'grading_mode'
    ) and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'syllabi' and column_name = 'grading_method'
    ) then
        alter table public.syllabi rename column grading_mode to grading_method;
    end if;
end;
$$;

alter table public.syllabi
    drop constraint if exists syllabi_grading_mode_check;

alter table public.syllabi
    drop constraint if exists syllabi_grading_method_check;

alter table public.syllabi
    add constraint syllabi_grading_method_check
    check (grading_method in ('points', 'weighted_categories', 'other'));

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
    v_grading_method text;
begin
    if not exists (
        select 1 from public.courses c
        where c.id = p_course_id and c.user_id = p_user_id
    ) then
        raise exception 'No class matched this RISE course ID.';
    end if;

    v_grading_method := coalesce(nullif(p_info ->> 'grading_method', ''), 'points');
    if v_grading_method not in ('points', 'weighted_categories', 'other') then
        raise exception 'Unsupported grading method.';
    end if;

    insert into public.syllabi (
        course_id, late_work, professor_name, professor_email, class_location, grading_method, updated_at
    ) values (
        p_course_id,
        nullif(p_info ->> 'late_work', ''),
        nullif(p_info ->> 'professor_name', ''),
        nullif(p_info ->> 'professor_email', ''),
        nullif(p_info ->> 'class_location', ''),
        v_grading_method,
        now()
    )
    on conflict (course_id) do update set
        late_work = excluded.late_work,
        professor_name = excluded.professor_name,
        professor_email = excluded.professor_email,
        class_location = excluded.class_location,
        grading_method = excluded.grading_method,
        updated_at = now()
    returning id into v_syllabus_id;

    delete from public.office_hours where syllabus_id = v_syllabus_id;
    insert into public.office_hours (
        user_id, syllabus_id, day_of_week, start_time, end_time, office_location, required_booking, booking_link
    )
    select
        p_user_id,
        v_syllabus_id,
        nullif(item ->> 'day_of_week', '')::smallint,
        nullif(item ->> 'start_time', '')::time,
        nullif(item ->> 'end_time', '')::time,
        nullif(item ->> 'office_location', ''),
        coalesce((item ->> 'required_booking')::boolean, false),
        nullif(item ->> 'booking_link', '')
    from jsonb_array_elements(coalesce(p_info -> 'office_hours', '[]'::jsonb)) item
    where nullif(item ->> 'day_of_week', '') is not null
       or nullif(item ->> 'start_time', '') is not null
       or nullif(item ->> 'end_time', '') is not null
       or nullif(item ->> 'office_location', '') is not null
       or nullif(item ->> 'booking_link', '') is not null
    on conflict do nothing;

    delete from public.grading_topics where syllabus_id = v_syllabus_id;
    if v_grading_method = 'weighted_categories' then
        insert into public.grading_topics (syllabus_id, title, percentage, total_count)
        select
            v_syllabus_id,
            item ->> 'title',
            nullif(item ->> 'percentage', '')::numeric,
            nullif(item ->> 'total_count', '')::integer
        from jsonb_array_elements(coalesce(p_info -> 'topics', '[]'::jsonb)) item
        where nullif(item ->> 'title', '') is not null;
    end if;

    update public.courses
    set syllabus_info_confirmed_at = now()
    where id = p_course_id and user_id = p_user_id;

    return v_syllabus_id;
end;
$$;

revoke all on function public.save_manual_syllabus_by_course_id(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_manual_syllabus_by_course_id(uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
