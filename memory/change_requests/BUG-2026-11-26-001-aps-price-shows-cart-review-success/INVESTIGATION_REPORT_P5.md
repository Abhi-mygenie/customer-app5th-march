# INVESTIGATION REPORT P5 — BUG-2026-11-26-001

**Date:** 2026-11-27
**Role:** Investigation (Role 6) — no code changes
**Scope:** Two distinct display failures on OrderSuccess post-waiter-adjustment:
  1. Header and Bill Summary totals still show "+ APS" after waiter adjusts price
  2. GST rows (CGST / SGST) completely absent from Bill Summary

---

## Screenshots

| Order | Symptom |
|---|---|
| #000098 (first report) | melo fish shows ₹120 (per-item mask lifted) BUT header ₹130 + APS, all bill rows ₹130 + APS |
| #000099 (this report) | Header ₹205 (no APS — my reverted fix had run), bill rows ₹200 clean, but **CGST/SGST rows absent** despite ₹5 tax in Grand Total |

---

## Issue 1 — Header and totals still show "+ APS" after waiter adjusts price

### Root cause: `hasSuccessAPS` is a static constant, never re-evaluated from polling

**File:** `frontend/src/pages/OrderSuccess.jsx` lines 159–160

```js
const apsSuccessCount = orderData?.apsCount || 0;   // ← frozen at order-placement time
const hasSuccessAPS   = apsSuccessCount > 0;         // ← static constant, never updates
```

**Per-item mask (lines 682–685) — works correctly:**
```js
(apsSuccessFoodIds.has(String(item.foodId ...))
  && parseFloat(item.unitPrice ?? item.price) <= 1 + 0.5)   // ← live from polling
  ? 'APS' : `₹${...}`
```
Two conditions AND-ed: food ID in APS set **AND** `unitPrice <= 1.5`.
After waiter sets price to ₹120 → polling returns `unitPrice=120` → `120 <= 1.5 = false` → mask lifts. ✅

**Header (lines 578–597) and all three Bill Summary rows (Item Total, Subtotal, Grand Total):**
```js
{hasSuccessAPS && displayTotal != null
  ? `₹${parseFloat(displayTotal).toFixed(2)} + APS`   // ← always fires
  ...
```
`hasSuccessAPS` is never re-computed from live data. No code path sets it false.

### Data flow — exact divergence:
```
Polling → setLiveOrderItems()      → unitPrice = 120 → per-item mask lifts ✅
Polling → setLiveOrderAmount(230)  → header still uses hasSuccessAPS=true →
                                     shows "₹130 + APS" forever              ❌
Polling → setBillSummary(live)     → totals still gate on hasSuccessAPS=true →
                                     shows "₹130 + APS" forever              ❌
```

---

## Issue 2 — GST rows absent from Bill Summary (Order #000099)

### Root cause: both `effBS.cgst` sources are always 0 for all-APS carts

**File A:** `frontend/src/api/transformers/orderTransformer.ts` lines 211–213

```ts
billSummary: {
  itemTotal,
  subtotal,
  cgst: 0,  // Will be calculated in component based on restaurant settings
  sgst: 0,
  ...
}
```
The transformer explicitly hardcodes `cgst: 0` and `sgst: 0`. The comment says "calculated in component" — but OrderSuccess **never calculates** cgst/sgst from scratch. It only reads them.

**File B:** `frontend/src/pages/ReviewOrder.jsx` lines 734–752 — `taxBreakdownDisplay`

```js
const taxBreakdownDisplay = useMemo(() => {
  const newItems = cartItems.map(cartItem => ({
    fullPrice: isAPS(cartItem.item) ? 0 : calculateCartItemPrice(cartItem),  // ← APS = 0
    taxPercent: parseFloat(cartItem.item.tax) || 0,
    ...
  }));
  return calculateTaxBreakdown([...newItems, ...prevItems], isGstEnabled);
});
```
When ALL items in the cart are APS, every `fullPrice = 0` → `calculateTaxBreakdown` returns `cgst: 0, sgst: 0`.

This feeds:
```js
const itemCgstDisplay = parseFloat((taxBreakdownDisplay.cgst * discountRatioDisp).toFixed(2));
// → 0 * anything = 0
```

And into:
```js
displayBillSummary: hasCartAPS ? {
  ...
  cgst: itemCgstDisplay,   // → 0
  sgst: itemSgstDisplay,   // → 0
} : null,
```

