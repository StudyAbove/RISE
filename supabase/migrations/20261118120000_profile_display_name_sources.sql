-- ============================================
-- Display Name Source Selection (#35)
-- ============================================

alter table public.profiles
add column if not exists canvas_display_name text,
add column if not exists custom_display_name text,
add column if not exists display_name_source text
  not null
  default 'canvas'
  check (display_name_source in ('canvas', 'custom'));

-- Existing users currently have their Canvas-provided name stored in
-- display_name, so preserve it as the Canvas option.
update public.profiles
set canvas_display_name = display_name
where canvas_display_name is null
  and display_name is not null;

-- Home continues reading display_name exactly as before.
-- This column remains the currently selected/effective display name.
