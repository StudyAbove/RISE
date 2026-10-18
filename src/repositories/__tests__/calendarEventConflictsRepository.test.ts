import {
  getUnresolvedCalendarEventConflict,
  getUnresolvedCalendarEventConflicts,
  markCalendarEventConflictResolved,
  saveCalendarEventConflict,
} from '../calendarEventConflictsRepository';

const mockQuery = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  maybeSingle: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) =>
      mockQuery.from(table),
  },
}));

const unresolvedConflictRow = {
  id: 'conflict-1',
  calendar_event_id: 'event-1',
  calendar_event_link_id: 'link-1',
  user_id: 'user-1',
  provider: 'apple',

  rise_title: 'RISE Study Session',
  rise_start_at:
    '2026-10-20T18:00:00.000Z',
  rise_end_at:
    '2026-10-20T19:00:00.000Z',
  rise_location: 'Library',
  rise_description:
    'RISE version',
  rise_updated_at:
    '2026-10-18T20:00:00.000Z',

  provider_title: 'Apple Study Session',
  provider_start_at:
    '2026-10-20T19:00:00.000Z',
  provider_end_at:
    '2026-10-20T20:00:00.000Z',
  provider_location: 'Home',
  provider_description:
    'Apple version',
  provider_updated_at:
    '2026-10-18T21:00:00.000Z',

  status: 'unresolved',
  resolution: null,

  created_at:
    '2026-10-18T21:05:00.000Z',
  resolved_at: null,
};

const saveInput = {
  calendarEventId: 'event-1',
  calendarEventLinkId: 'link-1',
  userId: 'user-1',
  provider: 'apple' as const,

  riseVersion: {
    title: 'RISE Study Session',
    startAt:
      '2026-10-20T18:00:00.000Z',
    endAt:
      '2026-10-20T19:00:00.000Z',
    location: 'Library',
    description:
      'RISE version',
    updatedAt:
      '2026-10-18T20:00:00.000Z',
  },

  providerVersion: {
    title: 'Apple Study Session',
    startAt:
      '2026-10-20T19:00:00.000Z',
    endAt:
      '2026-10-20T20:00:00.000Z',
    location: 'Home',
    description:
      'Apple version',
    updatedAt:
      '2026-10-18T21:00:00.000Z',
  },
};

beforeEach(() => {
  jest.clearAllMocks();

  mockQuery.from.mockReturnValue(
    mockQuery,
  );

  mockQuery.select.mockReturnValue(
    mockQuery,
  );

  mockQuery.eq.mockReturnValue(
    mockQuery,
  );

  mockQuery.update.mockReturnValue(
    mockQuery,
  );

  mockQuery.insert.mockReturnValue(
    mockQuery,
  );
});

describe(
  'saveCalendarEventConflict',
  () => {
    it(
      'creates a new unresolved conflict when the provider link has no active conflict',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: null,
            error: null,
          });

        mockQuery.single
          .mockResolvedValueOnce({
            data: unresolvedConflictRow,
            error: null,
          });

        const conflict =
          await saveCalendarEventConflict(
            saveInput,
          );

        expect(
          mockQuery.from,
        ).toHaveBeenCalledWith(
          'calendar_event_conflicts',
        );

        expect(
          mockQuery.insert,
        ).toHaveBeenCalledWith({
          calendar_event_id:
            'event-1',

          calendar_event_link_id:
            'link-1',

          user_id:
            'user-1',

          provider:
            'apple',

          rise_title:
            'RISE Study Session',

          rise_start_at:
            '2026-10-20T18:00:00.000Z',

          rise_end_at:
            '2026-10-20T19:00:00.000Z',

          rise_location:
            'Library',

          rise_description:
            'RISE version',

          rise_updated_at:
            '2026-10-18T20:00:00.000Z',

          provider_title:
            'Apple Study Session',

          provider_start_at:
            '2026-10-20T19:00:00.000Z',

          provider_end_at:
            '2026-10-20T20:00:00.000Z',

          provider_location:
            'Home',

          provider_description:
            'Apple version',

          provider_updated_at:
            '2026-10-18T21:00:00.000Z',

          status:
            'unresolved',

          resolution:
            null,

          resolved_at:
            null,
        });

        expect(
          conflict,
        ).toEqual({
          id: 'conflict-1',

          calendarEventId:
            'event-1',

          calendarEventLinkId:
            'link-1',

          userId:
            'user-1',

          provider:
            'apple',

          riseVersion: {
            title:
              'RISE Study Session',

            startAt:
              '2026-10-20T18:00:00.000Z',

            endAt:
              '2026-10-20T19:00:00.000Z',

            location:
              'Library',

            description:
              'RISE version',

            updatedAt:
              '2026-10-18T20:00:00.000Z',
          },

          providerVersion: {
            title:
              'Apple Study Session',

            startAt:
              '2026-10-20T19:00:00.000Z',

            endAt:
              '2026-10-20T20:00:00.000Z',

            location:
              'Home',

            description:
              'Apple version',

            updatedAt:
              '2026-10-18T21:00:00.000Z',
          },

          status:
            'unresolved',

          resolution:
            undefined,

          createdAt:
            '2026-10-18T21:05:00.000Z',

          resolvedAt:
            undefined,
        });
      },
    );

    it(
      'refreshes the snapshots of an existing unresolved conflict instead of creating a duplicate',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: {
              id: 'conflict-1',
            },
            error: null,
          });

        mockQuery.single
          .mockResolvedValueOnce({
            data: unresolvedConflictRow,
            error: null,
          });

        await saveCalendarEventConflict(
          saveInput,
        );

        expect(
          mockQuery.insert,
        ).not.toHaveBeenCalled();

        expect(
          mockQuery.update,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            calendar_event_id:
              'event-1',

            calendar_event_link_id:
              'link-1',

            rise_title:
              'RISE Study Session',

            provider_title:
              'Apple Study Session',

            provider_updated_at:
              '2026-10-18T21:00:00.000Z',
          }),
        );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'id',
          'conflict-1',
        );
      },
    );

    it(
      'stores blank optional fields as null',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: null,
            error: null,
          });

        mockQuery.single
          .mockResolvedValueOnce({
            data: {
              ...unresolvedConflictRow,
              rise_location: null,
              rise_description: null,
              provider_location: null,
              provider_description: null,
            },
            error: null,
          });

        await saveCalendarEventConflict({
          ...saveInput,

          riseVersion: {
            ...saveInput.riseVersion,
            location: '   ',
            description: '',
          },

          providerVersion: {
            ...saveInput.providerVersion,
            location: '',
            description: '   ',
          },
        });

        expect(
          mockQuery.insert,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            rise_location:
              null,

            rise_description:
              null,

            provider_location:
              null,

            provider_description:
              null,
          }),
        );
      },
    );
  },
);

