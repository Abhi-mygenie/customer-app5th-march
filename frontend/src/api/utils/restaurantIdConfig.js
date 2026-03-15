/**
 * Restaurant Configuration
 * Centralized configuration for special restaurant IDs
 * Update this file to add/remove restaurants that need special handling
 */

// Hardcoded fallback: restaurants that require stations/multiple menu
export const RESTAURANTS_ID = ['716', '739'];

/**
 * Check if restaurant has multiple menus (shows stations page).
 * Priority: Hardcoded list (716, 739) > API field `multiple_menu` (Yes/No).
 * @param {object|null} restaurant - Restaurant object from API
 * @param {string|number} restaurantId - Restaurant ID (fallback)
 * @returns {boolean}
 */
export const isMultipleMenu = (restaurant, restaurantId) => {
  // 1. Check hardcoded list first (always override for these restaurants)
  const id = restaurantId || restaurant?.id;
  if (id && RESTAURANTS_ID.includes(String(id))) {
    return true;
  }
  // 2. Fallback to API config (multiple_menu: "Yes" or "No")
  if (restaurant?.multiple_menu) {
    return restaurant.multiple_menu === 'Yes';
  }
  return false;
};

/**
 * @deprecated Use isMultipleMenu(restaurant, restaurantId) instead.
 * Kept for backward compatibility during transition.
 */
export const isRestaurantIdValid = (restaurantId) => {
  if (!restaurantId) return false;
  return RESTAURANTS_ID.includes(String(restaurantId));
};
