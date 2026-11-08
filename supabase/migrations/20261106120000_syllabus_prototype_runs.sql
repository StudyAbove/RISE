-- Isolated results from the no-RISE-phone syllabus prototype.
-- The extension can submit only through the Edge Function, which validates
-- its paired extension token and writes with the service role. Results are
-- inspectable in the Supabase dashboard and are not mixed with real courses.

create table public.syllabus_prototype_runs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    canvas_course_id text,
    course_name text not null,
    source_type text not null check (source_type in ('text', 'pdf', 'docx')),
    source_name text,
    input_character_count integer not null default 0,
    extracted_info jsonb not null
);

alter table public.syllabus_prototype_runs enable row level security;
revoke all on public.syllabus_prototype_runs from anon, authenticated;
grant all on public.syllabus_prototype_runs to service_role;

create index syllabus_prototype_runs_created_at_idx
    on public.syllabus_prototype_runs(created_at desc);
