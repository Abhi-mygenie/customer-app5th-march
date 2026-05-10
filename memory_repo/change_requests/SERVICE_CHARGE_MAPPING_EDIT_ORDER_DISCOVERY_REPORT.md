# SERVICE_CHARGE_MAPPING — Edit Order Discovery Report

> Read-only discovery. No code changes. Codebase is the source of truth; doc references are corroborating context.
>
> **Codebase paths inspected:**
> - `frontend/src/pages/ReviewOrder.jsx`
> - `frontend/src/pages/OrderSuccess.jsx`
> - `frontend/src/api/transformers/helpers.js`
> - `frontend/src/api/transformers/orderTransformer.ts`
> - `frontend/src/api/services/orderService.ts`
> - `frontend/src/types/models/order.types.ts`
> - `frontend/src/__tests__/services/orderService.test.js`
> - `frontend/src/context/CartContext.js`
>
> **Baseline docs:**
> - `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `/app/memory/current-state/MODULE_MAP.md`
> - `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_IMPLEMENTATION_HANDOVER.md`
> - `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_IMPLEMENTATION_SUMMARY.md`

---

## 1. Final Verdict

**`edit_order_code_level_aligned_but_478_validation_required`**

The edit-order code path is wired with the same Service-Charge fields as the place-order path at the source level, BUT:

- **No automated test** exists for `updateCustomerOrder` (all 6 SC tests target `placeOrder`).
- **No manual validation** has been performed on 478 (the only restaurant where edit-order applies). The summary itself flags `478 flow validation (loyalty + coupon + wallet + edit-order) — requires stakeholder testing` as pending.
- The **716 validation does not exercise `updateCustomerOrder` at all**, because 716 is explicitly hardcoded to skip the edit-order flow (`ReviewOrder.jsx:1032-1035` — `// they don't use edit order flow`).
- One adjacent pre-existing bug (`taxType: ... || 'percentage'` in `orderTransformer.ts:156`) directly impacts edit-mode tax display on previous items but was deliberately scoped out of this CR (handover R-adjacent-1).

So: the code looks correct; nothing has been **proven** correct end-to-end for 478.

---

## 2. What Was Done (file/function-wise)