describe(
  'getUnresolvedCalendarEventConflicts',
  () => {
    it(
      'returns unresolved conflicts for the signed-in student',
      async () => {
        mockQuery.order
          .mockResolvedValueOnce({
            data: [
              unresolvedConflictRow,
            ],
            error: null,
          });

        const conflicts =
          await getUnresolvedCalendarEventConflicts();

        expect(
          mockQuery.from,
        ).toHaveBeenCalledWith(
          'calendar_event_conflicts',
        );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'status',
          'unresolved',
        );

        expect(
          mockQuery.order,
        ).toHaveBeenCalledWith(
          'created_at',
          {
            ascending: true,
          },
        );

        expect(
          conflicts,
        ).toHaveLength(1);

        expect(
          conflicts[0],
        ).toMatchObject({
          id:
            'conflict-1',

          calendarEventId:
            'event-1',

          provider:
            'apple',

          status:
            'unresolved',
        });
      },
    );
  },
);

describe(
  'getUnresolvedCalendarEventConflict',
  () => {
    it(
      'loads the unresolved conflict for one event and provider',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data:
              unresolvedConflictRow,

            error:
              null,
          });

        const conflict =
          await getUnresolvedCalendarEventConflict(
            'event-1',
            'apple',
          );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'calendar_event_id',
          'event-1',
        );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'provider',
          'apple',
        );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'status',
          'unresolved',
        );

        expect(
          conflict,
        ).toMatchObject({
          id:
            'conflict-1',

          calendarEventId:
            'event-1',

          provider:
            'apple',
        });
      },
    );

    it(
      'returns null when the event has no unresolved conflict',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: null,
            error: null,
          });

        await expect(
          getUnresolvedCalendarEventConflict(
            'event-1',
            'google',
          ),
        ).resolves.toBeNull();
      },
    );
  },
);

describe(
  'markCalendarEventConflictResolved',
  () => {
    it(
      'marks the conflict resolved after the selected version succeeds',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: {
              ...unresolvedConflictRow,

              status:
                'resolved',

              resolution:
                'rise',

              resolved_at:
                '2026-10-18T22:00:00.000Z',
            },

            error:
              null,
          });

        const conflict =
          await markCalendarEventConflictResolved(
            'conflict-1',
            'rise',
          );

        expect(
          mockQuery.update,
        ).toHaveBeenCalledWith({
          status:
            'resolved',

          resolution:
            'rise',

          resolved_at:
            expect.any(String),
        });

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'id',
          'conflict-1',
        );

        expect(
          mockQuery.eq,
        ).toHaveBeenCalledWith(
          'status',
          'unresolved',
        );

        expect(
          conflict.status,
        ).toBe(
          'resolved',
        );

        expect(
          conflict.resolution,
        ).toBe(
          'rise',
        );
      },
    );

    it(
      'throws when Supabase cannot mark the conflict resolved',
      async () => {
        const updateError = {
          message:
            'Could not resolve calendar conflict',
        };

        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: null,
            error: updateError,
          });

        await expect(
          markCalendarEventConflictResolved(
            'conflict-1',
            'apple',
          ),
        ).rejects.toBe(
          updateError,
        );
      },
    );

    it(
      'throws when the conflict is no longer unresolved',
      async () => {
        mockQuery.maybeSingle
          .mockResolvedValueOnce({
            data: null,
            error: null,
          });

        await expect(
          markCalendarEventConflictResolved(
            'conflict-1',
            'rise',
          ),
        ).rejects.toThrow(
          'Calendar conflict could not be found or resolved.',
        );
      },
    );
  },
);
