# Service Charge Mapping — Implementation Handover

| Field | Value |
|---|---|
| **CR name** | `SERVICE_CHARGE_MAPPING` |
| **Repo** | `https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| **Branch** | `main` |
| **Base commit** | `7ddb458331980d88faf4fd95182cd73f24ff464a` |
| **Author** | Planning Agent (E1) |
| **Status** | ✅ Approved by stakeholder — ready for implementation |
| **Scope** | Frontend-only. No backend changes. |
| **Last updated** | 2026-05-02 |

---

## 1. Requirement (one paragraph)

Map three keys returned by the `restaurant_details` API into the existing customer-ordering billing flow so that a "service charge" line + its GST tax flow through the price breakdown UI, the bill summary on OrderSuccess, and all three order-API payload writers. The three keys are `auto_service_charge` (on/off), `service_charge_percentage` (rate %), and `service_charge_tax` (GST rate % to apply on the service-charge amount). When the keys are absent or `auto_service_charge !== 'Yes'`, the app must behave **byte-identically to today** (zero regression).

---

## 2. Locked business rules

| # | Rule |
|---|---|
| R1 | **Apply gate:** `auto_service_charge === 'Yes'` AND `parseFloat(service_charge_percentage) > 0`. No master switch beyond `auto_service_charge`. |
| R2 | **SC base:** `subtotalAfterDiscount` (i.e. `itemTotal − pointsDiscount`, clamped at 0). Loyalty discount **does** reduce the SC base. |
| R3 | **GST on SC:** `serviceCharge × parseFloat(service_charge_tax) / 100`, gated by restaurant-level `gst_status === true \|\| 'Yes'`. If GST is off OR `service_charge_tax = 0` ⇒ `gstOnServiceCharge = 0` (SC still applies). |
| R4 | **GST split:** GST on SC merges into the existing GST bucket → CGST/SGST 50/50 split (same as item-level GST). VAT bucket is **never** affected by SC. |
| R5 | **Rounding:** All intermediates raw. Single `Math.ceil` at the very end, gated by `restaurant.total_round === 'Yes'`. |
| R6 | **Edit mode:** Frontend recomputes everything client-side from current cart + previous items. If frontend doesn't recompute, API values hold. |
| R7 | **Three payload writers:** `buildMultiMenuPayload`, normal `placeOrder`, `updateCustomerOrder` — all updated identically. |
| R8 | **Fields not new:** All 8 affected payload fields already exist in the real 716 payload (validated). |
| R9 | **`service_gst_tax_amount`:** Stays hardcoded `0`. Stakeholder directive — do not populate. |

---

## 3. Locked math

```js
// === Inputs from restaurant_details API ===
const scAutoApply  = restaurant?.auto_service_charge === 'Yes';
const scPct        = parseFloat(restaurant?.service_charge_percentage) || 0;
const scGstRate    = parseFloat(restaurant?.service_charge_tax)        || 0;
const isGstEnabled = restaurant?.gst_status === true || restaurant?.gst_status === 'Yes';
const applyServiceCharge = scAutoApply && scPct > 0;

// === Existing (untouched) ===
// itemTotal             = previousSubtotal + subtotal           // ReviewOrder.jsx:575
// subtotalAfterDiscount = max(0, itemTotal - pointsDiscount)    // ReviewOrder.jsx:578
// discountRatio         = itemTotal > 0 ? subAft/itemTotal : 1  // ReviewOrder.jsx:581
// adjustedCgst/Sgst/Vat = original × discountRatio              // ReviewOrder.jsx:582-584

// === NEW: Service charge ===
const serviceCharge = applyServiceCharge
                      ? subtotalAfterDiscount * scPct / 100
                      : 0;

// === NEW: GST on service charge ===
const gstOnServiceCharge = (applyServiceCharge && isGstEnabled && scGstRate > 0)
                            ? serviceCharge * scGstRate / 100
                            : 0;
const scCgst = gstOnServiceCharge / 2;
const scSgst = gstOnServiceCharge / 2;

// === Aggregates ===
const finalCgst     = adjustedCgst + scCgst;
const finalSgst     = adjustedSgst + scSgst;
const finalVat      = adjustedVat;                          // VAT untouched
const finalTotalTax = finalCgst + finalSgst + finalVat;

