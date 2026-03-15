/**
 * Custom Hook: useMenuData
 * Specialized hook for fetching menu data
 * Now uses React Query for caching and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getRestaurantDetails, getRestaurantProducts } from '../api/services/restaurantService';
// import { getStations } from '../api/services/stationService';
import { getTableConfig } from '../api/services/tableRoomService';
import { getErrorMessage } from '../api/utils/errorHandler';

/**
 * Hook to fetch menu sections for a specific station
 * Uses React Query for automatic caching and deduplication
 * @param {string} stationId - Station ID
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { menuSections, loading, error, errorMessage, refetch }
 */
export const useMenuSections = (stationId, restaurantId) => {
  // Use provided restaurantId or fallback
  const finalRestaurantId = restaurantId || process.env.REACT_APP_RESTAURANT_ID;

  const {
    data: menuSections,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['menuSections', finalRestaurantId, stationId],
    queryFn: async () => {
      // Debug: Log the parameters
      // console.log('fetchMenuSections called with:', { stationId, finalRestaurantId });

      if (!finalRestaurantId) {
        console.warn('No restaurantId provided, cannot fetch menu sections');
        return [];
      }

      try {
        // Call the new restaurant products API
        const data = await getRestaurantProducts(finalRestaurantId, "0" , stationId);
        
        // Debug: Log the API response
        // console.log('API Response:', data);
        // console.log('Data structure:', {
        //   hasData: !!data,
        //   hasProducts: !!(data && data.products),
        //   productsIsArray: !!(data && data.products && Array.isArray(data.products)),
        //   productsLength: data?.products?.length,
        //   dataKeys: data ? Object.keys(data) : [],
        // });
        
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
                // console.log('item.image:', item.image);
                // If image is already a full URL, use it; otherwise construct it
                if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
                  imageUrl = item.image;
                } else {
                  // Construct image URL (adjust base URL as needed)
                  const imageBaseUrl = process.env.REACT_APP_IMAGE_BASE_URL || 'https://manage.mygenie.online';
                  imageUrl = `${imageBaseUrl}/storage/${item.image}`;
                }
              }
              
              return {
                id: String(item.id),
                name: item.name || '',
                description: item.description || '',
                price: item.price || 0,
                image: imageUrl,
                isVeg: isVeg, // true = veg, false = non-veg
                isEgg: isEgg, // true = egg, false = not egg
                allergens: item.allergens || [], // Empty array for now, can be populated from attributes if needed
                variations: item.variations || [], // Include variations array
                add_ons: item.add_ons || [], // Include add_ons array
                kcal: item.kcal || '', // Add kcal field
                portion: item.portion_size || '', // Add portion field
                station: item.station_name || '', // Add station field
                live_web: item.live_web || null, // "Y" or "N" or null
                web_available_time_starts: item.web_available_time_starts || null, // "HH:MM:SS" or null
                web_available_time_ends: item.web_available_time_ends || null, // "HH:MM:SS" or null
                tax: item.tax || 0,                    
                tax_type: item.tax_type || 'GST', // "GST" | "VAT"
              };
            });

            return {
              categoryId: String(product.category_id || ''),
              sectionName: product.category_name || '',
              sectionImage: product.category_image || '',
              items: transformedItems,
            };
          });

          // Debug: Log transformed sections
          // console.log('Transformed Sections:', transformedSections);
          // console.log('Sections count:', transformedSections.length);
          // console.log('Total items:', transformedSections.reduce((sum, section) => sum + (section.items?.length || 0), 0));

          return transformedSections;
        } else {
          console.warn('API response structure unexpected:', data);
          return [];
        }
      } catch (err) {
        // Fallback to local JSON if API fails (for development)
        if (process.env.NODE_ENV === 'development') {
          try {
            const menuItemsData = require('../data/menuItems.json');
            return menuItemsData[stationId] || [];
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw err; // Re-throw original error if fallback fails
          }
        }
        throw err;
      }
    },
    enabled: !!finalRestaurantId, // Only fetch if restaurantId exists
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (menu items change more frequently)
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 3,
  });

  return {
    menuSections: menuSections || [],
    loading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch,
  };
};

/**
 * Hook to fetch all stations
 * Uses React Query for automatic caching and deduplication
 * @param {string} restaurantId - Restaurant ID (required)
 * @returns {Object} { stations, loading, error, errorMessage, refetch }
 */
export const useStations = (restaurantId) => {
  // Use provided restaurantId or fallback
  const finalRestaurantId = restaurantId;

  const {
    data: stations,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stations', finalRestaurantId],
    queryFn: async () => {
      try {
        // const data = await getStations(finalRestaurantId);
        // return data || [];
        const stationsData = require('../data/stations.json');
        return stationsData || [];
      } catch (err) {
        // Fallback to local JSON if API fails (for development)
        if (process.env.NODE_ENV === 'development') {
          try {
            const stationsData = require('../data/stations.json');
            return stationsData || [];
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw err; // Re-throw original error if fallback fails
          }
        }
        throw err;
      }
    },
    enabled: !!finalRestaurantId, // Only fetch if restaurantId exists
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
