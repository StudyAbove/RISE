-- Normalized syllabus details linked to a student's existing course.
create table public.syllabi (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null unique references public.courses(id) on delete cascade,
    course_overview text,
    late_work text,
    professor_name varchar(200),
    professor_email varchar(254),
    grading_mode text not null default 'points'
        check (grading_mode in ('points', 'weighted_categories')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.office_hours (
    id uuid primary key default gen_random_uuid(),
    syllabus_id uuid not null references public.syllabi(id) on delete cascade,
    day_of_week smallint check (day_of_week between 0 and 6),
    start_time time,
    end_time time,
    required_booking boolean not null default false,
    booking_link text,
    created_at timestamptz not null default now(),
    check ((start_time is null) = (end_time is null))
);

create index office_hours_syllabus_id_idx on public.office_hours(syllabus_id);

create table public.grading_topics (
    id uuid primary key default gen_random_uuid(),
    syllabus_id uuid not null references public.syllabi(id) on delete cascade,
    title varchar(100) not null,
    percentage numeric(5, 2) check (percentage between 0 and 100),
    total_count integer check (total_count is null or total_count > 0),
    created_at timestamptz not null default now()
);

create index grading_topics_syllabus_id_idx on public.grading_topics(syllabus_id);

alter table public.syllabi enable row level security;
alter table public.office_hours enable row level security;
alter table public.grading_topics enable row level security;

create policy "Users can read syllabus details for their courses"
on public.syllabi for select to authenticated
using (exists (
    select 1 from public.courses
    where courses.id = syllabi.course_id and courses.user_id = auth.uid()
));

create policy "Users can read office hours for their courses"
on public.office_hours for select to authenticated
using (exists (
    select 1 from public.syllabi
    join public.courses on courses.id = syllabi.course_id
    where syllabi.id = office_hours.syllabus_id and courses.user_id = auth.uid()
));

create policy "Users can read grading topics for their courses"
on public.grading_topics for select to authenticated
using (exists (
    select 1 from public.syllabi
    join public.courses on courses.id = syllabi.course_id
    where syllabi.id = grading_topics.syllabus_id and courses.user_id = auth.uid()
));

grant select on public.syllabi, public.office_hours, public.grading_topics to authenticated;

-- The Edge Function supplies the paired user's ID and course code. Require one
-- exact match before storing, then replace child rows atomically.
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
        syllabus_id, day_of_week, start_time, end_time, required_booking, booking_link
    )
    select v_syllabus_id,
        nullif(item ->> 'day_of_week', '')::smallint,
        nullif(item ->> 'start_time', '')::time,
        nullif(item ->> 'end_time', '')::time,
        coalesce((item ->> 'required_booking')::boolean, false),
        nullif(item ->> 'booking_link', '')
    from jsonb_array_elements(coalesce(p_info -> 'office_hours', '[]'::jsonb)) item
    where nullif(item ->> 'day_of_week', '') is not null
       or nullif(item ->> 'start_time', '') is not null
       or nullif(item ->> 'end_time', '') is not null;

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
