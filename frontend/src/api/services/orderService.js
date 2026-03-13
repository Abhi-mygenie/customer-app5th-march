// /**
//  * Order Service
//  * Handles all order-related API calls
//  */

// import apiClient from '../config/axios';
// import { ENDPOINTS } from '../config/endpoints';

// /**
//  * Transform variations to API format
//  * @param {Object} cartItem - Cart item with variations
//  * @returns {Array} Formatted variations array
//  */
// const transformVariations = (cartItem) => {
//   if (!cartItem.variations || cartItem.variations.length === 0) {
//     return [];
//   }

//   // Group variations by their variation name
//   const variationGroups = {};
  
//   // Get original variation structure from item
//   if (cartItem.item.variations && cartItem.item.variations.length > 0) {
//     cartItem.item.variations.forEach((originalVariation) => {
//       const variationName = originalVariation.name || 'CHOICE OF';
      
//       // Get selected values for this variation
//       const selectedValues = cartItem.variations.filter(v => {
//         // Match selected variation to original variation by checking if it exists in original values
//         return originalVariation.values?.some(origVal => origVal.label === v.label);
//       });

//       if (selectedValues.length > 0) {
//         if (!variationGroups[variationName]) {
//           variationGroups[variationName] = [];
//         }
//         selectedValues.forEach(selected => {
//           variationGroups[variationName].push(selected.label);
//         });
//       }
//     });
//   } else {
//     // Fallback: if no original variation structure, group all selected variations
//     const allLabels = cartItem.variations.map(v => v.label);
//     if (allLabels.length > 0) {
//       variationGroups['CHOICE OF'] = allLabels;
//     }
//   }

//   // Format as API expects: [{ name: "VARRIENT", values: { label: ["60ML"] } }]
//   return Object.entries(variationGroups).map(([name, labels]) => ({
//     name: name,
//     values: {
//       label: labels
//     }
//   }));
// };

// /**
//  * Transform add-ons to API format
//  * @param {Object} cartItem - Cart item with add-ons
//  * @returns {Object} Formatted add-ons with ids, add_ons, and qtys arrays
//  */
// const transformAddOns = (cartItem) => {
//   if (!cartItem.add_ons || cartItem.add_ons.length === 0) {
//     return {
//       add_on_ids: [],
//       add_ons: [],
//       add_on_qtys: []
//     };
//   }

//   const add_on_ids = [];
//   const add_ons = [];
//   const add_on_qtys = [];

//   cartItem.add_ons.forEach(addon => {
//     if (addon.quantity > 0) {
//       add_on_ids.push(addon.id);
//       add_ons.push({
//         id: addon.id,
//         name: addon.name,
//         price: parseFloat(addon.price) || 0
//       });
//       add_on_qtys.push(addon.quantity);
//     }
//   });

//   return { add_on_ids, add_ons, add_on_qtys };
// };

// /**
//  * Transform cart items to API format
//  * @param {Array} cartItems - Array of cart items
//  * @returns {Array} Formatted cart array for API
//  */
// const transformCartItems = (cartItems) => {
//   return cartItems.map(cartItem => {
//     const { add_on_ids, add_ons, add_on_qtys } = transformAddOns(cartItem);
//     const variations = transformVariations(cartItem);
    
//     // Calculate item price (base + variations + addons)
//     const basePrice = parseFloat(cartItem.item.price) || 0;
//     let variationsTotal = 0;
//     if (cartItem.variations && cartItem.variations.length > 0) {
//       cartItem.variations.forEach((variation) => {
//         variationsTotal += parseFloat(variation.optionPrice) || 0;
//       });
//     }
//     let addonsTotal = 0;
//     if (cartItem.add_ons && cartItem.add_ons.length > 0) {
//       cartItem.add_ons.forEach((addon) => {
//         addonsTotal += (parseFloat(addon.price) || 0) * (addon.quantity || 0);
//       });
//     }
//     const itemPrice = basePrice + variationsTotal + addonsTotal;

//     return {
//       food_id: parseInt(cartItem.itemId) || 0,
//       food_level_notes: cartItem.cookingInstructions || '',
//       station: cartItem.item.station || 'OTHER',
//       item_campaign_id: null,
//       price: itemPrice.toFixed(2),
//       variant: '',
//       variations: variations,
//       quantity: cartItem.quantity,
//       add_on_ids: add_on_ids,
//       add_ons: add_ons,
//       add_on_qtys: add_on_qtys
//     };
//   });
// };

// /**
//  * Extract phone number without country code
//  * @param {string} phoneNumber - Full phone number with country code
//  * @returns {string} Phone number without country code
//  */
// const extractPhoneNumber = (phoneNumber) => {
//   if (!phoneNumber || phoneNumber.trim() === '') {
//     return '';
//   }
  
