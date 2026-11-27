# PLANNING DOC — BUG-2026-11-26-001-P5

**ID:** BUG-2026-11-26-001  
**Date:** 2026-11-27  
**Role:** Planning (Role 2)  
**Source:** INVESTIGATION_REPORT_P5.md  
**Stage:** Impact Analysis + Implementation Plan

---

## 1. Items Being Planned (both together — same 2 files)

| # | Issue | Root Cause |
|---|---|---|
| Issue 1 | Header + bill summary totals still show `+ APS` after waiter adjusts | `hasSuccessAPS` is a static constant from navigate state; never re-evaluated from live polling |
| Issue 2 | CGST / SGST rows absent from Bill Summary after waiter adjusts an all-APS cart | `effBS.cgst` is always 0: `displayBillSummary.cgst=0` (APS display math sets APS fullPrice=0) + `billSummary.cgst=0` (transformer hardcodes it, never maps `total_gst_tax_amount` from POS) |

---

## 2. Code Reality Check

### 2.1 Issue 1 — `hasSuccessAPS` is static

**Confirmed in `OrderSuccess.jsx` lines 159–160:**
```js
const apsSuccessCount = orderData?.apsCount || 0;   // frozen at order-placement time
const hasSuccessAPS   = apsSuccessCount > 0;         // static constant, never re-computed
```

**Render sites that use it (all 4 must change):**

| Site | Line | Current guard |
|---|---|---|
| Order header total | ~586 | `hasSuccessAPS && displayTotal != null` |
| Bill Summary — Item Total | ~727 | `hasSuccessAPS` |
| Bill Summary — Subtotal | ~762 | `hasSuccessAPS` |
| Bill Summary — Grand Total | ~803 | `hasSuccessAPS` |

**Per-item mask (line 682) already correct — MUST NOT change:**
```js
apsSuccessFoodIds.has(String(item.foodId ...)) && parseFloat(item.unitPrice ?? item.price) <= 1.5
```
Data-driven from live polling. ✅

---

### 2.2 Issue 2 — `effBS.cgst = 0` always

**Confirmed chain:**

```
orderTransformer.ts line 212:
    cgst: 0,  // "Will be calculated in component" — never is

ReviewOrder.jsx line 738 (taxBreakdownDisplay):
    fullPrice: isAPS(cartItem.item) ? 0 : calculateCartItemPrice(cartItem)
    → all-APS cart → every fullPrice=0 → taxBreakdownDisplay.cgst=0
    → itemCgstDisplay=0 → displayBillSummary.cgst=0

OrderSuccess.jsx line 722:
    const effBS = displayBillSummary || billSummary;
    → displayBillSummary non-null (hasCartAPS=true) → effBS=displayBillSummary
    → effBS.cgst=0 → GST rows never show
```

**POS API probe (order_1578881_probe.json) confirms:**

`total_gst_tax_amount` is an ORDER-LEVEL field denormalized on every detail item:
```json
item[0].total_gst_tax_amount = "15.65"
item[1].total_gst_tax_amount = "15.65"   ← same on all 56 items
item[-1].total_gst_tax_amount = "15.65"
```

The transformer currently ignores this field. `BillSummary` type already has `cgst: number` and `sgst: number`.

**`food_details.tax = 0`** for restaurant 69 items — per-item tax rate not in food_details for this restaurant. Using `total_gst_tax_amount` from the order-level field is the correct source.

---

### 2.3 `effBS` selection problem

Even if `billSummary.cgst` is fixed in the transformer, `effBS = displayBillSummary || billSummary` will still prefer `displayBillSummary` when it is non-null — and `displayBillSummary.cgst = 0`. So `effBS` must be switched to use `billSummary` once APS prices are confirmed by the waiter.

---

## 3. Impact Analysis

| File | Scope | Risk |
|---|---|---|
| `orderTransformer.ts` | Map `total_gst_tax_amount` and `service_gst_tax_amount` from POS API into `billSummary.cgst/sgst/scCgst/scSgst` | LOW — read-only improvement; existing consumers of `billSummary.cgst` only saw 0 before, now see real value |
| `OrderSuccess.jsx` | Add `liveHasAPS`; swap 4 render sites; fix `effBS` selection | LOW — display-only; no payload, no cart math |

