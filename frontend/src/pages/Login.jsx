import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails } from '../hooks/useMenuData';
import { IoArrowBack, IoPhonePortraitOutline, IoMailOutline, IoLockClosedOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendOTP, login } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { restaurant } = useRestaurantDetails(restaurantId);
  
  const [step, setStep] = useState('phone'); // phone, otp, password
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantContext, setRestaurantContext] = useState(null);

  // Auto-detect if input is email (contains @)
  const isEmailInput = phoneOrEmail.includes('@');

  // Build restaurant context from URL and API data
  useEffect(() => {
    if (restaurant?.id) {
      const posId = searchParams.get('pos_id') || "0001"; // Default MyGenie
      setRestaurantContext({
        restaurant_id: String(restaurant.id),
        pos_id: posId,
        restaurant_name: restaurant.name
      });
    }
  }, [restaurant, searchParams]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    // If email detected, go straight to password step
    if (isEmailInput) {
      setStep('password');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(phoneOrEmail, restaurantContext);
      toast.success('OTP sent successfully');
      if (result.otp_for_testing) {
        toast(`Test OTP: ${result.otp_for_testing}`, { duration: 10000, icon: '🔑' });
      }
      setStep('otp');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 4) {
      toast.error('Please enter valid OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await login(phoneOrEmail, otp, true, restaurantContext);
      toast.success(`Welcome, ${result.user.name || 'User'}!`);
      
      // Redirect to menu page (not profile) - user stays in browsing flow
      if (result.user_type === 'customer') {
        // Go back to restaurant menu or landing
        const redirectPath = restaurantContext?.restaurant_id 
          ? `/${restaurantContext.restaurant_id}/menu`
          : '/';
        navigate(redirectPath);
      } else {
        navigate('/admin/settings');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Please enter password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(phoneOrEmail, password, false, restaurantContext);
      toast.success(`Welcome, ${result.user.restaurant_name || result.user.name || 'User'}!`);
      
      // Redirect based on user type
      if (result.user_type === 'customer') {
        navigate('/profile');
      } else {
        navigate('/admin/settings');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp' || step === 'password') {
      setStep('phone');
      setOtp('');
      setPassword('');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <button className="back-btn" onClick={handleBack} data-testid="login-back-btn">
            <IoArrowBack />
          </button>
          <h1 className="login-title">
            {step === 'phone' && 'Login'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'password' && 'Enter Password'}
          </h1>
        </div>

        {/* Logo */}
        <div className="login-logo-section">
          <img 
            src="/assets/images/ic_login_logo.png" 
            alt="MyGenie" 
            className="login-logo"
            onError={(e) => e.target.src = '/assets/images/mygenie_logo.svg'}
          />
        </div>

        {/* Step 1: Phone/Email Input */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="login-form" data-testid="login-phone-form">
            <p className="login-subtitle">Enter your phone number to continue</p>
            
            <div className="input-group">
              <span className="input-icon">
                {isEmailInput ? <IoMailOutline /> : <IoPhonePortraitOutline />}
              </span>
              <input
                type="text"
                placeholder="Phone number"
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                className="login-input"
                data-testid="login-phone-input"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="login-btn login-btn-primary"
              disabled={loading}
              data-testid="login-send-otp-btn"
            >
              {loading ? 'Sending...' : (isEmailInput ? 'Continue' : 'Send OTP')}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleOTPLogin} className="login-form" data-testid="login-otp-form">
            <p className="login-subtitle">
              Enter the 6-digit OTP sent to <strong>{phoneOrEmail}</strong>
            </p>
            
            <div className="input-group">
              <span className="input-icon">
                <IoLockClosedOutline />
              </span>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="login-input otp-input"
                data-testid="login-otp-input"
                maxLength={6}
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="login-btn login-btn-primary"
              disabled={loading || otp.length < 4}
              data-testid="login-verify-btn"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button 
              type="button"
              className="login-btn login-btn-text"
              onClick={handleSendOTP}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* Step 3: Password (for restaurant admins) */}
        {step === 'password' && (
          <form onSubmit={handlePasswordLogin} className="login-form" data-testid="login-password-form">
            <p className="login-subtitle">
              Enter your password for <strong>{phoneOrEmail}</strong>
            </p>
            
            <div className="input-group">
              <span className="input-icon">
                <IoLockClosedOutline />
              </span>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                data-testid="login-password-input"
                autoFocus
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
          </form>
        )}

        {/* Footer */}
        <div className="login-footer">
          <p className="login-note">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
