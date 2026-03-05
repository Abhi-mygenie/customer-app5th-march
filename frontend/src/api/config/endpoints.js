/**
 * API Endpoints Configuration
 * All API endpoints are defined here for easy maintenance
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://preprod.mygenie.online/api/v1';

export const ENDPOINTS = {
  // Auth endpoints
  LOGIN: () => `${API_BASE_URL}/auth/login`,
  
  // Order endpoints
  PLACE_ORDER: () => `${API_BASE_URL}/customer/order/place`,
  PLACE_ORDER_AUTOPAID: () => `${API_BASE_URL}/customer/order/autopaid-place-prepaid-order`,
  
  // Restaurant endpoints
  // RESTAURANT_DETAILS: (restaurantId) => `${API_BASE_URL}/restaurants/details/${restaurantId}`,
  RESTAURANT_DETAILS: () => `${API_BASE_URL}/web/restaurant-info`,

  
  // Menu endpoints (to be updated based on actual API structure)
  MENU_ITEMS: (restaurantId) => `${API_BASE_URL}/restaurants/${restaurantId}/menu`,
  MENU_SECTIONS: (restaurantId) => `${API_BASE_URL}/restaurants/${restaurantId}/menu/sections`,
  
  // Station endpoints
  STATIONS: (restaurantId) => `${API_BASE_URL}/restaurants/${restaurantId}/stations`,
  STATION_DETAILS: (restaurantId, stationId) => `${API_BASE_URL}/restaurants/${restaurantId}/stations/${stationId}`,
  
  // Category endpoints
  CATEGORIES: (restaurantId, stationId) => `${API_BASE_URL}/restaurants/${restaurantId}/stations/${stationId}/categories`,
  
  // Restaurant products endpoint (POST)
  RESTAURANT_PRODUCTS: () => `${API_BASE_URL}/web/restaurant-product`,

  // Restaurant Table/Room endpoints
  RESTAURANT_TABLE_ROOMS: () => `${API_BASE_URL}/web/table-config`,
};

export default ENDPOINTS;
