/**
 * Tests for PasswordSetup OTP Login Flow
 * Steps 1-6: OTP auth method for existing customers
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// react-router-dom auto-mocked via __mocks__
const { __mockNavigate: mockNavigate, __mockLocation: mockLocation } = require('react-router-dom');

// Mock CRM service
const mockCrmSendOtp = jest.fn();
const mockCrmVerifyOtp = jest.fn();
const mockCrmLogin = jest.fn();
const mockCrmRegister = jest.fn();
const mockCrmForgotPassword = jest.fn();
const mockCrmResetPassword = jest.fn();

jest.mock('../../api/services/crmService', () => ({
  crmSendOtp: (...args) => mockCrmSendOtp(...args),
  crmVerifyOtp: (...args) => mockCrmVerifyOtp(...args),
  crmLogin: (...args) => mockCrmLogin(...args),
  crmRegister: (...args) => mockCrmRegister(...args),
  crmForgotPassword: (...args) => mockCrmForgotPassword(...args),
  crmResetPassword: (...args) => mockCrmResetPassword(...args),
  buildUserId: (restaurantId, posId = '0001') => `pos_${posId}_restaurant_${restaurantId}`,
}));

// Mock AuthContext
const mockSetCrmAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    setCrmAuth: mockSetCrmAuth,
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock react-hot-toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

import PasswordSetup from '../../pages/PasswordSetup';

// Helper to render with specific location state
const renderWithState = (state) => {
  mockLocation.state = state;
  return render(<PasswordSetup />);
};

// Default state for existing customer with password
const existingCustomerState = {
  phone: '+919579504871',
  name: 'Abhishek',
  restaurantId: '478',
  customerExists: true,
  hasPassword: true,
  customerName: 'Abhishek',
  orderMode: '',
};

// Default state for new customer
const newCustomerState = {
  phone: '+919999999999',
  name: 'New User',
  restaurantId: '478',
  customerExists: false,
  hasPassword: false,
  customerName: '',
  orderMode: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockLocation.state = null;
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================
// TC-01: Auth method chooser renders for existing customer
// ============================================
describe('TC-01: Auth Method Chooser', () => {
  test('shows OTP and Password buttons for existing customer with password', () => {
    renderWithState(existingCustomerState);

    expect(screen.getByTestId('choose-otp-btn')).toBeInTheDocument();
    expect(screen.getByTestId('choose-password-btn')).toBeInTheDocument();
    expect(screen.getByTestId('skip-login-btn')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Abhishek/)).toBeInTheDocument();
    expect(screen.getByText('How would you like to login?')).toBeInTheDocument();
  });

  test('does NOT show chooser for new customer — shows registration form instead', () => {
    renderWithState(newCustomerState);

    expect(screen.queryByTestId('choose-otp-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('choose-password-btn')).not.toBeInTheDocument();
    // Should show "Create your account" set password form
    expect(screen.getByTestId('set-password-input')).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });
});

// ============================================
// TC-02: Send OTP (handleLoginSendOtp)
// ============================================
describe('TC-02: Send OTP', () => {
  test('clicking Login with OTP calls crmSendOtp and shows OTP input', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({
      success: true,
      message: 'OTP sent',
      expires_in_minutes: 10,
    });

    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    // Verify crmSendOtp was called with correct args
    expect(mockCrmSendOtp).toHaveBeenCalledWith('+919579504871', 'pos_0001_restaurant_478');
    expect(mockToastSuccess).toHaveBeenCalledWith('OTP sent to your phone');

    // OTP input screen should now be visible
    expect(screen.getByTestId('otp-digit-input')).toBeInTheDocument();
    expect(screen.getByTestId('verify-otp-btn')).toBeInTheDocument();
    expect(screen.getByTestId('resend-otp-btn')).toBeInTheDocument();
    expect(screen.getByText(/We sent a code to/)).toBeInTheDocument();
  });

  test('crmSendOtp returns debug_otp — displays it', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({
      success: true,
      message: 'OTP sent',
      debug_otp: '123456',
    });

    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    expect(screen.getByTestId('otp-dev-display')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
  });

  test('crmSendOtp 404 — falls back to password screen', async () => {
    const error404 = new Error('Customer not found');
    error404.status = 404;
    mockCrmSendOtp.mockRejectedValueOnce(error404);

    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    // Should switch to password screen
    expect(mockToastError).toHaveBeenCalledWith('OTP not available for this number. Please use password.');
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
  });

  test('crmSendOtp generic error — shows error message', async () => {
    mockCrmSendOtp.mockRejectedValueOnce(new Error('Network error'));

    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    expect(screen.getByTestId('choose-error')).toHaveTextContent('Network error');
  });
});

// ============================================
// TC-03: Verify OTP (handleLoginVerifyOtp)
// ============================================
describe('TC-03: Verify OTP', () => {
  const setupOtpScreen = async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);
    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });
  };

  test('entering correct OTP and verifying — logs in and navigates to menu', async () => {
    mockCrmVerifyOtp.mockResolvedValueOnce({
      success: true,
      token: 'test-crm-token-123',
      customer: { name: 'Abhishek', phone: '9579504871' },
    });

    await setupOtpScreen();

    // Enter OTP
    const otpInput = screen.getByTestId('otp-digit-input');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    expect(otpInput.value).toBe('123456');

    // Click verify
    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-otp-btn'));
    });

    // Verify correct API call
    expect(mockCrmVerifyOtp).toHaveBeenCalledWith('+919579504871', '123456', 'pos_0001_restaurant_478');

    // Verify auth was set
    expect(mockSetCrmAuth).toHaveBeenCalledWith('test-crm-token-123', { name: 'Abhishek', phone: '9579504871' });

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/478/menu');

    // Verify toast
    expect(mockToastSuccess).toHaveBeenCalledWith('Welcome back, Abhishek!');

    // Verify guest data saved
    const guestData = JSON.parse(localStorage.getItem('guestCustomer'));
    expect(guestData.name).toBe('Abhishek');
    expect(guestData.phone).toBe('+919579504871');
  });

  test('OTP too short — shows validation error', async () => {
    await setupOtpScreen();

    const otpInput = screen.getByTestId('otp-digit-input');
    fireEvent.change(otpInput, { target: { value: '123' } });

    // Verify button should be disabled (otpDigits.length !== 6)
    expect(screen.getByTestId('verify-otp-btn')).toBeDisabled();
  });

  test('wrong OTP — shows error, stays on screen', async () => {
    mockCrmVerifyOtp.mockRejectedValueOnce(new Error('Invalid OTP'));

    await setupOtpScreen();

    const otpInput = screen.getByTestId('otp-digit-input');
    fireEvent.change(otpInput, { target: { value: '000000' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-otp-btn'));
    });

    expect(screen.getByTestId('otp-error')).toHaveTextContent('Invalid OTP');
    // Should still be on OTP screen
    expect(screen.getByTestId('otp-digit-input')).toBeInTheDocument();
  });

  test('expired OTP — shows specific expired message', async () => {
    mockCrmVerifyOtp.mockRejectedValueOnce(new Error('OTP expired'));

    await setupOtpScreen();

    fireEvent.change(screen.getByTestId('otp-digit-input'), { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-otp-btn'));
    });

    expect(screen.getByTestId('otp-error')).toHaveTextContent('OTP expired. Please resend.');
  });

  test('OTP input only accepts digits, max 6', async () => {
    await setupOtpScreen();

    const otpInput = screen.getByTestId('otp-digit-input');

    // Enter non-digits — should be stripped
    fireEvent.change(otpInput, { target: { value: 'abc123def456' } });
    expect(otpInput.value).toBe('123456');

    // Enter more than 6 — should be truncated
    fireEvent.change(otpInput, { target: { value: '1234567890' } });
    expect(otpInput.value).toBe('123456');
  });
});

// ============================================
// TC-04: Resend OTP
// ============================================
describe('TC-04: Resend OTP', () => {
  test('resend button disabled during countdown, enabled after', async () => {
    mockCrmSendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    const resendBtn = screen.getByTestId('resend-otp-btn');

    // Should be disabled with countdown
    expect(resendBtn).toBeDisabled();
    expect(resendBtn.textContent).toMatch(/Resend OTP \(0:\d{2}\)/);

    // Advance timer to completion
    act(() => {
      jest.advanceTimersByTime(31000);
    });

    // Should now be enabled
    expect(resendBtn).not.toBeDisabled();
    expect(resendBtn.textContent).toBe('Resend OTP');
  });
});

// ============================================
// TC-05: Switch between OTP and Password
// ============================================
describe('TC-05: Auth Method Switching', () => {
  test('choose → password → back to choose', async () => {
    renderWithState(existingCustomerState);

    // Start on chooser
    expect(screen.getByTestId('choose-otp-btn')).toBeInTheDocument();

    // Switch to password
    fireEvent.click(screen.getByTestId('choose-password-btn'));
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();

    // Switch back to choose via "Use OTP instead"
    fireEvent.click(screen.getByTestId('switch-to-otp-btn'));
    expect(screen.getByTestId('choose-otp-btn')).toBeInTheDocument();
  });

  test('OTP screen → "Use password instead" → password screen', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);

    // Go to OTP screen
    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });
    expect(screen.getByTestId('otp-digit-input')).toBeInTheDocument();

    // Switch to password
    fireEvent.click(screen.getByTestId('switch-to-password-btn'));
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
  });

  test('OTP screen → back button → chooser', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    fireEvent.click(screen.getByTestId('otp-back-btn'));
    expect(screen.getByTestId('choose-otp-btn')).toBeInTheDocument();
  });
});

// ============================================
// TC-06: Skip for Now
// ============================================
describe('TC-06: Skip for Now', () => {
  test('skip from chooser — saves guest data and navigates to menu', () => {
    renderWithState(existingCustomerState);

    fireEvent.click(screen.getByTestId('skip-login-btn'));

    const guestData = JSON.parse(localStorage.getItem('guestCustomer'));
    expect(guestData.name).toBe('Abhishek');
    expect(guestData.phone).toBe('+919579504871');
    expect(guestData.restaurantId).toBe('478');
    expect(mockNavigate).toHaveBeenCalledWith('/478/menu');
  });

  test('skip from OTP screen — navigates to menu', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    fireEvent.click(screen.getByTestId('skip-otp-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/478/menu');
  });
});

// ============================================
// TC-07: Delivery Mode Navigation
// ============================================
describe('TC-07: Delivery Mode', () => {
  test('OTP verify with delivery mode — navigates to delivery-address, not menu', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    mockCrmVerifyOtp.mockResolvedValueOnce({
      success: true,
      token: 'token-123',
      customer: { name: 'Abhishek', phone: '9579504871' },
    });

    renderWithState({ ...existingCustomerState, orderMode: 'delivery' });

    // Send OTP
    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    // Verify OTP
    fireEvent.change(screen.getByTestId('otp-digit-input'), { target: { value: '123456' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-otp-btn'));
    });

    // Should navigate to delivery address, NOT menu
    expect(mockNavigate).toHaveBeenCalledWith('/478/delivery-address');
  });

  test('skip with delivery mode — navigates to delivery-address', () => {
    renderWithState({ ...existingCustomerState, orderMode: 'delivery' });

    fireEvent.click(screen.getByTestId('skip-login-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/478/delivery-address');
  });
});

// ============================================
// TC-08: Password Login Still Works (Regression)
// ============================================
describe('TC-08: Password Login Regression', () => {
  test('choosing password → entering password → login works', async () => {
    mockCrmLogin.mockResolvedValueOnce({
      success: true,
      token: 'password-token-456',
      customer: { name: 'Abhishek', phone: '9579504871' },
    });

    renderWithState(existingCustomerState);

    // Choose password
    fireEvent.click(screen.getByTestId('choose-password-btn'));

    // Enter password
    fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: 'mypassword' } });

    // Click login
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'));
    });

    expect(mockCrmLogin).toHaveBeenCalledWith('+919579504871', 'mypassword', 'pos_0001_restaurant_478');
    expect(mockSetCrmAuth).toHaveBeenCalledWith('password-token-456', { name: 'Abhishek', phone: '9579504871' });
    expect(mockNavigate).toHaveBeenCalledWith('/478/menu');
  });

  test('forgot password link still visible on password screen', () => {
    renderWithState(existingCustomerState);

    fireEvent.click(screen.getByTestId('choose-password-btn'));
    expect(screen.getByTestId('forgot-password-btn')).toBeInTheDocument();
  });
});

// ============================================
// TC-09: New Customer Registration Unchanged
// ============================================
describe('TC-09: New Customer Registration (No OTP)', () => {
  test('new customer sees set password form, NOT auth method chooser', () => {
    renderWithState(newCustomerState);

    // No OTP/Password chooser
    expect(screen.queryByTestId('choose-otp-btn')).not.toBeInTheDocument();

    // Shows registration form
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByTestId('set-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('save-continue-btn')).toBeInTheDocument();
  });
});

// ============================================
// TC-10: Phone Masking
// ============================================
describe('TC-10: Phone Display Masking', () => {
  test('OTP screen masks phone number', async () => {
    mockCrmSendOtp.mockResolvedValueOnce({ success: true, message: 'OTP sent' });
    renderWithState(existingCustomerState);

    await act(async () => {
      fireEvent.click(screen.getByTestId('choose-otp-btn'));
    });

    // Phone should be masked
    const subtitle = screen.getByTestId('otp-subtitle');
    expect(subtitle.textContent).toContain('•••••');
    expect(subtitle.textContent).not.toContain('9579504871');
  });
});
