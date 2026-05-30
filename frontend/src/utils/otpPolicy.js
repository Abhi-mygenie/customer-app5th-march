/**
 * otpPolicy — CR-2026-05-30-001 Item 1
 *
 * Resolves which admin-config flag governs OTP for the customer's current
 * order context, and whether the OTP/password-setup page should be shown.
 *
 * Design:
 *   - Flag name encodes the matching mode (e.g. `otpRequiredDineInWithTable`).
 *   - `config[flag] !== false` means "show OTP page" (default = current behaviour).
 *   - Only an explicit `false` skips the page. Missing / null / undefined
 *     preserve today's behaviour (OTP page IS shown).
 *
 * Used by `LandingPage.jsx` to gate the navigate('/password-setup', ...) call.
 *
 * Hard constraint: Restaurant 716 is IN-scope for Item 1 and honours these
 * flags like every other restaurant. (Items 2/3 of the CR carve 716 out
 * separately; do NOT carry that carve-out into Item 1.)
 */

import { hasAssignedTable } from './orderTypeHelpers';

/**
 * Resolve the admin-config flag name that governs OTP for the current order context.
 *
 * @param {object} ctx
 * @param {string|undefined} ctx.selectedMode         - 'dinein' | 'takeaway' | 'delivery' | ...
 * @param {string|undefined} ctx.scannedOrderType     - from QR (`type=order_type`)
 * @param {string|undefined} ctx.scannedRoomOrTable   - 'room' | 'table' | 'walkin'
 * @param {string|undefined} ctx.scannedTableId       - table_id from QR
 * @returns {string} one of the otpRequired* flag names
 */
export function pickOtpFlag({
  selectedMode,
  scannedOrderType,
  scannedRoomOrTable,
  scannedTableId,
} = {}) {
  if (scannedRoomOrTable === 'room') return 'otpRequiredRoomOrders';
  if (scannedRoomOrTable === 'walkin') return 'otpRequiredWalkIn';
  if (scannedOrderType === 'delivery' || selectedMode === 'delivery') return 'otpRequiredDelivery';
  if (scannedOrderType === 'takeaway' || selectedMode === 'takeaway') return 'otpRequiredTakeaway';
  if (
    scannedOrderType === 'dinein' &&
    hasAssignedTable(scannedTableId) &&
    scannedRoomOrTable === 'table'
  ) {
    return 'otpRequiredDineInWithTable';
  }
  return 'otpRequiredDineIn';
}

/**
 * Returns true if the password-setup / OTP page should be shown for this flag value.
 * Treats true/undefined/null/missing as "OTP required" (current behaviour).
 * Only an explicit boolean `false` skips the page.
 *
 * @param {string} flagName - one of the otpRequired* keys from pickOtpFlag()
 * @param {object} config   - the restaurant config object (from RestaurantConfigContext)
 * @returns {boolean}
 */
export function shouldShowOtpPage(flagName, config) {
  if (!flagName) return true;
  return config?.[flagName] !== false;
}