// === Final subtotal & total ===
const finalSubtotal = subtotalAfterDiscount + serviceCharge;
const totalToPay    = finalSubtotal + finalTotalTax;
const isRoundingEnabled = restaurant?.total_round === 'Yes';
const roundedTotal      = isRoundingEnabled ? Math.ceil(totalToPay) : totalToPay;
```

### Worked example
SC=5%, `service_charge_tax`=18%, no discount, GST enabled. Cart: ₹200 (GST 18%) + ₹300 (GST 18%) + ₹100×2 (GST 18%) + ₹500 (VAT 22%).

```
itemTotal             = 1200.00
subtotalAfterDiscount = 1200.00          // no discount
serviceCharge         = 1200 × 5/100      = 60.00
gstOnServiceCharge    = 60 × 18/100       = 10.80   (CGST 5.40 / SGST 5.40)
itemGst (existing)    = 700 × 18/100      = 126.00  (CGST 63 / SGST 63)
itemVat (existing)    = 500 × 22/100      = 110.00
finalCgst             = 63 + 5.40         = 68.40
finalSgst             = 63 + 5.40         = 68.40
finalVat                                  = 110.00
finalTotalTax                             = 246.80
finalSubtotal         = 1200 + 60         = 1260.00
totalToPay            = 1260 + 246.80     = 1506.80
roundedTotal (ceil if total_round=Yes)    = 1507
```

---

## 4. Payload mapping (validated against real 716 payload)

All three writers (`buildMultiMenuPayload`, `placeOrder` normal, `updateCustomerOrder`) carry identical SC fields:

| Field | New value | Replaces |
|---|---|---|
| `order_sub_total_without_tax` | `itemTotal` (raw, pre-SC, pre-discount) | currently duplicates `_amount` |
| `order_sub_total_amount` | `finalSubtotal` (= subtotalAfterDiscount + serviceCharge) | currently = `subtotal` (= itemTotal) |
| `total_service_tax_amount` | `serviceCharge` | hardcoded `0` |
| `total_gst_tax_amount` | `finalCgst + finalSgst` | currently item-GST only |
| `total_vat_tax_amount` | `finalVat` (untouched) | unchanged |
| `tax_amount` (root) | `finalTotalTax` | derivative — already a sum |
| `order_amount` | `roundedTotal` (already passed in via `orderData.totalToPay`) | unchanged behaviour |
| `discount_amount` | `pointsDiscount` (existing, untouched) | unchanged |
| `service_gst_tax_amount` | `0` (per R9) | unchanged |

---

## 5. Files in scope — implementation steps

### 5.1 `frontend/src/utils/taxCalculation.js`

**Why:** This is the single source of truth for tax. To keep that property, extend `calculateTaxBreakdown` to optionally fold service-charge GST into the GST bucket *before* the CGST/SGST 50/50 split. This avoids divergent bucket math across call sites.

**Add a new optional 3rd parameter `serviceChargeGst` (number) — the *already-computed* GST-on-SC amount, NOT a rate.** The caller computes it. The util just adds it to `totalGst` before splitting.

```js
// BEFORE (lines 34-54)
export const calculateTaxBreakdown = (items, isGstEnabled) => {
  let totalGst = 0;
  let totalVat = 0;
  items.forEach(({ fullPrice, quantity, taxPercent, taxType, isCancelled }) => {
    if (isCancelled) return;
    const { gst, vat } = calculateItemTax(fullPrice, quantity, taxPercent, taxType, isGstEnabled);
    totalGst += gst;
    totalVat += vat;
  });
  totalGst = parseFloat(totalGst.toFixed(2));
  totalVat = parseFloat(totalVat.toFixed(2));
  const cgst = parseFloat((totalGst / 2).toFixed(2));
  const sgst = parseFloat((totalGst / 2).toFixed(2));
  const totalTax = parseFloat((totalGst + totalVat).toFixed(2));
  return { cgst, sgst, totalGst, vat: totalVat, totalTax };
};

// AFTER — additive 3rd arg, defaults to 0 ⇒ zero regression
export const calculateTaxBreakdown = (items, isGstEnabled, serviceChargeGst = 0) => {
  let totalGst = 0;
  let totalVat = 0;
  items.forEach(({ fullPrice, quantity, taxPercent, taxType, isCancelled }) => {
    if (isCancelled) return;
    const { gst, vat } = calculateItemTax(fullPrice, quantity, taxPercent, taxType, isGstEnabled);
    totalGst += gst;
    totalVat += vat;
  });
  // Fold SC-GST into GST bucket BEFORE split
  totalGst += (parseFloat(serviceChargeGst) || 0);
  totalGst = parseFloat(totalGst.toFixed(2));
  totalVat = parseFloat(totalVat.toFixed(2));
  const cgst = parseFloat((totalGst / 2).toFixed(2));
  const sgst = parseFloat((totalGst / 2).toFixed(2));
  const totalTax = parseFloat((totalGst + totalVat).toFixed(2));
  return { cgst, sgst, totalGst, vat: totalVat, totalTax };
};
```

**Must not change:** `calculateItemTax` (lines 17–25). Per-item math stays identical.

---

### 5.2 `frontend/src/pages/ReviewOrder.jsx`

**(a) Read 3 keys (after `useRestaurantDetails(restaurantId)` around line ~120):**

```js
const scAutoApply  = restaurant?.auto_service_charge === 'Yes';
const scPct        = parseFloat(restaurant?.service_charge_percentage) || 0;
const scGstRate    = parseFloat(restaurant?.service_charge_tax)        || 0;
const applyServiceCharge = scAutoApply && scPct > 0;
```

**(b) Compute `serviceCharge` and `gstOnServiceCharge` immediately after `subtotalAfterDiscount` (line 578):**

```js
const subtotalAfterDiscount = Math.max(0, itemTotal - pointsDiscount);   // existing line 578

