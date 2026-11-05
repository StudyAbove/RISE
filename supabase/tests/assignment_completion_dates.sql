-- Local tests only. All test records are rolled back.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
    '43000000-0000-4000-8000-000000000001',
    'completion-date-test@example.com',
    '{}'::jsonb
);

do $$
declare
    test_assignment_id uuid;
    inserted_completed_id uuid;
    original_completed_at timestamptz;
    saved_completed_at timestamptz;
begin
    -- An unfinished assignment should not have a completion date.
    insert into public.assignments (user_id, title, completed)
    values (
        '43000000-0000-4000-8000-000000000001',
        'Completion date test',
        false
    )
    returning id into test_assignment_id;

    if exists (
        select 1
        from public.assignments
        where id = test_assignment_id
          and completed_at is not null
    ) then
        raise exception 'FAIL: Unfinished assignment has a completion date.';
    end if;

    raise notice 'PASS: Unfinished assignments have no completion date.';

    -- First completion records the date.
    update public.assignments
    set completed = true
    where id = test_assignment_id
    returning completed_at into original_completed_at;

    if original_completed_at is distinct from now() then
        raise exception 'FAIL: First completion did not record the current date.';
    end if;

    raise notice 'PASS: First completion records a date.';

    -- An ordinary sync must preserve the original completion date.
    update public.assignments
    set title = 'Updated assignment title',
        updated_at = now() + interval '1 day'
    where id = test_assignment_id
    returning completed_at into saved_completed_at;

    if saved_completed_at is distinct from original_completed_at then
        raise exception 'FAIL: Sync changed the completion date.';
    end if;

    -- Repeated completion, including an attempted replacement date,
    -- must also preserve the original date.
    update public.assignments
    set completed = true,
        completed_at = now() + interval '7 days'
    where id = test_assignment_id
    returning completed_at into saved_completed_at;

    if saved_completed_at is distinct from original_completed_at then
        raise exception 'FAIL: Repeated completion restarted retention.';
    end if;

    raise notice 'PASS: Repeated syncs preserve the completion date.';

    -- Reopening an assignment clears its completion date.
    update public.assignments
    set completed = false
    where id = test_assignment_id;

    if exists (
        select 1
        from public.assignments
        where id = test_assignment_id
          and completed_at is not null
    ) then
        raise exception 'FAIL: Reopened assignment kept its completion date.';
    end if;

    raise notice 'PASS: Reopening clears the completion date.';

    -- Completing it again records a date.
    update public.assignments
    set completed = true
    where id = test_assignment_id
    returning completed_at into saved_completed_at;

    if saved_completed_at is distinct from now() then
        raise exception 'FAIL: Recompletion did not record a date.';
    end if;

    raise notice 'PASS: Recompletion records a date.';

    -- Canvas may import an assignment that is already submitted.
    insert into public.assignments (user_id, title, completed)
    values (
        '43000000-0000-4000-8000-000000000001',
        'Already submitted assignment',
        true
    )
    returning id, completed_at
    into inserted_completed_id, saved_completed_at;

    if saved_completed_at is distinct from now() then
        raise exception 'FAIL: Completed import has no correct completion date.';
    end if;

    raise notice 'PASS: Already completed imports receive a completion date.';
end;
$$;

rollback;