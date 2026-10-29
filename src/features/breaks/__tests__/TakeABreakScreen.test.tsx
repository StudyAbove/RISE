import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import {
  TakeABreakScreen,
} from '../screens/TakeABreakScreen';

const mockGoBack = jest.fn();

jest.mock(
  '@react-navigation/native',
  () => {
    const actual =
      jest.requireActual(
        '@react-navigation/native',
      );

    return {
      ...actual,
      useNavigation: () => ({
        goBack: mockGoBack,
      }),
    };
  },
);

type RenderResult =
  Awaited<
    ReturnType<typeof render>
  >;

function expectSelected(
  getByRole:
    RenderResult['getByRole'],
  name: string,
  selected: boolean,
) {
  const option =
    getByRole(
      'tab',
      {
        name,
      },
    );

  expect(
    option.props
      .accessibilityState
      ?.selected,
  ).toBe(selected);
}

describe(
  'TakeABreakScreen',
  () => {
    beforeEach(() => {
      mockGoBack.mockClear();
    });

    it(
      'shows all three break options',
      async () => {
        const {
          getByRole,
        } = await render(
          <TakeABreakScreen />,
        );

        expect(
          getByRole(
            'tab',
            {
              name:
                'Stretch break',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          getByRole(
            'tab',
            {
              name:
                'Hydrate break',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          getByRole(
            'tab',
            {
              name:
                'Walk break',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'starts with Stretch selected',
      async () => {
        const {
          getByRole,
        } = await render(
          <TakeABreakScreen />,
        );

        expectSelected(
          getByRole,
          'Stretch break',
          true,
        );

        expectSelected(
          getByRole,
          'Hydrate break',
          false,
        );

        expectSelected(
          getByRole,
          'Walk break',
          false,
        );
      },
    );

    it(
      'changes the active break when another option is selected',
      async () => {
        const {
          getByRole,
        } = await render(
          <TakeABreakScreen />,
        );

        fireEvent.press(
          getByRole(
            'tab',
            {
              name:
                'Hydrate break',
            },
          ),
        );

        await waitFor(() => {
          expectSelected(
            getByRole,
            'Hydrate break',
            true,
          );

          expectSelected(
            getByRole,
            'Stretch break',
            false,
          );

          expectSelected(
            getByRole,
            'Walk break',
            false,
          );
        });
      },
    );

    it(
      'can switch among all three break types without navigating away',
      async () => {
        const {
          getByRole,
        } = await render(
          <TakeABreakScreen />,
        );

        fireEvent.press(
          getByRole(
            'tab',
            {
              name:
                'Hydrate break',
            },
          ),
        );

        await waitFor(() => {
          expectSelected(
            getByRole,
            'Hydrate break',
            true,
          );
        });

        fireEvent.press(
          getByRole(
            'tab',
            {
              name:
                'Walk break',
            },
          ),
        );

        await waitFor(() => {
          expectSelected(
            getByRole,
            'Walk break',
            true,
          );

          expectSelected(
            getByRole,
            'Hydrate break',
            false,
          );
        });

        fireEvent.press(
          getByRole(
            'tab',
            {
              name:
                'Stretch break',
            },
          ),
        );

        await waitFor(() => {
          expectSelected(
            getByRole,
            'Stretch break',
            true,
          );

          expectSelected(
            getByRole,
            'Walk break',
            false,
          );
        });

        expect(
          mockGoBack,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'goes back when the back button is pressed',
      async () => {
        const {
          getByRole,
        } = await render(
          <TakeABreakScreen />,
        );

        fireEvent.press(
          getByRole(
            'button',
            {
              name:
                'Back',
            },
          ),
        );

        expect(
          mockGoBack,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);
