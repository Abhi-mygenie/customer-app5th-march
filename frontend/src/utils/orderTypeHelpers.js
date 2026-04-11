/**
 * Order Type Helpers
 * Single source of truth for order type checks across the app.
 * 
 * 4 channels: dinein, room, takeaway, delivery
 * - dinein & room: require table/room selection
 * - takeaway & delivery: no table needed
 */

/**
 * Check if order type requires a table/room (dine-in or room service)
 * Also returns true for null/undefined orderType (backward compat — old QR codes without orderType param)
 * @param {string|null|undefined} orderType
 * @returns {boolean}
 */
export const isDineInOrRoom = (orderType) => {
  return !orderType || orderType === 'dinein' || orderType === 'room';
};

/**
 * Check if order type is takeaway or delivery
 * @param {string|null|undefined} orderType
 * @returns {boolean}
 */
export const isTakeawayOrDelivery = (orderType) => {
  return orderType === 'takeaway' || orderType === 'delivery' || orderType === 'take_away';
};

/**
 * Check if the order type needs table status checking
 * Only dine-in and room orders need table occupancy checks
 * @param {string|null|undefined} orderType 
 * @returns {boolean}
 */
export const needsTableCheck = (orderType) => {
  return isDineInOrRoom(orderType);
};

/**
 * Check if Call Waiter / Pay Bill actions are relevant for this order type
 * Only relevant for dine-in and room service
 * @param {string|null|undefined} orderType
 * @returns {boolean}
 */
export const showsDineInActions = (orderType) => {
  return isDineInOrRoom(orderType);
};