//   let custPhone = phoneNumber;
//   if (phoneNumber.startsWith('+91')) {
//     custPhone = phoneNumber.replace('+91', '');
//   } else if (phoneNumber.startsWith('+')) {
//     // Remove any country code
//     custPhone = phoneNumber.replace(/^\+\d+/, '');
//   }
//   return custPhone;
// };

// /**
//  * Get dial code from phone number
//  * @param {string} phoneNumber - Full phone number
//  * @returns {string} Dial code (default: '+91')
//  */
// const getDialCode = (phoneNumber) => {
//   if (!phoneNumber || phoneNumber.trim() === '') {
//     return '+91';
//   }
  
//   if (phoneNumber.startsWith('+91')) {
//     return '+91';
//   }
//   return phoneNumber.split(' ')[0] || '+91';
// };

// /**
//  * Place order
//  * @param {Object} orderData - Order data object
//  * @param {Array} orderData.cartItems - Cart items
//  * @param {string} orderData.customerName - Customer name
//  * @param {string} orderData.customerPhone - Customer phone (optional)
//  * @param {string} orderData.tableNumber - Table number
//  * @param {string} orderData.specialInstructions - Special instructions
//  * @param {string} orderData.couponCode - Coupon code
//  * @param {number} orderData.restaurantId - Restaurant ID
//  * @param {number} orderData.subtotal - Subtotal amount
//  * @param {number} orderData.totalToPay - Total amount to pay
//  * @param {string} orderData.token - Authentication token
//  * @returns {Promise} Order response data
//  */
// export const placeOrder = async (orderData) => {
//   try {
//     const {
//       cartItems,
//       customerName,
//       customerPhone,
//       tableNumber,
//       specialInstructions,
//       couponCode,
//       restaurantId,
//       subtotal,
//       totalToPay,
//       token
//     } = orderData;

//     // Transform cart items to API format
//     const cart = transformCartItems(cartItems);

//     // Extract phone number without country code
//     const custPhone = extractPhoneNumber(customerPhone || '');
//     const dialCode = getDialCode(customerPhone || '');

//     // Prepare API payload
//     const orderPayload = {
//       data: {
//         cart: cart,
//         coupon_discount_amount: 0,
//         coupon_discount_title: null,
//         order_amount: parseFloat(totalToPay.toFixed(2)),
//         dial_code: dialCode,
//         otp: '',
//         address_id: '',
//         order_type: 'dinein',
//         payment_method: 'cash_on_delivery',
//         payment_id: '',
//         fcm_token: '',
//         order_note: specialInstructions || '',
//         coupon_code: couponCode !== '0' ? couponCode : '',
//         restaurant_id: parseInt(restaurantId) || 0,
//         distance: 1,
//         delivery_charge: '0',
//         schedule_at: null,
//         discount_amount: 0,
//         tax_amount: 0, // Will be calculated by backend
//         order_sub_total_amount: parseFloat(subtotal.toFixed(2)),
//         address: '',
//         latitude: '',
//         longitude: '',
//         pincode: '',
//         air_bnb_id: '',
//         payment_type: 'postpaid',
//         contact_person_name: '',
//         contact_person_number: '',
//         address_type: '',
//         road: '',
//         house: '',
//         table_id: tableNumber,
//         floor: '',
//         dm_tips: '',
//         subscription_order: '0',
//         subscription_type: 'daily',
//         subscription_days: '[]',
//         subscription_quantity: '1',
//         subscription_start_at: '',
//         subscription_end_at: '',
//         cust_phone: custPhone || '',
//         cust_name: customerName || '', 
//         cust_email: '',
//         estimatedTime: '',
//         discount_type: ''
//       }
//     };

//     // console.log('[OrderService] Placing order...');
//     // console.log('[OrderService] Order payload:', JSON.stringify(orderPayload, null, 2));

//     const response = await apiClient.post(ENDPOINTS.PLACE_ORDER(), orderPayload, {
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json; charset=UTF-8',
//         'zoneId': '',
//         'X-localization': 'en',
//         'latitude': '',
//         'longitude': ''
//       }
//     });

//     // console.log('[OrderService] Order placed successfully:', response.data);
//     return response.data;
//   } catch (error) {
//     // console.error('[OrderService] Failed to place order:', error);
//     throw error;
//   }
// };

// // Export service object
// const orderService = {
//   placeOrder,
// };

// export default orderService;

/**
 * Order Service
 * Handles all order-related API calls
 */

/**
 * Order Service
 * Handles all order-related API calls
 */

import apiClient from '../config/axios';
import { ENDPOINTS } from '../config/endpoints';

/**
 * Transform variations to API format
 * @param {Object} cartItem - Cart item with variations
 * @returns {Array} Formatted variations array
 */
