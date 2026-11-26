// BUG-2026-11-26-001-P2: APS price=0 display
// Centralised APS detection helper.
// Primary: aps==="yes" from POS API (reliable, POS-authoritative).
// Fallback: price===1 for items loaded from cache before transformer update.
export const isAPS = (item) =>
  item?.aps === 'yes' ||
  (item?.aps === undefined && parseFloat(item?.price) === 1);
