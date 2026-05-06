/**
 * Tests for authToken utility
 * Covers: storeToken, getStoredToken, getTokenExpiry, isTokenExpired, clearStoredToken
 * Note: loginForToken and getAuthToken require API calls — tested separately
 */

// Mock axios before importing authToken (it imports apiClient at module level)
jest.mock('../../api/config/axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import {
  getStoredToken,
  getTokenExpiry,
  isTokenExpired,
  storeToken,
  clearStoredToken,
} from '../../utils/authToken';

// ─── Setup ───────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = 'order_auth_token';
const TOKEN_EXPIRY_KEY = 'order_token_expiry';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ─── storeToken ──────────────────────────────────────────────────

describe('storeToken', () => {
  test('stores token in localStorage', () => {
    storeToken('test-token-123');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-token-123');
  });

  test('stores expiry timestamp in localStorage', () => {
    const before = Date.now();
    storeToken('test-token');
    const after = Date.now();

    const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY), 10);
    // TOKEN_EXPIRY_TIME is 10 * 60 * 1000 = 600000ms (10 minutes)
    expect(expiry).toBeGreaterThanOrEqual(before + 600000);
    expect(expiry).toBeLessThanOrEqual(after + 600000);
  });
});

// ─── getStoredToken ──────────────────────────────────────────────

describe('getStoredToken', () => {
  test('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  test('returns stored token', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'my-jwt-token');
    expect(getStoredToken()).toBe('my-jwt-token');
  });
});

// ─── getTokenExpiry ──────────────────────────────────────────────

describe('getTokenExpiry', () => {
  test('returns null when no expiry stored', () => {
    expect(getTokenExpiry()).toBeNull();
  });

  test('returns numeric timestamp', () => {
    const ts = Date.now() + 600000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, ts.toString());
    expect(getTokenExpiry()).toBe(ts);
  });
});

// ─── isTokenExpired ──────────────────────────────────────────────

describe('isTokenExpired', () => {
  test('returns true when no token exists', () => {
    expect(isTokenExpired()).toBe(true);
  });

  test('returns true when token exists but no expiry', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
    expect(isTokenExpired()).toBe(true);
  });

  test('returns true when token is expired', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
    localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() - 1000).toString());
    expect(isTokenExpired()).toBe(true);
  });

  test('returns false when token is still valid', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
    localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + 300000).toString());
    expect(isTokenExpired()).toBe(false);
  });
});

// ─── clearStoredToken ────────────────────────────────────────────

describe('clearStoredToken', () => {
  test('removes token and expiry from localStorage', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token');
    localStorage.setItem(TOKEN_EXPIRY_KEY, '123456');
    
    clearStoredToken();
    
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_EXPIRY_KEY)).toBeNull();
  });

  test('does not throw when nothing stored', () => {
    expect(() => clearStoredToken()).not.toThrow();
  });
});

// ─── Integration ─────────────────────────────────────────────────

describe('storeToken -> isTokenExpired integration', () => {
  test('token is not expired immediately after storing', () => {
    storeToken('fresh-token');
    expect(isTokenExpired()).toBe(false);
  });

  test('clearStoredToken makes isTokenExpired return true', () => {
    storeToken('token');
    expect(isTokenExpired()).toBe(false);
    clearStoredToken();
    expect(isTokenExpired()).toBe(true);
  });
});
