alter table public.calendar_event_links
add column is_all_day boolean not null default false,
add column all_day_start_date date,
add column all_day_end_date date;

alter table public.calendar_event_links
add constraint calendar_event_links_all_day_dates_check
check (
  (
    is_all_day = false
    and all_day_start_date is null
    and all_day_end_date is null
  )
  or
  (
    is_all_day = true
    and all_day_start_date is not null
    and all_day_end_date is not null
    and all_day_end_date > all_day_start_date
  )
);