const transformVariations = (cartItem) => {
  if (!cartItem.variations || cartItem.variations.length === 0) {
    return [];
  }

  // Group variations by their variation name
  const variationGroups = {};

  // Get original variation structure from item
  if (cartItem.item.variations && cartItem.item.variations.length > 0) {
    cartItem.item.variations.forEach((originalVariation) => {
      const variationName = originalVariation.name || 'CHOICE OF';

      // Get selected values for this variation
      const selectedValues = cartItem.variations.filter(v => {
        // Match selected variation to original variation by checking if it exists in original values
        return originalVariation.values?.some(origVal => origVal.label === v.label);
      });

      if (selectedValues.length > 0) {
        if (!variationGroups[variationName]) {
          variationGroups[variationName] = [];
        }
        selectedValues.forEach(selected => {
          variationGroups[variationName].push(selected.label);
        });
      }
    });
  } else {
    // Fallback: if no original variation structure, group all selected variations
    const allLabels = cartItem.variations.map(v => v.label);
    if (allLabels.length > 0) {
      variationGroups['CHOICE OF'] = allLabels;
    }
  }

  // Format as API expects: [{ name: "VARRIENT", values: { label: ["60ML"] } }]
  return Object.entries(variationGroups).map(([name, labels]) => ({
    name: name,
    values: { label: labels }
  }));
};

/**
 * Transform add-ons to API format
 * @param {Object} cartItem - Cart item with add-ons
 * @returns {Object} Formatted add-ons with ids, add_ons, and qtys arrays
 */
const transformAddOns = (cartItem) => {
  if (!cartItem.add_ons || cartItem.add_ons.length === 0) {
    return {
      add_on_ids: [],
      add_ons: [],
      add_on_qtys: []
    };
  }

  const add_on_ids = [];
  const add_ons = [];
  const add_on_qtys = [];

  cartItem.add_ons.forEach(addon => {
    if (addon.quantity > 0) {
      add_on_ids.push(addon.id);
      add_ons.push({
        id: addon.id,
        name: addon.name,
        price: parseFloat(addon.price) || 0
      });
      add_on_qtys.push(addon.quantity);
    }
  });

  return { add_on_ids, add_ons, add_on_qtys };
};

/**
 * Calculate item price (base + variations + addons)
 * Shared by both normal and 716 cart transformers
 * @param {Object} cartItem - Cart item
 * @returns {number} Total item price
 */
const calculateItemPrice = (cartItem) => {
  const basePrice = parseFloat(cartItem.item.price) || 0;

  let variationsTotal = 0;
  if (cartItem.variations && cartItem.variations.length > 0) {
    cartItem.variations.forEach((variation) => {
      variationsTotal += parseFloat(variation.optionPrice) || 0;
    });
  }

  let addonsTotal = 0;
  if (cartItem.add_ons && cartItem.add_ons.length > 0) {
    cartItem.add_ons.forEach((addon) => {
      addonsTotal += (parseFloat(addon.price) || 0) * (addon.quantity || 0);
    });
  }

  return basePrice + variationsTotal + addonsTotal;
};

/**
 * Calculate variations total price only
 * Used for total_variation_price field in 716 API
 * @param {Object} cartItem
 * @returns {number} Variations total price
 */
const calculateVariationsTotal = (cartItem) => {
  if (!cartItem.variations || cartItem.variations.length === 0) return 0;
  return cartItem.variations.reduce(
    (sum, v) => sum + (parseFloat(v.optionPrice) || 0), 0
  );
};

/**
 * Calculate add-ons total price only
 * Used for total_add_on_price field in 716 API
 * @param {Object} cartItem
 * @returns {number} Add-ons total price
 */
const calculateAddOnsTotal = (cartItem) => {
  if (!cartItem.add_ons || cartItem.add_ons.length === 0) return 0;
  return cartItem.add_ons.reduce(
    (sum, a) => sum + ((parseFloat(a.price) || 0) * (a.quantity || 0)), 0
  );
};

/**
 * Transform cart items — Normal API format
 * @param {Array} cartItems - Array of cart items
 * @returns {Array} Formatted cart array for normal API
 */
const transformCartItems = (cartItems) => {
  return cartItems.map(cartItem => {
    const { add_on_ids, add_ons, add_on_qtys } = transformAddOns(cartItem);
    const variations = transformVariations(cartItem);
    const itemPrice = calculateItemPrice(cartItem);

    return {
      food_id: parseInt(cartItem.itemId) || 0,
      food_level_notes: cartItem.cookingInstructions || '',
      station: cartItem.item.station || 'OTHER',
      item_campaign_id: null,
      price: itemPrice.toFixed(2),
      variant: '',
      variations: variations,
      quantity: cartItem.quantity,
      add_on_ids: add_on_ids,
      add_ons: add_ons,
      add_on_qtys: add_on_qtys
    };
  });
};

