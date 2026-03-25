/**
 * Order Service (TypeScript)
 * Handles all order-related API calls
 * Uses centralized transformers for data mapping
 */

import apiClient from '../config/axios';
import { ENDPOINTS } from '../config/endpoints';

// Import transformers
import {
  transformTableStatus,
  transformOrderDetails as transformOrderDetailsFromApi,
  transformPreviousOrderItem,
  calculateVariationsTotal,
  calculateAddonsTotal,
} from '../transformers';

// Import types
import {
  ORDER_STATUS,
  ApiOrderDetailsResponse,
  ApiPlaceOrderResponse,
} from '../../types/api/order.types';

import {
  TableStatus,
  OrderDetails,
  PlaceOrderData,
  UpdateOrderData,
} from '../../types/models/order.types';

// ============================================
// Auth Token Helper
// ============================================
const getStoredToken = async () => {
  // Try to get token from localStorage
  const token = localStorage.getItem('authToken');
  if (token) return token;
  
  // Fallback: try to refresh token
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    const newToken = response.data?.token;
    if (newToken) {
      localStorage.setItem('authToken', newToken);
      return newToken;
    }
  } catch (e) {
    console.error('[OrderService] Token refresh failed:', e);
  }
  return null;
};

// ============================================
// Check Table Status
// ============================================
export const checkTableStatus = async (
  tableId: string | number,
  restaurantId: string | number,
  authToken: string
): Promise<TableStatus & { tableStatus: string; error?: string }> => {
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
      orderId: orderId ? parseInt(orderId, 10) : null,
      isOccupied: tableStatus === 'Not Available' && !!orderId,
      isAvailable: tableStatus === 'Available',
      isInvalid: tableStatus === 'Invalid Table ID or QR code',
    };
  } catch (error: any) {
    console.error('[OrderService] Failed to check table status:', error);
    return {
      tableStatus: 'Available',
      orderId: null,
      isOccupied: false,
      isAvailable: true,
      isInvalid: false,
      error: error.message,
    };
  }
};

