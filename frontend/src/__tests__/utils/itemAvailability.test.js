/**
 * Tests for itemAvailability utility
 * Covers: timeToSeconds, isItemAvailable
 */
import { timeToSeconds, isItemAvailable } from '../../utils/itemAvailability';

// ─── timeToSeconds ───────────────────────────────────────────────

describe('timeToSeconds', () => {
  test('converts midnight correctly', () => {
    expect(timeToSeconds('00:00:00')).toBe(0);
  });

  test('converts noon correctly', () => {
    expect(timeToSeconds('12:00:00')).toBe(43200);
  });

  test('converts end of day correctly', () => {
    expect(timeToSeconds('23:59:59')).toBe(86399);
  });

  test('converts arbitrary time', () => {
    // 9h * 3600 + 30m * 60 + 45s = 32400 + 1800 + 45 = 34245
    expect(timeToSeconds('09:30:45')).toBe(34245);
  });

  test('returns null for null input', () => {
    expect(timeToSeconds(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(timeToSeconds(undefined)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(timeToSeconds('')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(timeToSeconds(12345)).toBeNull();
  });

  test('returns null for malformed time string (missing parts)', () => {
    expect(timeToSeconds('12:00')).toBeNull();
  });

  test('returns null for invalid hours (>23)', () => {
    expect(timeToSeconds('25:00:00')).toBeNull();
  });

  test('returns null for invalid minutes (>59)', () => {
    expect(timeToSeconds('12:60:00')).toBeNull();
  });

  test('returns null for invalid seconds (>59)', () => {
    expect(timeToSeconds('12:00:60')).toBeNull();
  });

  test('returns null for negative values', () => {
    expect(timeToSeconds('-1:00:00')).toBeNull();
  });
});

// ─── isItemAvailable ─────────────────────────────────────────────

describe('isItemAvailable', () => {
  // Helper to make item objects
  const makeItem = (live_web, starts, ends) => ({
    live_web,
    web_available_time_starts: starts,
    web_available_time_ends: ends,
  });

  const noon = 43200; // 12:00:00

  describe('live_web checks', () => {
    test('returns false when live_web is null', () => {
      expect(isItemAvailable(makeItem(null, '00:00:00', '23:59:59'), noon)).toBe(false);
    });

    test('returns false when live_web is undefined', () => {
      expect(isItemAvailable(makeItem(undefined, '00:00:00', '23:59:59'), noon)).toBe(false);
    });

    test('returns false when live_web is "N"', () => {
      expect(isItemAvailable(makeItem('N', '00:00:00', '23:59:59'), noon)).toBe(false);
    });

    test('returns false when live_web is empty string', () => {
      expect(isItemAvailable(makeItem('', '00:00:00', '23:59:59'), noon)).toBe(false);
    });
  });

  describe('null time checks', () => {
    test('returns false when start time is null', () => {
      expect(isItemAvailable(makeItem('Y', null, '23:59:59'), noon)).toBe(false);
    });

    test('returns false when end time is null', () => {
      expect(isItemAvailable(makeItem('Y', '00:00:00', null), noon)).toBe(false);
    });

    test('returns false when both times are null', () => {
      expect(isItemAvailable(makeItem('Y', null, null), noon)).toBe(false);
    });
  });

  describe('start === end (always available)', () => {
    test('returns true when start equals end', () => {
      expect(isItemAvailable(makeItem('Y', '12:00:00', '12:00:00'), 0)).toBe(true);
      expect(isItemAvailable(makeItem('Y', '12:00:00', '12:00:00'), noon)).toBe(true);
      expect(isItemAvailable(makeItem('Y', '12:00:00', '12:00:00'), 86399)).toBe(true);
    });
  });

  describe('same-day range (start < end)', () => {
    // Range: 09:00 - 17:00 (32400 - 61200)
    const item = makeItem('Y', '09:00:00', '17:00:00');

    test('returns true when current is within range', () => {
      expect(isItemAvailable(item, noon)).toBe(true); // 12:00
    });

    test('returns true at exact start', () => {
      expect(isItemAvailable(item, 32400)).toBe(true); // 09:00
    });

    test('returns true at exact end', () => {
      expect(isItemAvailable(item, 61200)).toBe(true); // 17:00
    });

    test('returns false before start', () => {
      expect(isItemAvailable(item, 32399)).toBe(false); // 08:59:59
    });

    test('returns false after end', () => {
      expect(isItemAvailable(item, 61201)).toBe(false); // 17:00:01
    });
  });

  describe('overnight range (start > end)', () => {
    // Range: 22:00 - 06:00 (79200 - 21600)
    const item = makeItem('Y', '22:00:00', '06:00:00');

    test('returns true at 23:00 (after start)', () => {
      expect(isItemAvailable(item, 82800)).toBe(true);
    });

    test('returns true at 02:00 (before end, next day)', () => {
      expect(isItemAvailable(item, 7200)).toBe(true);
    });

    test('returns true at exact start (22:00)', () => {
      expect(isItemAvailable(item, 79200)).toBe(true);
    });

    test('returns true at exact end (06:00)', () => {
      expect(isItemAvailable(item, 21600)).toBe(true);
    });

    test('returns false at noon (outside range)', () => {
      expect(isItemAvailable(item, noon)).toBe(false);
    });

    test('returns false at 12:00 (midday, outside overnight range)', () => {
      expect(isItemAvailable(item, 43200)).toBe(false);
    });
  });

  describe('invalid time strings', () => {
    test('returns false for malformed start time', () => {
      expect(isItemAvailable(makeItem('Y', 'bad', '17:00:00'), noon)).toBe(false);
    });

    test('returns false for malformed end time', () => {
      expect(isItemAvailable(makeItem('Y', '09:00:00', 'bad'), noon)).toBe(false);
    });
  });
});
