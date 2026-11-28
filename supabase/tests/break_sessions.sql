begin;

-- Temporary accounts and assignment, removed by the final rollback.
insert into auth.users (id, email)
values
    ('69000000-0000-4000-8000-000000000001', 'break-test-a@example.invalid'),
    ('69000000-0000-4000-8000-000000000002', 'break-test-b@example.invalid');

insert into public.assignments (id, user_id, title, source, kind)
values (
    '69000000-0000-4000-8000-000000000003',
    '69000000-0000-4000-8000-000000000001',
    'Break analytics test',
    'rise',
    'homework'
);

-- Run as student A, so row-level security is actually tested.
set local role authenticated;

select set_config(
    'request.jwt.claim.sub',
    '69000000-0000-4000-8000-000000000001',
    true
);

do $$
declare
    saved_kind text;
    saved_count integer;
begin
    insert into public.break_sessions (
        client_session_id, assignment_id, break_type,
        started_at, ended_at, duration_seconds
    )
    values (
        'break-analytics-test',
        '69000000-0000-4000-8000-000000000003',
        'hydrate',
        '2026-11-28 09:00:00+00',
        '2026-11-28 09:00:45+00',
        45
    );

    select assignment_kind into saved_kind
    from public.break_sessions
    where client_session_id = 'break-analytics-test';

    if saved_kind is distinct from 'homework' then
        raise exception 'FAIL: Assignment type was not captured.';
    end if;

    raise notice 'PASS: Actual break time and assignment type are saved.';

    insert into public.break_sessions (
        client_session_id, assignment_id, break_type,
        started_at, ended_at, duration_seconds
    )
    values (
        'break-analytics-test',
        '69000000-0000-4000-8000-000000000003',
        'hydrate',
        '2026-11-28 09:00:00+00',
        '2026-11-28 09:00:45+00',
        45
    )
    on conflict (user_id, client_session_id) do nothing;

    select count(*) into saved_count
    from public.break_sessions
    where client_session_id = 'break-analytics-test';

    if saved_count <> 1 then
        raise exception 'FAIL: Duplicate break was recorded.';
    end if;

    raise notice 'PASS: Repeated saves do not duplicate a break.';

    begin
        insert into public.break_sessions (
            client_session_id, break_type,
            started_at, ended_at, duration_seconds
        )
        values (
            'invalid-duration', 'hydrate',
            '2026-11-28 09:00:00+00',
            '2026-11-28 09:00:10+00',
            90
        );

        raise exception 'FAIL: Duration exceeded elapsed time.';
    exception
        when check_violation then
            raise notice 'PASS: Duration cannot exceed elapsed time.';
    end;
end;
$$;

-- Switch to student B.
select set_config(
    'request.jwt.claim.sub',
    '69000000-0000-4000-8000-000000000002',
    true
);

do $$
begin
    if exists (
        select 1 from public.break_sessions
        where client_session_id = 'break-analytics-test'
    ) then
        raise exception 'FAIL: Another student can read the break.';
    end if;

    raise notice 'PASS: Students cannot read another account''s breaks.';

    begin
        insert into public.break_sessions (
            client_session_id, assignment_id, break_type,
            started_at, ended_at, duration_seconds
        )
        values (
            'wrong-assignment',
            '69000000-0000-4000-8000-000000000003',
            'walk',
            '2026-11-28 09:00:00+00',
            '2026-11-28 09:01:00+00',
            60
        );

        raise exception 'FAIL: Another student''s assignment was accepted.';
    exception
        when insufficient_privilege then
            raise notice 'PASS: Students cannot record breaks for another account''s assignment.';
    end;
end;
$$;

rollback;