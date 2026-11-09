-- ============================================
-- Estimate Each Assignment Once (#67)
-- ============================================

-- An assignment's time estimate should only be redone when the professor
-- actually changes the assignment, or when it's removed from Canvas and
-- added back. Before, any difference in what Canvas sent cleared it, e.g.
-- Canvas leaving out the instructions of a locked assignment and sending
-- them again once it unlocks, which paid for a new estimate each time.

-- What the saved estimate was based on: the title and instructions, ignoring
-- spacing and capital letters.
alter table public.assignments
    add column estimate_basis text;

create function public.assignment_estimate_basis(title text, description text)
returns text
language sql
immutable
set search_path = ''
as $$
    select md5(
        lower(regexp_replace(trim(coalesce(title, '')), '\s+', ' ', 'g'))
        || '|'
        || lower(regexp_replace(trim(coalesce(description, '')), '\s+', ' ', 'g'))
    );
$$;

update public.assignments
set estimate_basis = public.assignment_estimate_basis(title, description)
where estimated_minutes is not null;

create or replace function public.clear_changed_assignment_estimate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- A new estimate was just saved: remember what it was based on.
    if new.estimated_minutes is not null
        and new.estimated_minutes is distinct from old.estimated_minutes then
        new.estimate_basis := public.assignment_estimate_basis(new.title, new.description);
        return new;
    end if;

    -- Nothing to clear.
    if old.estimated_minutes is null then
        return new;
    end if;

    -- Removed from Canvas and added back: estimate it again.
    if old.removed_at is not null and new.removed_at is null then
        new.estimated_minutes := null;
        new.kind := null;
        new.estimated_at := null;
        new.estimate_basis := null;
        return new;
    end if;

    -- Canvas sometimes leaves the instructions out (e.g. locked
    -- assignments); that isn't a change, so keep the estimate.
    if trim(coalesce(new.description, '')) = '' then
        return new;
    end if;

    -- The professor changed the title or instructions.
    if new.estimate_basis is distinct from
        public.assignment_estimate_basis(new.title, new.description) then
        new.estimated_minutes := null;
        new.kind := null;
        new.estimated_at := null;
        new.estimate_basis := null;
    end if;

    return new;
end;
$$;
