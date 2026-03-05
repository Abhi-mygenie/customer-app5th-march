import React from 'react';
import { CartProvider } from '../../context/CartContext';
import { useRestaurantId } from '../../utils/useRestaurantId';

/**
 * CartWrapper component that provides CartContext to children
 * Automatically gets restaurantId and provides it to CartProvider
 */
const CartWrapper = ({ children }) => {
  const { restaurantId } = useRestaurantId();
  //  Never pass a hostname (containing dot) as restaurantId
  const safeRestaurantId = restaurantId && !restaurantId.includes('.') 
    ? restaurantId 
    : null;
  
  return (
    <CartProvider restaurantId={safeRestaurantId || 'default'}>
      {children}
    </CartProvider>
  );
};

export default CartWrapper;

// import React, { useMemo } from 'react';
// import { useLocation } from 'react-router-dom';
// import { CartProvider } from '../../context/CartContext';
// import { getSubdomain } from '../../utils/useRestaurantId';

// // Hostname to Restaurant ID mapping
// const HOSTNAME_TO_RESTAURANT_ID = {
//   '18march.mygenie.online': '478',
//   'kalabahia.mygenie.online': '1',
//   'hyatt.mygenie.online': '716'
// };

// /**
//  * Convert hostname to restaurant ID if mapped
//  */
// const getRestaurantIdFromHostname = (hostname) => {
//   if (!hostname) return null;
  
//   if (HOSTNAME_TO_RESTAURANT_ID[hostname]) {
//     return HOSTNAME_TO_RESTAURANT_ID[hostname];
//   }
  
//   if (/^\d+$/.test(hostname)) {
//     return hostname;
//   }
  
//   return null;
// };

// /**
//  * CartWrapper component that provides CartContext to children
//  * Automatically gets restaurantId and provides it to CartProvider
//  */
// const CartWrapper = ({ children }) => {
//   const location = useLocation();
  
//   // Extract restaurantId from pathname (works outside Routes)
//   const restaurantId = useMemo(() => {
//     // 1. Try path parameter first (e.g., /478/menu)
//     const pathMatch = location.pathname.match(/^\/([^/]+)/);
//     if (pathMatch) {
//       const firstSegment = pathMatch[1];
//       const excludedPaths = ['menu', 'stations', 'about', 'review-order', 'order-success'];
//       if (!excludedPaths.includes(firstSegment)) {
//         // If it's a valid ID, return it
//         const mappedId = getRestaurantIdFromHostname(firstSegment);
//         if (mappedId) return mappedId;
//         // If it's numeric, return as is
//         if (/^\d+$/.test(firstSegment)) {
//           return firstSegment;
//         }
//       }
//     }
    
//     // 2. Try query parameter
//     const searchParams = new URLSearchParams(location.search);
//     const queryId = searchParams.get('id') || searchParams.get('restaurantId');
//     if (queryId) {
//       return getRestaurantIdFromHostname(queryId) || queryId;
//     }
    
//     // 3. Try subdomain/hostname
//     const subdomain = getSubdomain();
//     if (subdomain) {
//       // Convert hostname to restaurant ID
//       return getRestaurantIdFromHostname(subdomain) || subdomain;
//     }
    
//     // 4. Fallback to environment variable
//     return process.env.REACT_APP_RESTAURANT_ID || null;
//   }, [location.pathname, location.search]);
  
//   return (
//     <CartProvider restaurantId={restaurantId || 'default'}>
//       {children}
//     </CartProvider>
//   );
// };

// export default CartWrapper;