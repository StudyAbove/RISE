-- RISE initial database schema

-- ============================================
-- Profiles
-- ============================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    onboarding_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================
-- Courses
-- ============================================

create table public.courses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    code text,
    created_at timestamptz not null default now()
);

create index courses_user_id_idx
on public.courses(user_id);

-- ============================================
-- Assignments
-- ============================================

create table public.assignments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid references public.courses(id) on delete set null,
    title text not null,
    description text,
    due_at timestamptz,
    source text not null default 'rise'
        check (source in ('rise', 'canvas')),
    completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index assignments_user_id_idx
on public.assignments(user_id);

create index assignments_due_at_idx
on public.assignments(due_at);

-- ============================================
-- Calendar Events
-- ============================================

create table public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    start_at timestamptz not null,
    end_at timestamptz not null,
    source text not null
        check (source in ('rise', 'apple', 'google', 'canvas')),
    location text,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index calendar_events_user_id_idx
on public.calendar_events(user_id);

create index calendar_events_start_at_idx
on public.calendar_events(start_at);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.calendar_events enable row level security;

-- Profiles

create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Courses

create policy "Users can view their own courses"
on public.courses
for select
using (auth.uid() = user_id);

create policy "Users can create their own courses"
on public.courses
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own courses"
on public.courses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own courses"
on public.courses
for delete
using (auth.uid() = user_id);

-- Assignments

create policy "Users can view their own assignments"
on public.assignments
for select
using (auth.uid() = user_id);

create policy "Users can create their own assignments"
on public.assignments
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own assignments"
on public.assignments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own assignments"
on public.assignments
for delete
using (auth.uid() = user_id);

-- Calendar Events

create policy "Users can view their own calendar events"
on public.calendar_events
for select
using (auth.uid() = user_id);

create policy "Users can create their own calendar events"
on public.calendar_events
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own calendar events"
on public.calendar_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own calendar events"
on public.calendar_events
for delete
using (auth.uid() = user_id);