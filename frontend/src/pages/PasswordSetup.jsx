import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { crmRegister, crmLogin, crmForgotPassword, crmResetPassword, buildUserId } from '../api/services/crmService';
import { IoEyeOutline, IoEyeOffOutline, IoArrowBack } from 'react-icons/io5';
import './PasswordSetup.css';

const PasswordSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCrmAuth } = useAuth();

  // Data passed from LandingPage
  const {
    phone = '',
    name = '',
    restaurantId = '',
    customerExists = false,
    hasPassword = false,
    customerName = '',
    orderMode = '',
  } = location.state || {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const displayName = customerName || name || '';
  const needsSetPassword = !customerExists || !hasPassword;
  const userId = buildUserId(restaurantId);

  const navigateToMenu = () => {
    // Delivery mode → go to delivery address page first
    if (orderMode === 'delivery') {
      navigate(`/${restaurantId}/delivery-address`);
      return;
    }
    if (restaurantId) {
      navigate(`/${restaurantId}/menu`);
    } else {
      navigate('/menu');
    }
  };

  const handleSkip = () => {
    const guestData = { name: displayName, phone, restaurantId };
    localStorage.setItem('guestCustomer', JSON.stringify(guestData));
    navigateToMenu();
  };

  // Set password (new customer or existing without password) → CRM /customer/register
  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const data = await crmRegister(phone, password, userId, displayName);

      if (data.token) {
        setCrmAuth(data.token, data.customer);
      }
      // Save customer details for ReviewOrder pre-fill
      const guestData = { name: displayName, phone, restaurantId };
      localStorage.setItem('guestCustomer', JSON.stringify(guestData));
      toast.success('Password set successfully!');
      navigateToMenu();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with existing password → CRM /customer/login
  const handleLogin = async () => {
    setError('');
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const data = await crmLogin(phone, password, userId);

      if (data.token) {
        setCrmAuth(data.token, data.customer);
      }
      const loginName = data.customer?.name || displayName;
      const guestData = { name: loginName, phone, restaurantId };
      localStorage.setItem('guestCustomer', JSON.stringify(guestData));
      toast.success(`Welcome back, ${loginName}!`);
      navigateToMenu();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password — send OTP → CRM /customer/forgot-password
  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const data = await crmForgotPassword(phone, userId);
      setOtpSent(true);
      // CRM may return debug_otp in dev mode
      if (data.debug_otp) {
        setDevOtp(data.debug_otp);
      }
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  // Reset password with OTP → CRM /customer/reset-password
  const handleResetPassword = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      await crmResetPassword(phone, otp, userId, password);
      toast.success('Password reset! Please login.');
      setForgotMode(false);
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      setDevOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password flow
  if (forgotMode) {
    return (
      <div className="password-setup-page" data-testid="password-reset-page">
        <div className="password-setup-container">
          <button className="password-back-btn" onClick={() => setForgotMode(false)} data-testid="reset-back-btn">
            <IoArrowBack /> Back
          </button>
          <h2 className="password-setup-title">Reset Password</h2>
          <p className="password-setup-subtitle">We'll send an OTP to {phone}</p>

          {!otpSent ? (
            <button
              className="password-setup-btn primary"
              onClick={handleSendOtp}
              disabled={sendingOtp}
              data-testid="send-otp-btn"
            >
              {sendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
          ) : (
            <>
              {devOtp && (
                <div className="login-dev-otp" data-testid="dev-otp-display">
                  Dev OTP: <strong>{devOtp}</strong>
                </div>
              )}
              <div className="password-input-group">
                <input
                  type="text"
                  className="password-input"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(''); }}
                  maxLength={6}
                  data-testid="otp-input"
                />
              </div>
              <div className="password-input-group">
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="password-input"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    data-testid="new-password-input"
                  />
                  <button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
                    {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>
              <div className="password-input-group">
                <div className="password-input-wrapper">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="password-input"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    data-testid="confirm-new-password-input"
                  />
                  <button className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} type="button">
                    {showConfirm ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>
              {error && <p className="password-error" data-testid="reset-error">{error}</p>}
              <button
                className="password-setup-btn primary"
                onClick={handleResetPassword}
                disabled={isLoading}
                data-testid="reset-password-btn"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Set password (new customer or returning without password)
  if (needsSetPassword) {
    return (
      <div className="password-setup-page" data-testid="password-set-page">
        <div className="password-setup-container">
          <h2 className="password-setup-title">
            {customerExists ? `Welcome back${displayName ? `, ${displayName}` : ''}!` : 'Create your account'}
          </h2>
          <p className="password-setup-subtitle">
            Set a password for quick login next time
          </p>

          <div className="password-input-group">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="password-input"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                data-testid="set-password-input"
              />
              <button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
          </div>

          <div className="password-input-group">
            <div className="password-input-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="password-input"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                data-testid="confirm-password-input"
              />
              <button className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} type="button">
                {showConfirm ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
          </div>

          {error && <p className="password-error" data-testid="set-password-error">{error}</p>}

          <button
            className="password-setup-btn primary"
            onClick={handleSetPassword}
            disabled={isLoading}
            data-testid="save-continue-btn"
          >
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </button>

          <button className="password-skip-link" onClick={handleSkip} data-testid="skip-password-btn">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Login with existing password
  return (
    <div className="password-setup-page" data-testid="password-login-page">
      <div className="password-setup-container">
        <h2 className="password-setup-title">
          Welcome back{displayName ? `, ${displayName}` : ''}!
        </h2>

        <div className="password-input-group">
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="password-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              data-testid="login-password-input"
            />
            <button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
              {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>
        </div>

        {error && <p className="password-error" data-testid="login-password-error">{error}</p>}

        <button
          className="password-setup-btn primary"
          onClick={handleLogin}
          disabled={isLoading}
          data-testid="login-btn"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <button className="password-forgot-link" onClick={() => setForgotMode(true)} data-testid="forgot-password-btn">
          Forgot password?
        </button>

        <button className="password-skip-link" onClick={handleSkip} data-testid="skip-login-btn">
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default PasswordSetup;
