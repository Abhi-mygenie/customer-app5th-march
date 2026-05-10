/**
 * Order Transformer
 * Transforms API response to internal model types
 * SINGLE SOURCE OF TRUTH for all order-related mappings
 */

import {
  ApiCheckTableStatusResponse,
  ApiOrderDetailItem,
  ApiOrderDetailsResponse,
  ApiVariation,
  ApiAddon,
  ApiVariationValue,
  ORDER_STATUS,
} from '../../types/api/order.types';

import {
  TableStatus,
  OrderItem,
  OrderDetails,
  Variation,
  VariationValue,
  Addon,
  BillSummary,
  PreviousOrderItem,
} from '../../types/models/order.types';

// ============================================
// Table Status Transformer
// ============================================
export const transformTableStatus = (api: ApiCheckTableStatusResponse): TableStatus => ({
  isOccupied: !api.is_available,
  isAvailable: api.is_available,
  orderId: api.order_id,
});

// ============================================
// Variation Transformers
// ============================================
export const transformVariationValue = (api: ApiVariationValue): VariationValue => ({
  label: api.label,
  price: parseFloat(api.optionPrice) || 0,
});

export const transformVariation = (api: ApiVariation): Variation => ({
  name: api.name,
  type: api.type,
  required: api.required === 'on',
  values: (api.values || []).map(transformVariationValue),
});

export const transformVariations = (apiVariations: ApiVariation[] | undefined): Variation[] => {
  if (!apiVariations || !Array.isArray(apiVariations)) return [];
  return apiVariations.map(transformVariation);
};

// ============================================
// Addon Transformer
// ============================================
export const transformAddon = (api: ApiAddon): Addon => ({
  id: api.id,
  name: api.name,
  price: typeof api.price === 'string' ? parseFloat(api.price) : api.price,
  quantity: api.quantity || 1,
});

export const transformAddons = (apiAddons: ApiAddon[] | undefined): Addon[] => {
  if (!apiAddons || !Array.isArray(apiAddons)) return [];
  return apiAddons.map(transformAddon);
};

// ============================================
// Price Calculation Helpers
// ============================================
export const calculateVariationsTotal = (variations: Variation[]): number => {
  return variations.reduce((total, variation) => {
    const valuesTotal = variation.values.reduce((sum, val) => sum + val.price, 0);
    return total + valuesTotal;
  }, 0);
};

export const calculateAddonsTotal = (addons: Addon[]): number => {
  return addons.reduce((total, addon) => total + (addon.price * addon.quantity), 0);
};

export const calculateFullPrice = (
  basePrice: number,
  variations: Variation[],
  addons: Addon[]
): number => {
  return basePrice + calculateVariationsTotal(variations) + calculateAddonsTotal(addons);
};

// ============================================
// Order Item Transformer
// ============================================
export const transformOrderItem = (api: ApiOrderDetailItem): OrderItem => {
  const basePrice = parseFloat(api.unit_price) || api.food_details?.price || 0;
  const variations = transformVariations(api.variation);
  const addons = transformAddons(api.add_ons);
  const fullPrice = calculateFullPrice(basePrice, variations, addons);
  
  // API returns food_status (snake_case), not foodStatus (camelCase)
  const itemStatus = (api as any).food_status ?? api.foodStatus;

  return {
    id: api.id,
    foodId: api.food_id,
    name: api.food_details?.name || 'Item',
    description: api.food_details?.description || undefined,
    image: api.food_details?.image || undefined,
    price: basePrice,
    fullPrice,
    quantity: api.quantity || 1,
    veg: api.food_details?.veg === 1 || api.food_details?.veg === true,
    status: itemStatus,
    notes: api.food_level_notes || undefined,
    variations,
    addons,
    tax: api.food_details?.tax || 0,
    taxType: api.food_details?.tax_type || 'percentage',
    taxCalc: api.food_details?.tax_calc as 'Inclusive' | 'Exclusive' | undefined,
  };
};

// ============================================
// Previous Order Item Transformer (for Edit Mode)
// ============================================
export const transformPreviousOrderItem = (api: ApiOrderDetailItem): PreviousOrderItem => {
  const basePrice = parseFloat(api.unit_price) || api.food_details?.price || 0;
  const variations = transformVariations(api.variation);
  const addons = transformAddons(api.add_ons);
  const variationsTotal = calculateVariationsTotal(variations);
  const addonsTotal = calculateAddonsTotal(addons);
  const fullPrice = basePrice + variationsTotal + addonsTotal;
  
  // API returns food_status (snake_case), not foodStatus (camelCase)
  const itemStatus = (api as any).food_status ?? api.foodStatus;

  return {
    id: api.id,
    foodId: api.food_id,
    name: api.food_details?.name || 'Item',
    description: api.food_details?.description || undefined,
    image: api.food_details?.image || undefined,
    price: basePrice,
    fullPrice,
    quantity: api.quantity || 1,
    veg: api.food_details?.veg === 1 || api.food_details?.veg === true,
    status: itemStatus,
    foodStatus: itemStatus,
    notes: api.food_level_notes || undefined,
    variations,
    addons,
    tax: api.food_details?.tax || 0,
    taxType: api.food_details?.tax_type || 'percentage',
    taxCalc: api.food_details?.tax_calc as 'Inclusive' | 'Exclusive' | undefined,
    unitPrice: basePrice,
    variationsTotal,
    addonsTotal,
  };
};

