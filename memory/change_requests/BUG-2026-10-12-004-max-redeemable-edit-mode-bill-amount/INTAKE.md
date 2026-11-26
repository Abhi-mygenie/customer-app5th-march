# INTAKE — BUG-2026-10-12-004
## Edit-order mode: `max-redeemable` `bill_amount` sends only new items' sub-total

**Registered by:** Role 2 — Planning Agent (owner ruling 2026-10-12, parked from CR-2026-10-12-003) · **Priority:** P3 · **Risk:** LOW–MEDIUM (hotspot ReviewOrder.jsx)

## What
`ReviewOrder.jsx` L596 calls `crmGetMaxRedeemable(crmToken, subtotal)` where `subtotal = getTotalPrice()` (new cart items only). In edit-order mode `itemTotal = previousSubtotal + subtotal` (L683) is the real pre-tax food value, so the loyalty preview / max redeemable in edit mode is computed on a partial bill.

## Evidence
Code read 2026-10-12; not reproduced live (edit-order flow needs a placed order; POS preprod was down).

## Proposed fix (when picked up)
Pass `itemTotal` instead of `subtotal` to max-redeemable in edit mode (and to CR-002 list `order_total`/validate `order_total` — check CR-2026-10-11-001 ruling on which total POS uses for coupons before changing).

## Status
INTAKE COMPLETE · parked · owner: "leave as-is, separate low-priority item".