/**
 * Transform cart items — 716 API format
 * Same as normal but includes tax + price breakdown fields per item
 * Tax is calculated from item.tax (percentage) and item.tax_type (GST | VAT)
 * @param {Array} cartItems - Array of cart items
 * @returns {Array} Formatted cart array for 716 API
 */
const transformCartItemsFor716 = (cartItems) => {
  return cartItems.map(cartItem => {
    const { add_on_ids, add_ons, add_on_qtys } = transformAddOns(cartItem);
    const variations      = transformVariations(cartItem);
    const itemPrice       = calculateItemPrice(cartItem);
    const variationsTotal = calculateVariationsTotal(cartItem);    
    const addOnsTotal     = calculateAddOnsTotal(cartItem);            

    // ─── Tax Calculation per item ─────────────────────────────────
    const taxPercent   = parseFloat(cartItem.item.tax) || 0;
    const taxType      = cartItem.item.tax_type || 'GST';          // "GST" | "VAT"
    const taxAmountPerUnit = parseFloat(((itemPrice * taxPercent) / 100).toFixed(2));
    const taxAmount = taxAmountPerUnit * cartItem.quantity;        // Multiply by quantity to get total tax for this item
    const gstTaxAmount = taxType === 'GST' ? taxAmount : 0;        
    const vatTaxAmount = taxType === 'VAT' ? taxAmount : 0;        
    // ─────────────────────────────────────────────────────────────

    return {
      food_id: parseInt(cartItem.itemId) || 0,
      food_level_notes: cartItem.cookingInstructions || '',
      station: cartItem.item.station || 'OTHER',
      item_campaign_id: null,
      price: itemPrice.toFixed(2),
      variant: '',
      variations: variations,
      quantity: cartItem.quantity,
      add_on_ids: add_on_ids,
      add_ons: add_ons,
      add_on_qtys: add_on_qtys,
      total_variation_price: parseFloat(variationsTotal * cartItem.quantity),
      total_add_on_price: parseFloat(addOnsTotal * cartItem.quantity),        
      gst_tax_amount: gstTaxAmount,                                   
      vat_tax_amount: vatTaxAmount,                                   
      tax_amount: taxAmount,
      discount_on_food: 0                                             
    };
  });
};

/**
 * Extract phone number without country code
 * @param {string} phoneNumber - Full phone number with country code
 * @returns {string} Phone number without country code
 */
const extractPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return '';
  }

  let custPhone = phoneNumber;
  if (phoneNumber.startsWith('+91')) {
    custPhone = phoneNumber.replace('+91', '');
  } else if (phoneNumber.startsWith('+')) {
    custPhone = phoneNumber.replace(/^\+\d+/, '');
  }
  return custPhone;
};

/**
 * Get dial code from phone number
 * @param {string} phoneNumber - Full phone number
 * @returns {string} Dial code (default: '+91')
 */
const getDialCode = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return '+91';
  }

  if (phoneNumber.startsWith('+91')) {
    return '+91';
  }
  return phoneNumber.split(' ')[0] || '+91';
};

/**
 * Build payload for normal restaurants
 * @param {Object} orderData - Order data
 * @returns {Object} API payload wrapped in { data: {} }
 */
const buildNormalPayload = (orderData) => {
  const {
    cartItems,
    customerName,
    customerPhone,
    tableNumber,
    specialInstructions,
    couponCode,
    restaurantId,
    subtotal,
    totalToPay,
    orderType,
    pointsRedeemed = 0,
    pointsDiscount = 0,
  } = orderData;

  const cart      = transformCartItems(cartItems);
  const custPhone = extractPhoneNumber(customerPhone || '');
  const dialCode  = getDialCode(customerPhone || '');
  // console.log('orderType', orderType);

  return {
    data: {
      cart,
      coupon_discount_amount: 0,
      coupon_discount_title: null,
      order_amount: parseFloat(totalToPay.toFixed(2)),
      dial_code: dialCode,
      otp: '',
      address_id: '',
      order_type:  (orderType === 'takeaway' || orderType === 'take_away') ? 'take_away' : (orderType === 'delivery' || orderType === 'delivery_order') ? 'delivery' : 'dinein',
      payment_method: 'cash_on_delivery',
      payment_id: '',
      fcm_token: '',
      order_note: specialInstructions || '',
      coupon_code: couponCode !== '0' ? couponCode : '',
      restaurant_id: parseInt(restaurantId) || 0,
      distance: 1,
      delivery_charge: '0',
      schedule_at: null,
      discount_amount: pointsDiscount,
      tax_amount: 0,
      order_sub_total_amount: parseFloat(subtotal.toFixed(2)),
      address: '',
      latitude: '',
      longitude: '',
      pincode: '',
      air_bnb_id: '',
      payment_type: 'postpaid',
      contact_person_name: '',
      contact_person_number: '',
      address_type: '',
      road: '',
      house: '',
      table_id: tableNumber || '',
      floor: '',
      dm_tips: '',
      subscription_order: '0',
      subscription_type: 'daily',
      subscription_days: '[]',
      subscription_quantity: '1',
      subscription_start_at: '',
      subscription_end_at: '',
      cust_phone: custPhone || '',
      cust_name: customerName || '',
      cust_email: '',
      estimatedTime: '',
      discount_type: pointsRedeemed > 0 ? 'Loyality' : '',
      // Loyalty points redemption
      points_redeemed: pointsRedeemed,
      points_discount: pointsDiscount
    }
  };
};

