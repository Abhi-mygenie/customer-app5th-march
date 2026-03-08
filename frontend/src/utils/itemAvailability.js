/**
 * Item Availability Utility Functions
 * Pure functions for checking item availability based on live_web and time ranges
 */

/**
 * Convert time string (HH:MM:SS) to seconds since midnight
 * @param {string} timeStr - Time in format "HH:MM:SS" (e.g., "12:00:00")
 * @returns {number} Seconds since midnight (0-86399)
 * @example
 * timeToSeconds("12:00:00") → 43200
 * timeToSeconds("23:59:59") → 86399
 * timeToSeconds("00:00:00") → 0
 */
export const timeToSeconds = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }

  const parts = timeStr.split(':');
  if (parts.length !== 3) {
    return null;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  // Validate ranges
  if (
    isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
    hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59 ||
    seconds < 0 || seconds > 59
  ) {
    return null;
  }

  return (hours * 3600) + (minutes * 60) + seconds;
};

/**
 * Check if an item is available based on live_web and time range
 * 
 * Logic (in order):
 * 1. If live_web !== 'Y' → UNAVAILABLE
 * 2. If either time is null → UNAVAILABLE
 * 3. If start === end → AVAILABLE (always)
 * 4. Time range check:
 *    - Same day (start < end): current >= start AND current <= end
 *    - Overnight (start > end): current >= start OR current <= end
 * 
 * @param {Object} item - Menu item object
 * @param {string} item.live_web - "Y" or "N" (or null/undefined)
 * @param {string|null} item.web_available_time_starts - Time string "HH:MM:SS" or null
 * @param {string|null} item.web_available_time_ends - Time string "HH:MM:SS" or null
 * @param {number} currentTimeInSeconds - Current time in seconds since midnight (0-86399)
 * @returns {boolean} true if item is available, false otherwise
 */
export const isItemAvailable = (item, currentTimeInSeconds) => {
  // STEP 1: Check live_web
  // Treat null/undefined as 'N' (unavailable)
  if (!item.live_web || item.live_web !== 'Y') {
    return false;
  }

  // STEP 2: Check if times are null
  if (!item.web_available_time_starts || !item.web_available_time_ends) {
    return false;
  }

  // Convert times to seconds
  const startSeconds = timeToSeconds(item.web_available_time_starts);
  const endSeconds = timeToSeconds(item.web_available_time_ends);

  // If conversion failed, item is unavailable
  if (startSeconds === null || endSeconds === null) {
    return false;
  }

  // STEP 3: If start === end, item is always available
  if (startSeconds === endSeconds) {
    return true;
  }

  // STEP 4: Time range check
  if (startSeconds < endSeconds) {
    // Same day range: current >= start AND current <= end
    return currentTimeInSeconds >= startSeconds && currentTimeInSeconds <= endSeconds;
  } else {
    // Overnight range (start > end): current >= start OR current <= end
    return currentTimeInSeconds >= startSeconds || currentTimeInSeconds <= endSeconds;
  }
};
