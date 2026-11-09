-- Run against the local database. Roll back all test changes.
begin;

do $$
declare
    test_user_id uuid := gen_random_uuid();
    test_assignment_id uuid;
    legacy_task_id uuid;
    saved_completed boolean;
begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (
        test_user_id,
        test_user_id::text || '@example.com',
        '{}'::jsonb
    );

    insert into public.assignments (user_id, title, estimated_minutes)
    values (test_user_id, 'Microtask duration cap test', 210)
    returning id into test_assignment_id;

    -- Simulate a 120-minute task saved before the cap was introduced.
    alter table public.assignment_microtasks
        disable trigger enforce_new_microtask_duration;

    insert into public.assignment_microtasks (
        assignment_id, user_id, title, position, estimated_minutes,
        source_basis, plan_total_minutes
    )
    values (
        test_assignment_id, test_user_id, 'Existing task', 1, 120,
        'test-basis', 210
    )
    returning id into legacy_task_id;

    alter table public.assignment_microtasks
        enable trigger enforce_new_microtask_duration;

    insert into public.assignment_microtasks (
        assignment_id, user_id, title, position, estimated_minutes,
        source_basis, plan_total_minutes
    )
    values (
        test_assignment_id, test_user_id, 'New task at the cap', 2, 90,
        'test-basis', 210
    );

    raise notice 'PASS: A new 90-minute task can be saved.';

    begin
        insert into public.assignment_microtasks (
            assignment_id, user_id, title, position, estimated_minutes,
            source_basis, plan_total_minutes
        )
        values (
            test_assignment_id, test_user_id, 'New task above the cap', 3, 91,
            'test-basis', 210
        );

        raise exception 'FAIL: A new 91-minute task was saved.';
    exception
        when check_violation then
            if sqlerrm <> 'New microtasks cannot exceed 90 minutes.' then
                raise;
            end if;
    end;

    raise notice 'PASS: The cap rejects a new 91-minute task.';

    update public.assignment_microtasks
    set completed = true
    where id = legacy_task_id
    returning completed into saved_completed;

    if saved_completed is distinct from true then
        raise exception 'FAIL: Could not complete the existing task.';
    end if;

    update public.assignment_microtasks
    set completed = false
    where id = legacy_task_id
    returning completed into saved_completed;

    if saved_completed is distinct from false then
        raise exception 'FAIL: Could not undo completion on the existing task.';
    end if;

    raise notice 'PASS: Completion and undo still work on the existing 120-minute task.';
end;
$$;

rollback;