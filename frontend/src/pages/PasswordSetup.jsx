import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { IoEyeOutline, IoEyeOffOutline, IoArrowBack } from 'react-icons/io5';
import './PasswordSetup.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const PasswordSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();

  // Data passed from LandingPage
  const {
    phone = '',
    name = '',
    restaurantId = '',
    customerExists = false,
    hasPassword = false,
    customerName = '',
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

  const displayName = customerName || name || '';
  const needsSetPassword = !customerExists || !hasPassword;

  const navigateToMenu = () => {
    if (restaurantId) {
      navigate(`/${restaurantId}/menu`);
    } else {
      navigate('/menu');
    }
  };

  const handleSkip = () => {
    // Save as guest and continue
    const guestData = { name: displayName, phone, restaurantId };
    localStorage.setItem('guestCustomer', JSON.stringify(guestData));
    navigateToMenu();
  };

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
      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password,
          confirm_password: confirmPassword,
          restaurant_id: restaurantId,
          name: displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to set password');

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      toast.success('Password set successfully!');
      navigateToMenu();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password,
          restaurant_id: restaurantId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid password');

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      toast.success(`Welcome back, ${data.customer?.name || displayName}!`);
      navigateToMenu();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, restaurant_id: restaurantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setOtpSent(true);
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

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
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          new_password: password,
          confirm_password: confirmPassword,
          otp,
          restaurant_id: restaurantId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
      toast.success('Password reset! Please login.');
      setForgotMode(false);
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
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
