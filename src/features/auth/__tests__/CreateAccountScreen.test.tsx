import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import CreateAccountScreen from '../screens/CreateAccountScreen';
import { createAccountWithSchoolEmail } from '../services/authService';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../services/authService', () => ({
  createAccountWithSchoolEmail: jest.fn(),
}));

const mockCreateAccountWithSchoolEmail =
  createAccountWithSchoolEmail as jest.MockedFunction<
    typeof createAccountWithSchoolEmail
  >;

describe('CreateAccountScreen', () => {
  it('handles create-account validation, success, and errors', async () => {
    jest.clearAllMocks();

    const {
      getByLabelText,
      getByRole,
      getByText,
      queryByText,
    } = await render(
      <CreateAccountScreen />,
    );

    const emailInput =
      getByLabelText('School email');

    const signUpButton =
      getByRole('button', {
        name: 'Sign up',
      });

    // Empty email
    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        getByText('Enter your school email.'),
      ).toBeOnTheScreen();
    });

    expect(
      mockCreateAccountWithSchoolEmail,
    ).not.toHaveBeenCalled();

    // Invalid email format
    fireEvent.changeText(
      emailInput,
      'not-an-email',
    );

    await waitFor(() => {
      expect(
        queryByText('Enter your school email.'),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        getByText(
          'Enter a valid email address.',
        ),
      ).toBeOnTheScreen();
    });

    expect(
      mockCreateAccountWithSchoolEmail,
    ).not.toHaveBeenCalled();

    // Valid email format, but not .edu
    fireEvent.changeText(
      emailInput,
      'student@gmail.com',
    );

    await waitFor(() => {
      expect(
        queryByText(
          'Enter a valid email address.',
        ),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        getByText(
          'A school email ending in .edu is required.',
        ),
      ).toBeOnTheScreen();
    });

    expect(
      mockCreateAccountWithSchoolEmail,
    ).not.toHaveBeenCalled();

    // Valid .edu email
    mockCreateAccountWithSchoolEmail.mockResolvedValueOnce(
      {} as never,
    );

    fireEvent.changeText(
      emailInput,
      ' STUDENT@CSULB.EDU ',
    );

    await waitFor(() => {
      expect(
        queryByText(
          'A school email ending in .edu is required.',
        ),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        mockCreateAccountWithSchoolEmail,
      ).toHaveBeenLastCalledWith(
        'student@csulb.edu',
      );

      expect(
        mockNavigate,
      ).toHaveBeenCalledWith(
        'CheckInbox',
        {
          email:
            'student@csulb.edu',
        },
      );
    });

    // Existing account
    mockCreateAccountWithSchoolEmail.mockRejectedValueOnce(
      new Error('EMAIL_ALREADY_REGISTERED'),
    );

    fireEvent.changeText(
      emailInput,
      'existing@csulb.edu',
    );

    await waitFor(() => {
      expect(
        emailInput,
      ).toHaveDisplayValue(
        'existing@csulb.edu',
      );
    });

    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        getByText(
          'An account with this school email already exists. Please log in instead.',
        ),
      ).toBeOnTheScreen();
    });

    // Rate limit
    mockCreateAccountWithSchoolEmail.mockRejectedValueOnce(
      new Error('Email rate limit exceeded'),
    );

    fireEvent.changeText(
      emailInput,
      'another@csulb.edu',
    );

    await waitFor(() => {
      expect(
        queryByText(
          'An account with this school email already exists. Please log in instead.',
        ),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(signUpButton);

    await waitFor(() => {
      expect(
        getByText(
          'Too many verification emails were requested. Please wait a few minutes and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });
});