// NEW
const serviceCharge      = applyServiceCharge
                           ? subtotalAfterDiscount * scPct / 100
                           : 0;
const isGstEnabled       = restaurant?.gst_status === true || restaurant?.gst_status === 'Yes';   // already exists at line 524 inside useMemo — re-derive here for outer scope
const gstOnServiceCharge = (applyServiceCharge && isGstEnabled && scGstRate > 0)
                           ? serviceCharge * scGstRate / 100
                           : 0;
```

**(c) Update the `taxBreakdown` useMemo (lines 523–569):** pass `gstOnServiceCharge` as the new 3rd arg to `calculateTaxBreakdown`.

⚠️ **Important:** Because `gstOnServiceCharge` depends on `subtotalAfterDiscount` which depends on `pointsDiscount`, and `taxBreakdown` is currently a `useMemo` whose result is *then* multiplied by `discountRatio`, the new SC-GST must be folded in **after** the discount-ratio adjustment, not via `calculateTaxBreakdown`'s arg.

**Revised approach — keep `calculateTaxBreakdown` signature unchanged in 5.1, add SC-GST OUTSIDE the useMemo:**

```js
// REVISED for 5.1: do NOT extend calculateTaxBreakdown; revert to original signature.
// Service-charge GST is added in ReviewOrder.jsx after discount-ratio adjustment, like this:

// existing — unchanged
const { cgst, sgst, totalGst, vat, totalTax } = taxBreakdown;
const itemTotal              = previousSubtotal + subtotal;
const subtotalAfterDiscount  = Math.max(0, itemTotal - pointsDiscount);
const discountRatio          = itemTotal > 0 ? subtotalAfterDiscount / itemTotal : 1;
const adjustedCgst           = parseFloat((cgst * discountRatio).toFixed(2));
const adjustedSgst           = parseFloat((sgst * discountRatio).toFixed(2));
const adjustedVat            = parseFloat((vat  * discountRatio).toFixed(2));

// NEW — service-charge block
const serviceCharge      = applyServiceCharge ? subtotalAfterDiscount * scPct / 100 : 0;
const gstOnServiceCharge = (applyServiceCharge && isGstEnabled && scGstRate > 0)
                            ? serviceCharge * scGstRate / 100 : 0;
const scCgst             = parseFloat((gstOnServiceCharge / 2).toFixed(2));
const scSgst             = parseFloat((gstOnServiceCharge / 2).toFixed(2));

// MODIFIED — final aggregates
const finalCgst     = parseFloat((adjustedCgst + scCgst).toFixed(2));
const finalSgst     = parseFloat((adjustedSgst + scSgst).toFixed(2));
const finalVat      = adjustedVat;                                     // VAT untouched
const finalTotalTax = parseFloat((finalCgst + finalSgst + finalVat).toFixed(2));

// MODIFIED — final subtotal includes SC
const finalSubtotal = parseFloat((subtotalAfterDiscount + serviceCharge).toFixed(2));
const totalToPay    = parseFloat((finalSubtotal + finalTotalTax).toFixed(2));   // was: subtotalAfterDiscount + adjustedTotalTax (line 588)

