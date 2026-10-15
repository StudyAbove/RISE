import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import LoginScreen from '../screens/LoginScreen';
import { loginWithSchoolEmail } from '../services/authService';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../services/authService', () => ({
  loginWithSchoolEmail: jest.fn(),
}));

const mockLoginWithSchoolEmail =
  loginWithSchoolEmail as jest.MockedFunction<
    typeof loginWithSchoolEmail
  >;

describe('LoginScreen', () => {
  it('handles login validation, success, and errors', async () => {
    jest.clearAllMocks();

    const {
      getByLabelText,
      getByRole,
      getByText,
      queryByText,
    } = await render(
      <LoginScreen />,
    );

    const emailInput =
      getByLabelText('School email');

    const loginButton =
      getByRole('button', {
        name: 'Log in',
      });

    // Empty email
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        getByText('Enter your school email.'),
      ).toBeOnTheScreen();
    });

    expect(
      mockLoginWithSchoolEmail,
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

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        getByText(
          'Enter a valid email address.',
        ),
      ).toBeOnTheScreen();
    });

    expect(
      mockLoginWithSchoolEmail,
    ).not.toHaveBeenCalled();

    // Valid format, but not .edu
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

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        getByText(
          'A school email ending in .edu is required.',
        ),
      ).toBeOnTheScreen();
    });

    expect(
      mockLoginWithSchoolEmail,
    ).not.toHaveBeenCalled();

    // Valid .edu email
    mockLoginWithSchoolEmail.mockResolvedValueOnce(
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

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        mockLoginWithSchoolEmail,
      ).toHaveBeenLastCalledWith(
        'student@csulb.edu',
      );

      expect(
        getByText(
          'Check your school email for a login link.',
        ),
      ).toBeOnTheScreen();
    });

    // Email is not registered
    mockLoginWithSchoolEmail.mockRejectedValueOnce(
      new Error('EMAIL_NOT_REGISTERED'),
    );

    fireEvent.changeText(
      emailInput,
      'newstudent@csulb.edu',
    );

    await waitFor(() => {
      expect(
        queryByText(
          'Check your school email for a login link.',
        ),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        getByText(
          'No account was found with this school email. Please sign up first.',
        ),
      ).toBeOnTheScreen();
    });

    // Rate limit
    mockLoginWithSchoolEmail.mockRejectedValueOnce(
      new Error('Email rate limit exceeded'),
    );

    fireEvent.changeText(
      emailInput,
      'existing@csulb.edu',
    );

    await waitFor(() => {
      expect(
        queryByText(
          'No account was found with this school email. Please sign up first.',
        ),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(
        getByText(
          'Too many login emails were requested. Please wait a few minutes and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });
});