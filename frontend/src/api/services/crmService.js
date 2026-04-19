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
// Per-restaurant API key map
// ============================================
// REACT_APP_CRM_API_KEY is a JSON object: { "<restaurantId>": "<apiKey>", ... }
let CRM_API_KEYS = {};
try {
  const raw = process.env.REACT_APP_CRM_API_KEY;
  if (raw) {
    CRM_API_KEYS = typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
} catch (e) {
  console.error('[CRM] Failed to parse REACT_APP_CRM_API_KEY as JSON:', e);
  CRM_API_KEYS = {};
}

/** Extract restaurant_id from a "pos_{posId}_restaurant_{restaurantId}" userId string */
const getRestaurantIdFromUserId = (userId) => {
  if (!userId) return null;
  const m = String(userId).match(/restaurant_(\d+)/);
  return m ? m[1] : null;
};

/** Extract restaurant_id from a CRM JWT (user_id claim) */
const getRestaurantIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return getRestaurantIdFromUserId(decoded.user_id);
  } catch {
    return null;
  }
};

/** Get API key for a restaurant id (string or number) */
const getApiKeyForRestaurant = (restaurantId) => {
  if (restaurantId == null) return null;
  return CRM_API_KEYS[String(restaurantId)] || null;
};

// ============================================
// API version flag (Phase-1 migration)
// ============================================
// Read at module load; defaults to v1 if not set or invalid.
// Controls which CRM contract this service talks to (see Phase-1 plan).
// Value flip requires a frontend restart (CRA bakes env vars at dev-server start).
const CRM_API_VERSION = (process.env.REACT_APP_CRM_API_VERSION || 'v1').trim().toLowerCase();
if (!['v1', 'v2'].includes(CRM_API_VERSION)) {
  console.warn(`[CRM] Invalid REACT_APP_CRM_API_VERSION="${CRM_API_VERSION}", defaulting to v1`);
}
console.log(`[CRM] API version: ${CRM_API_VERSION}`);
// eslint-disable-next-line no-unused-vars
const isV2 = () => CRM_API_VERSION === 'v2';

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
 * Internal fetch wrapper with error handling.
 * Pass opts.restaurantId (or opts.userId / opts.token) to attach the per-restaurant x-api-key.
 */
const crmFetch = async (endpoint, options = {}) => {
  const url = `${CRM_URL}${endpoint}`;
  const { headers: optionHeaders, restaurantId, userId, token, ...restOptions } = options;

  // Resolve restaurant id from the first available source
  const resolvedRestId =
    restaurantId ||
    getRestaurantIdFromUserId(userId) ||
    getRestaurantIdFromToken(token) ||
    getRestaurantIdFromUserId(
      (() => {
        try {
          const body = restOptions.body ? JSON.parse(restOptions.body) : null;
          return body?.user_id;
        } catch {
          return null;
        }
      })()
    );

  const apiKey = getApiKeyForRestaurant(resolvedRestId);
  if (!apiKey && resolvedRestId) {
    console.warn(`[CRM] No API key configured for restaurant_id=${resolvedRestId}`);
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
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

  // ============================================
  // v2 response-envelope adapter
  // ============================================
  // v2 wraps every response in { success, message, data }.
  // v1 returns bare objects and will NOT match this shape — passes through unchanged.
  // Business errors in v2 arrive as HTTP 200 with success:false — must throw here.
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'success' in data &&
    'data' in data
  ) {
    if (data.success === false) {
      const err = new Error(data.message || 'CRM returned success:false');
      err.data = data;
      err.isBusinessError = true;
      throw err;
    }
    return data.data;
  }

  return data;
};

/**
 * Authenticated fetch — adds Bearer token + per-restaurant x-api-key (derived from token)
 */
const crmAuthFetch = async (endpoint, token, options = {}) => {
  return crmFetch(endpoint, {
    ...options,
    token, // used by crmFetch to resolve restaurant -> x-api-key
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
 * Returns: { success, message, expires_in_minutes, debug_otp? }
 *
 * v1 path: POST /customer/send-otp  — body { phone, user_id, country_code }
 * v2 path: POST /scan/auth/request-otp — body { phone, restaurant_id }
 *          response normalized to v1 shape so PasswordSetup.jsx is unaffected.
 */
export const crmSendOtp = async (phone, userId, countryCode = '91') => {
  if (isV2()) {
    const restaurantId = getRestaurantIdFromUserId(userId);
    const data = await crmFetch('/scan/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({
        phone: stripPhonePrefix(phone),
        restaurant_id: restaurantId,
      }),
      userId, // used by crmFetch to resolve restaurant -> x-api-key
    });
    return {
      success: true,
      message: 'OTP sent',
      expires_in_minutes: data?.expires_in_seconds
        ? Math.ceil(data.expires_in_seconds / 60)
        : 10,
      debug_otp: data?.dev_otp,
      phone: data?.phone,
    };
  }

  // v1 — unchanged
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