// existing — unchanged
const isRoundingEnabled = restaurant?.total_round === 'Yes';
const roundedTotal      = isRoundingEnabled ? Math.ceil(totalToPay) : totalToPay;
const hasRoundingDiff   = isRoundingEnabled && roundedTotal !== totalToPay;
```

> **Action:** Revert step 5.1 — `taxCalculation.js` does NOT need to change. Keep the SC-GST fold-in in `ReviewOrder.jsx` so loyalty-discount math (which already uses `discountRatio`) stays untouched. Note that **discount does not apply to SC-GST** because SC is computed AFTER discount; this is the desired behaviour.

**(d) Update `buildBillSummary` helper (line 36–47) — add `serviceCharge`:**

```js
const buildBillSummary = ({ itemTotal, pointsDiscount, pointsToRedeem, subtotalAfterDiscount, serviceCharge, adjustedCgst, adjustedSgst, adjustedVat, finalCgst, finalSgst, finalVat, finalTotalTax, finalSubtotal, roundedTotal, hasRoundingDiff, totalToPay }) => ({
  itemTotal,
  pointsDiscount,
  pointsRedeemed: pointsToRedeem,
  serviceCharge,                    // NEW
  subtotal: finalSubtotal,          // CHANGED: was subtotalAfterDiscount; now post-SC
  subtotalBeforeServiceCharge: subtotalAfterDiscount,   // NEW (optional, for OrderSuccess to optionally show)
  cgst: finalCgst,                  // CHANGED: includes SC-CGST
  sgst: finalSgst,                  // CHANGED: includes SC-SGST
  vat: finalVat,
  totalTax: finalTotalTax,
  grandTotal: roundedTotal,
  originalTotal: hasRoundingDiff ? totalToPay : null
});
```

**(e) All 3 call sites of `buildBillSummary`** (lines 790, 1064, 1189) — pass the new args (`serviceCharge`, `finalCgst`, `finalSgst`, `finalVat`, `finalTotalTax`, `finalSubtotal`).

**(f) Both `placeOrder` and `updateCustomerOrder` call sites (around lines 1000–1024 and similar):** add to `orderData`:

```js
serviceCharge,
gstOnServiceCharge,
itemTotal,
subtotalAfterDiscount,
finalSubtotal,
totalToPay: roundedTotal,         // already passed
totalTax: finalTotalTax,          // already passed; ensure it now uses finalTotalTax
```

**(g) Inline Price Breakdown UI (lines 1368–1514) — add 2 new rows:**

After the existing `Item Total` row (line 1377–1380):
```jsx
{serviceCharge > 0 && (
  <div className="price-row price-row-sub" data-testid="row-service-charge">
    <span className="price-label-sub">Service Charge ({scPct}%)</span>
    <span className="price-value-sub">₹{serviceCharge.toFixed(2)}</span>
  </div>
)}
```

Before the existing `Subtotal` row (line 1477), the value of that row changes from `subtotalAfterDiscount` to `finalSubtotal`:
```jsx
<div className="price-row price-row-subtotal">
  <span className="price-label">Subtotal</span>
  <span className="price-value">₹{finalSubtotal.toFixed(2)}</span>
</div>
```

CGST/SGST rows (lines 1485–1492) now show `finalCgst`/`finalSgst` (already includes SC-GST):
```jsx
<span className="price-value-sub">₹{finalCgst.toFixed(2)}</span>
<span className="price-value-sub">₹{finalSgst.toFixed(2)}</span>
```

VAT row (line 1495–1500) — unchanged (`adjustedVat`).

Grand Total row (lines 1503–1510) — value unchanged (`roundedTotal`).

**Must not change:**
- `getTotalPrice()` from `useCart()` (line 83) — pure cart subtotal.
- Loyalty discount/redemption flow (lines 668–700-ish).
- Coupon code UI.
- Razorpay flow.
- `total_round` ceil logic.
- Edit mode, table-config, customer-details, scanned-table flows.

---

### 5.3 `frontend/src/api/transformers/helpers.js` — `buildMultiMenuPayload`

**Read SC values from new `orderData` fields. Replace 3 lines:**

```js
// existing destructure (line 322 area) — add:
const {
  // ... existing
  serviceCharge = 0,            // NEW
  itemTotal = 0,                // NEW
  finalSubtotal = subtotal,     // NEW (fallback to existing subtotal for safety)
  // ...
} = orderData;
```

**In the returned `data` object (lines 354–412):**

```js
// CHANGE line 375
order_sub_total_amount: parseFloat((finalSubtotal || subtotal || 0).toFixed(2)),

// CHANGE line 376
order_sub_total_without_tax: parseFloat((itemTotal || subtotal || 0).toFixed(2)),

// CHANGE line 407
total_service_tax_amount: parseFloat((serviceCharge || 0).toFixed(2)),

// LEAVE line 408 as-is (per R9)
service_gst_tax_amount: 0,
```

**`total_gst_tax_amount` (line 405) and `tax_amount` (line 374, line 352)** automatically reflect the new totals because `orderData.totalTax` is now `finalTotalTax` from ReviewOrder. No code change in helpers.js for these — verify by trace.

⚠️ **Verify:** the `cart.reduce(... gst_tax_amount ...)` at lines 346–347 sums **per-item** gst — so it does NOT include SC-GST. SC-GST must be added at root level, not inside the cart loop. **Therefore line 405 needs an explicit additive change:**

```js
// REPLACEMENT for lines 346-352 (compute root totals)
const itemGstTaxAmount = parseFloat(
  cart.reduce((sum, item) => sum + (item.gst_tax_amount || 0), 0).toFixed(2)
);
const itemVatTaxAmount = parseFloat(
  cart.reduce((sum, item) => sum + (item.vat_tax_amount || 0), 0).toFixed(2)
);
const gstOnSc = parseFloat((orderData.gstOnServiceCharge || 0).toFixed(2));
const totalGstTaxAmount = parseFloat((itemGstTaxAmount + gstOnSc).toFixed(2));
const totalVatTaxAmount = itemVatTaxAmount;
const rootTaxAmount = parseFloat((totalGstTaxAmount + totalVatTaxAmount).toFixed(2));
```

`total_gst_tax_amount` (line 405) → uses new `totalGstTaxAmount`. ✅
`tax_amount` (line 374) → uses new `rootTaxAmount`. ✅

**Must not change:** `transformCartItemForMultiMenu` (lines 261–304). Per-item GST/VAT math stays identical — items are taxed on their own price; SC-GST is a root-level add.

---

### 5.4 `frontend/src/api/services/orderService.ts` — `placeOrder` (normal path)

**Lines 285–334 (`payloadData` object).** Apply same field changes as helpers.js but in a different location:

```ts
// Pull from orderData (around line 248-251)
const serviceCharge      = parseFloat(orderData.serviceCharge || 0);
const gstOnServiceCharge = parseFloat(orderData.gstOnServiceCharge || 0);
const itemTotal          = parseFloat(orderData.itemTotal || 0);
const finalSubtotal      = parseFloat(orderData.finalSubtotal || orderData.subtotal || 0);
const finalTotalTax      = parseFloat(orderData.totalTax || 0);   // already finalTotalTax from ReviewOrder

