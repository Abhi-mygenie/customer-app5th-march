/**
 * Room Order Utilities
 * Helper functions for handling room-specific order logic
 */

/**
 * Check if an item is a "check in" item (should be excluded from billing for room orders)
 * @param {Object} item - Order item object (can be previousItem or cartItem format)
 * @returns {boolean} true if item is a "check in" item
 */
export const isCheckinItem = (item) => {
  // Handle both formats: item.item.name (previousItems) and item.name (direct)
  const name = (item?.item?.name || item?.name || '').toLowerCase().trim();
  return name === 'check in';
};

/**
 * Check if current order is a room order (from sessionStorage)
 * @param {string} restaurantId - Restaurant ID to check
 * @returns {boolean} true if current order is for a room
 */
export const isRoomOrder = (restaurantId) => {
  if (!restaurantId) return false;
  
  try {
    const storageKey = `scanned_table_${restaurantId}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.room_or_table === 'room';
    }
  } catch (error) {
    console.error('Error checking room order status:', error);
  }
  return false;
};

/**
 * Filter out "check in" items from an array (only for room orders)
 * @param {Array} items - Array of order items
 * @param {string} restaurantId - Restaurant ID
 * @returns {Array} Filtered items array
 */
export const filterCheckinItems = (items, restaurantId) => {
  if (!items || !Array.isArray(items)) return [];
  
  // Only filter for room orders
  if (!isRoomOrder(restaurantId)) {
    return items;
  }
  
  return items.filter(item => !isCheckinItem(item));
};