/**
 * Build payload for restaurant 716/478
 * Differences from normal:
 *   - { data: {} } wrapper — same as normal                        
 *   - order_type: "dinein"                                         
 *   - payment_type: "postpaid"                                     
 *   - tax_amount at root level (sum of all item taxes)             
 *   - order_amount includes tax                                    
 *   - cart items have tax + price breakdown fields                 
 *   - extra root fields: total_gst/vat/service_tax, round_up, tip 
 * @param {Object} orderData - Order data
 * @returns {Object} API payload wrapped in { data: {} }
 */
const build716Payload = (orderData) => {
  const {
    cartItems,
    customerName,
    customerPhone,
    tableNumber,
    specialInstructions,
    couponCode,
    restaurantId,
    subtotal,
    totalToPay,
    pointsRedeemed = 0,
    pointsDiscount = 0,
    // totalTax     // ← pre-calculated in ReviewOrder.jsx and passed in
  } = orderData;

  const cart      = transformCartItemsFor716(cartItems);
  const custPhone = extractPhoneNumber(customerPhone || '');
  const dialCode  = getDialCode(customerPhone || '');

  // ─── Root level tax amounts ────────────────────────────────────
  const totalGstTaxAmount =  parseFloat(
        cart.reduce((sum, item) => sum + (item.gst_tax_amount || 0), 0).toFixed(2)
      );

  const totalVatTaxAmount = parseFloat(
    cart.reduce((sum, item) => sum + (item.vat_tax_amount || 0), 0).toFixed(2)
  );

  const rootTaxAmount = parseFloat(
    (totalGstTaxAmount + totalVatTaxAmount).toFixed(2)
  );
  // ──────────────────────────────────────────────────────────────

  return {
    data: {                                                         //  same wrapper as normal
      cart,
      coupon_discount_amount: 0,
      coupon_discount_title: null,
      order_amount: parseFloat(totalToPay.toFixed(2)),             // already subtotal + tax from ReviewOrder
      dial_code: dialCode,
      otp: '',
      address_id: '',
      order_type: 'dinein',
      payment_method: 'cash_on_delivery',                           // always cash
      payment_id: '',
      fcm_token: '',
      order_note: specialInstructions || '',
      coupon_code: couponCode !== '0' ? couponCode : '',
      restaurant_id: parseInt(restaurantId) || 0,
      distance: 1,
      delivery_charge: '0',
      schedule_at: null,
      discount_amount: pointsDiscount,
      tax_amount: rootTaxAmount,                                    //  sum of gst + vat taxes
      order_sub_total_amount: parseFloat(subtotal.toFixed(2)),
      address: '',
      latitude: '',
      longitude: '',
      pincode: '',
      air_bnb_id: '',
      payment_type: 'prepaid',                                     // always prepaid
      contact_person_name: '',
      contact_person_number: '',
      address_type: '',
      road: '',
      house: '',
      table_id: tableNumber || '0',
      floor: '',
      dm_tips: '',
      subscription_order: '0',
      subscription_type: 'daily',
      subscription_days: '[]',
      subscription_quantity: '1',
      subscription_start_at: '',
      subscription_end_at: '',
      cust_phone: custPhone || '',
      cust_name: customerName || '',
      cust_email: '',
      estimatedTime: '',
      discount_type: pointsRedeemed > 0 ? 'Loyality' : '',
      // Loyalty points redemption
      points_redeemed: pointsRedeemed,
      points_discount: pointsDiscount,
      // ─── 716 specific root fields ────────────────────────────────
      total_gst_tax_amount: totalGstTaxAmount,                    
      total_vat_tax_amount: totalVatTaxAmount,                      
      total_service_tax_amount: 0,                                  
      service_gst_tax_amount: 0,                                    
      round_up: 0,                                                  
      tip_tax_amount: 0                                            
    }
  };
};

/**
 * Place order — single exported function
 * Automatically selects correct endpoint and payload based on restaurantId
 *
 * @param {Object} orderData - Order data object
 * @param {Array}  orderData.cartItems            - Cart items
 * @param {string} orderData.customerName         - Customer name
 * @param {string} orderData.customerPhone        - Customer phone (optional)
 * @param {string} orderData.tableNumber          - Table/room ID
 * @param {string} orderData.specialInstructions  - Special instructions
 * @param {string} orderData.couponCode           - Coupon code
 * @param {number} orderData.restaurantId         - Restaurant ID
 * @param {number} orderData.subtotal             - Subtotal (before tax)
 * @param {number} orderData.totalToPay           - Final total (subtotal + tax)
 * @param {number} orderData.totalTax             - Total tax amount (for 716/478)
 * @param {string} orderData.token                - Auth token
 * @returns {Promise} Order response data
 */
