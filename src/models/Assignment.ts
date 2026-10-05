export type AssignmentSource = 'canvas' | 'rise';

export interface Assignment {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  dueAt: string;
  source: AssignmentSource;
  completed: boolean;
}