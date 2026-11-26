# QA HANDOVER — BUG-2026-11-26-001

**ID:** BUG-2026-11-26-001  
**Title:** APS price (₹1) display mask — CartBar, ReviewOrder, OrderSuccess  
**Status:** QA  
**Implemented:** 2026-11-26  
**Risk:** LOW — display-only, zero payload/math change  
**Build:** PASS (yarn build, 0 errors)  
**Self-test:** 12/12 PASS (test_reports/iteration_36.json)

---

## What Was Changed (display-only)

| File | Edits | What |
|---|---|---|
| `CartBar.jsx` | 1-A, 1-B, 1-C | Added `cartItems` to useCart(), computed APS mask vars, applied to both normal and edit-mode price display |
| `ReviewOrder.jsx` | 2-A–2-G | Display mask on Item Total, Subtotal, Grand Total, Place Order button; apsItemFoodIds/apsCount captured before clearCart() and passed in all 4 navigate-to-order-success calls |
| `OrderSuccess.jsx` | 3-A–3-D | Reads apsItemFoodIds/apsCount from navigate state; masks top total, per-item price, bill summary Item Total + Subtotal |

**What did NOT change:** CartContext.js, orderService.ts, server.py, any CSS files, any other component.  
**POS payload unchanged:** ₹1 is still sent to POS as intended.

---

## Test Restaurant

| Restaurant | ID | APS items |
|---|---|---|
| The Goan Kitchen | 69 | "check in", "melo fish" (price=1) |
| Public test | 716 | No APS items (use for V-03/V-12) |

---

## QA Test Cases

### CartBar (visible on /menu page when items in cart)

| ID | Steps | Expected |
|---|---|---|
| V-01 | Restaurant 69 → add "check in" only → check cart bottom bar | Shows `APS` NOT `₹1.00` |
| V-02 | Restaurant 69 → add "check in" + any normal item (e.g. ₹100) → check cart bar | Shows `₹100.00 + APS` |
| V-03 | Restaurant 716 → add any item → check cart bar | Shows normal `₹X.XX` unchanged |

### ReviewOrder Price Breakdown

| ID | Steps | Expected |
|---|---|---|
| V-05 | Restaurant 69 → add "check in" only → Review Order → Item Total | `APS` |
| V-06 | Restaurant 69 → add "check in" + ₹100 normal → Review Order → Item Total | `₹100.00 + APS` |
| V-07 | Same all-APS cart → Subtotal row | `APS` |
| V-08 | Same all-APS cart → Grand Total row | `APS` |
| V-09 | All-APS cart → Place Order button | `Place Order (APS)` |
| V-10 | Mixed cart → Place Order button | `Place Order ₹100.00 + APS` |
| V-12 | Normal items only (restaurant 716) → no APS text anywhere in price breakdown | All prices normal |
| V-13 | APS items in cart → APS notice text ("variable pricing (APS)...") still visible | APS notice unchanged |

### OrderSuccess

| ID | Steps | Expected |
|---|---|---|
| V-14 | Place order with APS item (requires live restaurant) → OrderSuccess top total | `APS` or `₹X + APS` |
| V-15 | Place order with APS + normal → top total | `₹{normal} + APS` |
| V-16 | Per-item price for APS item in order list | Shows `APS` |
| V-17 | Per-item price for normal item | Shows `₹X.XX` unchanged |
| V-18/19 | Bill Summary Item Total + Subtotal | Masked |
| V-22 | Navigate directly to `/{restaurantId}/order-success` with no state | Redirects gracefully, no crash |

### Regression — must not have changed

| ID | Check | Expected |
|---|---|---|
| R-01 | Normal cart → place order payload (`order_amount` in network tab) | Still includes ₹1 for APS items |
| R-02 | CartContext `getTotalPrice()` return value | Unchanged (₹1 still included) |
| R-03 | Edit-mode CartBar shows split price (from CR-2026-11-25-003) | Still working |
| R-04 | APS notice text in ReviewOrder | Unchanged |

---

## Already Self-Tested (iteration_36)

V-01, V-02, V-03, V-05, V-06, V-07, V-08, V-09, V-10, V-12, V-13, V-22 — all PASS.

V-14 through V-19 require a live order placement on restaurant 69 — deferred to owner smoke test.

---

## Known Limitation

OrderSuccess APS masking (V-14–V-19) could not be automated without placing a real order on preprod. These require owner smoke test on restaurant 69 or any restaurant with APS items.

After the waiter adjusts the APS price in POS, `liveOrderAmount` polling will update naturally and the mask will lift automatically (guard: `item.price <= 1`).
