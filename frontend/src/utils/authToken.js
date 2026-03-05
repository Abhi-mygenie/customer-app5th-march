// src/utils/authToken.js

import apiClient from '../api/config/axios';

// Storage keys
const TOKEN_STORAGE_KEY = 'order_auth_token';
const TOKEN_EXPIRY_KEY = 'order_token_expiry';

// Token expiration: 30 minutes
const TOKEN_EXPIRY_TIME = 10 * 60 * 1000; // 30 minutes in milliseconds

// Hardcoded credentials (move to env variables)
const HARDCODED_PHONE = process.env.REACT_APP_LOGIN_PHONE || '+919579504871';
const HARDCODED_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD || 'Qplazm@10';

/**
 * Get stored token from localStorage
 */
export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Get token expiration timestamp
 */
export const getTokenExpiry = () => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
};

/**
 * Check if token is expired (30-minute custom expiration)
 * @returns {boolean} true if token is expired or doesn't exist
 */
export const isTokenExpired = () => {
  const token = getStoredToken();
  const expiry = getTokenExpiry();
  
  // No token or no expiry = expired
  if (!token || !expiry) {
    return true;
  }
  
  const now = Date.now();
  const isExpired = now >= expiry;
  
  if (isExpired) {
    // console.log('[Auth] Token expired (30-minute limit)', {
    //   expiredAt: new Date(expiry).toISOString(),
    //   now: new Date(now).toISOString()
    // });
  }
  
  return isExpired;
};

/**
 * Store token with 30-minute expiration
 * @param {string} token - JWT token from login API
 */
export const storeToken = (token) => {
  const expiry = Date.now() + TOKEN_EXPIRY_TIME; // 30 minutes from now
  
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  
  // console.log('[Auth] Token stored', {
  //   expiresAt: new Date(expiry).toISOString(),
  //   expiresIn: '2 minutes'
  // });
};

/**
 * Clear stored token
 */
export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  // console.log('[Auth] Token cleared');
};

/**
 * Call login API to get token
 * @returns {Promise<string>} JWT token
 */
export const loginForToken = async () => {
  try {
    // console.log('[Auth] Calling login API...');
    
    const response = await apiClient.post('/auth/login', {
      phone: HARDCODED_PHONE,
      password: HARDCODED_PASSWORD
    });
    
    if (response.data && response.data.token) {
      const token = response.data.token;
      storeToken(token); // Store with 30-minute expiration
      
      // console.log('[Auth] Login successful', {
      //   tokenReceived: true,
      //   isPhoneVerified: response.data.is_phone_verified,
      //   userId: response.data.user_id
      // });
      
      return token;
    }
    
    throw new Error('No token in response');
  } catch (error) {
    // console.error('[Auth] Login failed:', error);
    clearStoredToken();
    
    // Re-throw with more context
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    throw new Error(`Failed to get authentication token: ${errorMessage}`);
  }
};

/**
 * Get auth token - checks expiration, gets new token if expired
 * @param {boolean} forceRefresh - Force new token even if current is valid
 * @returns {Promise<string>} JWT token
 */
export const getAuthToken = async (forceRefresh = false) => {
  // Force refresh - get new token
  if (forceRefresh) {
    // console.log('[Auth] Force refresh requested');
    return await loginForToken();
  }
  
  // Check if we have a stored token
  const storedToken = getStoredToken();
  
  // No token - get new one
  if (!storedToken) {
    // console.log('[Auth] No token found, fetching new token');
    return await loginForToken();
  }
  
  // Check if token is expired (30-minute check)
  if (isTokenExpired()) {
    // console.log('[Auth] Token expired (30min), fetching new token');
    return await loginForToken();
  }
  
  // Token is still valid (within 30 minutes)
  // const expiry = getTokenExpiry();
  // const timeLeft = Math.floor((expiry - Date.now()) / 1000 / 60);
  // console.log('[Auth] Using existing token', {
  //   expiresIn: `${timeLeft} minutes`,
  //   expiresAt: new Date(expiry).toISOString()
  // });
  
  return storedToken;
};
