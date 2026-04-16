/**
 * CRM Service — All CRM API calls
 * Base URL: REACT_APP_CRM_URL (e.g., https://customer-app-march-2.preview.emergentagent.com/api)
 * 
 * Auth endpoints: No token required
 * Profile/Address endpoints: CRM customer token required (from login or verify-otp)
 */

const CRM_URL = process.env.REACT_APP_CRM_URL;

if (!CRM_URL) {
  console.error('[CRM] CRITICAL: REACT_APP_CRM_URL is not set in .env');
}

// ============================================
// Helper
// ============================================

/**
 * Build user_id string from restaurant ID and POS ID
 * Format: "pos_{posId}_restaurant_{restaurantId}"
 */
export const buildUserId = (restaurantId, posId = '0001') => {
  return `pos_${posId}_restaurant_${restaurantId}`;
};

/**
 * Internal fetch wrapper with error handling
 */
const crmFetch = async (endpoint, options = {}) => {
  const url = `${CRM_URL}${endpoint}`;
  const { headers: optionHeaders, ...restOptions } = options;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
    ...restOptions,
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(text || `CRM returned non-JSON response (${response.status})`);
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data.detail
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      : `CRM error (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Authenticated fetch — adds Bearer token
 */
const crmAuthFetch = async (endpoint, token, options = {}) => {
  return crmFetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};

// ============================================
// Auth — No token required
// ============================================

/**
 * Register customer with phone + password
 * Creates new customer or links password to existing (no password set)
 * Returns: { success, token, customer, is_new_customer }
 */
export const crmRegister = async (phone, password, userId, name = '', email = '') => {
  const body = { phone: stripPhonePrefix(phone), password, user_id: userId };
  if (name) body.name = name;
  if (email) body.email = email;

  return crmFetch('/customer/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * Login customer with phone + password
 * Returns: { success, token, customer } (customer includes addresses)
 */
export const crmLogin = async (phone, password, userId) => {
  return crmFetch('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ phone: stripPhonePrefix(phone), password, user_id: userId }),
  });
};

/**
 * Strip country code prefix from phone for CRM API calls.
 * CRM expects bare digits (e.g., "7505242126"), not "+917505242126".
 * The country_code field is sent separately.
 */
const stripPhonePrefix = (phone) => {
  if (!phone) return phone;
  // Remove + and leading country code (91 for India, etc.)
  let bare = phone.replace(/^\+/, '');
  // If starts with 91 and remaining is 10 digits, strip 91
  if (bare.startsWith('91') && bare.length === 12) {
    return bare.slice(2);
  }
  return bare;
};

/**
 * Send OTP to customer phone
 * Returns: { success, message, expires_in_minutes, restaurant_name }
 */
export const crmSendOtp = async (phone, userId, countryCode = '91') => {
  return crmFetch('/customer/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: stripPhonePrefix(phone), user_id: userId, country_code: countryCode }),
  });
};

/**
 * Verify OTP and get token + profile
 * Returns: { success, token, customer } (customer includes addresses)
 */
export const crmVerifyOtp = async (phone, otp, userId, countryCode = '91') => {
  return crmFetch('/customer/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: stripPhonePrefix(phone), otp, user_id: userId, country_code: countryCode }),
  });
};

/**
 * Send OTP for password reset
 * Returns: { success, message, expires_in_minutes }
 */
export const crmForgotPassword = async (phone, userId, countryCode = '91') => {
  return crmFetch('/customer/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ phone: stripPhonePrefix(phone), user_id: userId, country_code: countryCode }),
  });
};

/**
 * Reset password with OTP verification
 * Returns: { success, message }
 */
export const crmResetPassword = async (phone, otp, userId, newPassword) => {
  return crmFetch('/customer/reset-password', {
    method: 'POST',
    body: JSON.stringify({ phone: stripPhonePrefix(phone), otp, user_id: userId, new_password: newPassword }),
  });
};

// ============================================
// Profile — CRM token required
// ============================================

/**
 * Get current customer profile (same data as login/verify-otp response)
 * Returns: { id, name, phone, email, tier, total_points, addresses, ... }
 */
export const crmGetProfile = async (token) => {
  return crmAuthFetch('/customer/me', token, { method: 'GET' });
};

/**
 * Get customer order history
 * Returns: { total_orders, orders: [...] }
 */
export const crmGetOrders = async (token, limit = 50, skip = 0) => {
  return crmAuthFetch(`/customer/me/orders?limit=${limit}&skip=${skip}`, token, { method: 'GET' });
};

/**
 * Get customer points balance + transaction history
 * Returns: { total_points, points_value, tier, expiring_soon, transactions: [...] }
 */
export const crmGetPoints = async (token, limit = 50) => {
  return crmAuthFetch(`/customer/me/points?limit=${limit}`, token, { method: 'GET' });
};

/**
 * Get customer wallet balance + transaction history
 * Returns: { wallet_balance, total_received, total_used, transactions: [...] }
 */
export const crmGetWallet = async (token, limit = 50) => {
  return crmAuthFetch(`/customer/me/wallet?limit=${limit}`, token, { method: 'GET' });
};

// ============================================
// Addresses — CRM token required
// ============================================

/**
 * Get all saved addresses
 * Returns: { customer_id, addresses: [...], total }
 */
export const crmGetAddresses = async (token) => {
  return crmAuthFetch('/customer/me/addresses', token, { method: 'GET' });
};

/**
 * Add a new delivery address
 * Returns: address object with generated id
 */
export const crmAddAddress = async (token, addressData) => {
  return crmAuthFetch('/customer/me/addresses', token, {
    method: 'POST',
    body: JSON.stringify(addressData),
  });
};

/**
 * Update an existing address (send only fields to change)
 * Returns: updated address object
 */
export const crmUpdateAddress = async (token, addressId, addressData) => {
  return crmAuthFetch(`/customer/me/addresses/${addressId}`, token, {
    method: 'PUT',
    body: JSON.stringify(addressData),
  });
};

/**
 * Delete an address
 * Returns: { message, remaining_addresses }
 */
export const crmDeleteAddress = async (token, addressId) => {
  return crmAuthFetch(`/customer/me/addresses/${addressId}`, token, {
    method: 'DELETE',
  });
};

/**
 * Set an address as default
 * Returns: updated address object with is_default: true
 */
export const crmSetDefaultAddress = async (token, addressId) => {
  return crmAuthFetch(`/customer/me/addresses/${addressId}/set-default`, token, {
    method: 'POST',
  });
};
