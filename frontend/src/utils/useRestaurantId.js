// /**
//  * Custom Hook: useRestaurantId
//  * Extracts restaurant ID from URL (path or query parameter)
//  * Supports multiple URL formats:
//  * - /478 (path parameter)
//  * - /restaurant/478 (path parameter)
//  * - /?id=478 (query parameter)
//  * - /?restaurantId=478 (query parameter)
//  */

// import { useParams, useSearchParams } from 'react-router-dom';

// /**
//  * Get restaurant ID from URL
//  * Priority: URL path param > Query param > Environment variable > Default
//  */
// export const useRestaurantId = () => {
//   const params = useParams();
//   const [searchParams] = useSearchParams();

//   // Try to get from path parameter first (e.g., /478 or /restaurant/478)
//   const pathRestaurantId = params.restaurantId || params.id;

//   // Try to get from query parameter (e.g., ?id=478 or ?restaurantId=478)
//   const queryRestaurantId = searchParams.get('id') || searchParams.get('restaurantId');

//   // Priority: path > query > env > default
//   const restaurantId = 
//     pathRestaurantId || 
//     queryRestaurantId 
//     ;

//   return restaurantId;
// };

// export default useRestaurantId;


/**
 * Custom Hook: useRestaurantId
 * Extracts restaurant ID from URL (path, query, or subdomain)
 * Supports multiple URL formats:
 * - /478 (path parameter)
 * - /?id=478 (query parameter)
 * - hyatt.mygenie.online (subdomain)
 */

import { useParams, useSearchParams } from 'react-router-dom';

/**
 * Get subdomain from current hostname
 * @returns {string|null} - Subdomain or null
 */
export const getSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Development - localhost
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    // Support subdomain testing: hyatt.localhost
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }
    return null;
  }
  
  // Production - Extract subdomain from mygenie.online
  const parts = hostname.split('.');
  
  // Just mygenie.online (2 parts) → no subdomain
  if (parts.length === 2) {
    return null;
  }
  
  // hyatt.mygenie.online (3 parts) → subdomain is "hyatt"
  if (parts.length === 3) {
    const subdomain = parts[0];
    
    // Exclude system subdomains
    const systemSubdomains = ['www', 'admin', 'api', 'cdn', 'app'];
    if (systemSubdomains.includes(subdomain)) {
      return null;
    }
    
    // If hostname ends with .mygenie.online, return full hostname
    if (hostname.endsWith('.mygenie.online')) {
      return hostname;  // Return "hyatt.mygenie.online"
    }
    
    // Otherwise, return just subdomain (for other domains)
    return subdomain;
  }
  
  return null;
};

/**
 * Get restaurant identifier (ID or subdomain)
 * Priority: Path > Query > Subdomain > Environment variable
 */
export const useRestaurantId = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // 1. Try path parameter first (e.g., /478)
  const pathRestaurantId = params.restaurantId || params.id;
  
  // 2. Try query parameter (e.g., ?id=478)
  const queryRestaurantId = searchParams.get('id') || searchParams.get('restaurantId');
  
  // 3. Try subdomain (e.g., hyatt.mygenie.online)
  const subdomain = getSubdomain();
  
  // 4. Fallback to environment variable or hardcoded default (18march)
  const envRestaurantId = process.env.REACT_APP_RESTAURANT_ID;
  const defaultRestaurantId = "478"; // 18march - hardcoded for preview
  
  // Priority: path > query > subdomain > env > default
  const restaurantId = pathRestaurantId || queryRestaurantId || subdomain || envRestaurantId || defaultRestaurantId;
  
  // Helper flag for URL generation
  const isSubdomainMode = !!subdomain && !pathRestaurantId && !queryRestaurantId;
  
  return {
    restaurantId,        // Can be ID (478) or subdomain (hyatt)
    isSubdomainMode,     // Boolean: using subdomain routing?
    subdomain,           // Actual subdomain (for display/debugging)
  };
};

export default useRestaurantId;
