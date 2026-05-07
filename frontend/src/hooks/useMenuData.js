/**
 * Custom Hook: useMenuData
 * Specialized hook for fetching menu data
 * Now uses React Query for caching and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getRestaurantDetails, getRestaurantProducts, getMenuMaster } from '../api/services/restaurantService';
import logger from '../utils/logger';
// import { getStations } from '../api/services/stationService';
import { getTableConfig } from '../api/services/tableRoomService';
import { getErrorMessage } from '../api/utils/errorHandler';

/**
 * Shared menu-sections fetch + transform.
 * Used by both `useMenuSections` (the hook) AND external prefetch callers
 * (e.g., LandingPage idle prefetch, DiningMenu hover prefetch) so that
 * everyone hits the SAME React Query cache slot — no key drift, no
 * duplicate fetches.
 *
 * Behavior is byte-identical to the prior inline queryFn.
 */
const fetchMenuSections = async (finalRestaurantId, stationId) => {
  if (!finalRestaurantId) {
    logger.menu('No restaurantId provided, cannot fetch menu sections');
    return [];
  }

  try {
    // Call the new restaurant products API
    const data = await getRestaurantProducts(finalRestaurantId, "0", stationId);

    // Transform API response to match expected format
    // Handle both direct products array and nested structure
    const products = data?.products || (Array.isArray(data) ? data : []);

    if (products && Array.isArray(products) && products.length > 0) {
      const transformedSections = products.map((product) => {
        // Transform items to match expected format
        const transformedItems = (product.items || []).map((item) => {
          // Map veg field: 1 = veg, 0 = non-veg
          // Map egg field: 1 = egg, 0 = not egg
          const isVeg = item.veg === 1;
          const isEgg = item.veg === 2;

          // Build image URL if image exists
          let imageUrl = null;
          if (item.image && item.image.trim() !== '') {
            // If image is already a full URL, use it; otherwise construct it
            if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
              imageUrl = item.image;
            } else {
              // DFA-001 fix: No fallback — fail visibly if env var missing
              const imageBaseUrl = process.env.REACT_APP_IMAGE_BASE_URL;
              if (!imageBaseUrl) {
                logger.error('menu', 'REACT_APP_IMAGE_BASE_URL is not set. Images will not load.');
              }
              imageUrl = `${imageBaseUrl}/storage/${item.image}`;
            }
          }

          return {
            id: String(item.id),
            name: item.name || '',
            description: item.description || '',
            price: item.price || 0,
            image: imageUrl,
            isVeg: isVeg,
            isEgg: isEgg,
            allergens: item.allergens || [],
            variations: item.variations || [],
            add_ons: item.add_ons || [],
            kcal: item.kcal || '',
            portion: item.portion_size || '',
            station: item.station_name || '',
            live_web: item.live_web || null,
            web_available_time_starts: item.web_available_time_starts || null,
            web_available_time_ends: item.web_available_time_ends || null,
            tax: item.tax || 0,
            tax_type: item.tax_type || 'GST',
          };
        });

        return {
          categoryId: String(product.category_id || ''),
          sectionName: product.category_name || '',
          sectionImage: product.category_image || '',
          items: transformedItems,
        };
      });

      return transformedSections;
    } else {
      logger.menu('API response structure unexpected:', data);
      return [];
    }
  } catch (err) {
    // Fallback to local JSON if API fails (for development)
    if (process.env.NODE_ENV === 'development') {
      try {
        const menuItemsData = require('../data/menuItems.json');
        return menuItemsData[stationId] || [];
      } catch (fallbackError) {
        logger.error('menu', 'Fallback also failed:', fallbackError);
        throw err;
      }
    }
    throw err;
  }
};

/**
 * Shared React Query options factory for menu sections.
 * Use from any component to prefetch with the EXACT same cache slot
 * that `useMenuSections` consumes — guarantees no duplicate fetch and
 * no key drift.
 *
 * Query key: ['menuSections', restaurantId, stationId]
 *
 * @param {string} restaurantId - Restaurant ID
 * @param {string|undefined} stationId - Station ID (or undefined for default menu)
 * @returns {Object} React Query options
 */
export const buildMenuSectionsQueryOptions = (restaurantId, stationId) => {
  const finalRestaurantId = restaurantId || process.env.REACT_APP_RESTAURANT_ID;
  return {
    queryKey: ['menuSections', finalRestaurantId, stationId],
    queryFn: () => fetchMenuSections(finalRestaurantId, stationId),
    enabled: !!finalRestaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes (unchanged)
    gcTime: 15 * 60 * 1000,   // 15 minutes (unchanged)
    retry: 3,
  };
};

/**
 * Hook to fetch menu sections for a specific station
 * Uses React Query for automatic caching and deduplication
 * @param {string} stationId - Station ID
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { menuSections, loading, error, errorMessage, refetch }
 */
export const useMenuSections = (stationId, restaurantId) => {
  const {
    data: menuSections,
    isLoading: loading,
    error,
    refetch,
  } = useQuery(buildMenuSectionsQueryOptions(restaurantId, stationId));

  return {
    menuSections: menuSections || [],
    loading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch,
  };
};

// Standard menus that every restaurant has — everything else is a "station"
const STANDARD_MENUS = ['Normal', 'Party', 'Premium', 'Aggregator'];

/**
 * Convert 24h time string "HH:mm:ss" or "HH:mm" to human-readable "h AM/PM"
 * e.g. "07:00:00" → "7 AM", "23:00:00" → "11 PM", "00:00:00" → "12 AM"
 */
const formatTimeTo12h = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return null;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
};

