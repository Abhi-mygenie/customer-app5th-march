import React, { createContext, useContext, useState, useEffect } from 'react';
import { crmGetProfile } from '../api/services/crmService';
import logger from '../utils/logger';
const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [token, setToken] = useState(null);
  const [crmToken, setCrmToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check tokens on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Priority 1: Check CRM token (customer)
      const storedCrmToken = localStorage.getItem('crm_token');
      if (storedCrmToken) {
        try {
          const profile = await crmGetProfile(storedCrmToken);
          setUser(profile);
          setUserType('customer');
          setCrmToken(storedCrmToken);
          setToken(storedCrmToken);
          setLoading(false);
          return;
        } catch (error) {
          logger.error('auth', 'CRM token validation failed:', error);
          localStorage.removeItem('crm_token');
        }
      }

      // Priority 2: Check admin token (restaurant)
      const storedAdminToken = localStorage.getItem('auth_token');
      if (storedAdminToken) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedAdminToken}` }
          });
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            logger.auth('Auth check: Server returned non-JSON response');
            setLoading(false);
            return;
          }
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setUserType(data.user_type);
            setToken(storedAdminToken);
          } else {
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          logger.error('auth', 'Admin auth check failed:', error);
          localStorage.removeItem('auth_token');
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Admin login (used by Login.jsx — our backend, admin only)
  const login = async (phoneOrEmail, otpOrPassword, isOTP = true, restaurantContext = null) => {
    const body = { phone_or_email: phoneOrEmail };

    if (isOTP) {
      body.otp = otpOrPassword;
    } else {
      body.password = otpOrPassword;
    }
    
    if (restaurantContext) {
      body.restaurant_id = restaurantContext.restaurant_id;
      body.pos_id = restaurantContext.pos_id || "0001";
    }

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.error('auth', 'Non-JSON response:', text);
      throw new Error('Server is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    setUser(data.user);
    setUserType(data.user_type);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
    
    if (data.restaurant_context) {
      localStorage.setItem('restaurant_context', JSON.stringify(data.restaurant_context));
    }
    
    return data;
  };

  // Admin auth setter (used by Login.jsx for direct admin login)
  const setAuth = (newToken, newUser, newUserType) => {
    setUser(newUser);
    setUserType(newUserType);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
  };

  // CRM customer auth setter (used by PasswordSetup.jsx)
  const setCrmAuth = (newCrmToken, customerProfile) => {
    setUser(customerProfile);
    setUserType('customer');
    setCrmToken(newCrmToken);
    setToken(newCrmToken);
    localStorage.setItem('crm_token', newCrmToken);
  };

  const logout = () => {
    setUser(null);
    setUserType(null);
    setToken(null);
    setCrmToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('crm_token');
    localStorage.removeItem('pos_token');
    localStorage.removeItem('restaurant_context');
  };

  // sendOTP kept for backward compat (if anything still calls it)
  const sendOTP = async (phone, restaurantContext = null) => {
    const body = { phone };
    if (restaurantContext) {
      body.restaurant_id = restaurantContext.restaurant_id;
      body.pos_id = restaurantContext.pos_id || "0001";
    }
    
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.error('auth', 'Non-JSON response:', text);
      throw new Error('Server is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send OTP');
    }
    return data;
  };

  const value = {
    user,
    userType,
    token,
    crmToken,
    loading,
    isAuthenticated: !!token,
    isCustomer: userType === 'customer',
    isRestaurant: userType === 'restaurant',
    sendOTP,
    login,
    setAuth,
    setCrmAuth,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
