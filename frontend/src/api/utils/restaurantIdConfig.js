/**
 * Restaurant Configuration
 * Centralized configuration for special restaurant IDs
 * Update this file to add/remove restaurants that need special handling
 */

// Hardcoded fallback: restaurants that require stations/multiple menu
export const RESTAURANTS_ID = ['716', '739'];

/**
 * Check if restaurant has multiple menus (shows stations page).
 * Priority: API field `multiple_menus` (Yes/No) > hardcoded fallback list.
 * @param {object|null} restaurant - Restaurant object from API
 * @param {string|number} restaurantId - Restaurant ID (fallback)
 * @returns {boolean}
 */
export const isMultipleMenu = (restaurant, restaurantId) => {
  // 1. Check API config first (multiple_menus: "Yes" or "No")
  if (restaurant?.multiple_menus) {
    return restaurant.multiple_menus === 'Yes';
  }
  // 2. Fallback to hardcoded list
  if (!restaurantId) return false;
  return RESTAURANTS_ID.includes(String(restaurantId));
};

/**
 * @deprecated Use isMultipleMenu(restaurant, restaurantId) instead.
 * Kept for backward compatibility during transition.
 */
export const isRestaurantIdValid = (restaurantId) => {
  if (!restaurantId) return false;
  return RESTAURANTS_ID.includes(String(restaurantId));
};
