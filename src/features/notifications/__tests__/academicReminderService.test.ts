import * as Notifications from 'expo-notifications';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
  cancelAcademicDeadlineReminders,
  reconcileAcademicDeadlineReminders,
  refreshAcademicDeadlineReminders,
} from '../services/academicReminderService';
import { loadNotificationsEnabled } from '../services/notificationPreferenceService';
import { areDeviceNotificationsAllowed } from '../services/notificationService';
import { fetchAssignments } from '../../../repositories/assignmentsRepository';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  getAllScheduledNotificationsAsync:
    jest.fn(),
  cancelScheduledNotificationAsync:
    jest.fn(),
  scheduleNotificationAsync:
    jest.fn(),
}));

jest.mock(
  '../services/notificationPreferenceService',
  () => ({
    loadNotificationsEnabled:
      jest.fn(),
  }),
);

jest.mock(
  '../services/notificationService',
  () => ({
    areDeviceNotificationsAllowed:
      jest.fn(),
  }),
);

jest.mock(
  '../../../repositories/assignmentsRepository',
  () => ({
    fetchAssignments:
      jest.fn(),
  }),
);

const mockLoadNotificationsEnabled =
  loadNotificationsEnabled as jest.MockedFunction<
    typeof loadNotificationsEnabled
  >;

const mockAreDeviceNotificationsAllowed =
  areDeviceNotificationsAllowed as jest.MockedFunction<
    typeof areDeviceNotificationsAllowed
  >;

const mockFetchAssignments =
  fetchAssignments as jest.MockedFunction<
    typeof fetchAssignments
  >;

const mockGetScheduled =
  Notifications
    .getAllScheduledNotificationsAsync as jest.MockedFunction<
      typeof Notifications.getAllScheduledNotificationsAsync
    >;

const mockCancel =
  Notifications
    .cancelScheduledNotificationAsync as jest.MockedFunction<
      typeof Notifications.cancelScheduledNotificationAsync
    >;

const mockSchedule =
  Notifications
    .scheduleNotificationAsync as jest.MockedFunction<
      typeof Notifications.scheduleNotificationAsync
    >;

const now =
  new Date('2026-11-16T12:00:00.000Z');

let nextId = 1;

function scheduledNotification(
  identifier: string,
  data: Record<string, unknown>,
): Notifications.NotificationRequest {
  return {
    identifier,
    content: {
      title: 'Scheduled notification',
      subtitle: null,
      body: '',
      data,
      categoryIdentifier: null,
      sound: null,
    },
    trigger: null,
  };
}

function assignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    id: `assignment-${nextId++}`,
    title: 'Midterm Review',
    description: null,
    dueAt:
      new Date(
        '2026-11-20T12:00:00.000Z',
      ),
    completed: false,
    completedAt: null,
    source: 'canvas',
    courseId: 'course-1',
    courseName: 'Computer Science',
    courseCode: 'CECS 456',
    courseColor: '#000000',
    courseTint: '#FFFFFF',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
    microtasks: [],
    ...overrides,
  };
}

