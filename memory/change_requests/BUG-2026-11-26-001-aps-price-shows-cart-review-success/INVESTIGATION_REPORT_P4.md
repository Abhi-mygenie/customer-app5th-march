# INVESTIGATION REPORT P4 — BUG-2026-11-26-001

**Date:** 2026-11-27
**Role:** Investigation (Role 6) — 3 root causes, full POS API probe
**Scope:** Phase 4 — RC-1 (LandingPage), RC-2 (fullPrice vs unit_price), RC-3 (PreviousOrderItems)

---

## Owner Report (5 screenshots, 2026-11-27)

1. OrderSuccess: older order items showing ₹1.00 for melo fish (Served)
2. OrderSuccess: melo fish + Boli + mappu×1 showing ₹21.00 instead of APS
3. OrderSuccess: melo fish + mappu×6 showing ₹61.00 instead of APS
4. ReviewOrder edit mode "Previously Ordered": melo fish showing ₹1.00/₹21.00/₹61.00
5. Update Order button showing price (separate issue → BUG-2026-11-27-001)

---

## POS API Probe — order 1578881

**Endpoint:** `GET /api/air-bnb/get-order-details/1578881`
**File persisted:** `/app/memory/order_1578881_probe.json` (56 line items)

**Key finding:** `unit_price = "1.00"` for ALL unconfirmed APS items regardless of variation/addon quantity.

| Item | unit_price | total_variation | total_add_on | Expected display |
|---|---|---|---|---|
| melo fish (no addon) | 1.00 | 0 | 0 | APS |
| melo fish + boli | 1.00 | 10 | 0 | APS |
| melo fish + boli + mappu×1 | 1.00 | 10 | 10 | APS |
| melo fish + mappu×6 | 1.00 | 0 | 60 | APS |
| melo fish + boli (waiter→89) | **89.00** | 20 | 0 | ₹198.00 |

**`food_details.aps` field:** NOT present in order-details response (only in menu endpoint).

---

## Root Cause 1 — LandingPage navigate calls missing APS data

**Files:** `LandingPage.jsx` lines 330–337 and 694–702
**Root cause:** Both OrderSuccess navigate paths pass only `{orderId, totalToPay, billSummary}`. No `apsItemFoodIds`. On QR scan or page refresh, `apsSuccessFoodIds = new Set([])` → no masking.
**Fix:** Derive from `orderDetails.previousItems` using `unitPrice <= 1`.

---

## Root Cause 2 — fullPrice used in APS mask instead of unit_price

**Data flow:**
```
POS: unit_price=1, total_add_on_price=60 (mappu×6)
→ transformOrderItem: fullPrice = 1 + 60 = 61
→ OrderSuccess line 291: price = fullPrice (61), discards basePrice (1)
→ APS mask: 61 <= 1.5 → FALSE → shows ₹61
```

**Fix:** Add `unitPrice: basePrice` to `transformOrderItem` + preserve in `liveOrderItems` + change mask to `unitPrice <= 1.5`.

**Note:** `transformPreviousOrderItem` already had `unitPrice: basePrice` (line 158). `transformOrderItem` was missing it. TypeScript `OrderItem` interface also needed `unitPrice?: number` field.

---

## Root Cause 3 — PreviousOrderItems.jsx no APS masking

**File:** `PreviousOrderItems.jsx` line 162
**Root cause:** `₹{(fullPrice × qty).toFixed(2)}` — always numeric, no APS check. `item.unitPrice` IS available from `transformPreviousOrderItem`.
**Collapsed header subtotal:** line 103 also includes APS `fullPrice` amounts (wrong).
**Fix:** Add `unitPrice <= 1` check on per-item price + skip APS items in subtotal.

---

## Existing flows confirmed unaffected

- Non-APS items (₹100): `apsSuccessFoodIds.has(fid) = false` → unchanged
- Waiter-adjusted APS (unit_price=89): `89 > 1.5` → shows real price
- Bill Summary, CartBar, ReviewOrder totals: not touched
- POS payload: not touched

---

## Files Changed (Phase 4)

```
frontend/src/pages/LandingPage.jsx                                (Edit 1, 2 — RC-1)
frontend/src/api/transformers/orderTransformer.ts                 (Edit 3 — RC-2)
frontend/src/types/models/order.types.ts                          (unitPrice? — TypeScript fix)
frontend/src/pages/OrderSuccess.jsx                               (Edit 4, 5 — RC-2)
frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx (Edit 6, 7 — RC-3)
```

---

*End of Investigation Report P4 — 2026-11-27*
