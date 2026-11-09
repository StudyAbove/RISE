-- Cap newly created microtasks at 90 minutes.
-- Existing tasks remain usable, including completion and undo.
create function public.enforce_new_microtask_duration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.estimated_minutes > 90 then
        raise exception 'New microtasks cannot exceed 90 minutes.'
            using errcode = '23514';
    end if;

    return new;
end;
$$;

create trigger enforce_new_microtask_duration
before insert on public.assignment_microtasks
for each row
execute function public.enforce_new_microtask_duration();