// CHANGE line 317
tax_amount: parseFloat(finalTotalTax.toFixed(2)),

// CHANGE line 318
order_sub_total_amount: parseFloat(finalSubtotal.toFixed(2)),

// CHANGE line 319
order_sub_total_without_tax: parseFloat(itemTotal.toFixed(2)),
```

**Add new fields** to `payloadData` (anywhere within the object literal, near tax/subtotal fields):

```ts
total_service_tax_amount: parseFloat(serviceCharge.toFixed(2)),
service_gst_tax_amount: 0,
// total_gst_tax_amount and total_vat_tax_amount are NOT in normal payload today (verify against
// real placed-order response from a non-716 restaurant). If backend expects them on normal
// payload too, also add them here.
```

⚠️ **Verify with backend:** does the normal `/place_order` endpoint accept `total_service_tax_amount` and the `total_gst_tax_amount` family? The validated payload was from 716 (multi-menu). For non-716, these fields may or may not be expected. **R2 in section 9.**

---

### 5.5 `frontend/src/api/services/orderService.ts` — `updateCustomerOrder`

Same field changes as 5.4, applied to the `payloadData` object inside `updateCustomerOrder` (lines 380–460 area). Pull `serviceCharge`, `gstOnServiceCharge`, `itemTotal`, `finalSubtotal` from the function args (add to the destructure block at line 376–392).

```ts
// Add to destructure
serviceCharge = 0,
gstOnServiceCharge = 0,
itemTotal = 0,
finalSubtotal = subtotal,

// Apply field changes mirroring 5.4
tax_amount: parseFloat(totalTax.toFixed(2)),                      // existing — totalTax now = finalTotalTax
order_sub_total_amount: parseFloat(finalSubtotal.toFixed(2)),
order_sub_total_without_tax: parseFloat(itemTotal.toFixed(2)),
total_service_tax_amount: parseFloat(serviceCharge.toFixed(2)),
service_gst_tax_amount: 0,
```

---

### 5.6 `frontend/src/pages/OrderSuccess.jsx` — Bill Summary

**(a) `recalculate billSummary` block (lines 293–331)** — when re-deriving billSummary from API response, thread `serviceCharge` through:

```js
// existing (line 295-298)
const apiBillSummary = orderDetails.billSummary;
const persistedPointsDiscount = passedBillSummary?.pointsDiscount || 0;
const persistedPointsRedeemed = passedBillSummary?.pointsRedeemed || 0;

// NEW: pick up service charge from API or persisted billSummary
const persistedServiceCharge = passedBillSummary?.serviceCharge || apiBillSummary.serviceCharge || 0;

// existing math (lines 301-313) — unchanged

