/**
 * Tests for errorHandler utility
 * Covers: ErrorTypes, getErrorMessage, getErrorType, isRetryableError
 */
import { ErrorTypes, getErrorMessage, getErrorType, isRetryableError } from '../../api/utils/errorHandler';

// ─── ErrorTypes constant ─────────────────────────────────────────

describe('ErrorTypes', () => {
  test('has all expected error types', () => {
    expect(ErrorTypes.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorTypes.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
    expect(ErrorTypes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorTypes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorTypes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorTypes.SERVER_ERROR).toBe('SERVER_ERROR');
    expect(ErrorTypes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorTypes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });
});

// ─── getErrorMessage ─────────────────────────────────────────────

describe('getErrorMessage', () => {
  test('returns API message when available', () => {
    const error = { response: { data: { message: 'Custom API error' } } };
    expect(getErrorMessage(error)).toBe('Custom API error');
  });

  test('returns API error field when message is absent', () => {
    const error = { response: { data: { error: 'Custom error field' } } };
    expect(getErrorMessage(error)).toBe('Custom error field');
  });

  test('returns timeout message for timeout errors', () => {
    const error = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
    expect(getErrorMessage(error)).toMatch(/timeout/i);
  });

  test('returns network error message', () => {
    const error = { message: 'Network Error' };
    expect(getErrorMessage(error)).toMatch(/network/i);
  });

  test('returns correct message for 400', () => {
    const error = { response: { status: 400, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/invalid request/i);
  });

  test('returns correct message for 401', () => {
    const error = { response: { status: 401, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/unauthorized/i);
  });

  test('returns correct message for 403', () => {
    const error = { response: { status: 403, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/forbidden/i);
  });

  test('returns correct message for 404', () => {
    const error = { response: { status: 404, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/not found/i);
  });

  test('returns correct message for 422', () => {
    const error = { response: { status: 422, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/validation/i);
  });

  test('returns correct message for 500', () => {
    const error = { response: { status: 500, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/server error/i);
  });

  test('returns correct message for 502', () => {
    const error = { response: { status: 502, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/bad gateway/i);
  });

  test('returns correct message for 503', () => {
    const error = { response: { status: 503, data: {} }, message: '' };
    expect(getErrorMessage(error)).toMatch(/unavailable/i);
  });

  test('returns fallback for unknown status', () => {
    const error = { response: { status: 418, data: {} }, message: 'I am a teapot' };
    expect(getErrorMessage(error)).toBe('I am a teapot');
  });

  test('returns generic message when no message available', () => {
    const error = { response: { status: 999, data: {} } };
    expect(getErrorMessage(error)).toMatch(/unexpected error/i);
  });
});

// ─── getErrorType ────────────────────────────────────────────────

describe('getErrorType', () => {
  test('returns TIMEOUT_ERROR for timeout', () => {
    expect(getErrorType({ code: 'ECONNABORTED', message: '' })).toBe(ErrorTypes.TIMEOUT_ERROR);
  });

  test('returns TIMEOUT_ERROR for timeout message', () => {
    expect(getErrorType({ message: 'timeout of 30000ms exceeded' })).toBe(ErrorTypes.TIMEOUT_ERROR);
  });

  test('returns NETWORK_ERROR for network errors', () => {
    expect(getErrorType({ message: 'Network Error' })).toBe(ErrorTypes.NETWORK_ERROR);
  });

  test('returns NETWORK_ERROR when no response', () => {
    expect(getErrorType({ message: 'something', response: undefined })).toBe(ErrorTypes.NETWORK_ERROR);
  });

  test('returns UNAUTHORIZED for 401', () => {
    expect(getErrorType({ message: '', response: { status: 401 } })).toBe(ErrorTypes.UNAUTHORIZED);
  });

  test('returns FORBIDDEN for 403', () => {
    expect(getErrorType({ message: '', response: { status: 403 } })).toBe(ErrorTypes.FORBIDDEN);
  });

  test('returns NOT_FOUND for 404', () => {
    expect(getErrorType({ message: '', response: { status: 404 } })).toBe(ErrorTypes.NOT_FOUND);
  });

  test('returns VALIDATION_ERROR for 422', () => {
    expect(getErrorType({ message: '', response: { status: 422 } })).toBe(ErrorTypes.VALIDATION_ERROR);
  });

  test('returns SERVER_ERROR for 500', () => {
    expect(getErrorType({ message: '', response: { status: 500 } })).toBe(ErrorTypes.SERVER_ERROR);
  });

  test('returns SERVER_ERROR for 502', () => {
    expect(getErrorType({ message: '', response: { status: 502 } })).toBe(ErrorTypes.SERVER_ERROR);
  });

  test('returns SERVER_ERROR for 503', () => {
    expect(getErrorType({ message: '', response: { status: 503 } })).toBe(ErrorTypes.SERVER_ERROR);
  });

  test('returns UNKNOWN_ERROR for unrecognized status', () => {
    expect(getErrorType({ message: '', response: { status: 418 } })).toBe(ErrorTypes.UNKNOWN_ERROR);
  });
});

// ─── isRetryableError ────────────────────────────────────────────

describe('isRetryableError', () => {
  test('returns true for network errors', () => {
    expect(isRetryableError({ message: 'Network Error' })).toBe(true);
  });

  test('returns true for timeout errors', () => {
    expect(isRetryableError({ code: 'ECONNABORTED', message: '' })).toBe(true);
  });

  test('returns true for server errors (500)', () => {
    expect(isRetryableError({ message: '', response: { status: 500 } })).toBe(true);
  });

  test('returns true for server errors (502)', () => {
    expect(isRetryableError({ message: '', response: { status: 502 } })).toBe(true);
  });

  test('returns true for server errors (503)', () => {
    expect(isRetryableError({ message: '', response: { status: 503 } })).toBe(true);
  });

  test('returns false for 401 unauthorized', () => {
    expect(isRetryableError({ message: '', response: { status: 401 } })).toBe(false);
  });

  test('returns false for 404 not found', () => {
    expect(isRetryableError({ message: '', response: { status: 404 } })).toBe(false);
  });

  test('returns false for 422 validation', () => {
    expect(isRetryableError({ message: '', response: { status: 422 } })).toBe(false);
  });

  test('returns false for 403 forbidden', () => {
    expect(isRetryableError({ message: '', response: { status: 403 } })).toBe(false);
  });
});