**Blast radius:** SMALL. No other component reads from `transformOrderDetails` for GST rows. No payload affected.

**Interaction check:**
- `PreviousOrderItems.jsx` — does NOT use `transformOrderDetails`; unaffected ✅
- `ReviewOrder.jsx` — does NOT use `transformOrderDetails`; unaffected ✅
- `CartBar.jsx` — unaffected ✅
- `server.py` — unaffected ✅

---

## 4. Owner Decisions

**None required.** Investigation already confirmed all options. Proceeding with:
- Mixed cart display: `₹{nonApsTotal} + APS` (already implemented in Phase 3+4)
- GST source: `total_gst_tax_amount` from POS (most accurate, already in every API response)
- GST display timing: show only when `!liveHasAPS` (waiter has adjusted all APS prices)

---

## 5. Implementation Plan

### Files WILL change

1. `frontend/src/api/transformers/orderTransformer.ts`
2. `frontend/src/pages/OrderSuccess.jsx`

### Files WILL NOT change

- `frontend/src/pages/ReviewOrder.jsx`
- `frontend/src/components/CartBar/CartBar.jsx`
- `frontend/src/context/CartContext.js`
- `frontend/src/pages/LandingPage.jsx`
- `backend/server.py`
- Any CSS files
- Order payload fields — POS still receives ₹1 as-is

---

### Edit E-1 — `orderTransformer.ts`: map real cgst/sgst from POS

**Location:** `transformOrderDetails`, lines 198–219 (the `return` block)

**Before:**
```ts
billSummary: {
  itemTotal,
  subtotal,
  cgst: 0,  // Will be calculated in component based on restaurant settings
  sgst: 0,
  vat: 0,
  totalTax: 0,
  discount: 0,
  grandTotal: orderAmount,
},
```

**After:**
```ts
// BUG-2026-11-26-001-P5: read order-level GST from POS (denormalised on every detail item)
const rawFirstItem = api.details?.[0] as any;
const totalGstAmount = parseFloat(rawFirstItem?.total_gst_tax_amount || '0') || 0;
const serviceGstAmount = parseFloat(rawFirstItem?.service_gst_tax_amount || '0') || 0;
const liveCgst   = parseFloat((totalGstAmount / 2).toFixed(2));
const liveSgst   = parseFloat((totalGstAmount - liveCgst).toFixed(2));
const liveScCgst = parseFloat((serviceGstAmount / 2).toFixed(2));
const liveScSgst = parseFloat((serviceGstAmount - liveScCgst).toFixed(2));

billSummary: {
  itemTotal,
  subtotal,
  cgst: liveCgst,
  sgst: liveSgst,
  scCgst: liveScCgst,
  scSgst: liveScSgst,
  vat: 0,
  totalTax: totalGstAmount,
  discount: 0,
  grandTotal: orderAmount,
},
```

**Safety:** `rawFirstItem` cast as `any` — same pattern used in this file for `fOrderStatus` (line 196). `parseFloat(undefined)` → `NaN` → `|| 0` guard. No type error.

---

### Edit E-2 — `OrderSuccess.jsx`: add `liveHasAPS` derived value

**Location:** After line 160 (`const hasSuccessAPS = apsSuccessCount > 0;`), add:

```js
// BUG-2026-11-26-001-P5: live-derived APS gate — lifts when waiter adjusts all APS prices.
// Fallback to static hasSuccessAPS before first poll (liveOrderItems empty) — prevents flash.
const liveHasAPS = liveOrderItems.length > 0
  ? liveOrderItems.some(item =>
      apsSuccessFoodIds.has(String(item.foodId)) &&
      parseFloat(item.unitPrice ?? item.price) <= 1.5
    )
  : hasSuccessAPS;
```

---

### Edit E-3 — `OrderSuccess.jsx`: fix `effBS` selection

**Location:** Line 722 — `const effBS = displayBillSummary || billSummary;`