// CHANGE setBillSummary call (line 319-330) — add serviceCharge
setBillSummary({
  ...apiBillSummary,
  pointsDiscount: persistedPointsDiscount,
  pointsRedeemed: persistedPointsRedeemed,
  serviceCharge: persistedServiceCharge,                     // NEW
  subtotal: subtotalAfterDiscount + persistedServiceCharge,  // CHANGED: include SC
  cgst: adjustedCgst,
  sgst: adjustedSgst,
  vat: adjustedVat,
  totalTax: adjustedTotalTax,
  grandTotal: apiOrderAmount,
  originalTotal: hasRoundingDiff ? localGrandTotal : null
});
```

**(b) Bill Summary render (lines 645–697)** — insert new row between `Discount` and `Subtotal`:

```jsx
{billSummary.serviceCharge > 0 && (
  <div className="bill-row bill-row-service" data-testid="bill-row-service-charge">
    <span className="bill-label">Service Charge</span>
    <span className="bill-value">₹{billSummary.serviceCharge.toFixed(2)}</span>
  </div>
)}
```

**Must not change:** `LandingPage.jsx` (it consumes `billSummary.grandTotal` only — already correct).

---

### 5.7 `frontend/src/__tests__/services/orderService.test.js`

**(a) Keep zero-baseline (lines 247–248) but gate it on a no-SC restaurant** — restructure the test or add an explicit case:

```js
test('zero baseline: total_service_tax_amount remains 0 when auto_service_charge != Yes', async () => {
  await placeOrder(makeOrderData({
    isMultipleMenuType: true,
    serviceCharge: 0,
    gstOnServiceCharge: 0,
  }));
  const [, payload] = apiClient.post.mock.calls[0];
  expect(payload.data.total_service_tax_amount).toBe(0);
  expect(payload.data.service_gst_tax_amount).toBe(0);
});
```

**(b) Add positive case:**

```js
test('service charge populates total_service_tax_amount and inflates total_gst_tax_amount', async () => {
  await placeOrder(makeOrderData({
    isMultipleMenuType: true,
    serviceCharge: 60,
    gstOnServiceCharge: 10.80,
    itemTotal: 1200,
    finalSubtotal: 1260,
    subtotal: 1260,                       // helper expects subtotal at root level
    totalTax: 246.80,
  }));
  const [, payload] = apiClient.post.mock.calls[0];
  expect(payload.data.total_service_tax_amount).toBeCloseTo(60, 2);
  expect(payload.data.service_gst_tax_amount).toBe(0);
  expect(payload.data.order_sub_total_without_tax).toBeCloseTo(1200, 2);
  expect(payload.data.order_sub_total_amount).toBeCloseTo(1260, 2);
  expect(payload.data.tax_amount).toBeCloseTo(246.80, 2);
});
```

**(c) Sanity test for non-multi-menu (normal placeOrder)** — same pattern.

---

## 6. What MUST NOT change

| File / Area | Reason |
|---|---|
| `frontend/src/utils/taxCalculation.js` | `calculateItemTax` and `calculateTaxBreakdown` signatures stay as today. SC-GST fold-in is done in caller. |
| `frontend/src/context/CartContext.js` `getTotalPrice()` | Pure cart subtotal. SC is a billing concern. |
| `frontend/src/api/transformers/helpers.js` `transformCartItemForMultiMenu` | Per-item GST/VAT untouched. Item base is never multiplied by service factor. |
| Loyalty discount + `discountRatio` logic in `ReviewOrder.jsx` | Tax-on-discount is unchanged. SC is computed AFTER discount. SC-GST is added on top. |
| Coupon flow, loyalty redemption flow, Razorpay flow | Untouched. |
| `total_round` `Math.ceil` final rounding | Untouched. Single round point preserved. |
| `frontend/src/pages/LandingPage.jsx` | Reads `billSummary.grandTotal` only. No change. |
| `frontend/src/pages/AdminSettings.jsx` and admin app | Out of scope. |
| `frontend/src/components/CartWrapper`, `CartContext`, `OrderItemCard`, `MenuItem` | Untouched. |
| `frontend/src/components/ReviewOrderPriceBreakdown/*.jsx` | Currently imported but unused (inline breakdown in ReviewOrder.jsx renders). Confirm during impl; if unused, leave alone — do NOT delete imports. |

---

## 7. Restaurants WITHOUT service charge — zero regression contract

When `auto_service_charge !== 'Yes'` OR `service_charge_percentage = 0` OR keys absent:
- `applyServiceCharge = false` ⇒ `serviceCharge = 0` ⇒ `gstOnServiceCharge = 0`
- `finalSubtotal === subtotalAfterDiscount`
- `finalCgst === adjustedCgst`, `finalSgst === adjustedSgst`, `finalVat === adjustedVat`
- `finalTotalTax === adjustedTotalTax`
- `totalToPay` calculation byte-identical to current behaviour
- New SC row is hidden (`{serviceCharge > 0 && ...}`)
- Payload `total_service_tax_amount: 0` (same as today's hardcoded)
- Payload `order_sub_total_amount === order_sub_total_without_tax === itemTotal` (same as today's duplicate)

**This MUST be preserved.** Add a regression test case for this baseline.

---

## 8. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| E1 | `auto_service_charge` key missing | `applyServiceCharge = false`, zero regression. |
| E2 | `auto_service_charge = 'No'` | `applyServiceCharge = false`, zero regression. |
| E3 | `auto_service_charge = 'Yes'`, `service_charge_percentage = 0` | `applyServiceCharge = false`, zero regression. |
| E4 | `auto_service_charge = 'Yes'`, pct > 0, `service_charge_tax = 0` | SC applies; `gstOnServiceCharge = 0`. (per R3) |
| E5 | `auto_service_charge = 'Yes'`, pct > 0, `gst_status = 'No'` | SC applies; `gstOnServiceCharge = 0`. (per R3) |
| E6 | Loyalty discount applied | SC base = `subtotalAfterDiscount`. Discount reduces SC base. SC-GST is computed AFTER discount, so discount does NOT scale SC-GST. |
| E7 | Edit-mode (`isEditMode=true`) | Frontend recomputes everything; previous + new items both contribute to `itemTotal` → SC base. |
| E8 | Mixed-tax cart (GST + VAT items) | VAT bucket untouched. GST bucket inflated by SC-GST. |
| E9 | Single-VAT-item cart with SC | `vat` unchanged, `cgst`/`sgst` reflect ONLY the SC-GST portion. Worth a screenshot during QA. |
| E10 | `total_round = 'Yes'` | `Math.ceil(totalToPay)` happens after SC + SC-GST + items + items-tax all summed. Single round point. |
| E11 | `pointsDiscount > itemTotal` | Existing `Math.max(0, …)` clamps to 0. SC base = 0 ⇒ SC = 0. Self-consistent. |
| E12 | `service_charge_percentage = "10.5"` (decimal string) | `parseFloat` handles it. Don't validate decimals. |
| E13 | `service_charge_tax` returns as `"5.00"` (string with decimals) | `parseFloat` handles it. |
| E14 | API returns `service_charge_tax = 0` and `gst_status = 'Yes'` | SC applies; SC-GST is 0 (R3 + R4). Differs from E5: VAT bucket also untouched in both. |
| E15 | Two `placeOrder` paths (716 / non-716) | Both must show identical SC math; only payload writer differs. |

---

## 9. Risks & runtime-TBC items

| ID | Risk / TBC | Mitigation / action |
|---|---|---|
| **R-runtime-1** | Backend field-name confirmation for `total_service_tax_amount`, `order_sub_total_without_tax`, `order_sub_total_amount` on **non-716 (`/place_order`)** endpoint. The validated payload was 716-only. | Send a test order on a non-716 restaurant after impl; compare network tab to expected mapping. If backend rejects fields silently → coordinate w/ backend team to mirror multi-menu schema. |
| **R-runtime-2** | `transformOrderDetailsFromApi` SC field names (so OrderSuccess shows SC for an already-placed order). The order-details API response shape for SC is unknown until a real order with SC is placed. | After first real SC order, capture `/order-details` response. Add field mapping in `orderTransformer.ts → transformPreviousOrderItem` and `getOrderDetails` taxItem builder. Until then, `OrderSuccess.jsx` will fall back to `passedBillSummary.serviceCharge` (from in-memory state passed via navigation). |
| **R-runtime-3** | `service_charge_percentage` and `service_charge_tax` value types — confirmed strings ("5", "5.00") in console samples; `parseFloat` covers both. If backend ever returns a number, no code change needed. | None. |
| **R-adjacent-1** | **Existing bug, not in CR scope** — `frontend/src/api/transformers/orderTransformer.ts:121` and `:156` have `taxType: api.food_details?.tax_type \|\| 'percentage'`. The fallback `'percentage'` makes `calculateItemTax` return `0` for both GST and VAT (engine accepts only `'GST'` or `'VAT'`). This is why OrderSuccess Bill Summary shows ₹X = ₹X = ₹X (no CGST/SGST/VAT) for some 716 orders even today. **Stakeholder direction: do nothing under this CR.** Once this bug is fixed separately, OrderSuccess will display the SC-GST correctly via the inflated `cgst`/`sgst` values produced by the new aggregation. Until then, the SC line itself will display correctly (driven by `billSummary.serviceCharge`), but SC-GST contribution to the GST rows on OrderSuccess will be invisible. |
| **R-adjacent-2** | `Math.ceil` inconsistency between writers (`buildMultiMenuPayload` uses `parseFloat(toFixed(2))`, normal/update use `Math.ceil`). Pre-existing. Not introduced by CR. | Leave alone per "must not change existing logic". |

---

## 10. QA checklist

### 10.1 Functional positive cases

| # | Setup | Expected |
|---|---|---|
| Q1 | 716 restaurant, `auto_service_charge='Yes'`, `service_charge_percentage='5'`, `service_charge_tax='18'`, `gst_status='Yes'`, `total_round='Yes'`. Cart from worked example (§3). | Bill Summary: Item Total ₹1200, Service Charge (5%) ₹60, Subtotal ₹1260, CGST ₹68.40, SGST ₹68.40, VAT ₹110, **Grand Total ₹1507** (ceiling of 1506.80). Payload: `total_service_tax_amount: 60`, `total_gst_tax_amount: 136.80`, `order_sub_total_without_tax: 1200`, `order_sub_total_amount: 1260`. |
| Q2 | Same as Q1 but `total_round='No'` | Grand Total ₹1506.80. |
| Q3 | Same as Q1 + 200 loyalty points discount | SC base = 1000 (1200−200). serviceCharge = 50. gstOnServiceCharge = 9. SC-CGST 4.50, SC-SGST 4.50. Item-tax adjusted by `discountRatio` then SC-GST added on top. |
| Q4 | Single VAT item ₹500 (22%) + SC enabled (5%, 18%) | `vat = 110` unchanged; `cgst = 4.50`, `sgst = 4.50` (both ONLY from SC-GST). |
| Q5 | `service_charge_tax = 0` | SC ₹60 shows; CGST/SGST rows hidden (no SC-GST, no item GST). |
| Q6 | `gst_status = 'No'` + SC enabled | SC ₹60 shows; CGST/SGST hidden (gst_status off suppresses ALL GST including SC-GST). VAT items still tax. |

### 10.2 Regression / zero-impact cases

| # | Setup | Expected |
|---|---|---|
| Q7 | `auto_service_charge` key absent | Payload + UI byte-identical to today. |
| Q8 | `auto_service_charge='No'` | Payload + UI byte-identical to today. |
| Q9 | `auto_service_charge='Yes'`, `pct=0` | Same as Q8. |
| Q10 | Edit existing order with no SC (legacy order) | Bill Summary recomputes correctly; no SC row; no payload change. |
| Q11 | Coupon flow with `auto_service_charge='No'` | Existing coupon math intact. No SC interference. |
| Q12 | Razorpay online payment flow | `roundedTotal` matches `order_amount`. Razorpay webhook receives correct amount. |

### 10.3 Edit-mode cases

| # | Setup | Expected |
|---|---|---|
| Q13 | Edit a placed order on 716 with SC; add an item | Frontend recomputes SC on `previousSubtotal + subtotal − pointsDiscount`. Payload `updateCustomerOrder` carries new SC values. |
| Q14 | Edit a placed order on 716 without SC (legacy) | If `auto_service_charge` is now off → SC = 0. If now on → SC computed on combined cart. Either way: no SC row if 0. |

### 10.4 Cross-restaurant cases

| # | Setup | Expected |
|---|---|---|
| Q15 | Non-716 restaurant with `auto_service_charge='Yes'` | Normal `/place_order` payload carries SC fields (pending R-runtime-1). |
| Q16 | Two restaurants in succession (one with SC, one without) | Cart switch resets state correctly. No SC bleed-through between restaurants. |

### 10.5 OrderSuccess display cases

| # | Setup | Expected |
|---|---|---|
| Q17 | Place order with SC → land on OrderSuccess | Bill Summary shows Service Charge row immediately (from passed billSummary). |
| Q18 | Refresh OrderSuccess page (forces re-fetch from API) | Service Charge row remains (from passed in-memory state — note R-runtime-2 limitation; may revert to API-derived 0 until R-runtime-2 wired). |
| Q19 | Open order from history list | Service Charge displays from API order-details once R-runtime-2 wired. Until then, may show 0. |

---

## 11. Implementation sequence (recommended)

1. **Phase A — pure math, no UI** (lowest blast radius)
   - 5.2(a), (b), (c) — read keys, compute SC + GST-on-SC in `ReviewOrder.jsx`.
   - 5.2(d) — extend `buildBillSummary`.
   - Validate via `console.log` that math matches §3 worked example.
2. **Phase B — payload writers**
   - 5.3 `buildMultiMenuPayload`.
   - 5.2(f) — pass new fields into `placeOrder` / `updateCustomerOrder` calls.
   - Manually inspect network tab on a 716 test order; assert all 8 mapped fields.
3. **Phase C — UI**
   - 5.2(g) — inline price breakdown rows.
   - 5.6 — OrderSuccess Bill Summary row.
4. **Phase D — non-716 path**
   - 5.4, 5.5 — normal `placeOrder` and `updateCustomerOrder`.
   - Wait for R-runtime-1 confirmation before merging.
5. **Phase E — tests**
   - 5.7 — unit tests.
6. **Phase F — runtime wire-up (post-merge)**
   - R-runtime-2 — wire `transformPreviousOrderItem` / `getOrderDetails` to read SC from order-details API once response shape is known.

---

## 12. Acceptance criteria

- [ ] All Q1–Q6 positive cases pass exactly with the values stated.
- [ ] All Q7–Q12 regression cases produce byte-identical payloads to current production for at least one snapshot test.
- [ ] All test cases in `orderService.test.js` pass green.
- [ ] No imports added / removed beyond what the spec requires.
- [ ] No changes to `taxCalculation.js`, `CartContext.js`, `getTotalPrice()`, `transformCartItemForMultiMenu`, `LandingPage.jsx`.
- [ ] New conditional rows only render when SC > 0.
- [ ] No console errors when `restaurant` is `null` / loading.
- [ ] Code reviewed against §6 must-not-change list.

---

## 13. Adjacent-bug FYI (do not fix in this CR)

`frontend/src/api/transformers/orderTransformer.ts:121, 156` — `tax_type: ... \|\| 'percentage'` makes `calculateItemTax` return zeroes. Affects OrderSuccess Bill Summary tax display for placed orders. Stakeholder direction: leave alone. Track separately. After the bug is fixed independently, this CR's SC-GST display on OrderSuccess will work end-to-end without further changes.

---

## 14. Sign-off

| Role | Name | Status |
|---|---|---|
| Stakeholder | (you) | ✅ Approved on 2026-05-02 |
| Planning Agent | E1 | ✅ Locked |
| Implementation Agent | TBD | ⏳ |

**Implementation agent: read this doc top to bottom before touching code. Open questions to the planning agent if any rule contradicts what you read in actual source. Do not invent business rules.**
