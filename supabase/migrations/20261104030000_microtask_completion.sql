-- ============================================
-- Mark Microtasks Complete and Undo (#44)
-- ============================================

-- Students may change completion only.
-- Existing permissions still prevent them from editing task instructions,
-- estimates, positions, ownership, or the generated plan.
grant update (completed)
on table public.assignment_microtasks
to authenticated;

-- Match the visibility rules used when reading tasks:
-- own task, own assignment, not removed, and course syncing enabled.
create policy "Users can update their own microtask completion"
on public.assignment_microtasks
for update
to authenticated
using (
    user_id = (select auth.uid())
    and exists (
        select 1
        from public.assignments as assignment
        where assignment.id = assignment_microtasks.assignment_id
          and assignment.user_id = (select auth.uid())
          and assignment.removed_at is null
          and (
              assignment.course_id is null
              or exists (
                  select 1
                  from public.courses as course
                  where course.id = assignment.course_id
                    and course.user_id = (select auth.uid())
                    and course.sync_enabled = true
              )
          )
    )
)
with check (
    user_id = (select auth.uid())
);