// ============================================
// Get Order Details
// ============================================
export const getOrderDetails = async (orderId: number | string): Promise<OrderDetails & {
  fOrderStatus: number;
  restaurantOrderId?: string;
  tableId?: string;
  tableNo?: string;
  restaurant?: any;
  deliveryCharge?: number;
}> => {
  try {
    const response = await apiClient.get(ENDPOINTS.GET_ORDER_DETAILS(orderId), {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const orderData: ApiOrderDetailsResponse = response.data;
    const details = orderData.details || [];
    const firstDetail = details[0] || {};

    // Calculate totals from items
    let itemTotal = 0;
    let totalGst = 0;
    let totalVat = 0;
    const orderDiscount = parseFloat((firstDetail as any).order_discount) || 0;

    // Transform previous items using centralized transformer
    // Returns CLEAN transformed data - components should use these standardized properties
    const previousItems = details.map(detail => {
      const item = transformPreviousOrderItem(detail);
      const isCancelled = detail.foodStatus === ORDER_STATUS.CANCELLED;
      
      if (!isCancelled) {
        itemTotal += item.fullPrice * item.quantity;
        
        // Calculate tax
        const taxPercent = item.tax || 0;
        const taxType = item.taxType || 'GST';
        const taxAmountPerUnit = parseFloat(((item.fullPrice * taxPercent) / 100).toFixed(2));
        const totalTaxForItem = taxAmountPerUnit * item.quantity;
        
        if (taxType === 'GST') totalGst += totalTaxForItem;
        if (taxType === 'VAT') totalVat += totalTaxForItem;
      }
      
      // Return transformed item with standardized properties
      // Components should use: name, price, fullPrice, variations[], addons[]
      return {
        ...item,
        // Legacy aliases for backward compatibility during migration
        orderId: (detail as any).order_id,
        unitPrice: item.price,           // Alias: use 'price' instead
        item: {                           // Legacy nested structure
          id: item.foodId,
          name: item.name,
          description: item.description || '',
          image: item.image || '',
          price: item.price,
          veg: item.veg,
          tax: item.tax,
          tax_type: item.taxType,
        },
        orderNote: (detail as any).order_note || '',
      };
    });

    // Round tax values
    totalGst = parseFloat(totalGst.toFixed(2));
    totalVat = parseFloat(totalVat.toFixed(2));

    const cgst = parseFloat((totalGst / 2).toFixed(2));
    const sgst = parseFloat((totalGst / 2).toFixed(2));
    const totalTax = parseFloat((totalGst + totalVat).toFixed(2));

    // Extract order-level status
    const fOrderStatus = (firstDetail as any).f_order_status ?? ORDER_STATUS.YET_TO_CONFIRM;
    const restaurantOrderId = (firstDetail as any).restaurant_order_id ?? null;

    // API fields mapping
    const orderAmount = parseFloat((firstDetail as any).order_amount) || 0;
    const apiItemTotal = parseFloat((firstDetail as any).order_sub_total_amount) || 0;
    const apiSubtotal = parseFloat((firstDetail as any).order_sub_total_without_tax) || 0;

    const finalItemTotal = apiItemTotal > 0 ? apiItemTotal : parseFloat(itemTotal.toFixed(2));
    const finalSubtotal = apiSubtotal > 0 ? apiSubtotal : parseFloat((itemTotal - orderDiscount).toFixed(2));
    const finalGrandTotal = orderAmount > 0 ? orderAmount : parseFloat((finalSubtotal + totalTax).toFixed(2));

    return {
      orderId: typeof orderId === 'string' ? parseInt(orderId, 10) : orderId,
      orderAmount,
      subtotal: finalSubtotal,
      subtotalWithoutTax: finalSubtotal,
      tableNo: orderData.table_no,
      tableId: (orderData as any).table_id,
      orderStatus: orderData.order_status,
      orderType: orderData.order_type,
      fOrderStatus,
      restaurantOrderId,
      items: [],
      previousItems,
      restaurant: (orderData as any).restaurant,
      deliveryCharge: (orderData as any).delivery_charge,
      billSummary: {
        itemTotal: finalItemTotal,
        discount: orderDiscount,
        subtotal: finalSubtotal,
        cgst,
        sgst,
        vat: totalVat,
        totalTax,
        grandTotal: finalGrandTotal,
        originalTotal: orderAmount,
      }
    };
  } catch (error) {
    console.error('[OrderService] Failed to fetch order details:', error);
    throw error;
  }
};

// ============================================
// Transform Variations to API Format
// ============================================
const transformVariationsForApi = (cartItem: any): any[] => {
  if (!cartItem.variations || cartItem.variations.length === 0) {
    return [];
  }

  const variationGroups: Record<string, string[]> = {};

  if (cartItem.item?.variations && cartItem.item.variations.length > 0) {
    cartItem.item.variations.forEach((originalVariation: any) => {
      const variationName = originalVariation.name || 'CHOICE OF';
      
      const selectedValues = cartItem.variations.filter((v: any) => 
        originalVariation.values?.some((origVal: any) => origVal.label === v.label)
      );

      if (selectedValues.length > 0) {
        if (!variationGroups[variationName]) {
          variationGroups[variationName] = [];
        }
        selectedValues.forEach((selected: any) => {
          variationGroups[variationName].push(selected.label);
        });
      }
    });
  } else {
    const allLabels = cartItem.variations.map((v: any) => v.label);
    if (allLabels.length > 0) {
      variationGroups['CHOICE OF'] = allLabels;
    }
  }

  return Object.entries(variationGroups).map(([name, labels]) => ({
    name,
    values: { label: labels }
  }));
};

// ============================================
// Transform Addons to API Format
// ============================================
const transformAddonsForApi = (cartItem: any) => {
  if (!cartItem.add_ons || cartItem.add_ons.length === 0) {
    return {
      add_on_ids: [],
      add_ons: [],
      add_on_qtys: []
    };
  }

  const addOns = cartItem.add_ons;
  return {
    add_on_ids: addOns.map((a: any) => a.id),
    add_ons: addOns.map((a: any) => ({
      id: a.id,
      name: a.name,
      price: typeof a.price === 'string' ? parseFloat(a.price) : a.price,
    })),
    add_on_qtys: addOns.map((a: any) => a.quantity || 1)
  };
};

// ============================================
// Transform Cart Items for API
// ============================================
const transformCartItems = (cartItems: any[], gstEnabled = true) => {
  return cartItems.map(cartItem => {
    const variations = transformVariationsForApi(cartItem);
    const { add_on_ids, add_ons, add_on_qtys } = transformAddonsForApi(cartItem);

    // Calculate price with variations and addons
    const basePrice = parseFloat(cartItem.price) || 0;
    const variationsTotal = (cartItem.variations || []).reduce((sum: number, v: any) => 
      sum + (parseFloat(v.optionPrice || v.price) || 0), 0
    );
    const addonsTotal = (cartItem.add_ons || []).reduce((sum: number, a: any) => 
      sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0
    );
    const itemPrice = (basePrice + variationsTotal + addonsTotal) * (cartItem.quantity || 1);

    return {
      food_id: String(cartItem.id),
      food_level_notes: cartItem.foodLevelNotes || '',
      station: cartItem.station || 'KDS',
      item_campaign_id: cartItem.item_campaign_id || null,
      price: itemPrice.toFixed(2),
      variant: '',
      variations,
      quantity: cartItem.quantity || 1,
      add_on_ids,
      add_ons,
      add_on_qtys,
    };
  });
};

// ============================================
// Place Order
// ============================================
export const placeOrder = async (orderData: any): Promise<ApiPlaceOrderResponse> => {
  try {
    const formData = new FormData();
    const gstEnabled = orderData.gstEnabled !== false;
    const cart = transformCartItems(orderData.cartItems || [], gstEnabled);

    const payloadData = {
      address_id: '',
      dial_code: orderData.dialCode || '+91',
      payment_id: '',
      payment_type: orderData.paymentType || 'postpaid',
      delivery_charge: '0',
      fcm_token: '',
      otp: '',
      pincode: '',
      cust_email: '',
      table_id: String(orderData.tableId),
      cart,
      coupon_discount_amount: 0,
      distance: 1,
      coupon_discount_title: '',
      cust_name: orderData.customerName || '',
      cust_phone: orderData.customerPhone || '',
      schedule_at: null,
      order_amount: Math.ceil(orderData.totalToPay || 0),
      order_note: orderData.orderNote || '',
      order_type: orderData.orderType || 'dinein',
      payment_method: 'cash_on_delivery',
      coupon_code: '',
      restaurant_id: String(orderData.restaurantId),
      address: '',
      latitude: '',
      longitude: '',
      address_type: '',
      contact_person_name: '',
      contact_person_number: '',
      discount_amount: orderData.pointsDiscount || 0,
      tax_amount: parseFloat((orderData.totalTax || 0).toFixed(2)),
      order_sub_total_amount: parseFloat((orderData.subtotal || 0).toFixed(2)),
      order_sub_total_without_tax: parseFloat((orderData.subtotal || 0).toFixed(2)),
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
      discount_type: '',
      points_redeemed: orderData.pointsRedeemed || 0,
      points_discount: orderData.pointsDiscount || 0,
    };

    formData.append('data', JSON.stringify(payloadData));

    const response = await apiClient.post(ENDPOINTS.PLACE_ORDER(), formData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${orderData.authToken}`,
        'zoneId': '3',
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('[OrderService] Failed to place order:', error);
    throw error;
  }
};

// ============================================
// Update Customer Order
// ============================================
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
  totalToPay = 0,
  subtotal = 0,
  totalTax = 0,
  pointsDiscount = 0,
  pointsRedeemed = 0,
}: any): Promise<ApiPlaceOrderResponse> => {
  try {
    const formData = new FormData();

    // Transform cart items using centralized function
    const cart = cartItems.map((cartItem: any) => {
      // Transform variations - use item.variations to get correct group names
      let variations: any[] = [];
      if (cartItem.variations && cartItem.variations.length > 0) {
        const variationGroups: Record<string, string[]> = {};
        
        cartItem.variations.forEach((v: any) => {
          // Find the variation group name from original item variations
          let name = 'CHOICE OF';
          if (cartItem.item?.variations && cartItem.item.variations.length > 0) {
            const matchingGroup = cartItem.item.variations.find((origVar: any) => 
              origVar.values?.some((val: any) => val.label === v.label)
            );
            if (matchingGroup) {
              name = matchingGroup.name || 'CHOICE OF';
            }
          }
          
          if (!variationGroups[name]) {
            variationGroups[name] = [];
          }
          variationGroups[name].push(v.label || v.value);
        });
        
        variations = Object.entries(variationGroups).map(([name, labels]) => ({
          name,
          values: { label: labels }
        }));
      }

      // Transform add-ons
      const addOns = cartItem.add_ons || [];
      const add_on_ids = addOns.map((a: any) => a.id);
      const add_ons = addOns.map((a: any) => ({
        id: a.id,
        name: a.name,
        price: typeof a.price === 'string' ? parseFloat(a.price) : a.price,
      }));
      const add_on_qtys = addOns.map((a: any) => a.quantity || 1);

      // Calculate item price
      const basePrice = parseFloat(cartItem.price) || 0;
      const variationsTotal = (cartItem.variations || []).reduce((sum: number, v: any) => 
        sum + (parseFloat(v.optionPrice || v.price) || 0), 0
      );
      const addonsTotal = addOns.reduce((sum: number, a: any) => 
        sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0
      );
      const itemPrice = (basePrice + variationsTotal + addonsTotal) * (cartItem.quantity || 1);

      return {
        food_id: String(cartItem.id),
        food_level_notes: cartItem.foodLevelNotes || '',
        station: cartItem.station || 'KDS',
        item_campaign_id: cartItem.item_campaign_id || null,
        price: itemPrice.toFixed(2),
        variant: '',
        variations,
        quantity: cartItem.quantity || 1,
        add_on_ids,
        add_ons,
        add_on_qtys,
      };
    });

    const payloadData = {
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
      cart,
      coupon_discount_amount: 0,
      distance: 1,
      coupon_discount_title: '',
      cust_name: customerName,
      cust_phone: customerPhone,
      schedule_at: null,
      order_amount: Math.ceil(totalToPay),
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
      discount_amount: pointsDiscount,
      tax_amount: parseFloat(totalTax.toFixed(2)),
      order_sub_total_amount: parseFloat(subtotal.toFixed(2)),
      order_sub_total_without_tax: parseFloat(subtotal.toFixed(2)),
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
      discount_type: '',
      points_redeemed: pointsRedeemed,
      points_discount: pointsDiscount,
    };

    formData.append('data', JSON.stringify(payloadData));

    const response = await apiClient.post(
      `${process.env.REACT_APP_API_BASE_URL || 'https://preprod.mygenie.online/api/v1'}/customer/order/update-customer-order`,
      formData,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`,
          'zoneId': '3',
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[OrderService] Failed to update customer order:', error);
    throw error;
  }
};

// ============================================
// Exports
// ============================================
export { getStoredToken };
export { ORDER_STATUS };