| File | Function | What changed |
|---|---|---|
| `pages/ReviewOrder.jsx` | top-level computation (l. 624–665) | Reads `auto_service_charge`, `service_charge_percentage`, `service_charge_tax` from `restaurant`. Computes `serviceCharge`, `gstOnServiceCharge`, `scCgst`, `scSgst`, `finalCgst`, `finalSgst`, `finalVat`, `finalTotalTax`, `finalSubtotal`, `totalToPay`, `roundedTotal`. `itemTotal = previousSubtotal + subtotal` (l. 612), so SC base **does** include previous-order items in edit mode. |
| `pages/ReviewOrder.jsx` | `buildBillSummary(...)` (l. 36–) | Now emits `serviceCharge`, `subtotal=finalSubtotal`, `itemCgst`, `itemSgst`, `scCgst`, `scSgst`, `gstRate`, `vatRate`, `scGstRate`. |
| `pages/ReviewOrder.jsx` | calls to `updateCustomerOrder` (l. 972, 1003, 1195) | Pass `serviceCharge`, `gstOnServiceCharge`, `itemTotal`, `finalSubtotal` in three places (happy path, fail-safe catch path, 401-retry path). |
| `pages/ReviewOrder.jsx` | calls to `placeOrder` (l. 1082, 1226) | Same 4 SC fields passed (happy + 401-retry). |
| `pages/ReviewOrder.jsx` | inline price-breakdown UI (l. 1480 onward) | Added Service Charge row + 4 tax sub-rows (CGST/SGST + CGST-on-SC/SGST-on-SC) with hide-when-zero rules and `%` suffix. |
| `api/transformers/helpers.js` | `allocateServiceChargePerItem(cart, totalServiceCharge, itemTotal)` (NEW, l. 330–357) | Splits aggregate SC per cart line proportionally to `(unitPrice × qty) / itemTotal`. Last item absorbs the rounding remainder so `Σ item.service_charge === totalServiceCharge`. Sets all `service_charge` to 0 when SC ≤ 0 or itemTotal ≤ 0. |
| `api/transformers/helpers.js` | `buildMultiMenuPayload(orderData, gstEnabled)` (l. 365–466) | Destructures the 4 SC fields from `orderData`. Calls `allocateServiceChargePerItem`. Emits `total_gst_tax_amount = itemGst + gstOnSc` (root-level fold-in), `total_vat_tax_amount`, `total_service_tax_amount`, `service_gst_tax_amount`, `order_sub_total_amount = finalSubtotal`, `order_sub_total_without_tax = itemTotal`, `tax_amount = totalGst + totalVat`. |
| `api/services/orderService.ts` | `placeOrder` normal path (l. 297–392) | Pulls SC fields from `orderData`. Calls `allocateServiceChargePerItem(cart, ...)`. Emits `total_service_tax_amount`, `service_gst_tax_amount`, `order_sub_total_amount = finalSubtotal`, `order_sub_total_without_tax = itemTotal`. **Does NOT emit `total_gst_tax_amount` / `total_vat_tax_amount`** at the root (only multi-menu payload does). |
| `api/services/orderService.ts` | `placeOrder` 716/multi-menu branch (l. 273–295) | Delegates to `buildMultiMenuPayload`. Routes to `ENDPOINTS.PLACE_ORDER_AUTOPAID()` only when `restaurantId === '716'`; multi-menu non-716 still uses `ENDPOINTS.PLACE_ORDER()`. |
| `api/services/orderService.ts` | `updateCustomerOrder` (l. 397–508) | Destructures `serviceCharge`, `gstOnServiceCharge`, `itemTotal`, `finalSubtotal`. Calls `allocateServiceChargePerItem(cart, ...)`. Emits the same `total_service_tax_amount`, `service_gst_tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`. Uses defensive fallbacks: `effectiveSubtotal = finalSubtotal ?? subtotal`, `effectiveItemTotal = (itemTotal > 0) ? itemTotal : subtotal`. **Endpoint:** `${REACT_APP_API_BASE_URL}/customer/order/update-customer-order` (hardcoded URL, NOT via `ENDPOINTS` map). |
| `api/services/orderService.ts` | `getOrderDetails` (l. 121–260) | Refactored to **pure-API mapping** for `billSummary`. Reads `total_vat_tax_amount`, `total_service_tax_amount`, `payload_total_gst_tax_amount`, `service_gst_tax_amount`, `order_sub_total_without_tax`, `order_sub_total_amount`, `total_tax_amount`, `order_amount`, `table_type` directly. Derives `itemGst = totalGst − scGst`, `cgst/sgst = itemGst/2`, `scCgst/scSgst = scGst/2`. No client-side recompute, no `calculateTaxBreakdown` call. Each `previousItem` is enriched with `item: { tax, tax_type }` for `ReviewOrder` consumption. |
| `pages/OrderSuccess.jsx` | bill summary render (l. 638–720) | Consumes `billSummary.serviceCharge`, `billSummary.cgst/sgst/vat/scCgst/scSgst`, `billSummary.gstRate/vatRate/scGstRate`. Hides each tax row when its amount is 0. Hides pre-round bracket via `SHOW_PRE_ROUND_BRACKET=false`. Hides internal order ID via `SHOW_INTERNAL_ORDER_ID=false`. |
| `pages/OrderSuccess.jsx` | API re-fetch effect (l. 312–319) | After `getOrderDetails(...)`, sets `billSummary` directly from `orderDetails.billSummary` — no merging, no recompute. |
| `pages/OrderSuccess.jsx` | EDIT ORDER click → `handleEditOrder` (l. 423–444) | Calls `getOrderDetails(orderId)`, gates on `fOrderStatus 3/6` (cancelled/paid), then `startEditOrder(orderId, orderDetails.previousItems, {tableId, tableNo, restaurant})`, then navigates to menu. |
| `types/models/order.types.ts` | `BillSummary` interface | Extended with `serviceCharge`, `scCgst`, `scSgst`, `gstRate`, `vatRate`, `scGstRate`. |
| `__tests__/services/orderService.test.js` | 6 new tests | All target `placeOrder` (multi-menu zero/positive/per-item-allocation/zero-SC-per-item; normal-path zero/positive). **No `updateCustomerOrder` test added.** |

