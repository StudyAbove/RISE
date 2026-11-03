-- Local database tests for assignment microtasks (#42).
-- All test records are rolled back at the end.

begin;

-- Two temporary students let us test account isolation.
insert into auth.users (id, email, raw_user_meta_data)
values
    (
        '42000000-0000-4000-8000-000000000001',
        'microtask-test-a@example.com',
        '{}'::jsonb
    ),
    (
        '42000000-0000-4000-8000-000000000002',
        'microtask-test-b@example.com',
        '{}'::jsonb
    );

-- Assignments have no course so these tests focus on task storage.
insert into public.assignments (
    id, user_id, title, description, estimated_minutes
)
values
    (
        '42100000-0000-4000-8000-000000000001',
        '42000000-0000-4000-8000-000000000001',
        'Test lab report',
        'Write up results and conclusion.',
        80
    ),
    (
        '42100000-0000-4000-8000-000000000002',
        '42000000-0000-4000-8000-000000000001',
        'Test lab report',
        'Write up results and conclusion.',
        80
    ),
    (
        '42100000-0000-4000-8000-000000000003',
        '42000000-0000-4000-8000-000000000002',
        'Test lab report',
        'Write up results and conclusion.',
        80
    );

do $$
declare
    created boolean;
    original_ids uuid[];
    repeated_ids uuid[];
    too_many_tasks jsonb;
begin
    -- A valid plan must save both tasks in order with the correct total.
    created := public.save_assignment_microtasks(
        '42100000-0000-4000-8000-000000000001',
        '42000000-0000-4000-8000-000000000001',
        'Test lab report',
        'Write up results and conclusion.',
        80,
        '[
            {"title":"Organize results","minutes":30},
            {"title":"Write the conclusion","minutes":50}
        ]'::jsonb
    );

    if created is distinct from true then
        raise exception 'FAIL: Valid plan was not created.';
    end if;

    if (
        select count(*)
        from public.assignment_microtasks
        where assignment_id = '42100000-0000-4000-8000-000000000001'
    ) <> 2 then
        raise exception 'FAIL: Expected two saved tasks.';
    end if;

    if (
        select sum(estimated_minutes)
        from public.assignment_microtasks
        where assignment_id = '42100000-0000-4000-8000-000000000001'
    ) <> 80 then
        raise exception 'FAIL: Saved durations do not total 80.';
    end if;

    if not exists (
        select 1
        from public.assignment_microtasks
        where assignment_id = '42100000-0000-4000-8000-000000000001'
          and position = 1
          and title = 'Organize results'
    ) then
        raise exception 'FAIL: Task order was not preserved.';
    end if;

    raise notice 'PASS: Valid plan, task order, and total.';

    select array_agg(id order by position)
    into original_ids
    from public.assignment_microtasks
    where assignment_id = '42100000-0000-4000-8000-000000000001';

    -- Simulate saved completion using the database administrator.
    update public.assignment_microtasks
    set completed = true
    where assignment_id = '42100000-0000-4000-8000-000000000001'
      and position = 1;

    created := public.save_assignment_microtasks(
        '42100000-0000-4000-8000-000000000001',
        '42000000-0000-4000-8000-000000000001',
        'Test lab report',
        'Write up results and conclusion.',
        80,
        '[{"title":"Replacement task","minutes":80}]'::jsonb
    );

    select array_agg(id order by position)
    into repeated_ids
    from public.assignment_microtasks
    where assignment_id = '42100000-0000-4000-8000-000000000001';

    if created is distinct from false
        or original_ids is distinct from repeated_ids
        or not exists (
            select 1
            from public.assignment_microtasks
            where assignment_id = '42100000-0000-4000-8000-000000000001'
              and position = 1
              and completed = true
        ) then
        raise exception 'FAIL: Existing plan or completion was replaced.';
    end if;

    raise notice 'PASS: Repeated requests preserve task IDs and completion.';

    -- Incorrect total must fail without inserting partial tasks.
    begin
        perform public.save_assignment_microtasks(
            '42100000-0000-4000-8000-000000000002',
            '42000000-0000-4000-8000-000000000001',
            'Test lab report',
            'Write up results and conclusion.',
            80,
            '[{"title":"Organize results","minutes":79}]'::jsonb
        );

        raise exception 'FAIL: Incorrect total was accepted.';
    exception when others then
        if sqlerrm <> 'Microtask minutes must equal the assignment estimate.' then
            raise;
        end if;
    end;

    if exists (
        select 1
        from public.assignment_microtasks
        where assignment_id = '42100000-0000-4000-8000-000000000002'
    ) then
        raise exception 'FAIL: Invalid plan inserted partial tasks.';
    end if;

    raise notice 'PASS: Incorrect totals rejected without partial saves.';

    select jsonb_agg(
        jsonb_build_object('title', 'Task ' || number, 'minutes', 1)
    )
    into too_many_tasks
    from generate_series(1, 13) as steps(number);

    begin
        perform public.save_assignment_microtasks(
            '42100000-0000-4000-8000-000000000002',
            '42000000-0000-4000-8000-000000000001',
            'Test lab report',
            'Write up results and conclusion.',
            80,
            too_many_tasks
        );

        raise exception 'FAIL: More than 12 tasks were accepted.';
    exception when others then
        if sqlerrm <> 'A plan must contain between 1 and 12 microtasks.' then
            raise;
        end if;
    end;

    raise notice 'PASS: Maximum of 12 tasks enforced.';

    begin
        perform public.save_assignment_microtasks(
            '42100000-0000-4000-8000-000000000002',
            '42000000-0000-4000-8000-000000000002',
            'Test lab report',
            'Write up results and conclusion.',
            80,
            '[{"title":"Review results","minutes":80}]'::jsonb
        );

        raise exception 'FAIL: Incorrect student was accepted.';
    exception when others then
        if sqlerrm <> 'Assignment is unavailable.' then
            raise;
        end if;
    end;

    raise notice 'PASS: Assignment ownership enforced.';

    begin
        perform public.save_assignment_microtasks(
            '42100000-0000-4000-8000-000000000002',
            '42000000-0000-4000-8000-000000000001',
            'Test lab report',
            'Different instructions.',
            80,
            '[{"title":"Review results","minutes":80}]'::jsonb
        );

        raise exception 'FAIL: Outdated instructions were accepted.';
    exception when others then
        if sqlerrm <> 'The assignment instructions changed. Please retry.' then
            raise;
        end if;
    end;

    raise notice 'PASS: Plans based on outdated instructions rejected.';

    -- Create the second student's plan for the read-permission test.
    perform public.save_assignment_microtasks(
        '42100000-0000-4000-8000-000000000003',
        '42000000-0000-4000-8000-000000000002',
        'Test lab report',
        'Write up results and conclusion.',
        80,
        '[{"title":"Prepare the report","minutes":80}]'::jsonb
    );

    -- Only the backend role should be allowed to save plans.
    if has_function_privilege(
        'authenticated',
        'public.save_assignment_microtasks(uuid,uuid,text,text,integer,jsonb)',
        'EXECUTE'
    ) or has_function_privilege(
        'anon',
        'public.save_assignment_microtasks(uuid,uuid,text,text,integer,jsonb)',
        'EXECUTE'
    ) then
        raise exception 'FAIL: App or anonymous role can save plans directly.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.save_assignment_microtasks(uuid,uuid,text,text,integer,jsonb)',
        'EXECUTE'
    ) then
        raise exception 'FAIL: Backend role cannot call the save function.';
    end if;

    raise notice 'PASS: Save-function permissions.';
end;
$$;

-- Act as student A to test the actual row-level read policy.
set local role authenticated;

select set_config(
    'request.jwt.claim.sub',
    '42000000-0000-4000-8000-000000000001',
    true
);

select set_config(
    'request.jwt.claims',
    '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated"}',
    true
);

do $$
begin
    if (
        select count(*)
        from public.assignment_microtasks
        where assignment_id in (
            '42100000-0000-4000-8000-000000000001',
            '42100000-0000-4000-8000-000000000003'
        )
    ) <> 2 then
        raise exception 'FAIL: Student cannot read exactly their own tasks.';
    end if;

    if exists (
        select 1
        from public.assignment_microtasks
        where assignment_id = '42100000-0000-4000-8000-000000000003'
    ) then
        raise exception 'FAIL: Another student''s tasks are visible.';
    end if;

    raise notice 'PASS: Student reads their own tasks only.';
end;
$$;

reset role;

-- Leave the local database unchanged after the test.
rollback;