describe(
  'academicReminderService',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
      nextId = 1;

      mockLoadNotificationsEnabled
        .mockReturnValue(true);

      mockAreDeviceNotificationsAllowed
        .mockResolvedValue(true);

      mockGetScheduled
        .mockResolvedValue([]);

      mockCancel
        .mockResolvedValue();

      mockSchedule
        .mockResolvedValue(
          'notification-id',
        );

      mockFetchAssignments
        .mockResolvedValue([]);
    });

    it(
      'schedules 3-day and 24-hour reminders when both thresholds are still ahead',
      async () => {
        const item = assignment({
          dueAt:
            new Date(
              '2026-11-20T12:00:00.000Z',
            ),
        });

        const count =
          await reconcileAcademicDeadlineReminders(
            [item],
            now,
          );

        expect(count).toBe(2);
        expect(
          mockSchedule,
        ).toHaveBeenCalledTimes(2);

        expect(
          mockSchedule.mock.calls[0][0]
            .content.data,
        ).toMatchObject({
          riseNotificationType:
            ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
          assignmentId:
            item.id,
          reminderThreshold:
            '3-days',
        });

        expect(
          mockSchedule.mock.calls[1][0]
            .content.data,
        ).toMatchObject({
          assignmentId:
            item.id,
          reminderThreshold:
            '24-hours',
        });
      },
    );

    it(
      'uses the latest due date when reminders are rebuilt after a deadline changes',
      async () => {
        const item = assignment({
          dueAt:
            new Date(
              '2026-11-20T12:00:00.000Z',
            ),
        });

        await reconcileAcademicDeadlineReminders(
          [item],
          now,
        );

        const firstTriggers =
          mockSchedule.mock.calls.map(
            ([request]) =>
              (
                request.trigger as {
                  date: Date;
                }
              ).date.toISOString(),
          );

        expect(firstTriggers).toEqual([
          '2026-11-17T12:00:00.000Z',
          '2026-11-19T12:00:00.000Z',
        ]);

        mockSchedule.mockClear();

        const updatedItem = {
          ...item,
          dueAt:
            new Date(
              '2026-11-22T12:00:00.000Z',
            ),
        };

        await reconcileAcademicDeadlineReminders(
          [updatedItem],
          now,
        );

        const updatedTriggers =
          mockSchedule.mock.calls.map(
            ([request]) =>
              (
                request.trigger as {
                  date: Date;
                }
              ).date.toISOString(),
          );

        expect(updatedTriggers).toEqual([
          '2026-11-19T12:00:00.000Z',
          '2026-11-21T12:00:00.000Z',
        ]);
      },
    );

    it(
      'creates only one notification for each reminder threshold per assignment',
      async () => {
        const item = assignment();

        await reconcileAcademicDeadlineReminders(
          [item],
          now,
        );

        const thresholds =
          mockSchedule.mock.calls.map(
            ([request]) =>
              request.content.data
                ?.reminderThreshold,
          );

        expect(thresholds).toEqual([
          '3-days',
          '24-hours',
        ]);

        expect(
          new Set(thresholds).size,
        ).toBe(2);
      },
    );

    it(
      'only schedules the 24-hour reminder when the 3-day threshold already passed',
      async () => {
        const item = assignment({
          dueAt:
            new Date(
              '2026-11-18T12:00:00.000Z',
            ),
        });

        const count =
          await reconcileAcademicDeadlineReminders(
            [item],
            now,
          );

        expect(count).toBe(1);

        expect(
          mockSchedule.mock.calls[0][0]
            .content.data,
        ).toMatchObject({
          reminderThreshold:
            '24-hours',
        });
      },
    );

    it(
      'does not schedule reminders after all reminder thresholds passed',
      async () => {
        const item = assignment({
          dueAt:
            new Date(
              '2026-11-17T06:00:00.000Z',
            ),
        });

        const count =
          await reconcileAcademicDeadlineReminders(
            [item],
            now,
          );

        expect(count).toBe(0);
        expect(
          mockSchedule,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not schedule reminders for completed assignments or assignments without due dates',
      async () => {
        const completed =
          assignment({
            completed: true,
          });

        const noDueDate =
          assignment({
            dueAt: null,
          });

        const count =
          await reconcileAcademicDeadlineReminders(
            [
              completed,
              noDueDate,
            ],
            now,
          );

        expect(count).toBe(0);
        expect(
          mockSchedule,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not schedule when the RISE notification preference is off and cancels existing academic reminders',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        mockGetScheduled
          .mockResolvedValue([
            scheduledNotification(
              'academic-old',
              {
                riseNotificationType:
                  ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
              },
            ),
          ]);

        const count =
          await reconcileAcademicDeadlineReminders(
            [assignment()],
            now,
          );

        expect(count).toBe(0);
        expect(
          mockSchedule,
        ).not.toHaveBeenCalled();

        expect(
          mockCancel,
        ).toHaveBeenCalledWith(
          'academic-old',
        );
      },
    );

    it(
      'handles denied device permission without scheduling or requesting permission',
      async () => {
        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(false);

        const count =
          await reconcileAcademicDeadlineReminders(
            [assignment()],
            now,
          );

        expect(count).toBe(0);
        expect(
          mockSchedule,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'replaces existing academic reminders while leaving unrelated scheduled notifications alone',
      async () => {
        mockGetScheduled
          .mockResolvedValue([
            scheduledNotification(
              'old-academic',
              {
                riseNotificationType:
                  ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
              },
            ),
            scheduledNotification(
              'other-notification',
              {
                riseNotificationType:
                  'some-future-feature',
              },
            ),
          ]);

        await reconcileAcademicDeadlineReminders(
          [assignment()],
          now,
        );

        expect(
          mockCancel,
        ).toHaveBeenCalledWith(
          'old-academic',
        );

        expect(
          mockCancel,
        ).not.toHaveBeenCalledWith(
          'other-notification',
        );
      },
    );

    it(
      'labels quiz and exam reminders with their academic item type',
      async () => {
        await reconcileAcademicDeadlineReminders(
          [
            assignment({
              title: 'Quiz 5',
              kind: 'quiz',
            }),
            assignment({
              title: 'Final Exam',
              kind: 'exam',
            }),
          ],
          now,
        );

        const titles =
          mockSchedule.mock.calls.map(
            ([request]) =>
              request.content.title,
          );

        expect(
          titles.some(
            (title) =>
              (title ?? '').startsWith('Quiz '),
          ),
        ).toBe(true);

        expect(
          titles.some(
            (title) =>
              (title ?? '').startsWith('Exam '),
          ),
        ).toBe(true);
      },
    );

    it(
      'loads current assignments when refreshing reminders',
      async () => {
        const assignments = [
          assignment(),
        ];

        mockFetchAssignments
          .mockResolvedValue(
            assignments,
          );

        jest.useFakeTimers();
        jest.setSystemTime(now);

        try {
          await refreshAcademicDeadlineReminders();
        } finally {
          jest.useRealTimers();
        }

        expect(
          mockFetchAssignments,
        ).toHaveBeenCalledTimes(1);

        expect(
          mockSchedule,
        ).toHaveBeenCalled();
      },
    );

    it(
      'can cancel academic reminders directly without cancelling unrelated notifications',
      async () => {
        mockGetScheduled
          .mockResolvedValue([
            scheduledNotification(
              'academic',
              {
                riseNotificationType:
                  ACADEMIC_DEADLINE_NOTIFICATION_TYPE,
              },
            ),
            scheduledNotification(
              'other',
              {},
            ),
          ]);

        await cancelAcademicDeadlineReminders();

        expect(
          mockCancel,
        ).toHaveBeenCalledTimes(1);

        expect(
          mockCancel,
        ).toHaveBeenCalledWith(
          'academic',
        );
      },
    );
  },
);
