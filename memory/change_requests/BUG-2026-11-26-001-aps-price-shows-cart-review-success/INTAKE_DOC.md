# INTAKE DOC — BUG-2026-11-26-001

**ID:** BUG-2026-11-26-001
**Type:** BUG (scope gap from CR-2026-11-14-002)
**Title:** APS price (₹1) still shows in CartBar, ReviewOrder price breakdown rows, and Order Success — three surfaces missed by the original APS CR
**Registered:** 2026-11-26
**Status:** INTAKE
**Priority:** P1
**Risk:** LOW

---

## 1. Owner Report (verbatim, screenshots 2026-11-26)

> "the aps item should not show price — its showing when we adding item in cart + order success and review page"
> "backend returns the total with aps price(1) — so it becomes 901 — in place of 900 + aps price"

Screenshots:
- Menu page: cart bottom bar shows "1 Item Added ₹1.00"
- Review Order: Item Total ₹1.00, Subtotal ₹1.00, Grand Total ₹1.00, "Place Order ₹1.00" button
- Order Success: "melo fish x1 ₹1.00", Item Total ₹101.00, Grand Total ₹101.00

---

## 2. Classification

**Type:** BUG — scope gap  
**Parent CR:** CR-2026-11-14-002 (SMOKE) — fixed menu card only  
**Severity:** P1 — customers see confusing ₹1 / ₹101 amounts; no workaround  
**Risk:** LOW — display only; no cart math, no order payload, no API contract change  

---

## 3. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-2026-11-14-002 | APS badge on menu card | PARENT (scope gap, not duplicate) |

CR-2026-11-14-002 fixed the menu card only. This BUG covers the three missed surfaces.

---

## 4. Evidence

### Surface 1 — CartBar.jsx (pre-order)
```
Line 114: ₹${totalPrice.toFixed(2)}
```
`totalPrice = getTotalPrice()` = raw cart sum including ₹1 APS placeholder. No APS guard.

**Expected display:**  
- All items APS: show `APS`  
- Mixed (APS + normal items): show `₹{nonApsTotal} + APS`

### Surface 2 — ReviewOrder.jsx (pre-order, 4 spots)

| Line | Renders | Expected |
|------|---------|----------|
| 2079 | Item Total `₹{itemTotal.toFixed(2)}` | `₹{itemTotal - apsTotal}` + APS or `APS` |
| 2291 | Subtotal `₹{finalSubtotal.toFixed(2)}` | Same masking |
| 2342 | Grand Total `₹{roundedTotal.toFixed(2)}` | Same masking |
| 2396 | "Place Order ₹{roundedTotal.toFixed(2)}" | "Place Order ₹{realTotal} + APS" or "Place Order (APS)" |

APS detection already exists in ReviewOrder (line 2049):
```js
cartItems.some(ci => parseFloat(ci.item?.price) === 1)
```
Reuse this pattern for masking.

### Surface 3 — OrderSuccess.jsx (post-order)

**Different from Surfaces 1 & 2** — data comes from POS via polling:

| Location | Source | Value |
|---|---|---|
| Top total (line 560) | `liveOrderAmount` ← POS `order_amount` | ₹101 |
| Per-item price (line 651) | `item.price` ← POS `unit_price: "1"` | ₹1.00 |
| Bill Summary rows (lines 689, 712) | `billSummary` ← POS `order_sub_total_amount` | ₹101 |

**Root cause for Surface 3:** ReviewOrder navigates to OrderSuccess passing `orderData` (orderId, totalToPay, billSummary) but does NOT pass APS item IDs or APS total. OrderSuccess cannot identify APS items once the cart is cleared.

**Fix path for Surface 3:**
- ReviewOrder derives `apsItemFoodIds` (Set of food IDs with price=1) from cartItems BEFORE navigating
- Passes `apsItemFoodIds` and `apsCount` in `orderData`
- OrderSuccess uses these to mask: `₹{grandTotal - apsCount}` and "APS" per-item

---

## 5. Blast Radius

| File | Surface | Change type |
|---|---|---|
| `frontend/src/components/CartBar/CartBar.jsx` | Cart bar price | Display mask |
| `frontend/src/pages/ReviewOrder.jsx` | 4 price rows + Place Order button | Display mask (reuse existing hasAPS detection) |
| `frontend/src/pages/ReviewOrder.jsx` | 4 navigate calls to order-success | Add `apsItemFoodIds`, `apsCount` to `orderData` |
| `frontend/src/pages/OrderSuccess.jsx` | Top total, per-item price, Bill Summary rows | Display mask using passed `apsItemFoodIds` |

**Files WILL NOT change:**
- `CartContext.js` — cart math unchanged
- `orderService.ts` — API payloads unchanged
- `server.py` — backend unchanged
- `PromoBanner.jsx`, auth files — untouched

---

## 6. Owner Decisions Needed

1. **Mixed cart display (APS + normal items):** When cart has ₹100 normal + ₹1 APS item, show:
   - Option A: `₹100 + APS` (recommended — clearest)
   - Option B: `₹100` (hide APS price completely)
   - Option C: `₹101` as-is (no change)

2. **Place Order button (all-APS cart):** Show:
   - Option A: `Place Order (APS)` (recommended)
   - Option B: `Place Order` (no price at all)

3. **Order Success after waiter adjusts price in POS:** The polling will naturally update `liveOrderAmount` to the real confirmed price. Once that happens, should we still show "APS" badge for the item or switch to the confirmed real price?
   - Recommendation: Show real price once POS updates (polling handles this automatically; APS mask only applies when price is still ₹1)

---

## 7. Ready for Planning

All code reality confirmed. No owner decisions block planning — planning can proceed with Option A defaults and document the choices. Owner can override at review.

---

**Intake complete: BUG-2026-11-26-001**
Classification: BUG (scope gap)
Severity: P1 | Risk: LOW
Duplicate check: DISTINCT (parent: CR-2026-11-14-002)
Evidence: captured (3 screenshots + code investigation)
Blast radius: SMALL (3 files, display only)
Next: Planning (Role 2) → owner approval → Implementation
