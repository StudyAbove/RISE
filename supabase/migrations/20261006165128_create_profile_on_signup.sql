create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    onboarding_completed
  )
  values (
    new.id,
    false
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  onboarding_completed
)
select
  id,
  false
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = auth.users.id
);