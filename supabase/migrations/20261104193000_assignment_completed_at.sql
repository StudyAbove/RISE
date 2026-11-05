-- Remember when RISE first records an assignment as completed.
-- List uses this date to keep completed assignments in Past for 14 days.
alter table public.assignments
add column completed_at timestamptz;

create function public.track_assignment_completion_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.completed then
        if TG_OP = 'INSERT' then
            new.completed_at := now();
        elsif old.completed then
            -- Syncing an already completed assignment preserves its date.
            new.completed_at := coalesce(old.completed_at, now());
        else
            -- The assignment has just changed from unfinished to completed.
            new.completed_at := now();
        end if;
    else
        -- Reopened assignments no longer have an active completion date.
        new.completed_at := null;
    end if;

    return new;
end;
$$;

create trigger track_assignment_completion_date
before insert or update on public.assignments
for each row
execute function public.track_assignment_completion_date();

-- Existing completed assignments have no recorded completion date.
-- Start their 14-day retention period when this migration is applied.
update public.assignments
set completed_at = now()
where completed = true
  and completed_at is null;