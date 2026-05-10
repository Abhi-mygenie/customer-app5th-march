/**
 * Channel-eligibility helpers for Scan & Order customer menu (CR A-1).
 *
 * Decides whether a Product API item is allowed for the active order channel,
 * using the per-item flags carried by the menu transformer (see CR D-1):
 *   - item.dinein   ('Yes' | 'No', default 'Yes')
 *   - item.takeaway ('Yes' | 'No', default 'Yes')
 *   - item.delivery ('Yes' | 'No', default 'Yes')
 *
 * Channel mapping:
 *   - 'dinein'                       -> item.dinein
 *   - 'takeaway' or 'take_away'      -> item.takeaway
 *   - 'delivery'                     -> item.delivery
 *
 * Room flow note (per owner decision in PRODUCT_API_FIELD_MAPPING_AND_BUSINESS_LOGIC_AUDIT):
 *   Room QRs send orderType='dinein', so room scans share the dinein gate.
 *   No separate room flag exists in the API today.
 *
 * Permissive defaults — never accidentally hide items:
 *   - missing/null orderType        -> allow (early menu loads, edge cases)
 *   - missing channel flag on item  -> D-1 transformer already defaults to 'Yes',
 *                                      and we use `!== 'No'` so any non-'No'
 *                                      value (including null/undefined) allows.
 *
 * Out of scope for A-1 (handled in separate CRs):
 *   - is_disable / status / food_stock / live_web / time gates
 *   - PreviousOrderItems re-check in edit-order flow (deferred — owner decision)
 *   - Order placement payload, taxes, charges, KOT, payment, sockets, Firebase
 */

/**
 * @param {object|null} item - menu item carrying dinein/takeaway/delivery flags
 * @param {string|null} orderType - 'dinein' | 'takeaway' | 'take_away' | 'delivery' | null
 * @returns {boolean} true = allowed for this channel; false = disallowed
 */
export const isItemAllowedForChannel = (item, orderType) => {
  if (!item) return false;
  if (!orderType) return true;

  switch (orderType) {
    case 'dinein':
      return item.dinein !== 'No';
    case 'takeaway':
    case 'take_away':
      return item.takeaway !== 'No';
    case 'delivery':
      return item.delivery !== 'No';
    default:
      return true;
  }
};

/**
 * Human-readable label for the active channel — used in toasts and confirm prompts.
 * @param {string|null} orderType
 * @returns {string}
 */
export const getChannelLabel = (orderType) => {
  switch (orderType) {
    case 'dinein':
      return 'Dine-in';
    case 'takeaway':
    case 'take_away':
      return 'Takeaway';
    case 'delivery':
      return 'Delivery';
    default:
      return 'this order type';
  }
};