/**
 * Hook to fetch stations (non-standard menus) via menu-master API
 * Filters out Normal/Party/Premium to derive station menus dynamically
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { stations, loading, error, errorMessage, refetch }
 */
export const useStations = (restaurantId) => {
  const finalRestaurantId = restaurantId;

  const {
    data: stations,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stations', finalRestaurantId],
    queryFn: async () => {
      const data = await getMenuMaster(finalRestaurantId);
      const menus = data?.menus || [];
      // Filter out standard menus to get station-specific menus
      const stationMenus = menus.filter(m => !STANDARD_MENUS.includes(m.menu_name));
      // Map to expected station format using real API data
      return stationMenus.map(menu => {
        const openFormatted = formatTimeTo12h(menu.opening_time);
        const closeFormatted = formatTimeTo12h(menu.closing_time);
        const isAllDay = menu.opening_time === '00:00:00' && 
          (menu.closing_time === '23:59:59' || menu.closing_time === '23:59:00');
        
        let timing = null;
        if (openFormatted && closeFormatted && !isAllDay) {
          timing = `(${openFormatted} - ${closeFormatted})`;
        }

        return {
          id: menu.menu_name,
          name: menu.menu_name,
          menuId: menu.id,
          image: menu.image || null,
          description: menu.description || null,
          timing,
          openingTime: menu.opening_time || null,
          closingTime: menu.closing_time || null,
        };
      });
    },
    enabled: !!finalRestaurantId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });

  return {
    stations: stations || [],
    loading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch,
  };
};

/**
 * Hook to fetch restaurant details
 * Uses React Query for automatic caching and deduplication
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { restaurant, loading, error, errorMessage, refetch }
 */
// export const useRestaurantDetails = (restaurantId) => {
//   // Use provided restaurantId or fallback
//   const finalRestaurantId = restaurantId;

//   const {
//     data: restaurant,
//     isLoading: loading,
//     isFetching,
//     error,
//     refetch,
//   } = useQuery({
//     queryKey: ['restaurant', finalRestaurantId],
//     queryFn: () => getRestaurantDetails(finalRestaurantId),
//     enabled: !!finalRestaurantId, // Only fetch if restaurantId exists
//     staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
//     gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
//     retry: 3,
//   });

//   return {
//     restaurant: restaurant || null,
//     loading,
//     isFetching,
//     error,
//     errorMessage: error ? getErrorMessage(error) : null,
//     refetch,
//   };
// };

/**
 * Hook to fetch restaurant details
 * Works with both restaurant ID and subdomain
 * Automatically normalizes cache to prevent duplicates
 */
export const useRestaurantDetails = (identifier) => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant', identifier],
    queryFn: async () => {
      if (!identifier) {
        throw new Error('No identifier provided');
      }
      return await getRestaurantDetails(identifier);
    },
    enabled: !!identifier,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes (renamed to gcTime in newer versions)
  });

  //  NEW: Normalize cache after successful fetch
  useEffect(() => {
    if (data?.id) {
      const restaurantId = data.id.toString();
      const subdomain = data.subdomain;
      
      // Cache by restaurant ID (primary key)
      queryClient.setQueryData(['restaurant', restaurantId], data);
      
      // Also cache by subdomain (if exists)
      if (subdomain) {
        queryClient.setQueryData(['restaurant', subdomain], data);
      }
      
      // Optional: Debug log (remove in production)
      // console.log('✅ Restaurant cached:', {
      //   id: restaurantId,
      //   subdomain: subdomain || 'none',
      //   name: data.name,
      // });
    }
  }, [data, queryClient]);

  return {
    restaurant: data,
    loading: isLoading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch,
  };
};

/**
 * Hook to fetch table and room configuration
 * Uses React Query for automatic caching and deduplication
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { rooms, tables, loading, error, errorMessage, refetch }
 */
export const useTableConfig = (restaurantId) => {

  const {
    data: tableConfig,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tableConfig', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return { rooms: [], tables: [] };
      }
      return await getTableConfig(restaurantId);
    },
    enabled: !!restaurantId, // Fetch if restaurantId exists (not hardcoded to 478)
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3,
  });

  return {
    rooms: tableConfig?.rooms || [],
    tables: tableConfig?.tables || [],
    loading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch,
  };
};

/**
 * Hook to fetch dietary tags for a restaurant
 * @param {string} restaurantId - Restaurant ID
 * @returns {Object} { dietaryTagsMapping, availableTags, loading }
 */
export const useDietaryTags = (restaurantId) => {
  const API_URL = process.env.REACT_APP_BACKEND_URL || '';
  
  // Fetch available tags
  const { data: availableTagsData } = useQuery({
    queryKey: ['availableDietaryTags'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/dietary-tags/available`);
      if (!response.ok) throw new Error('Failed to fetch available tags');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour - tags rarely change
  });

  // Fetch restaurant-specific mappings
  const { data: mappingData, isLoading: loading } = useQuery({
    queryKey: ['dietaryTagsMapping', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return { mappings: {} };
      const response = await fetch(`${API_URL}/api/dietary-tags/${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch dietary tags mapping');
      return response.json();
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const allTags = availableTagsData?.tags || [];
  const mappings = mappingData?.mappings || {};

  // Return allTags - filtering will be done in MenuItems.jsx based on current menu items
  return {
    dietaryTagsMapping: mappings,
    allTags,
    loading,
  };
};


const useMenuData = {
  useMenuSections,
  useStations,
  useRestaurantDetails,
  useTableConfig,
  useDietaryTags,
};

export default useMenuData;
