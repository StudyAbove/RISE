type CalendarRefreshListener =
  () => void;

const listeners =
  new Set<
    CalendarRefreshListener
  >();

export function notifyCalendarRefresh() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToCalendarRefresh(
  listener: CalendarRefreshListener,
) {
  listeners.add(
    listener,
  );

  return () => {
    listeners.delete(
      listener,
    );
  };
}
