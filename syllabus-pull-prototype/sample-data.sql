-- Demo data for reviewing the syllabus schema in Supabase.
-- Replace the email below with an existing RISE account, then run this in
-- Supabase Dashboard → SQL Editor. Requires the Canvas sync and syllabus
-- migrations to have been applied.
--
-- Safe to rerun: it updates the same clearly labeled sample course and
-- replaces its office-hour and grading-topic rows.

do $$
declare
    v_user_id uuid;
    v_course_id uuid;
begin
    select id
    into v_user_id
    from auth.users
    where lower(email) = lower('YOUR_RISE_EMAIL@example.com');

    if v_user_id is null then
        raise exception 'No Supabase auth user found for that email. Replace YOUR_RISE_EMAIL@example.com with your RISE login email.';
    end if;

    insert into public.courses (
        user_id,
        name,
        code,
        term,
        canvas_course_id,
        course_overview,
        professor_name,
        professor_email,
        grading_method,
        late_work,
        syllabus_info_confirmed_at
    ) values (
        v_user_id,
        'Sample Biology 101 (TEST DATA)',
        'BIO-101-DEMO',
        'Demo Term',
        'rise-syllabus-demo-001',
        'Sample course used to review syllabus extraction fields in Supabase.',
        'Dr. Example Instructor',
        'instructor@example.edu',
        'weighted_categories',
        'Late work accepted up to one week after the due date with a 10% deduction.',
        now()
    )
    on conflict (user_id, canvas_course_id) do update set
        name = excluded.name,
        code = excluded.code,
        term = excluded.term,
        course_overview = excluded.course_overview,
        professor_name = excluded.professor_name,
        professor_email = excluded.professor_email,
        grading_method = excluded.grading_method,
        late_work = excluded.late_work,
        syllabus_info_confirmed_at = excluded.syllabus_info_confirmed_at
    returning id into v_course_id;

    delete from public.course_syllabus_office_hours
    where course_id = v_course_id;

    insert into public.course_syllabus_office_hours (
        course_id, day_of_week, start_time, end_time, required_booking, booking_link
    ) values (
        v_course_id, 2, '14:00', '16:00', true, 'https://example.edu/office-hours'
    );

    delete from public.course_syllabus_grading_topics
    where course_id = v_course_id;

    insert into public.course_syllabus_grading_topics (
        course_id, title, percentage_worth, total_count
    ) values
        (v_course_id, 'Exams', 50.00, 3),
        (v_course_id, 'Laboratory Reports', 30.00, 6),
        (v_course_id, 'Quizzes', 20.00, 10);
end;
$$;

-- To remove this demo and its related syllabus rows later, run:
-- delete from public.courses
-- where canvas_course_id = 'rise-syllabus-demo-001'
--   and name = 'Sample Biology 101 (TEST DATA)';
