# INVESTIGATION REPORT P5 — BUG-2026-11-26-001

**Date:** 2026-11-27
**Role:** Investigation (Role 6) → Implementation (Role 3, owner-approved implicitly via "push this")
**Scope:** Phase 5 — header total and Bill Summary rows still show "+ APS" after waiter price adjustment

---

## Owner Report (screenshot 2026-11-27)

Order #000098 — The Goan Kitchen (restaurant 69)
- melo fish: ₹120.00 (per-item mask lifted ✅ — waiter adjusted)
- moo mwwt: ₹110.00 (normal item ✅)
- Order header: ₹130.00 + APS ❌
- Bill Summary Item Total: ₹130.00 + APS ❌
- Bill Summary Subtotal: ₹130.00 + APS ❌
- Bill Summary Grand Total: ₹130.00 + APS ❌

---

## Root Cause

**Classification:** PLAN_GAP — Phase 3+4 fix added `unitPrice <= 1.5` guard to per-item
mask (data-driven from polling) but header/totals still use `hasSuccessAPS`,
a **static constant** derived once from navigate state.

```js
// Before (static — never updates)
const apsSuccessCount = orderData?.apsCount || 0;
const hasSuccessAPS   = apsSuccessCount > 0;   // ← frozen at order-placement time

// All 4 render sites used this static value:
{hasSuccessAPS ? `₹${...} + APS` : `₹${...}`}
```

When the waiter adjusts an APS item price in POS:
- Polling → `liveOrderItems[i].unitPrice = 120` → per-item mask lifts ✅
- BUT `hasSuccessAPS` remains `true` forever → header + 3 bill rows never clear ❌

---

## Fix Applied — `OrderSuccess.jsx` only

```js
// BUG-2026-11-26-001-P5: live-derived APS gate
const liveHasAPS = liveOrderItems.length > 0
  ? liveOrderItems.some(item =>
      apsSuccessFoodIds.has(String(item.foodId)) &&
      parseFloat(item.unitPrice ?? item.price) <= 1.5
    )
  : hasSuccessAPS;   // fallback before first poll — prevents flash
```

Swapped `hasSuccessAPS` → `liveHasAPS` at all 4 render sites:
1. Order header total (line ~586)
2. Bill Summary Item Total (line ~735)
3. Bill Summary Subtotal (line ~762)
4. Bill Summary Grand Total (line ~803)

Per-item mask unchanged — it already uses `unitPrice <= 1.5` correctly.

---

## Files Changed

| File | Lines | Type |
|---|---|---|
| `frontend/src/pages/OrderSuccess.jsx` | +8 derived value, 4 swaps in JSX | Display only |

**Files NOT changed:** CartContext, ReviewOrder, CartBar, server.py, any payload, any API contract.

---

## Branch

`20261127-012639`

---

## Risk

LOW — display-only. Fallback to `hasSuccessAPS` before first poll prevents any flash.
Waiter-adjusted prices: `unitPrice > 1.5` → `liveHasAPS = false` → all totals show real amounts.

---

*End of Investigation Report P5 — 2026-11-27*
