/**
 * Restaurant configuration utilities
 * Determines multi-menu status dynamically from menu-master API data
 */

/**
 * Check if a restaurant has multiple menus (stations)
 * Driven by stations data from useStations hook (menu-master API)
 * @param {Array} stations - Array of station objects from useStations
 * @returns {boolean} true if restaurant has station menus
 */
export const isMultipleMenu = (stations) => {
  return Array.isArray(stations) && stations.length > 0;
};
