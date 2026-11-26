-- ============================================
-- Canvas Submission Times (#175)
-- ============================================

-- How Canvas says each assignment is turned in, e.g. {online_upload} or
-- {on_paper}. Streaks skip work that can't be turned in online, since Canvas
-- has no submission time for it. Null for RISE's own assignments, and for
-- Canvas assignments until their next sync.
alter table public.assignments
add column submission_types text[];

-- Canvas sync now sends when work was actually submitted, instead of RISE
-- using the time of the sync. Only the sync (service role) can set the date:
-- students can update their own assignments, so a date they send is ignored.
create or replace function public.track_assignment_completion_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    submitted_at timestamptz := case
        when current_user = 'service_role' then new.completed_at
    end;
begin
    if new.completed then
        if TG_OP = 'INSERT' then
            new.completed_at := coalesce(submitted_at, now());
        elsif old.completed then
            -- Keep the earliest date. A resubmission after the deadline
            -- doesn't make on-time work late, and real submission times
            -- replace the dates set when completed_at was added.
            new.completed_at := coalesce(
                least(submitted_at, old.completed_at),
                now()
            );
        else
            -- The assignment has just changed from unfinished to completed.
            new.completed_at := coalesce(submitted_at, now());
        end if;
    else
        -- Reopened assignments no longer have an active completion date.
        new.completed_at := null;
    end if;

    return new;
end;
$$;