---

## 3. APIs / Queries Involved

| Operation | Function (frontend) | HTTP | Endpoint |
|---|---|---|---|
| **Place order — normal** | `placeOrder(...)` (`orderService.ts:265`) | `POST` | `apiClient.post(ENDPOINTS.PLACE_ORDER(), formData, { 'multipart/form-data', Authorization: Bearer })` — `ENDPOINTS.PLACE_ORDER` resolves against `REACT_APP_API_BASE_URL` (POS API). |
| **Place order — 716/autopaid** | `placeOrder(...)` (multi-menu branch, `orderService.ts:277-294`) | `POST` | `apiClient.post(ENDPOINTS.PLACE_ORDER_AUTOPAID(), formData, ...)`. **Only used when `restaurantId === '716'`.** Multi-menu for non-716 still goes through `ENDPOINTS.PLACE_ORDER()`. |
| **Edit order (update)** | `updateCustomerOrder(...)` (`orderService.ts:397`) | `POST` | `apiClient.post(\`${process.env.REACT_APP_API_BASE_URL}/customer/order/update-customer-order\`, formData, { Authorization: Bearer, zoneId: 3 })`. URL **hardcoded**, not from `ENDPOINTS`. |
| **Order details (used pre-edit & on OrderSuccess polling)** | `getOrderDetails(orderId)` (`orderService.ts:121`) | `GET` | `apiClient.get(ENDPOINTS.GET_ORDER_DETAILS(orderId), ...)`. |
| **Restaurant details (source of `auto_service_charge`, `service_charge_percentage`, `service_charge_tax`, `gst_status`, `total_round`)** | `useRestaurantDetails(restaurantId)` → `getRestaurantDetails()` (`restaurantService.js:14-24`) | `POST` | `/web/restaurant-info` against `REACT_APP_API_BASE_URL`. |
| **Table status check (place-order pre-flight, skipped for 716)** | `checkTableStatus(...)` (`orderService.ts:84`) | — | `ENDPOINTS.CHECK_TABLE_STATUS(tableId, restaurantId)` |

> Edit-order flow at runtime:
> `OrderSuccess "EDIT ORDER" click` → `getOrderDetails()` → `startEditOrder(orderId, previousItems, meta)` (CartContext) → navigate to menu/stations → user adds items → ReviewOrder renders → recomputes SC on `previousSubtotal + subtotal − pointsDiscount` → on submit calls `updateCustomerOrder(...)` → navigate to OrderSuccess → `getOrderDetails()` polled every 60s → `billSummary` set from API directly.

---

## 4. Place Order vs Edit Order Payload Comparison

Field-by-field, comparing the three writers:
- **N** = `placeOrder` normal path (`orderService.ts:313–365`)
- **U** = `updateCustomerOrder` (`orderService.ts:433–486`)
- **M** = `buildMultiMenuPayload` 716 / multi-menu (`helpers.js:407–465`)

