alter table public.office_hours
    add column user_id uuid references auth.users(id) on delete cascade;

update public.office_hours oh
set user_id = c.user_id
from public.syllabi s
join public.courses c on c.id = s.course_id
where s.id = oh.syllabus_id;

delete from public.office_hours oh
using (
    select id,
           row_number() over (
               partition by user_id, syllabus_id, day_of_week, start_time, end_time, booking_link
               order by created_at, id
           ) as duplicate_number
    from public.office_hours
) duplicates
where oh.id = duplicates.id and duplicates.duplicate_number > 1;

alter table public.office_hours alter column user_id set not null;

alter table public.office_hours
    add constraint office_hours_user_syllabus_schedule_booking_key
    unique nulls not distinct (user_id, syllabus_id, day_of_week, start_time, end_time, booking_link);

create or replace function public.save_extracted_syllabus(
    p_user_id uuid,
    p_course_code text,
    p_info jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_course_ids uuid[];
    v_course_id uuid;
    v_syllabus_id uuid;
begin
    if p_course_code is null or btrim(p_course_code) = '' then
        raise exception 'A course code is required to link syllabus details.';
    end if;

    select array_agg(c.id) into v_course_ids
    from public.courses c
    where c.user_id = p_user_id and lower(btrim(c.code)) = lower(btrim(p_course_code));

    if coalesce(array_length(v_course_ids, 1), 0) = 0 then
        raise exception 'No course matched this user and course code.';
    elsif array_length(v_course_ids, 1) > 1 then
        raise exception 'More than one course matched this user and course code.';
    end if;
    v_course_id := v_course_ids[1];

    insert into public.syllabi (
        course_id, course_overview, late_work, professor_name, professor_email, grading_mode, updated_at
    ) values (
        v_course_id,
        nullif(p_info ->> 'course_overview', ''),
        nullif(p_info ->> 'late_work', ''),
        nullif(p_info ->> 'professor_name', ''),
        nullif(p_info ->> 'professor_email', ''),
        coalesce(nullif(p_info ->> 'grading_mode', ''), 'points'),
        now()
    )
    on conflict (course_id) do update set
        course_overview = excluded.course_overview,
        late_work = excluded.late_work,
        professor_name = excluded.professor_name,
        professor_email = excluded.professor_email,
        grading_mode = excluded.grading_mode,
        updated_at = now()
    returning id into v_syllabus_id;

    delete from public.office_hours where syllabus_id = v_syllabus_id;
    insert into public.office_hours (
        user_id, syllabus_id, day_of_week, start_time, end_time, office_location, required_booking, booking_link
    )
    select p_user_id, v_syllabus_id,
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
    on conflict on constraint office_hours_user_syllabus_schedule_booking_key do nothing;

    delete from public.grading_topics where syllabus_id = v_syllabus_id;
    insert into public.grading_topics (syllabus_id, title, percentage, total_count)
    select v_syllabus_id, item ->> 'title',
        nullif(item ->> 'percentage', '')::numeric,
        nullif(item ->> 'total_count', '')::integer
    from jsonb_array_elements(coalesce(p_info -> 'topics', '[]'::jsonb)) item
    where nullif(item ->> 'title', '') is not null;

    return v_syllabus_id;
end;
$$;

revoke all on function public.save_extracted_syllabus(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_extracted_syllabus(uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
