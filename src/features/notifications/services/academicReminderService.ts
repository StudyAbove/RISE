import * as Notifications from 'expo-notifications';

import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { loadNotificationsEnabled } from './notificationPreferenceService';
import { areDeviceNotificationsAllowed } from './notificationService';

const THREE_DAYS_MS =
  3 * 24 * 60 * 60 * 1000;

const ONE_DAY_MS =
  24 * 60 * 60 * 1000;

export const ACADEMIC_DEADLINE_NOTIFICATION_TYPE =
  'academic-deadline';

export type AcademicReminderThreshold =
  | '3-days'
  | '24-hours';

type ReminderDefinition = {
  threshold: AcademicReminderThreshold;
  offsetMs: number;
  titleSuffix: string;
};

const REMINDERS: ReminderDefinition[] = [
  {
    threshold: '3-days',
    offsetMs: THREE_DAYS_MS,
    titleSuffix: 'due in 3 days',
  },
  {
    threshold: '24-hours',
    offsetMs: ONE_DAY_MS,
    titleSuffix: 'due in 24 hours',
  },
];

function academicItemLabel(
  assignment: Assignment,
): string {
  if (assignment.kind === 'exam') {
    return 'Exam';
  }

  if (assignment.kind === 'quiz') {
    return 'Quiz';
  }

  return 'Assignment';
}

function formatDeadline(
  dueAt: Date,
): string {
  return dueAt.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Cancels only RISE academic-deadline reminders.
 *
 * Other current or future RISE notification types are left alone.
 */
export async function cancelAcademicDeadlineReminders():
  Promise<void> {
  const scheduled =
    await Notifications
      .getAllScheduledNotificationsAsync();

  const academicReminders =
    scheduled.filter(
      (notification) =>
        notification.content.data
          ?.riseNotificationType ===
        ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
    );

  await Promise.all(
    academicReminders.map(
      (notification) =>
        Notifications
          .cancelScheduledNotificationAsync(
            notification.identifier,
          ),
    ),
  );
}

/**
 * Rebuilds all pending academic deadline reminders from the
 * latest assignment data.
 *
 * Rebuilding guarantees:
 * - changed due dates replace old reminder times
 * - completed/removed assignments lose their reminders
 * - the same assignment/threshold cannot accumulate duplicates
 */
export async function reconcileAcademicDeadlineReminders(
  assignments: Assignment[],
  now: Date = new Date(),
): Promise<number> {
  /*
   * #84: the student's RISE preference always wins.
   * Also remove old pending academic reminders if reminders
   * have since been disabled.
   */
  if (!loadNotificationsEnabled()) {
    await cancelAcademicDeadlineReminders();
    return 0;
  }

  /*
   * Do not prompt from background/startup reconciliation.
   * The Settings toggle owns permission requests.
   */
  const deviceAllowed =
    await areDeviceNotificationsAllowed();

  if (!deviceAllowed) {
    await cancelAcademicDeadlineReminders();
    return 0;
  }

  /*
   * Remove the previous academic reminder set first.
   * The current assignment snapshot becomes the source of truth.
   */
  await cancelAcademicDeadlineReminders();

  let scheduledCount = 0;

  for (const assignment of assignments) {
    if (
      assignment.completed ||
      !assignment.dueAt
    ) {
      continue;
    }

    const dueAt = assignment.dueAt;

    /*
     * A deadline that already passed cannot receive a useful
     * deadline reminder.
     */
    if (
      dueAt.getTime() <=
      now.getTime()
    ) {
      continue;
    }

    for (const reminder of REMINDERS) {
      const triggerDate =
        new Date(
          dueAt.getTime() -
            reminder.offsetMs,
        );

      /*
       * Do not schedule a notification whose threshold has
       * already passed.
       *
       * Example:
       * if something is due in 2 days, only its 24-hour
       * reminder is still valid.
       */
      if (
        triggerDate.getTime() <=
        now.getTime()
      ) {
        continue;
      }

      const itemLabel =
        academicItemLabel(assignment);

      const courseLabel =
        assignment.courseCode ??
        assignment.courseName;

      await Notifications
        .scheduleNotificationAsync({
          content: {
            title:
              `${itemLabel} ${reminder.titleSuffix}`,
            body:
              `${assignment.title}` +
              (courseLabel
                ? ` • ${courseLabel}`
                : '') +
              ` • Due ${formatDeadline(dueAt)}`,
            data: {
              riseNotificationType:
                ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
              assignmentId:
                assignment.id,
              reminderThreshold:
                reminder.threshold,
              dueAt:
                dueAt.toISOString(),
              assignmentKind:
                assignment.kind ??
                'other',
            },
          },
          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .DATE,
            date: triggerDate,
          },
        });

      scheduledCount += 1;
    }
  }

  return scheduledCount;
}

/**
 * Loads the latest assignments and reconciles their reminders.
 *
 * RootNavigator calls this when the authenticated app starts
 * and whenever RISE returns to the foreground.
 */
export async function refreshAcademicDeadlineReminders():
  Promise<number> {
  const assignments =
    await fetchAssignments();

  return reconcileAcademicDeadlineReminders(
    assignments,
  );
}
