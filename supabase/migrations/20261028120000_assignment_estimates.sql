-- ============================================
-- Time Estimates for Assignments (#57)
-- ============================================

-- How long each assignment will take and what kind it is, so Home, List, and
-- Study can all show the same time. The estimate-assignments Edge Function
-- fills these in with Claude; the app guesses while they're empty.

alter table public.assignments
    add column estimated_minutes integer
        check (estimated_minutes between 5 and 6000),

    -- Keep in sync with ASSIGNMENT_KINDS in
    -- src/features/assignments/utils/assignmentEstimate.ts.
    add column kind text
        check (kind in (
            'exam', 'quiz', 'project', 'paper', 'lab',
            'homework', 'reading', 'discussion', 'other'
        )),

    add column estimated_at timestamptz;

-- ============================================
-- Re-estimate When an Assignment Changes
-- ============================================

-- Canvas sync updates assignments in place. If the title, description, or
-- points change, the old estimate may be wrong, so clear it and let the
-- function estimate again.
create function public.clear_changed_assignment_estimate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.points_possible is distinct from old.points_possible then
        new.estimated_minutes := null;
        new.kind := null;
        new.estimated_at := null;
    end if;

    return new;
end;
$$;

create trigger clear_changed_assignment_estimate
before update on public.assignments
for each row
execute function public.clear_changed_assignment_estimate();