// ============================================
// CR Fix — Hide POS "Check In" system item from customer UI
// ============================================
// Backend already excludes "Check In" from order_amount and
// order_sub_total_amount, so this filter only addresses the visual leak in:
//  - OrderSuccess "Items Ordered (n)"
//  - ReviewOrder "Previously Ordered" via PreviousOrderItems
//  - CartBar previousItemsCount badge
//  - billSummary.itemTotal (auto-corrects since itemTotal sums previousItems)
// Name-based detection is the only frontend-available signal — no
// food_id / category_id / system flag is exposed by the API schema today.
// Matches case/whitespace/hyphen/underscore tolerant variants:
// "Check In", "check in", "CheckIn", "check-in", "check_in", "  Check  In  ".
// All separators are stripped, so the canonical comparison is against "checkin".
// Substrings like "Check Inside" stay safe because the comparison is exact.
const isCheckInSystemItem = (api: ApiOrderDetailItem): boolean => {
  const name = String(api.food_details?.name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, '');
  return name === 'checkin';
};

// ============================================
// Order Details Transformer
// ============================================
export const transformOrderDetails = (api: ApiOrderDetailsResponse): OrderDetails => {
  const visibleDetails = (api.details || []).filter(d => !isCheckInSystemItem(d));
  const items = visibleDetails.map(transformOrderItem);
  const previousItems = visibleDetails.map(transformPreviousOrderItem);
  
  // Calculate bill summary
  const itemTotal = previousItems.reduce(
    (sum, item) => sum + (item.fullPrice * item.quantity),
    0
  );
  
  const orderAmount = parseFloat(api.order_amount) || 0;
  const subtotal = parseFloat(api.order_sub_total_amount || '') || itemTotal;
  const subtotalWithoutTax = parseFloat(api.order_sub_total_without_tax || '') || subtotal;

  // Determine fOrderStatus from first item or default
  // API returns food_status (snake_case), not foodStatus (camelCase)
  const firstItem = api.details?.[0];
  const fOrderStatus = (firstItem as any)?.food_status ?? firstItem?.foodStatus ?? ORDER_STATUS.YET_TO_CONFIRM;

  return {
    orderId: api.order_id,
    orderAmount,
    subtotal,
    subtotalWithoutTax,
    tableNo: api.table_no,
    orderStatus: api.order_status,
    orderType: api.order_type,
    fOrderStatus,
    items,
    previousItems,
    billSummary: {
      itemTotal,
      subtotal,
      cgst: 0,  // Will be calculated in component based on restaurant settings
      sgst: 0,
      vat: 0,
      totalTax: 0,
      discount: 0,
      grandTotal: orderAmount,
    },
  };
};

// ============================================
// Variation Label Helpers (for Display)
// ============================================
export const getVariationLabels = (variations: Variation[]): string => {
  if (!variations || variations.length === 0) return '';
  
  return variations
    .map(v => v.values.map(val => val.label).filter(Boolean).join(', '))
    .filter(Boolean)
    .join(', ');
};

export const getAddonLabels = (addons: Addon[]): string => {
  if (!addons || addons.length === 0) return '';
  
  return addons
    .map(a => `${a.name} x${a.quantity}`)
    .join(', ');
};

// ============================================
// API Variation Label Helpers (for API Response)
// These handle the raw API structure directly
// ============================================
export const getVariationLabelsFromApi = (apiVariations: ApiVariation[] | undefined): string => {
  if (!apiVariations || apiVariations.length === 0) return '';
  
  return apiVariations
    .map(v => {
      if (v.values && Array.isArray(v.values)) {
        return v.values.map(val => val.label).filter(Boolean).join(', ');
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
};

export const getAddonLabelsFromApi = (apiAddons: ApiAddon[] | undefined): string => {
  if (!apiAddons || apiAddons.length === 0) return '';
  
  return apiAddons
    .map(a => `${a.name || 'Addon'} x${a.quantity || 1}`)
    .join(', ');
};