**Before:**
```js
const effBS = displayBillSummary || billSummary;
```

**After:**
```js
// BUG-2026-11-26-001-P5: when APS confirmed (liveHasAPS=false), use live billSummary
// (which now carries real cgst/sgst from E-1) — displayBillSummary had cgst=0 for all-APS carts.
// When still APS (liveHasAPS=true), keep displayBillSummary for APS=0 masking.
const effBS = liveHasAPS ? (displayBillSummary || billSummary) : billSummary;
```

---

### Edit E-4 — `OrderSuccess.jsx`: swap 4 render sites (`hasSuccessAPS` → `liveHasAPS`)

| Site | Line | Change |
|---|---|---|
| Order header total | ~586 | `hasSuccessAPS` → `liveHasAPS` (×2 in that block) |
| Bill Summary Item Total | ~727 | `hasSuccessAPS` → `liveHasAPS` |
| Bill Summary Subtotal | ~762 | `hasSuccessAPS` → `liveHasAPS` |
| Bill Summary Grand Total | ~803 | `hasSuccessAPS` → `liveHasAPS` (×2 — includes pre-round bracket guard) |

**Per-item mask at line 682 — DO NOT TOUCH.**

---

## 6. Verification Matrix

| ID | Scenario | Expected result | Surface |
|---|---|---|---|
| V-P5-01 | APS item in cart, waiter NOT yet adjusted, polling returns unitPrice=1 | Header: `₹X + APS` or `APS`. Bill rows: `+ APS`. GST rows hidden | Header + Bill Summary |
| V-P5-02 | APS item, waiter adjusts to real price, polling returns unitPrice=120 | Header: `₹120.00`. Bill rows: real amounts. GST rows show (cgst from POS) | Header + Bill Summary |
| V-P5-03 | All-APS cart (both items APS), waiter adjusts both | Header: `₹230.00`. GST rows show CGST/SGST | Header + Bill Summary |
| V-P5-04 | Mixed cart (1 APS + 1 normal), waiter adjusts APS | liveHasAPS=false once BOTH items have unitPrice>1.5. Header: real total | All surfaces |
| V-P5-05 | Before first poll arrives (liveOrderItems=[]) | Falls back to static hasSuccessAPS — no flash, original behavior | Stability |
| V-P5-06 | No APS items in cart (restaurant 716) | hasSuccessAPS=false, liveHasAPS=false. Header/bill normal. GST rows show if cgst>0 | Regression |
| V-P5-07 | Non-APS order at restaurant with no GST (cgst=0 from POS) | GST rows hidden — correct (no tax) | Regression |
| V-P5-08 | Per-item price mask for APS items | Still shows `APS` when unitPrice<=1.5. NOT changed by this plan | Per-item (unchanged) |
| R-01 | POS payload `order_amount` unchanged | ₹1 still sent for unconfirmed APS — not touched | Regression |
| R-02 | CartContext `getTotalPrice()` unchanged | Untouched | Regression |

---

## 7. Exit Gate

```
1. Registry updated
2. Issue tracker updated  
3. File ownership updated
4. Code markers (BUG-2026-11-26-001-P5) added
5. Build/compile: yarn build PASS
6. Self-test: V-P5-01 to V-P5-08 + R-01 + R-02
7. QA handover written
```

---

## 8. Conflicts

None detected. No other active CR touches `OrderSuccess.jsx` or `orderTransformer.ts`.

---

```
Planning complete: BUG-2026-11-26-001-P5
Stage: Impact Analysis + Implementation Plan
Code reality: FULL — all edit locations confirmed, all unknowns resolved
Risk: LOW
Files WILL change: orderTransformer.ts (E-1), OrderSuccess.jsx (E-2, E-3, E-4)
Files WILL NOT touch: ReviewOrder.jsx, CartBar.jsx, CartContext.js, server.py
Owner decisions: none — all resolved in investigation
Docs: memory/change_requests/BUG-2026-11-26-001-aps-price-shows-cart-review-success/PLANNING_DOC_P5.md
Next: Owner approval → Implementation (Role 3)
```
