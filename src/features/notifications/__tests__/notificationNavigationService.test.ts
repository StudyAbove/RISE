const mockNavigate = jest.fn();
const mockIsReady = jest.fn();
const mockGetRootState = jest.fn();

jest.mock(
  '../../navigation/navigationRef',
  () => ({
    navigationRef: {
      isReady: () =>
        mockIsReady(),
      getRootState: () =>
        mockGetRootState(),
      navigate:
        (...args: unknown[]) =>
          mockNavigate(...args),
    },
  }),
);

import {
  clearPendingAcademicNotification,
  handleAcademicNotificationResponse,
  openPendingAcademicNotification,
} from '../services/notificationNavigationService';

function response(
  data: Record<string, unknown>,
) {
  return {
    notification: {
      request: {
        content: {
          data,
        },
      },
    },
  };
}

describe(
  'notificationNavigationService',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      clearPendingAcademicNotification();

      mockIsReady.mockReturnValue(
        true,
      );

      mockGetRootState.mockReturnValue({
        routeNames: [
          'MainTabs',
          'Settings',
          'AssignmentDetails',
        ],
      });
    });

    it(
      'opens AssignmentDetails from an academic deadline notification',
      () => {
        const handled =
          handleAcademicNotificationResponse(
            response({
              riseNotificationType:
                'academic-deadline',
              assignmentId:
                'assignment-123',
            }),
          );

        expect(handled).toBe(true);

        expect(
          mockNavigate,
        ).toHaveBeenCalledWith(
          'AssignmentDetails',
          {
            assignmentId:
              'assignment-123',
          },
        );
      },
    );

    it(
      'ignores notifications from other RISE features',
      () => {
        const handled =
          handleAcademicNotificationResponse(
            response({
              riseNotificationType:
                'some-other-feature',
              assignmentId:
                'assignment-123',
            }),
          );

        expect(handled).toBe(false);

        expect(
          mockNavigate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'ignores an academic notification without a valid assignment id',
      () => {
        const handled =
          handleAcademicNotificationResponse(
            response({
              riseNotificationType:
                'academic-deadline',
              assignmentId: '',
            }),
          );

        expect(handled).toBe(false);

        expect(
          mockNavigate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'holds the assignment while the authenticated route is unavailable',
      () => {
        mockGetRootState.mockReturnValue({
          routeNames: [
            'Welcome',
            'Login',
          ],
        });

        const handled =
          handleAcademicNotificationResponse(
            response({
              riseNotificationType:
                'academic-deadline',
              assignmentId:
                'assignment-456',
            }),
          );

        expect(handled).toBe(true);

        expect(
          mockNavigate,
        ).not.toHaveBeenCalled();

        expect(
          openPendingAcademicNotification(),
        ).toBe(false);
      },
    );

    it(
      'opens a pending assignment once AssignmentDetails becomes available',
      () => {
        mockGetRootState.mockReturnValue({
          routeNames: [
            'Welcome',
            'Login',
          ],
        });

        handleAcademicNotificationResponse(
          response({
            riseNotificationType:
              'academic-deadline',
            assignmentId:
              'assignment-789',
          }),
        );

        mockGetRootState.mockReturnValue({
          routeNames: [
            'MainTabs',
            'AssignmentDetails',
          ],
        });

        expect(
          openPendingAcademicNotification(),
        ).toBe(true);

        expect(
          mockNavigate,
        ).toHaveBeenCalledWith(
          'AssignmentDetails',
          {
            assignmentId:
              'assignment-789',
          },
        );

        /*
         * It was consumed, so a later lifecycle event must not
         * open the same notification again.
         */
        expect(
          openPendingAcademicNotification(),
        ).toBe(false);
      },
    );

    it(
      'keeps the assignment pending while navigation itself is not ready',
      () => {
        mockIsReady.mockReturnValue(
          false,
        );

        handleAcademicNotificationResponse(
          response({
            riseNotificationType:
              'academic-deadline',
            assignmentId:
              'assignment-999',
          }),
        );

        expect(
          mockNavigate,
        ).not.toHaveBeenCalled();

        mockIsReady.mockReturnValue(
          true,
        );

        expect(
          openPendingAcademicNotification(),
        ).toBe(true);

        expect(
          mockNavigate,
        ).toHaveBeenCalledWith(
          'AssignmentDetails',
          {
            assignmentId:
              'assignment-999',
          },
        );
      },
    );
  },
);
