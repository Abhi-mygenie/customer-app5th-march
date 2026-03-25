/**
 * Transformer Helpers - JavaScript re-export for JSX component compatibility
 * These functions are centralized here as SINGLE SOURCE OF TRUTH
 */

// ============================================
// RECEIVE Helpers (API Response → Display)
// ============================================

/**
 * Get variation labels from transformed variations array
 * @param {Array} variations - Transformed variations array with { name, type, values: [{ label, price }] }
 * @returns {string} Comma-separated labels
 */
export const getVariationLabels = (variations) => {
  if (!variations || variations.length === 0) return '';
  
  return variations
    .map(v => {
      // Handle transformer format: { values: [{ label, price }] }
      if (v.values && Array.isArray(v.values)) {
        return v.values.map(val => val.label || '').filter(Boolean).join(', ');
      }
      // Handle raw API format: { values: { label: [...] } }
      if (v.values && v.values.label) {
        const labels = Array.isArray(v.values.label) ? v.values.label : [v.values.label];
        return labels.filter(Boolean).join(', ');
      }
      // Fallback
      return v.label || v.name || '';
    })
    .filter(Boolean)
    .join(', ');
};

/**
 * Get addon labels from transformed addons array
 * @param {Array} addons - Transformed addons array with { id, name, price, quantity }
 * @returns {string} Comma-separated labels with quantities
 */
export const getAddonLabels = (addons) => {
  if (!addons || addons.length === 0) return '';
  
  return addons
    .map(a => `${a.name || 'Addon'} x${a.quantity || 1}`)
    .join(', ');
};

/**
 * Calculate total price of variations
 * @param {Array} variations - Transformed variations array
 * @returns {number} Total price of all selected variations
 */
export const calculateVariationsTotal = (variations) => {
  if (!variations || variations.length === 0) return 0;
  
  return variations.reduce((total, variation) => {
    if (variation.values && Array.isArray(variation.values)) {
      const valuesTotal = variation.values.reduce((sum, val) => 
        sum + (parseFloat(val.price) || 0), 0);
      return total + valuesTotal;
    }
    return total;
  }, 0);
};

/**
 * Calculate total price of addons
 * @param {Array} addons - Transformed addons array
 * @returns {number} Total price of all addons (price * quantity)
 */
export const calculateAddonsTotal = (addons) => {
  if (!addons || addons.length === 0) return 0;
  
  return addons.reduce((total, addon) => 
    total + ((parseFloat(addon.price) || 0) * (addon.quantity || 1)), 0);
};

// ============================================
// SEND Helpers (Cart → API Request)
// ============================================

/**
 * Transform cart item variations to API format
 * Groups variations by their parent group name
 * @param {Object} cartItem - Cart item with variations and item.variations
 * @returns {Array} API format: [{ name: "SIZE", values: { label: ["60ML"] } }]
 */
export const transformVariationsForApi = (cartItem) => {
  if (!cartItem.variations || cartItem.variations.length === 0) {
    return [];
  }

  const variationGroups = {};

  // Try to match variations to their group names from original item
  if (cartItem.item?.variations && cartItem.item.variations.length > 0) {
    cartItem.item.variations.forEach((originalVariation) => {
      const variationName = originalVariation.name || 'CHOICE OF';
      
      const selectedValues = cartItem.variations.filter((v) => 
        originalVariation.values?.some((origVal) => origVal.label === v.label)
      );

      if (selectedValues.length > 0) {
        if (!variationGroups[variationName]) {
          variationGroups[variationName] = [];
        }
        selectedValues.forEach((selected) => {
          variationGroups[variationName].push(selected.label);
        });
      }
    });
  } else {
    // Fallback: group all variations under generic name
    const allLabels = cartItem.variations.map((v) => v.label);
    if (allLabels.length > 0) {
      variationGroups['CHOICE OF'] = allLabels;
    }
  }

  return Object.entries(variationGroups).map(([name, labels]) => ({
    name,
    values: { label: labels }
  }));
};

/**
 * Transform cart item add-ons to API format
 * Splits into three parallel arrays as API expects
 * @param {Object} cartItem - Cart item with add_ons array
 * @returns {Object} { add_on_ids: [], add_ons: [], add_on_qtys: [] }
 */
export const transformAddonsForApi = (cartItem) => {
  if (!cartItem.add_ons || cartItem.add_ons.length === 0) {
    return {
      add_on_ids: [],
      add_ons: [],
      add_on_qtys: []
    };
  }

  const addOns = cartItem.add_ons;
  return {
    add_on_ids: addOns.map((a) => a.id),
    add_ons: addOns.map((a) => ({
      id: a.id,
      name: a.name,
      price: typeof a.price === 'string' ? parseFloat(a.price) : a.price,
    })),
    add_on_qtys: addOns.map((a) => a.quantity || 1)
  };
};

/**
 * Calculate full item price including variations and addons
 * @param {Object} cartItem - Cart item with price, variations, add_ons
 * @returns {number} Total price for single unit
 */
export const calculateCartItemPrice = (cartItem) => {
  const basePrice = parseFloat(cartItem.price || cartItem.item?.price) || 0;
  
  const variationsTotal = (cartItem.variations || []).reduce((sum, v) => 
    sum + (parseFloat(v.optionPrice || v.price) || 0), 0
  );
  
  const addonsTotal = (cartItem.add_ons || []).reduce((sum, a) => 
    sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0
  );
  
  return basePrice + variationsTotal + addonsTotal;
};

/**
 * Transform full cart item to API format
 * @param {Object} cartItem - Cart item from CartContext
 * @returns {Object} API cart item format
 */
export const transformCartItemForApi = (cartItem) => {
  const variations = transformVariationsForApi(cartItem);
  const { add_on_ids, add_ons, add_on_qtys } = transformAddonsForApi(cartItem);
  const unitPrice = calculateCartItemPrice(cartItem);
  const itemPrice = unitPrice * (cartItem.quantity || 1);

  return {
    food_id: String(cartItem.id || cartItem.itemId),
    food_level_notes: cartItem.foodLevelNotes || cartItem.cookingInstructions || '',
    station: cartItem.station || cartItem.item?.station || 'KDS',
    item_campaign_id: cartItem.item_campaign_id || null,
    price: itemPrice.toFixed(2),
    variant: '',
    variations,
    quantity: cartItem.quantity || 1,
    add_on_ids,
    add_ons,
    add_on_qtys,
  };
};

/**
 * Transform array of cart items to API format
 * @param {Array} cartItems - Array of cart items from CartContext
 * @returns {Array} Array of API-formatted cart items
 */
export const transformCartItemsForApi = (cartItems) => {
  return cartItems.map(transformCartItemForApi);
};