**OrderSuccess GST rows gate (line 768):**
```jsx
{/* D-2A — hide GST rows when APS-only (effBS.cgst===0) */}
{effBS.cgst > 0 && <CGST row />}
{effBS.sgst > 0 && <SGST row />}
```

Where `effBS = displayBillSummary || billSummary`.

**Result for all-APS cart after waiter adjusts both items:**

| Source | `cgst` value | Why |
|---|---|---|
| `displayBillSummary` | 0 | All APS → fullPrice=0 in display math → no GST computed |
| `billSummary` (live API) | 0 | Transformer hardcodes it; "to be calc in component" but never is |
| `effBS` | 0 | Both sources are 0 |
| GST rows render? | ❌ Never | `effBS.cgst > 0` is always false |

The D-2A comment was designed correctly — hide GST when APS-only. But the **reverse path** (GST reappearing once waiter adjusts all items to real prices) was never built. After adjustment, the live bill has ₹5 tax (₹2.50 CGST + ₹2.50 SGST) which is visible in `grandTotal - subtotal`, but neither display source knows this.

---

## Interaction Between the Two Issues

Both share the same structural cause: **the display layer is frozen at order-placement time and cannot react to waiter price adjustments from POS**. 

The per-item price (Phase 4 fix) was correctly made data-driven (`unitPrice <= 1.5` from live polling). The same approach is needed for the totals (Issue 1) and for the GST rows (Issue 2).

---

## Fix Path — Planning Only (no code here)

### For Issue 1 — replace `hasSuccessAPS` with a live-derived gate:

```js
// Derive from liveOrderItems once polling has data; fall back to static before first poll
const liveHasAPS = liveOrderItems.length > 0
  ? liveOrderItems.some(item =>
      apsSuccessFoodIds.has(String(item.foodId)) &&
      parseFloat(item.unitPrice ?? item.price) <= 1.5
    )
  : hasSuccessAPS;
```
Swap `hasSuccessAPS` → `liveHasAPS` at all 4 render sites (header, Item Total, Subtotal, Grand Total).

### For Issue 2 — derive live CGST/SGST from billing data once prices are known:

**Option A (recommended):** When `liveOrderItems` are populated and waiter-adjusted, compute a `liveEffCgst / liveEffSgst` from the GST-eligible items in `liveOrderItems` using their `unitPrice` × `taxPercent`:
```
liveEffCgst = liveOrderItems
  .filter(item => item.unitPrice > 1.5)   // only adjusted/real items
  .reduce((s, item) => s + computeItemCgst(item), 0)
```
Show GST rows when `liveEffCgst > 0` (overrides `effBS.cgst`).

**Option B (simpler, less accurate):** When `!liveHasAPS` and `billSummary.grandTotal > billSummary.subtotal`:
Derive: `liveTotalTax = billSummary.grandTotal - billSummary.subtotal`, show as split CGST/SGST rows without line-item detail. Requires knowing the GST rate — available from `restaurant.gst_tax_percent`.

**Unknown needed before planning:** Does `liveOrderItems[i].taxPercent` survive the transform chain into `liveOrderItems`? Check `transformOrderItem` / `transformPreviousOrderItem` for `taxPercent` preservation.

---

## Files That Will Change (Planning TBD)

| File | Issue | Change type |
|---|---|---|
| `frontend/src/pages/OrderSuccess.jsx` | 1 + 2 | Display-only: add live-derived gate + live GST rows |
| `frontend/src/api/transformers/orderTransformer.ts` | 2 (Option A only) | Preserve `taxPercent` per item in `transformOrderItem` |

**Will NOT change:** CartContext, ReviewOrder payload, server.py, POS API contracts, APS ₹1 placeholder.

---

## Classification

| Issue | Type | Risk | Confidence |
|---|---|---|---|
| Issue 1 — static `hasSuccessAPS` | PLAN_GAP | LOW | HIGH |
| Issue 2 — `effBS.cgst = 0` always | PLAN_GAP | LOW | HIGH |

Steps used: 10/10

---

## OWNER APPROVAL REQUIRED
```
OWNER APPROVAL REQUIRED
Reason: Investigation complete. Two root causes confirmed.
        Ready for Planning (Role 2) → owner approval → Implementation.
        One unknown: taxPercent preservation in transformOrderItem — 
        planning agent must verify before proposing final edit list.
Risk: LOW (display-only, zero payload/math change)
Proposed next step: Planning (Role 2) for both Issue 1 and Issue 2 together.
I will not proceed until owner approves.
```
