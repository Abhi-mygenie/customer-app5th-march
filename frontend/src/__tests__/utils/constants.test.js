/**
 * Tests for constants utility
 * Covers: API_CONFIG, CACHE_CONFIG
 */
import { API_CONFIG, CACHE_CONFIG } from '../../utils/constants';

describe('API_CONFIG', () => {
  test('has TIMEOUT set to 30 seconds', () => {
    expect(API_CONFIG.TIMEOUT).toBe(30000);
  });

  test('has RETRY_ATTEMPTS set to 3', () => {
    expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
  });

  test('has RETRY_DELAY set to 1 second', () => {
    expect(API_CONFIG.RETRY_DELAY).toBe(1000);
  });
});

describe('CACHE_CONFIG', () => {
  test('MENU_CACHE_TIME is 5 minutes', () => {
    expect(CACHE_CONFIG.MENU_CACHE_TIME).toBe(5 * 60 * 1000);
  });

  test('STATION_CACHE_TIME is 10 minutes', () => {
    expect(CACHE_CONFIG.STATION_CACHE_TIME).toBe(10 * 60 * 1000);
  });
});