| Field | N (placeOrder normal) | U (updateCustomerOrder) | M (buildMultiMenu, 716) | Comment |
|---|---|---|---|---|
| `order_amount` | `Math.ceil(orderData.totalToPay \|\| 0)` | `Math.ceil(totalToPay)` | `parseFloat((totalToPay \|\| 0).toFixed(2))` | **N and U identical**; M does NOT ceil (pre-existing inconsistency, flagged as R-adjacent-2 in handover, out of scope). For 478 edit, U applies — uses `Math.ceil`. |
| `order_sub_total_amount` | `parseFloat(finalSubtotal.toFixed(2))` (with fallback to `orderData.subtotal`) | `parseFloat(effectiveSubtotal.toFixed(2))` where `effectiveSubtotal = finalSubtotal ?? subtotal` | `parseFloat(((finalSubtotal !== undefined ? finalSubtotal : subtotal) \|\| 0).toFixed(2))` | **All three semantically identical** when ReviewOrder passes `finalSubtotal` (which it does). |
| `order_sub_total_without_tax` | `parseFloat(((itemTotal > 0) ? itemTotal : (orderData.subtotal \|\| 0)).toFixed(2))` | `parseFloat(effectiveItemTotal.toFixed(2))` where `effectiveItemTotal = (itemTotal > 0) ? itemTotal : subtotal` | `parseFloat(((itemTotal && itemTotal > 0) ? itemTotal : (subtotal \|\| 0)).toFixed(2))` | **All three identical.** ⚠️ The U fallback (`itemTotal? : subtotal`) means if ReviewOrder ever passes `itemTotal=0`, U would emit `subtotal` as `order_sub_total_without_tax`. Currently ReviewOrder passes `itemTotal = previousSubtotal + subtotal` which is > 0 in any non-empty cart. |
| `tax_amount` | `parseFloat((orderData.totalTax \|\| 0).toFixed(2))` (= `finalTotalTax` from RO) | `parseFloat(totalTax.toFixed(2))` (= `finalTotalTax` from RO) | `rootTaxAmount = totalGstTaxAmount + totalVatTaxAmount` (computed from cart loop + SC-GST fold-in) | **N and U identical** (driven by ReviewOrder's `finalTotalTax`). M derives independently, but the two should agree when previous-item tax is correct. ⚠️ See gap §6 about prev-item tax. |
| `total_service_tax_amount` | `parseFloat(serviceCharge.toFixed(2))` | `parseFloat(serviceCharge.toFixed(2))` | `parseFloat((serviceCharge \|\| 0).toFixed(2))` | **All three identical.** |
| `service_gst_tax_amount` | `parseFloat((parseFloat(orderData.gstOnServiceCharge \|\| 0)).toFixed(2))` | `parseFloat((parseFloat(gstOnServiceCharge) \|\| 0).toFixed(2))` | `parseFloat((gstOnServiceCharge \|\| 0).toFixed(2))` | **All three identical.** Deviates from handover R9 (which originally locked it to 0); deviation accepted per stakeholder direction (summary §6). |
| `total_gst_tax_amount` | **NOT emitted** | **NOT emitted** | `totalGstTaxAmount = itemGstTaxAmount + gstOnSc` | ⚠️ **Mismatch.** Only the 716 multi-menu writer emits this root-level field. For 478 (both place and edit), backend will not receive `total_gst_tax_amount` — backend has to derive from `tax_amount − total_vat_tax_amount` or sum from per-item `gst_tax_amount`. Handover R-runtime-1 explicitly flagged this risk for non-716 endpoints. |
| `total_vat_tax_amount` | **NOT emitted** | **NOT emitted** | `totalVatTaxAmount = Σ item.vat_tax_amount` | ⚠️ Same as above — only multi-menu emits this root-level. Backend has to derive for 478. |
| `cart[].service_charge` | Set by `allocateServiceChargePerItem(cart, serviceCharge, itemTotal)` | Set by `allocateServiceChargePerItem(cart, serviceCharge, itemTotal)` | Set by same helper | **All three identical** in mechanism. ⚠️ But the two cart transformers differ: N/U use `transformCartItemsForApi` (or `transformCartItems`) → flatter shape; M uses `transformCartItemsForMultiMenu` → multi-menu shape. The `service_charge` field is added on top of whichever shape the cart already has. |
| `coupon_discount_amount` | `0` (hardcoded) | `0` (hardcoded) | `0` (hardcoded) | **Identical, all hardcoded.** ⚠️ Coupon discount is NOT included in any writer. The CR did not address this; coupon flow is UI-only per current-state docs (`MODULE_MAP.md §6`). |
| `discount_amount` | `orderData.pointsDiscount \|\| 0` | `pointsDiscount` | `pointsDiscount` | **Identical** when ReviewOrder passes the same value (it does). |
| `payment_type` | `orderData.paymentType \|\| 'postpaid'` | `paymentType` (default `'postpaid'` in destructure) | `orderData.paymentType \|\| 'postpaid'` | **Identical defaulting.** ReviewOrder's edit-order calls (l. 978, 1009, 1201) hardcode `paymentType: 'postpaid'`; placeOrder uses `selectedPaymentType` from UI. |
| `payment_method` | `'cash_on_delivery'` (hardcoded) | `'cash_on_delivery'` (hardcoded) | `'cash_on_delivery'` (hardcoded) | **Identical, all hardcoded.** Razorpay is handled separately via `razorpay_id` flow, not via this field. |
| `order_type` | `orderData.orderType \|\| 'dinein'` | `orderType` (default `'dinein'` in destructure) | `orderData.orderType \|\| 'dinein'` | **Identical.** |
| `restaurant_id` | `String(orderData.restaurantId)` | `String(restaurantId)` | `parseInt(restaurantId) \|\| 0` | ⚠️ **Type mismatch.** N + U send a **string**; M sends an **integer**. Pre-existing — not introduced by this CR. Backend evidently accepts both (716 tested with int). For 478 edit, U sends string. |

### Per-cart-item field check (`allocateServiceChargePerItem` mutation)

```js
// helpers.js:330-357
cart.forEach((item, idx) => {
  if (idx === lastIdx) {
    item.service_charge = parseFloat((totalSc - allocated).toFixed(2));   // remainder
  } else {
    item.service_charge = parseFloat(((unitPrice * qty / itemTotal) * totalSc).toFixed(2));
  }
});
```

Verified by test cases:
- ✅ Multi-menu cart, 3 items proportional → `[10, 15, 25]` summing to 50 (test l. 457–462).
- ✅ Zero SC → every line gets `service_charge: 0` (test l. 473).

The same helper is invoked by N (`orderService.ts:311`), U (`orderService.ts:426`), and M (`helpers.js:391`). However, the `cart` array shape differs (multi-menu vs normal), so the helper relies only on `item.price` and `item.quantity` — both shapes carry these.

---

## 5. 716 vs 478 Finding

### What was tested for 716
- **Multi-menu/autopaid endpoint flow** via `buildMultiMenuPayload`.
- All 6 unit tests in `orderService.test.js` use `restaurantId: '478'` for the **mock**, but invoke `placeOrder` with `isMultipleMenuType: true` for the multi-menu cases (lines 175, 396) — the cases that exercise SC math route through `buildMultiMenuPayload`. The actual restaurant where multi-menu was confirmed end-to-end on a real backend is **716** (per summary §7.2).
- Manual validation scenarios (summary §7.2): single-item GST cart, multi-item GST+VAT+SC cart, per-item allocation echo, page refresh on OrderSuccess (pure-API mapping), grand-total bracket visibility, internal order ID hidden, `%` suffix.
- Adjacent fix: `sessionStorage` + API fallback for room/table on Collect Bill (716 dropdown flow).

### What was NOT tested for 716 (because 716 doesn't have it)
- **Edit order is hardcoded OFF for 716.** `ReviewOrder.jsx:1032-1035` literally states: `// CRITICAL HARDCODING: Restaurant 716 (Hyatt Centric) allows multiple orders per table. Skip table status check for 716 - they don't use edit order flow.` Therefore `updateCustomerOrder` is **never called** for 716 in production.
- `LandingPage` and `OrderSuccess` skip the EDIT ORDER button gating for 716 (716 always places a fresh order; UI even resets `tableNumber`/`roomOrTable` after each successful order — `ReviewOrder.jsx:1136-1140`, `1272-1276`).

### What this means for 478
- 478 is the path that uses:
  - `placeOrder` **normal** branch (lines 297–392) — NOT the multi-menu branch.
  - `updateCustomerOrder` (lines 397–508) — entirely skipped on 716.
  - `buildMultiMenuPayload` only if 478 is configured as multi-menu (per `restaurantIdConfig.js`); the autopaid endpoint is still NOT used (only 716 hits autopaid).
- **None of these paths have been validated end-to-end against a live backend** for 478 in this CR. The summary itself flags this as pending (summary §7.3).

### Why 716 ≠ 478 for this CR
| Aspect | 716 | 478 |
|---|---|---|
| Edit order flow | Hardcoded OFF | The primary use case |
| `updateCustomerOrder` invoked | Never | Yes, on every edit |
| Endpoint for new order | `PLACE_ORDER_AUTOPAID` (multi-menu branch) | `PLACE_ORDER` normal (or multi-menu branch with non-autopaid endpoint) |
| Payload writer | `buildMultiMenuPayload` only | `placeOrder` normal payload AND `updateCustomerOrder` payload |
| Loyalty/coupon/wallet on edit | N/A (no edit) | Real interaction with existing order's pointsDiscount, etc. |
| Backend fields validated | `total_service_tax_amount`, `service_gst_tax_amount`, `total_gst_tax_amount`, `total_vat_tax_amount`, `payload_total_gst_tax_amount` (multi-menu echo confirmed) | UNVALIDATED — particularly `total_gst_tax_amount` and `total_vat_tax_amount` are NOT sent in 478's place/update payloads, so backend must derive them. |

---

## 6. Gaps / Risks (real, code-evidenced)

| # | Gap / Risk | Evidence | Severity |
|---|---|---|---|
| G1 | **No automated test for `updateCustomerOrder`.** All 6 SC tests in `orderService.test.js` are for `placeOrder` (`describe` blocks at l. 78, 175, 270, 321, 374, 396, 478). Edit-order payload composition has zero test coverage. | grep on test file | High |
| G2 | **No manual validation on 478 edit order.** Summary §7.3 lists `478 flow validation (loyalty + coupon + wallet + edit-order)` as pending. | summary §7.3 | High |
| G3 | **`total_gst_tax_amount` and `total_vat_tax_amount` not emitted** from `placeOrder` (normal) or `updateCustomerOrder`. Only `buildMultiMenuPayload` (l. 458–459) emits them. Handover R-runtime-1 explicitly warned about this for the normal endpoint. Backend behavior on 478 unverified. | `orderService.ts:313-365`, `397-508` | High |
| G4 | **Adjacent bug — previous-item tax is silently zero in edit mode.** `orderTransformer.ts:156` does `taxType: api.food_details?.tax_type \|\| 'percentage'`. `'percentage'` is not recognized by `calculateItemTax` (which only handles `'GST'`/`'VAT'`), so `calculateTaxBreakdown` returns 0 for that line. In `ReviewOrder.jsx:585-586`, `prevItem.item?.tax_type` reads back what `getOrderDetails` puts at `previousItem.item.tax_type` (= `item.taxType` = potentially `'percentage'`). Result: in edit mode the GST/VAT contribution from previous items is 0, so `finalCgst/finalSgst/finalVat/finalTotalTax` and `roundedTotal` are understated. **This is pre-existing, explicitly out-of-scope (R-adjacent-1), but it directly affects whether 478 edit order will display correct totals.** | `orderTransformer.ts:121,156`, `ReviewOrder.jsx:582-598`, handover R-adjacent-1 | High (for 478 edit display correctness) |
| G5 | **`coupon_discount_amount` is hardcoded `0`** in all three writers. Coupon UI is rendered but no writer carries the coupon discount. CR did not change this. Risk: any 478 edit that involves a coupon will not propagate coupon math. | `orderService.ts:326,447`, `helpers.js:410`; `MODULE_MAP.md §6` flags coupon as UI-only. | Medium (out of CR scope but interacts with 478 validation checklist) |
| G6 | **`Math.ceil` rounding inconsistency between writers.** `placeOrder` normal and `updateCustomerOrder` use `Math.ceil(totalToPay)`. `buildMultiMenuPayload` uses `parseFloat((totalToPay).toFixed(2))` — no ceil. Handover R-adjacent-2 calls this out. ReviewOrder already passes `roundedTotal` (post-ceil) when `total_round === 'Yes'`, so the second ceil is a no-op for ints; but if `total_round !== 'Yes'`, `Math.ceil` in N/U will round up while M will not. | `orderService.ts:332,453`; `helpers.js:412` | Low–Medium (manifests only if 478 ever turns rounding off and uses both edit and 716-style multi-menu). |
| G7 | **`updateCustomerOrder` URL is hardcoded** (`${REACT_APP_API_BASE_URL}/customer/order/update-customer-order`, l. 491), not centralised in `ENDPOINTS`. Easy to miss if endpoint conventions change. Pre-existing. | `orderService.ts:491` | Low |
| G8 | **`restaurant_id` type mismatch** — N/U send string, M sends integer. Pre-existing. | `orderService.ts:337,458`, `helpers.js:422` | Low |
| G9 | **`OrderSuccess` previously-relied on `passedBillSummary.serviceCharge` fallback** is now gone. Effect at l. 312–319 unconditionally overwrites local `billSummary` with the API one. That means: if backend ever omits `service_gst_tax_amount`/`total_service_tax_amount` (handover §9 notes inconsistent echo), the user briefly sees a Service Charge row from `passedBillSummary` before it disappears on poll. | `OrderSuccess.jsx:312-319` | Low |
| G10 | **Re-edit (edit an order that was already edited) was not tested** even on paper. The handover §10.3 only lists Q13 (edit + add item) and Q14 (edit legacy without SC). The summary does not mention re-edit at all. | summary §7.3, handover §10.3 | Medium |

> Note: G3 is the highest priority among genuinely SC-CR-introduced risks. G4 is the highest priority for 478 edit-order display correctness, even though it is pre-existing.

---

## 7. Exact 478 Validation Checklist

Use a real 478 restaurant with `auto_service_charge='Yes'`, `service_charge_percentage` > 0, `service_charge_tax` > 0, `gst_status='Yes'`, `total_round='Yes'` for the positive cases (mirror handover §10.1 setup), and a 478 with `auto_service_charge='No'` (or absent) for regression cases.

### 7.1 Place order (478, NORMAL `/customer/order/place`)
- [ ] Cart with GST item only + SC. Inspect outgoing payload (DevTools Network):
  - `total_service_tax_amount` matches UI Service Charge row.
  - `service_gst_tax_amount` matches UI CGST-on-SC + SGST-on-SC.
  - `order_sub_total_amount = subtotalAfterDiscount + serviceCharge`.
  - `order_sub_total_without_tax = itemTotal` (pre-discount, pre-SC).
  - `tax_amount` matches `finalTotalTax` (= itemCgst + itemSgst + itemVat + scCgst + scSgst).
  - **Confirm whether backend accepts payload despite `total_gst_tax_amount` / `total_vat_tax_amount` being absent** (G3). Ask backend to either (a) confirm derivation, or (b) state that those fields are required.
  - `order_amount = ceil(roundedTotal)`.
  - Per-item `service_charge`: sum equals `total_service_tax_amount`.
- [ ] Cart with VAT item only + SC. UI shows VAT row + CGST-on-SC + SGST-on-SC; payload `total_service_tax_amount` correct, `tax_amount` correct.
- [ ] Mixed GST + VAT + SC cart. Mirror handover §3 worked example (or scaled equivalent) and verify all 6 tax rows + Grand Total = ceil.
- [ ] `auto_service_charge = 'No'` regression: payload is byte-identical to pre-CR for the same cart (handover §7).

### 7.2 Edit order (478, `/customer/order/update-customer-order`) — the critical untested path
- [ ] Place an order on 478 with SC enabled. Confirm SC row appears on OrderSuccess (Bill Summary).
- [ ] Click EDIT ORDER. `getOrderDetails` payload must include the SC fields the new pure-API mapping reads (`total_service_tax_amount`, `service_gst_tax_amount`, `payload_total_gst_tax_amount`, `total_vat_tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `order_amount`). If any is missing, document which are absent and check the fallback computations in `getOrderDetails:180-208`.
- [ ] In edit mode, observe ReviewOrder's `previousSubtotal`. Verify `itemTotal = previousSubtotal + currentCartSubtotal` is correct.
- [ ] Verify previous-item GST/VAT contribution is non-zero (G4 check). If `prevItem.item.tax_type` is `'percentage'` rather than `'GST'`/`'VAT'`, the totals will be wrong. Capture the actual `tax_type` string from `getOrderDetails` response for one previous item.
- [ ] Add 1 item to the cart. SC must recompute on `(prev + new) − pointsDiscount`. UI Service Charge row reflects the new aggregate.
- [ ] Click Update. Inspect outgoing `updateCustomerOrder` payload (Network):
  - All SC fields present and correct (same checklist as 7.1).
  - `cart[].service_charge` allocated proportionally; sum = `total_service_tax_amount`.
  - `payment_type='postpaid'` (hardcoded by ReviewOrder).
  - `restaurant_id` is a string.
- [ ] After successful update, verify navigation to OrderSuccess and the Bill Summary reflects the updated totals from `getOrderDetails` (pure API mapping).
- [ ] Refresh OrderSuccess. Bill Summary must persist (no flicker, no SC row disappearing).
- [ ] Re-edit (edit again). Repeat add-item, SC recomputed correctly, payload still carries SC fields. (G10)

### 7.3 Loyalty (points) interactions (positive case for handover Q3)
- [ ] Place order with N points redeemed (`pointsDiscount` > 0). Verify SC base = `subtotalAfterDiscount = max(0, itemTotal − pointsDiscount)`. SC and SC-GST scale accordingly.
- [ ] Edit an order that originally redeemed points. Confirm `pointsDiscount`/`pointsRedeemed` are propagated into `updateCustomerOrder` payload (`discount_amount`, `points_discount`, `points_redeemed`, `discount_type='Loyality'` when `pointsRedeemed > 0`).
- [ ] Edge: `pointsDiscount > itemTotal` → SC base = 0, SC = 0, SC-GST = 0. UI hides SC row. Payload `total_service_tax_amount = 0`.

### 7.4 Coupon interaction
- [ ] Apply a coupon on 478. Confirm whether `coupon_discount_amount` is sent (currently **hardcoded `0`** — G5). Document the actual UI vs payload behaviour. **This is a code-vs-doc gap that may need a separate CR.**

### 7.5 Wallet interaction
- [ ] If wallet pay-flow is in scope for 478, confirm wallet redemption does not interfere with SC math (SC is computed on `subtotalAfterDiscount`, which includes only points discount today).

### 7.6 Order details after edit (critical for OrderSuccess display correctness)
- [ ] Capture `/order-details` response after a successful edit. Confirm:
  - Per-detail `service_charge` is echoed and persisted.
  - Root `total_service_tax_amount`, `service_gst_tax_amount`, `payload_total_gst_tax_amount`, `total_vat_tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax` are present and correct post-edit.
  - `total_tax_amount` and `order_amount` reflect the post-edit values.
- [ ] OrderSuccess Bill Summary shows the same numbers across: (a) immediate post-update navigation (passed bill summary), (b) first poll (API bill summary), (c) refresh (API only).

### 7.7 Regression / zero-SC cases on 478
- [ ] `auto_service_charge='No'` + edit existing order: payload identical to pre-CR baseline; no SC row anywhere.
- [ ] `auto_service_charge='Yes'`, `service_charge_percentage=0`: `applyServiceCharge=false`, same as above.
- [ ] Legacy order placed before this CR, edited now under SC ON: SC computed on combined cart, previous items contribute correctly to itemTotal.

### 7.8 Cross-sanity
- [ ] Snapshot a 478 placeOrder payload and a 478 updateCustomerOrder payload for the same cart configuration. Compare the 14 fields in §4 of this report. Differences should be limited to: `order_id` (only in U), `coupon_code/coupon_discount_title` (only in N), `delivery_*`/`address_*` fields (only in N when delivery), `pincode` (in N for delivery).

---

**End of report.**
