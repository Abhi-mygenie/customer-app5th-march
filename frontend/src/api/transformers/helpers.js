/**
 * Transformer Helpers - JavaScript re-export for JSX component compatibility
 * These functions are centralized in orderTransformer.ts
 */

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
