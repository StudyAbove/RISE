-- ============================================
-- Estimate From the Instructions, Not Points (#57)
-- ============================================

-- Classes grade on very different point scales, so estimates now come only
-- from what the assignment asks for. Points changing no longer means the
-- estimate is out of date.
create or replace function public.clear_changed_assignment_estimate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.title is distinct from old.title
        or new.description is distinct from old.description then
        new.estimated_minutes := null;
        new.kind := null;
        new.estimated_at := null;
    end if;

    return new;
end;
$$;

-- Estimates saved so far used points; clear them so they're made again.
update public.assignments
set estimated_minutes = null,
    kind = null,
    estimated_at = null
where estimated_minutes is not null;
