import { navigationRef } from '../../navigation/navigationRef';
import { ACADEMIC_DEADLINE_NOTIFICATION_TYPE } from './academicReminderService';

type NotificationResponseLike = {
  notification: {
    request: {
      content: {
        data?: Record<string, unknown>;
      };
    };
  };
};

let pendingAssignmentId: string | null =
  null;

function getAcademicAssignmentId(
  response: NotificationResponseLike,
): string | null {
  const data =
    response.notification.request.content
      .data;

  if (
    data?.riseNotificationType !==
    ACADEMIC_DEADLINE_NOTIFICATION_TYPE
  ) {
    return null;
  }

  const assignmentId =
    data.assignmentId;

  if (
    typeof assignmentId !== 'string' ||
    assignmentId.trim().length === 0
  ) {
    return null;
  }

  return assignmentId;
}

function assignmentDetailsRouteAvailable():
  boolean {
  if (!navigationRef.isReady()) {
    return false;
  }

  return Boolean(
    navigationRef
      .getRootState()
      ?.routeNames.includes(
        'AssignmentDetails',
      ),
  );
}

function openAssignment(
  assignmentId: string,
): boolean {
  if (
    !assignmentDetailsRouteAvailable()
  ) {
    return false;
  }

  navigationRef.navigate(
    'AssignmentDetails',
    {
      assignmentId,
    },
  );

  return true;
}

/**
 * Handles a notification tap.
 *
 * If authentication/onboarding is not ready yet, the assignment
 * is kept pending until RootNavigator exposes AssignmentDetails.
 */
export function handleAcademicNotificationResponse(
  response: NotificationResponseLike,
): boolean {
  const assignmentId =
    getAcademicAssignmentId(response);

  if (!assignmentId) {
    return false;
  }

  if (openAssignment(assignmentId)) {
    pendingAssignmentId = null;
    return true;
  }

  pendingAssignmentId =
    assignmentId;

  return true;
}

/**
 * Opens a notification that arrived while RISE was launching.
 *
 * Returns true only when a pending assignment was actually opened.
 */
export function openPendingAcademicNotification():
  boolean {
  if (!pendingAssignmentId) {
    return false;
  }

  if (
    !openAssignment(
      pendingAssignmentId,
    )
  ) {
    return false;
  }

  pendingAssignmentId = null;
  return true;
}

/**
 * Test helper so each test starts without a queued notification.
 */
export function clearPendingAcademicNotification():
  void {
  pendingAssignmentId = null;
}
