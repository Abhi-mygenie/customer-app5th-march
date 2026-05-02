import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { crmRegister, crmLogin, crmForgotPassword, crmResetPassword, crmSendOtp, crmVerifyOtp, crmSkipOtp, buildUserId } from '../api/services/crmService';
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

  // OTP login states (Step 2: new state for OTP auth method)
  const [authMethod, setAuthMethod] = useState('choose'); // 'choose' | 'otp' | 'password'
  const [otpDigits, setOtpDigits] = useState('');
  const [otpLoginSent, setOtpLoginSent] = useState(false);
  const [otpLoginSending, setOtpLoginSending] = useState(false);
  const [otpLoginDevOtp, setOtpLoginDevOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const resendIntervalRef = useRef(null);

  const displayName = customerName || name || '';
  const isNewCustomer = !customerExists;  // Truly new — not in our DB at all
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

  const handleSkip = async () => {
    setError('');
    setIsLoading(true);
    try {
      const data = await crmSkipOtp(phone, userId);
      if (data?.token) {
        const customerProfile = { name: displayName, phone, ...data.customer };
        setCrmAuth(data.token, customerProfile, restaurantId);
        navigateToMenu();
      } else {
        toast.error('Could not continue. Please try again.');
      }
    } catch (err) {
      toast.error(err?.message || 'Could not continue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Start resend countdown timer
  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current);
          resendIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  // UX-GAP-01: Direct-to-password routing
  // Skip the intermediate "choose" screen when we already know what the user needs.
  // - Existing customer WITH password → jump to password login
  // - Existing customer WITHOUT password (or new) → jump to set-password
  // - Edge case (customerExists undefined) → stay on 'choose' as safety fallback
  useEffect(() => {
    if (customerExists && hasPassword) {
      setAuthMethod('password');
    } else if (customerExists && !hasPassword) {
      setAuthMethod('set-password');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 3: Send OTP for login (existing customer)
  const handleLoginSendOtp = useCallback(async () => {
    setError('');
    setOtpLoginSending(true);
    try {
      const data = await crmSendOtp(phone, userId);
      setOtpLoginSent(true);
      setAuthMethod('otp');
      startResendTimer();
      if (data.debug_otp) {
        setOtpLoginDevOtp(data.debug_otp);
      }
      toast.success('OTP sent to your phone');
    } catch (err) {
      // If CRM returns 404 (customer not in CRM), fall back to password
      if (err.status === 404) {
        toast.error('OTP not available for this number. Please use password.');
        setAuthMethod('password');
      } else {
        setError(err.message || 'Failed to send OTP');
      }
    } finally {
      setOtpLoginSending(false);
    }
  }, [phone, userId, startResendTimer]);

  // Step 4: Verify OTP and login
  const handleLoginVerifyOtp = async () => {
    setError('');
    if (otpDigits.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const data = await crmVerifyOtp(phone, otpDigits, userId);
      if (data.token) {
        setCrmAuth(data.token, data.customer, restaurantId);
      }
      const loginName = data.customer?.name || displayName;
      const guestData = { name: loginName, phone, restaurantId };
      localStorage.setItem('guestCustomer', JSON.stringify(guestData));
      toast.success(`Welcome back, ${loginName}!`);
      navigateToMenu();
    } catch (err) {
      if (err.message?.toLowerCase().includes('expired')) {
        setError('OTP expired. Please resend.');
      } else {
        setError(err.message || 'Invalid OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4b: Resend OTP handler
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpDigits('');
    setError('');
    setOtpLoginDevOtp('');
    await handleLoginSendOtp();
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
        setCrmAuth(data.token, data.customer, restaurantId);
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
        setCrmAuth(data.token, data.customer, restaurantId);
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

  // Set password — only for NEW customers (not in our DB at all)
  // Existing customers without password get OTP chooser below
  if (isNewCustomer) {
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

  // Mask phone for display: +919579504871 → +91 •••••04871
  const maskedPhone = phone ? phone.replace(/(\+\d{2})(\d+)(\d{5})/, '$1 •••••$3') : '';

  // Login with existing password — now with OTP / Password method selection
  // State A: authMethod = 'choose' (initial)
  if (authMethod === 'choose') {
    return (
      <div className="password-setup-page" data-testid="password-login-page">
        <div className="password-setup-container">
          <h2 className="password-setup-title" data-testid="welcome-title">
            Welcome back{displayName ? `, ${displayName}` : ''}!
          </h2>
          <p className="password-setup-subtitle">How would you like to login?</p>

          {error && <p className="password-error" data-testid="choose-error">{error}</p>}

          <button
            className="password-setup-btn primary"
            onClick={handleLoginSendOtp}
            disabled={otpLoginSending}
            data-testid="choose-otp-btn"
          >
            {otpLoginSending ? 'Sending OTP...' : 'Login with OTP'}
          </button>

          <button
            className="password-setup-btn secondary"
            onClick={() => { setAuthMethod(hasPassword ? 'password' : 'set-password'); setError(''); }}
            data-testid="choose-password-btn"
          >
            {hasPassword ? 'Login with Password' : 'Set a Password'}
          </button>

          <button className="password-skip-link" onClick={handleSkip} data-testid="skip-login-btn">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // State A2: authMethod = 'set-password' (existing customer without password, chose to set one)
  if (authMethod === 'set-password') {
    return (
      <div className="password-setup-page" data-testid="password-set-page">
        <div className="password-setup-container">
          <button
            className="password-back-btn"
            onClick={() => { setAuthMethod('choose'); setError(''); setPassword(''); setConfirmPassword(''); }}
            data-testid="set-password-back-btn"
          >
            <IoArrowBack /> Back
          </button>
          <h2 className="password-setup-title">
            Welcome back{displayName ? `, ${displayName}` : ''}!
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

          <button
            className="password-forgot-link"
            onClick={() => { setAuthMethod('choose'); setError(''); setPassword(''); setConfirmPassword(''); }}
            data-testid="switch-to-otp-from-set"
          >
            Use OTP instead
          </button>

          <button className="password-skip-link" onClick={handleSkip} data-testid="skip-password-btn">
            Skip for now
          </button>
        </div>
      </div>
    );
  }


  // State B: authMethod = 'otp' (OTP sent, waiting for verification)
  if (authMethod === 'otp') {
    return (
      <div className="password-setup-page" data-testid="otp-login-page">
        <div className="password-setup-container">
          <button
            className="password-back-btn"
            onClick={() => { setAuthMethod('choose'); setError(''); setOtpDigits(''); }}
            data-testid="otp-back-btn"
          >
            <IoArrowBack /> Back
          </button>
          <h2 className="password-setup-title" data-testid="otp-title">
            Welcome back{displayName ? `, ${displayName}` : ''}!
          </h2>
          <p className="password-setup-subtitle" data-testid="otp-subtitle">
            We sent a code to {maskedPhone}
          </p>

          {otpLoginDevOtp && (
            <div className="login-dev-otp" data-testid="otp-dev-display">
              Dev OTP: <strong>{otpLoginDevOtp}</strong>
            </div>
          )}

          <div className="password-input-group">
            <input
              type="text"
              className="password-input otp-input"
              placeholder="Enter 6-digit OTP"
              value={otpDigits}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpDigits(val);
                setError('');
              }}
              maxLength={6}
              inputMode="numeric"
              autoFocus
              data-testid="otp-digit-input"
            />
          </div>

          {error && <p className="password-error" data-testid="otp-error">{error}</p>}

          <button
            className="password-setup-btn primary"
            onClick={handleLoginVerifyOtp}
            disabled={isLoading || otpDigits.length !== 6}
            data-testid="verify-otp-btn"
          >
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <div className="otp-actions">
            <button
              className="password-forgot-link"
              onClick={handleResendOtp}
              disabled={resendTimer > 0}
              data-testid="resend-otp-btn"
            >
              {resendTimer > 0 ? `Resend OTP (0:${resendTimer.toString().padStart(2, '0')})` : 'Resend OTP'}
            </button>
            <button
              className="password-forgot-link"
              onClick={() => { setAuthMethod(hasPassword ? 'password' : 'set-password'); setError(''); }}
              data-testid="switch-to-password-btn"
            >
              {hasPassword ? 'Use password instead' : 'Set a password instead'}
            </button>
          </div>

          <button className="password-skip-link" onClick={handleSkip} data-testid="skip-otp-btn">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // State C: authMethod = 'password' (existing password flow — mostly unchanged)
  return (
    <div className="password-setup-page" data-testid="password-login-page">
      <div className="password-setup-container">
        <button
          className="password-back-btn"
          onClick={() => { setAuthMethod('choose'); setError(''); setPassword(''); }}
          data-testid="password-back-btn"
        >
          <IoArrowBack /> Back
        </button>
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

        <div className="otp-actions">
          <button
            className="password-forgot-link"
            onClick={() => toast('Password reset coming soon', { icon: 'ℹ️' })}
            style={{ color: '#9ca3af', cursor: 'not-allowed' }}
            title="Available soon"
            data-testid="forgot-password-btn"
          >
            Forgot password?
          </button>
          <button
            className="password-forgot-link"
            onClick={() => { setAuthMethod('choose'); setError(''); setPassword(''); }}
            data-testid="switch-to-otp-btn"
          >
            Use OTP instead
          </button>
        </div>

        <button className="password-skip-link" onClick={handleSkip} data-testid="skip-login-btn">
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default PasswordSetup;
