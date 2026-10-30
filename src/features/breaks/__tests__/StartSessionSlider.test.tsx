import {
  act,
  render,
} from '@testing-library/react-native';
import {
  Animated,
  PanResponder,
} from 'react-native';

import {
  StartSessionSlider,
} from '../components/StartSessionSlider';

type PanResponderConfig =
  Parameters<
    typeof PanResponder.create
  >[0];

describe(
  'StartSessionSlider',
  () => {
    let responder:
      PanResponderConfig;

    beforeEach(() => {
      jest.clearAllMocks();

      jest
        .spyOn(
          PanResponder,
          'create',
        )
        .mockImplementation(
          (config) => {
            responder =
              config;

            return {
              panHandlers: {},
            } as ReturnType<
              typeof PanResponder.create
            >;
          },
        );

      jest
        .spyOn(
          Animated,
          'spring',
        )
        .mockImplementation(
          (
            value,
            config,
          ) =>
            ({
              start: (
                callback,
              ) => {
                (
                  value as Animated.Value
                ).setValue(
                  config
                    .toValue as number,
                );

                callback?.({
                  finished:
                    true,
                });
              },
              stop:
                jest.fn(),
              reset:
                jest.fn(),
            }) as ReturnType<
              typeof Animated.spring
            >,
        );

      jest
        .spyOn(
          Animated,
          'timing',
        )
        .mockImplementation(
          (
            value,
            config,
          ) =>
            ({
              start: (
                callback,
              ) => {
                (
                  value as Animated.Value
                ).setValue(
                  config
                    .toValue as number,
                );

                callback?.({
                  finished:
                    true,
                });
              },
              stop:
                jest.fn(),
              reset:
                jest.fn(),
            }) as ReturnType<
              typeof Animated.timing
            >,
        );

      jest
        .spyOn(
          Animated,
          'delay',
        )
        .mockImplementation(
          () =>
            ({
              start: (
                callback,
              ) => {
                callback?.({
                  finished:
                    true,
                });
              },
              stop:
                jest.fn(),
              reset:
                jest.fn(),
            }) as ReturnType<
              typeof Animated.delay
            >,
        );

      jest
        .spyOn(
          Animated,
          'sequence',
        )
        .mockImplementation(
          (animations) =>
            ({
              start: (
                callback,
              ) => {
                animations.forEach(
                  (animation) => {
                    animation.start();
                  },
                );

                callback?.({
                  finished:
                    true,
                });
              },
              stop:
                jest.fn(),
              reset:
                jest.fn(),
            }) as ReturnType<
              typeof Animated.sequence
            >,
        );

      jest
        .spyOn(
          Animated,
          'parallel',
        )
        .mockImplementation(
          (animations) =>
            ({
              start: (
                callback,
              ) => {
                animations.forEach(
                  (animation) => {
                    animation.start();
                  },
                );

                callback?.({
                  finished:
                    true,
                });
              },
              stop:
                jest.fn(),
              reset:
                jest.fn(),
            }) as ReturnType<
              typeof Animated.parallel
            >,
        );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      'starts in the Start Session state',
      async () => {
        const {
          getByLabelText,
          getByText,
          queryByText,
        } = await render(
          <StartSessionSlider />,
        );

        expect(
          getByLabelText(
            'Start break session',
          ),
        ).toBeOnTheScreen();

        expect(
          getByText(
            'Start Session',
          ),
        ).toBeOnTheScreen();

        expect(
          queryByText(
            'Woo!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'resets when released before the completion threshold',
      async () => {
        const onComplete =
          jest.fn();

        const {
          getByText,
          queryByText,
        } = await render(
          <StartSessionSlider
            onComplete={
              onComplete
            }
          />,
        );

        await act(
          async () => {
            responder
              .onPanResponderRelease?.(
                {} as never,
                {
                  dx: 100,
                } as never,
              );
          },
        );

        expect(
          getByText(
            'Start Session',
          ),
        ).toBeOnTheScreen();

        expect(
          queryByText(
            'Woo!',
          ),
        ).not.toBeOnTheScreen();

        expect(
          onComplete,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'completes when released at the end of the slider',
      async () => {
        const onComplete =
          jest.fn();

        const {
          getByText,
        } = await render(
          <StartSessionSlider
            onComplete={
              onComplete
            }
          />,
        );

        await act(
          async () => {
            responder
              .onPanResponderRelease?.(
                {} as never,
                {
                  dx: 300,
                } as never,
              );
          },
        );

        expect(
          getByText(
            'Woo!',
          ),
        ).toBeOnTheScreen();

        expect(
          onComplete,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      'does not complete a second time after it is already finished',
      async () => {
        const onComplete =
          jest.fn();

        await render(
          <StartSessionSlider
            onComplete={
              onComplete
            }
          />,
        );

        await act(
          async () => {
            responder
              .onPanResponderRelease?.(
                {} as never,
                {
                  dx: 300,
                } as never,
              );
          },
        );

        expect(
          onComplete,
        ).toHaveBeenCalledTimes(
          1,
        );

        /*
         * React rerenders after completion and creates
         * a responder whose completed state is true.
         */
        await act(
          async () => {
            responder
              .onPanResponderRelease?.(
                {} as never,
                {
                  dx: 300,
                } as never,
              );
          },
        );

        expect(
          onComplete,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);
