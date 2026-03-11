/**
 * Tests for restaurantIdConfig utility
 * Covers: isMultipleMenu, isRestaurantIdValid, RESTAURANTS_ID
 */
import { RESTAURANTS_ID, isMultipleMenu, isRestaurantIdValid } from '../../api/utils/restaurantIdConfig';

// ─── RESTAURANTS_ID constant ─────────────────────────────────────

describe('RESTAURANTS_ID', () => {
  test('is an array', () => {
    expect(Array.isArray(RESTAURANTS_ID)).toBe(true);
  });

  test('contains expected IDs', () => {
    expect(RESTAURANTS_ID).toContain('716');
    expect(RESTAURANTS_ID).toContain('739');
  });

  test('contains only strings', () => {
    RESTAURANTS_ID.forEach(id => {
      expect(typeof id).toBe('string');
    });
  });
});

// ─── isMultipleMenu ──────────────────────────────────────────────

describe('isMultipleMenu', () => {
  describe('API config priority (menu_type field)', () => {
    test('returns true when menu_type is "multiple"', () => {
      const restaurant = { menu_type: 'multiple' };
      expect(isMultipleMenu(restaurant, '999')).toBe(true);
    });

    test('returns true when menu_type is "Multiple" (case-insensitive)', () => {
      const restaurant = { menu_type: 'Multiple' };
      expect(isMultipleMenu(restaurant, '999')).toBe(true);
    });

    test('returns true when menu_type is "MULTIPLE" (case-insensitive)', () => {
      const restaurant = { menu_type: 'MULTIPLE' };
      expect(isMultipleMenu(restaurant, '999')).toBe(true);
    });

    test('returns false when menu_type is "single"', () => {
      const restaurant = { menu_type: 'single' };
      expect(isMultipleMenu(restaurant, '716')).toBe(false);
    });

    test('API config overrides hardcoded list (single for 716)', () => {
      const restaurant = { menu_type: 'single' };
      expect(isMultipleMenu(restaurant, '716')).toBe(false);
    });

    test('API config overrides hardcoded list (multiple for non-listed)', () => {
      const restaurant = { menu_type: 'multiple' };
      expect(isMultipleMenu(restaurant, '123')).toBe(true);
    });
  });

  describe('hardcoded fallback (no menu_type)', () => {
    test('returns true for restaurant 716', () => {
      expect(isMultipleMenu(null, '716')).toBe(true);
      expect(isMultipleMenu({}, '716')).toBe(true);
    });

    test('returns true for restaurant 739', () => {
      expect(isMultipleMenu(null, '739')).toBe(true);
    });

    test('returns false for non-listed restaurant', () => {
      expect(isMultipleMenu(null, '478')).toBe(false);
      expect(isMultipleMenu({}, '999')).toBe(false);
    });

    test('handles numeric restaurantId by converting to string', () => {
      expect(isMultipleMenu(null, 716)).toBe(true);
      expect(isMultipleMenu(null, 478)).toBe(false);
    });

    test('returns false for null restaurantId', () => {
      expect(isMultipleMenu(null, null)).toBe(false);
    });

    test('returns false for undefined restaurantId', () => {
      expect(isMultipleMenu(null, undefined)).toBe(false);
    });

    test('returns false for empty string restaurantId', () => {
      expect(isMultipleMenu(null, '')).toBe(false);
    });
  });
});

// ─── isRestaurantIdValid (deprecated) ────────────────────────────

describe('isRestaurantIdValid (deprecated)', () => {
  test('returns true for listed restaurant IDs', () => {
    expect(isRestaurantIdValid('716')).toBe(true);
    expect(isRestaurantIdValid('739')).toBe(true);
  });

  test('returns false for non-listed restaurant IDs', () => {
    expect(isRestaurantIdValid('478')).toBe(false);
    expect(isRestaurantIdValid('999')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isRestaurantIdValid(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isRestaurantIdValid(undefined)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isRestaurantIdValid('')).toBe(false);
  });
});
