import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  // Check token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          // Handle non-JSON responses
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            // Server unavailable, keep token but don't validate
            console.warn('Auth check: Server returned non-JSON response');
            setLoading(false);
            return;
          }
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setUserType(data.user_type);
            setToken(storedToken);
          } else {
            // Token invalid
            localStorage.removeItem('auth_token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const sendOTP = async (phone, restaurantContext = null) => {
    const body = { phone };
    
    // Add restaurant context if available
    if (restaurantContext) {
      body.restaurant_id = restaurantContext.restaurant_id;
      body.pos_id = restaurantContext.pos_id || "0001";
    }
    
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send OTP');
    }
    
    return data;
  };

  const login = async (phoneOrEmail, otpOrPassword, isOTP = true, restaurantContext = null) => {
    const body = {
      phone_or_email: phoneOrEmail
    };

    if (isOTP) {
      body.otp = otpOrPassword;
    } else {
      body.password = otpOrPassword;
    }
    
    // Add restaurant context if available
    if (restaurantContext) {
      body.restaurant_id = restaurantContext.restaurant_id;
      body.pos_id = restaurantContext.pos_id || "0001";
    }

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // Handle non-JSON responses (e.g., 404 page not found, 502 gateway error)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    // Save to state and localStorage
    setUser(data.user);
    setUserType(data.user_type);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
    
    // Store restaurant context if available
    if (data.restaurant_context) {
      localStorage.setItem('restaurant_context', JSON.stringify(data.restaurant_context));
    }
    
    return data;
  };

  const logout = () => {
    setUser(null);
    setUserType(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  // Direct setter for auth state (used when Login.jsx handles its own fetch)
  const setAuth = (newToken, newUser, newUserType) => {
    setUser(newUser);
    setUserType(newUserType);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
  };

  const value = {
    user,
    userType,
    token,
    loading,
    isAuthenticated: !!token,
    isCustomer: userType === 'customer',
    isRestaurant: userType === 'restaurant',
    sendOTP,
    login,
    setAuth,
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
