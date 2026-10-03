export type CalendarSource =
  | 'rise'
  | 'apple'
  | 'google'
  | 'canvas';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string;
  source: CalendarSource;
  location?: string;
  description?: string;
}