export const placeOrder = async (orderData) => {
  try {
    const { token, restaurantId, isMultipleMenuType } = orderData;

    // Use flag passed from component (which checks API config + hardcoded fallback)
    const is716 = isMultipleMenuType === true;

    // ─── Select endpoint ─────────────────────────────────────────
    const endpoint = is716
      ? ENDPOINTS.PLACE_ORDER_AUTOPAID()
      : ENDPOINTS.PLACE_ORDER();

    // ─── Select payload ──────────────────────────────────────────
    const payload = is716
      ? build716Payload(orderData)
      : buildNormalPayload(orderData);

    // ─── Headers — same for both ──────────────────────────────────
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'zoneId': '',                                                 
      'X-localization': 'en',
      'latitude': '',
      'longitude': ''
    };

    // DEBUG: Log full payload to verify loyalty fields
    console.log('[OrderService] ========== ORDER PAYLOAD DEBUG ==========');
    console.log('[OrderService] Endpoint:', endpoint);
    console.log('[OrderService] Is 716 format:', is716);
    console.log('[OrderService] Full Payload:', JSON.stringify(payload, null, 2));
    console.log('[OrderService] Loyalty Fields:');
    console.log('  - points_redeemed:', payload.data.points_redeemed);
    console.log('  - points_discount:', payload.data.points_discount);
    console.log('  - discount_amount:', payload.data.discount_amount);
    console.log('  - discount_type:', payload.data.discount_type);
    console.log('[OrderService] ==========================================');

    const response = await apiClient.post(endpoint, payload, { headers });

    // DEBUG: Log FULL POS API RESPONSE
    console.log('[OrderService] ========== POS API RESPONSE ==========');
    console.log('[OrderService] Full Response:', JSON.stringify(response.data, null, 2));
    console.log('[OrderService] Response - order_id:', response.data?.order_id);
    console.log('[OrderService] Response - discount_amount:', response.data?.discount_amount);
    console.log('[OrderService] Response - discount_type:', response.data?.discount_type);
    console.log('[OrderService] Response - points_redeemed:', response.data?.points_redeemed);
    console.log('[OrderService] ===========================================');
    return response.data;

  } catch (error) {
    // console.error('[OrderService] Failed to place order:', error);
    throw error;
  }
};

// Export service object
const orderService = {
  placeOrder,
};

export default orderService;

/**
 * Fetch order details for editing
 * @param {string|number} orderId - Order ID to fetch
 * @returns {Promise<Object>} Order details with items
 */
