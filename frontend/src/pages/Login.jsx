import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoPhonePortraitOutline, IoLockClosedOutline, IoKeyOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails } from '../hooks/useMenuData';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import './Login.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { restaurant } = useRestaurantDetails(restaurantId);
  const { logoUrl: configLogoUrl } = useRestaurantConfig();

  // Steps: 'login' | 'otp' | 'forgot-otp' | 'reset-password' | 'set-password'
  const [step, setStep] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const logoSrc = configLogoUrl || '/assets/images/ic_login_logo.png';

  const posId = restaurant?.pos_id || '0001';

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [step]);

  // ── Flow A: Password Login ──────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      setError('Please enter phone/email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // DEBUG: Log request details
      console.log('[BUG-036 DEBUG] Login Request:', {
        url: `${API_URL}/api/auth/login`,
        phone: phone.trim(),
        restaurant_id: restaurantId,
        pos_id: posId
      });
      
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_or_email: phone.trim(),
          password: password.trim(),
          restaurant_id: restaurantId,
          pos_id: posId,
        }),
      });
      
      // DEBUG: Log raw response
      const rawText = await res.text();
      console.log('[BUG-036 DEBUG] Raw Response:', rawText);
      console.log('[BUG-036 DEBUG] Response Status:', res.status);
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('[BUG-036 DEBUG] JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response: ${rawText.substring(0, 100)}`);
      }
      
      if (!res.ok) throw new Error(data.detail || 'Login failed');

      setAuth(data.token, data.user, data.user_type);
      
      // Store POS token for admin operations (QR, etc.)
      if (data.pos_token) {
        localStorage.setItem('pos_token', data.pos_token);
      }

      if (data.user_type === 'restaurant') {
        navigate('/admin/settings');
      } else {
        // Customer: check if password is set
        if (!data.user.has_password) {
          setStep('set-password');
        } else {
          navigate(`/${restaurantId}`);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Flow B: Send OTP ──────────────────────
  const handleSendOtp = async (forForgot = false) => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          restaurant_id: restaurantId,
          pos_id: posId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');

      setOtpSent(true);
      setOtp('');
      setDevOtp(data.otp_for_testing || '');
      setStep(forForgot ? 'forgot-otp' : 'otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Flow B: Verify OTP & Login ──────────────
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_or_email: phone.trim(),
          otp: otp.trim(),
          restaurant_id: restaurantId,
          pos_id: posId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'OTP verification failed');

      setAuth(data.token, data.user, data.user_type);

      // Flow D: prompt to set password if none set
      if (!data.user.has_password) {
        setStep('set-password');
      } else {
        navigate(`/${restaurantId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Flow C: Verify OTP for Forgot Password ──
  const handleForgotOtpVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    // Just verify locally that OTP is entered — actual verification happens on reset
    setStep('reset-password');
    setError('');
  };

  // ── Flow C: Reset Password ──────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in both fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          new_password: newPassword.trim(),
          confirm_password: confirmPassword.trim(),
          restaurant_id: restaurantId,
          pos_id: posId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');

      setSuccess('Password reset successfully! Please login.');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Flow D: Set Password (after OTP login) ──
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in both fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password: newPassword.trim(),
          confirm_password: confirmPassword.trim(),
          restaurant_id: restaurantId,
          pos_id: posId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to set password');

      // Already logged in from OTP step, just navigate
      navigate(`/${restaurantId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSetPassword = () => {
    navigate(`/${restaurantId}`);
  };

  // ── Determine step title and back behavior ──
  const getStepTitle = () => {
    switch (step) {
      case 'otp': return 'Enter OTP';
      case 'forgot-otp': return 'Verify Phone';
      case 'reset-password': return 'Reset Password';
      case 'set-password': return 'Set Password';
      default: return 'Login';
    }
  };

  const handleBack = () => {
    setError('');
    switch (step) {
      case 'otp':
      case 'forgot-otp':
        setStep('login');
        setOtp('');
        break;
      case 'reset-password':
        setStep('forgot-otp');
        setNewPassword('');
        setConfirmPassword('');
        break;
      default:
        navigate(-1);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* Header */}
        {step !== 'set-password' && (
          <div className="login-header">
            <button className="back-btn" onClick={handleBack} data-testid="login-back-btn">
              <IoArrowBack size={20} />
            </button>
            <h1 className="login-title">{getStepTitle()}</h1>
          </div>
        )}

        {/* Logo */}
        <div className="login-logo-section">
          <img
            src={logoSrc}
            alt={restaurant?.name || 'Restaurant'}
            className="login-logo"
            onError={(e) => { e.target.src = '/assets/images/ic_login_logo.png'; }}
          />
          {restaurant?.name && (
            <p className="login-restaurant-name">{restaurant.name}</p>
          )}
        </div>

        {/* Messages */}
        {error && <p className="login-message login-error" data-testid="login-error">{error}</p>}
        {success && <p className="login-message login-success" data-testid="login-success">{success}</p>}

        {/* ─── Step: Login (phone + password) ─── */}
        {step === 'login' && (
          <form className="login-form" onSubmit={handlePasswordLogin}>
            <div className="input-group">
              <span className="input-icon"><IoPhonePortraitOutline /></span>
              <input
                type="tel"
                className="login-input"
                placeholder="Phone number or email"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="login-phone-input"
                autoFocus
              />
            </div>
            <div className="input-group">
              <span className="input-icon"><IoLockClosedOutline /></span>
              <input
                type="password"
                className="login-input"
                placeholder="Password or PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
              />
            </div>
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="login-links">
              <button
                type="button"
                className="login-btn login-btn-text"
                onClick={() => handleSendOtp(false)}
                disabled={loading}
                data-testid="login-use-otp-btn"
              >
                Use OTP instead
              </button>
              <button
                type="button"
                className="login-btn login-btn-text"
                onClick={() => handleSendOtp(true)}
                disabled={loading}
                data-testid="login-forgot-password-btn"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {/* ─── Step: OTP Verification (login) ─── */}
        {step === 'otp' && (
          <form className="login-form" onSubmit={handleOtpLogin}>
            <p className="login-subtitle">
              OTP sent to <strong>{phone}</strong>
            </p>
            {devOtp && (
              <div className="login-dev-otp" data-testid="dev-otp-display">
                Your OTP is: <strong>{devOtp}</strong>
              </div>
            )}
            <div className="input-group">
              <span className="input-icon"><IoKeyOutline /></span>
              <input
                type="text"
                className="login-input otp-input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                data-testid="login-otp-input"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading || otp.length < 6}
              data-testid="login-verify-otp-btn"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              className="login-btn login-btn-text"
              onClick={() => handleSendOtp(false)}
              disabled={loading}
              data-testid="login-resend-otp-btn"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* ─── Step: OTP Verification (forgot password) ─── */}
        {step === 'forgot-otp' && (
          <form className="login-form" onSubmit={handleForgotOtpVerify}>
            <p className="login-subtitle">
              Enter the OTP sent to <strong>{phone}</strong> to verify your identity
            </p>
            {devOtp && (
              <div className="login-dev-otp" data-testid="dev-otp-forgot-display">
                Your OTP is: <strong>{devOtp}</strong>
              </div>
            )}
            <div className="input-group">
              <span className="input-icon"><IoKeyOutline /></span>
              <input
                type="text"
                className="login-input otp-input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                data-testid="forgot-otp-input"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading || otp.length < 6}
              data-testid="forgot-verify-otp-btn"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              className="login-btn login-btn-text"
              onClick={() => handleSendOtp(true)}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* ─── Step: Reset Password ─── */}
        {step === 'reset-password' && (
          <form className="login-form" onSubmit={handleResetPassword}>
            <p className="login-subtitle">Create a new password for your account</p>
            <div className="input-group">
              <span className="input-icon"><IoLockClosedOutline /></span>
              <input
                type="password"
                className="login-input"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="reset-new-password-input"
                autoFocus
              />
            </div>
            <div className="input-group">
              <span className="input-icon"><IoLockClosedOutline /></span>
              <input
                type="password"
                className="login-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="reset-confirm-password-input"
              />
            </div>
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading}
              data-testid="reset-password-submit-btn"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* ─── Step: Set Password (after OTP login) ─── */}
        {step === 'set-password' && (
          <form className="login-form" onSubmit={handleSetPassword}>
            <p className="login-subtitle">
              Set a password so you can log in faster next time
            </p>
            <div className="input-group">
              <span className="input-icon"><IoLockClosedOutline /></span>
              <input
                type="password"
                className="login-input"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="set-new-password-input"
                autoFocus
              />
            </div>
            <div className="input-group">
              <span className="input-icon"><IoLockClosedOutline /></span>
              <input
                type="password"
                className="login-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="set-confirm-password-input"
              />
            </div>
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading}
              data-testid="set-password-submit-btn"
            >
              {loading ? 'Setting...' : 'Set Password'}
            </button>
            <button
              type="button"
              className="login-btn login-btn-text"
              onClick={handleSkipSetPassword}
              data-testid="set-password-skip-btn"
            >
              Skip for now
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="login-footer">
          <p className="login-note">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
