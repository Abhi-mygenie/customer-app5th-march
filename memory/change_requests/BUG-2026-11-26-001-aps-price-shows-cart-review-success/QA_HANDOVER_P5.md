# QA HANDOVER — BUG-2026-11-26-001-P5

**ID:** BUG-2026-11-26-001-P5
**Title:** APS price — header/totals still show "+ APS" after waiter adjusts + GST rows missing
**Status:** QA
**Implemented:** 2026-11-27
**Risk:** LOW — display-only, zero payload/math change
**Build:** PASS (yarn build, 0 errors)

---

## What Changed

| Edit | File | What |
|---|---|---|
| E-1 | `orderTransformer.ts` | Maps `total_gst_tax_amount` and `service_gst_tax_amount` from POS API into `billSummary.cgst/sgst/scCgst/scSgst` (was hardcoded 0 — "Will be calculated in component" but never was) |
| E-2 | `OrderSuccess.jsx` | Added `liveHasAPS` — derived from `liveOrderItems.unitPrice ≤ 1.5`, falls back to static `hasSuccessAPS` before first poll |
| E-3 | `OrderSuccess.jsx` | `effBS` now uses live `billSummary` (not `displayBillSummary`) when `!liveHasAPS` — so real cgst/sgst from E-1 flows into GST rows |
| E-4 | `OrderSuccess.jsx` | Swapped `hasSuccessAPS` → `liveHasAPS` at all 4 header/total render sites |

**What did NOT change:** ReviewOrder.jsx, CartBar.jsx, CartContext.js, server.py, all CSS, all API payloads, POS ₹1 placeholder.

---

## Test Restaurant

| Restaurant | ID | APS items |
|---|---|---|
| The Goan Kitchen | 69 | "melo fish", "check in" (aps=yes, unit_price=1 until waiter adjusts) |

---

## QA Test Cases

### Issue 1 — Header and totals clear when waiter adjusts APS price

| ID | Steps | Expected |
|---|---|---|
| V-P5-01 | Restaurant 69 → place order with APS item (melo fish) → open OrderSuccess **before** waiter adjusts | Header: `₹X + APS` or `APS`. Bill rows: `+ APS`. GST rows hidden (price still ₹1). |
| V-P5-02 | Same order → waiter adjusts melo fish price in POS → wait for polling (≤30s) | Header: real `₹X`. Bill rows: real amounts (no `+ APS`). GST rows **appear** with CGST/SGST. |
| V-P5-03 | Place order with both items as APS → waiter adjusts both prices | Header and all bill rows show real combined total. GST rows show. |

### Issue 2 — GST rows appear after waiter adjusts price

| ID | Steps | Expected |
|---|---|---|
| V-P5-04 | Same as V-P5-02 after waiter adjust | CGST row shows `₹X.XX`. SGST row shows `₹X.XX`. Grand Total = Subtotal + CGST + SGST. |
| V-P5-05 | Order at restaurant with no GST (food_details.tax=0, total_gst_tax_amount=0) | GST rows absent — correct (no tax on this order) |

### Regression — per-item mask unchanged

| ID | Steps | Expected |
|---|---|---|
| V-P5-06 | APS item, waiter NOT yet adjusted (unitPrice=1) | Per-item price shows `APS` — unchanged |
| V-P5-07 | APS item, waiter adjusted to ₹100 | Per-item price shows `₹100.00` — unchanged |
| V-P5-08 | Normal item (non-APS) | Per-item price shows normal `₹X.XX` — unchanged |

### Regression — payload / cart math unchanged

| ID | Check | Expected |
|---|---|---|
| R-01 | POS payload `order_amount` in network tab during place-order | Still includes ₹1 for APS items — untouched |
| R-02 | CartContext `getTotalPrice()` | Unchanged |
| R-03 | CartBar price display | Unchanged |
| R-04 | ReviewOrder price breakdown | Unchanged |
| R-05 | Non-APS order at restaurant 716 | All prices normal, no APS text |

---

## Known Limitation

V-P5-01 to V-P5-05 require a live order placement on restaurant 69 and a waiter to adjust the APS price in the POS. Cannot be fully automated without live preprod access.

V-P5-06 to R-05 (regression) can be verified without placing a real order.