export const getOrderDetails = async (orderId) => {
  try {
    const response = await apiClient.get(ENDPOINTS.GET_ORDER_DETAILS(orderId), {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // DEBUG: Log RAW API response
    console.log('[OrderService] ========== ORDER DETAILS RAW RESPONSE ==========');
    console.log('[OrderService] Order ID:', orderId);
    console.log('[OrderService] RAW Response:', JSON.stringify(response.data, null, 2));
    console.log('[OrderService] Loyalty Fields in Response:');
    console.log('  - discount_amount:', response.data?.discount_amount);
    console.log('  - discount_type:', response.data?.discount_type);
    console.log('  - order_discount:', response.data?.order_discount);
    console.log('  - points_redeemed:', response.data?.points_redeemed);
    console.log('  - coupon_discount_amount:', response.data?.coupon_discount_amount);
    console.log('[OrderService] ===================================================');

    const orderData = response.data;
    
    // Get order-level values from first detail item (API structure)
    const firstDetail = (orderData.details || [])[0] || {};
    
    const orderDiscount = parseFloat(firstDetail.order_discount) || 0;
    
    // Calculate item total and tax from item-level data (same logic as ReviewOrder)
    // Exclude cancelled items (food_status === 3)
    let itemTotal = 0;
    let totalGst = 0;
    let totalVat = 0;
    
    const previousItems = (orderData.details || []).map(detail => {
      const unitPrice = parseFloat(detail.unit_price) || 0;
      const quantity = detail.quantity || 1;
      const isCancelled = detail.food_status === 3;
      
      // Calculate variation total from detail.variation[].values[].optionPrice
      let variationTotal = 0;
      if (detail.variation && detail.variation.length > 0) {
        detail.variation.forEach(v => {
          if (v.values) {
            const vals = Array.isArray(v.values) ? v.values : [v.values];
            vals.forEach(val => {
              variationTotal += parseFloat(val.optionPrice) || 0;
            });
          }
        });
      }
      
      // Calculate addon total from detail.add_ons[].price * quantity
      let addonTotal = 0;
      if (detail.add_ons && detail.add_ons.length > 0) {
        detail.add_ons.forEach(a => {
          addonTotal += (parseFloat(a.price) || 0) * (a.quantity || 1);
        });
      }
      
      // Full item price = base + variations + addons
      const fullUnitPrice = unitPrice + variationTotal + addonTotal;
      
      // Only add to totals if NOT cancelled
      if (!isCancelled) {
        itemTotal += fullUnitPrice * quantity;
        
        // Calculate tax from item-level data (mirrors ReviewOrder logic)
        // Tax is on full price (base + variations + addons)
        const taxPercent = parseFloat(detail.food_details?.tax) || 0;
        const taxType = detail.food_details?.tax_type || 'GST';
        const taxAmountPerUnit = parseFloat(((fullUnitPrice * taxPercent) / 100).toFixed(2));
        const totalTaxForItem = taxAmountPerUnit * quantity;
        
        if (taxType === 'GST') totalGst += totalTaxForItem;
        if (taxType === 'VAT') totalVat += totalTaxForItem;
      }
      
      return {
        id: detail.id,
        foodId: detail.food_id,
        orderId: detail.order_id,
        quantity: quantity,
        unitPrice: unitPrice,
        price: detail.price,
        item: {
          id: detail.food_details?.id,
          name: detail.food_details?.name || 'Unknown Item',
          description: detail.food_details?.description || '',
          image: detail.food_details?.image || '',
          price: detail.food_details?.price || detail.price,
          veg: detail.food_details?.veg === 1,
          tax: detail.food_details?.tax || 0,
          tax_type: detail.food_details?.tax_type || 'GST',
        },
        variations: detail.variation || [],
        add_ons: detail.add_ons || [],
        foodLevelNotes: detail.food_level_notes || '',
        orderNote: detail.order_note || '',
        foodStatus: detail.food_status,
      };
    });

    // Round tax values
    totalGst = parseFloat(totalGst.toFixed(2));
    totalVat = parseFloat(totalVat.toFixed(2));

    // Split GST into CGST and SGST (50/50) — same as ReviewOrder
    const cgst = parseFloat((totalGst / 2).toFixed(2));
    const sgst = parseFloat((totalGst / 2).toFixed(2));
    const totalTax = parseFloat((totalGst + totalVat).toFixed(2));

    // Subtotal after discount
    const subtotal = parseFloat((itemTotal - orderDiscount).toFixed(2));

    // Grand Total = subtotal + tax (calculated forward, not from API's order_amount)
    const grandTotal = parseFloat((subtotal + totalTax).toFixed(2));

    // Extract order-level status from first detail item
    const fOrderStatus = firstDetail.f_order_status ?? null;
    const restaurantOrderId = firstDetail.restaurant_order_id ?? null;

    // order_amount from API (current total, reflects cancellations)
    const orderAmount = parseFloat(firstDetail.order_amount) || 0;

    return {
      orderId: orderId,
      fOrderStatus: fOrderStatus,
      restaurantOrderId: restaurantOrderId,
      orderAmount: orderAmount,
      previousItems,
      tableId: orderData.table_id,
      tableNo: orderData.table_no,
      restaurant: orderData.restaurant,
      deliveryCharge: orderData.delivery_charge,
      // Bill summary - calculated from item-level tax data (same as ReviewOrder)
      billSummary: {
        itemTotal: parseFloat(itemTotal.toFixed(2)),
        discount: orderDiscount,
        subtotal: subtotal,
        cgst: cgst,
        sgst: sgst,
        vat: totalVat,
        totalTax: totalTax,
        grandTotal: grandTotal,
      }
    };
  } catch (error) {
    console.error('[OrderService] Failed to fetch order details:', error);
    throw error;
  }
};

/**
 * Update an existing order with new items (Edit Order feature)
 * @param {Object} params - Order update parameters
 * @param {string} params.orderId - Existing order ID
 * @param {Array} params.cartItems - New items to add to the order
 * @param {string} params.restaurantId - Restaurant ID
 * @param {string} params.tableId - Table ID (optional)
 * @param {string} params.orderType - Order type (dinein/takeaway/delivery)
 * @param {string} params.paymentType - Payment type (postpaid/prepaid)
 * @param {string} params.orderNote - Special instructions
 * @param {string} params.authToken - Authorization token
 * @returns {Promise<Object>} Updated order response
 */
export const updateCustomerOrder = async ({
  orderId,
  cartItems,
  restaurantId,
  tableId = '0',
  orderType = 'dinein',
  paymentType = 'postpaid',
  orderNote = '',
  authToken,
  customerName = '',
  customerPhone = '',
  dialCode = '+91',
}) => {
  try {
    // Transform cart items to API format
    const cart = cartItems.map(cartItem => {
      // Transform variations
      let variations = [];
      if (cartItem.variations && cartItem.variations.length > 0) {
        // Group variations by name
        const variationGroups = {};
        cartItem.variations.forEach(v => {
          const name = v.variationName || v.name || 'CHOICE OF';
          if (!variationGroups[name]) {
            variationGroups[name] = [];
          }
          variationGroups[name].push(v.label || v.value);
        });
        
        variations = Object.entries(variationGroups).map(([name, labels]) => ({
          name: name,
          values: { label: labels }
        }));
      }

      // Transform add-ons
      const add_on_ids = [];
      const add_ons = [];
      const add_on_qtys = [];
      
      if (cartItem.add_ons && cartItem.add_ons.length > 0) {
        cartItem.add_ons.forEach(addon => {
          if (addon.quantity > 0) {
            add_on_ids.push(addon.id);
            add_ons.push({
              id: addon.id,
              name: addon.name,
              price: addon.price
            });
            add_on_qtys.push(addon.quantity);
          }
        });
      }

      return {
        food_id: cartItem.item?.id || cartItem.itemId,
        food_level_notes: cartItem.cookingInstructions || '',
        station: cartItem.item?.station || 'KDS',
        item_campaign_id: null,
        price: String(cartItem.item?.price || cartItem.totalPrice / cartItem.quantity),
        variant: '',
        variations: variations,
        quantity: cartItem.quantity,
        add_on_ids: add_on_ids,
        add_ons: add_ons,
        add_on_qtys: add_on_qtys
      };
    });

    // Build the order data payload
    const orderData = {
      order_id: String(orderId),
      address_id: '',
      dial_code: dialCode,
      payment_id: '',
      payment_type: paymentType,
      delivery_charge: '0',
      fcm_token: '',
      otp: '',
      pincode: '',
      cust_email: '',
      table_id: String(tableId),
      cart: cart,
      coupon_discount_amount: 0,
      distance: 1,
      coupon_discount_title: '',
      cust_name: customerName,
      cust_phone: customerPhone,
      schedule_at: null,
      order_amount: 0,
      order_note: orderNote,
      order_type: orderType,
      payment_method: 'cash_on_delivery',
      coupon_code: '',
      restaurant_id: String(restaurantId),
      address: '',
      latitude: '',
      longitude: '',
      address_type: '',
      contact_person_name: '',
      contact_person_number: '',
      discount_amount: 0,
      tax_amount: 0,
      order_sub_total_amount: 0,
      road: '',
      house: '',
      floor: '',
      dm_tips: '',
      estimatedTime: '',
      subscription_order: '0',
      subscription_type: 'daily',
      subscription_quantity: '1',
      subscription_days: [],
      subscription_start_at: '',
      subscription_end_at: '',
      discount_type: ''
    };

    // Create FormData with 'data' field as JSON string
    const formData = new FormData();
    formData.append('data', JSON.stringify(orderData));

    // Make API call
    const response = await apiClient.post(
      `${process.env.REACT_APP_API_BASE_URL || 'https://preprod.mygenie.online/api/v1'}/customer/order/update-customer-order`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-localization': 'en',
          'zoneId': '3',
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('[OrderService] Failed to update customer order:', error);
    throw error;
  }
};

/**
 * Check table status to determine if there's an existing order
 * Used to decide between "Edit Order" vs "Browse Menu" flow
 * @param {string|number} tableId - Table ID from QR scan
 * @param {string|number} restaurantId - Restaurant ID
 * @param {string} authToken - Authorization token
 * @returns {Promise<Object>} { tableStatus, orderId, isOccupied }
 *   - tableStatus: "Available" | "Not Available" | "Invalid Table ID or QR code"
 *   - orderId: string (empty if available, order ID if occupied)
 *   - isOccupied: boolean (true if table has active order)
 */
export const checkTableStatus = async (tableId, restaurantId, authToken) => {
  try {
    const response = await apiClient.get(
      ENDPOINTS.CHECK_TABLE_STATUS(tableId, restaurantId),
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'zoneId': '3',
          'Authorization': `Bearer ${authToken}`,
        }
      }
    );

    const status = response.data?.status || {};
    const tableStatus = status.table_status || 'Available';
    const orderId = status.order_id || '';
    
    return {
      tableStatus,
      orderId,
      isOccupied: tableStatus === 'Not Available' && !!orderId,
      isAvailable: tableStatus === 'Available',
      isInvalid: tableStatus === 'Invalid Table ID or QR code',
    };
  } catch (error) {
    console.error('[OrderService] Failed to check table status:', error);
    // Return safe default on error - treat as available (new order flow)
    return {
      tableStatus: 'Available',
      orderId: '',
      isOccupied: false,
      isAvailable: true,
      isInvalid: false,
      error: error.message,
    };
  }
};
