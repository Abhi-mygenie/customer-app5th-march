# Service Charge Mapping — Implementation Summary

| Field | Value |
|---|---|
| **CR name** | `SERVICE_CHARGE_MAPPING` |
| **Repo / Branch** | `customer-app5th-march` / `abhi-2-may` |
| **Base commit (handover)** | `7ddb458` (diff vs current HEAD `d3c9f63` = empty for in-scope files) |
| **Implementation Agent** | E1 |
| **Implementation date** | 2026-05-02 |
| **Final verdict** | **implementation_done** (pending user manual validation on 716 + 478) |

---

## 1. Requirement implemented

Mapped 3 keys from `restaurant_details` API (`auto_service_charge`, `service_charge_percentage`, `service_charge_tax`) into the customer-ordering billing flow:
- New `serviceCharge` line + GST-on-SC merged into existing CGST/SGST bucket per locked rule R4.
- Threaded through to all 3 payload writers (`buildMultiMenuPayload`, normal `placeOrder`, `updateCustomerOrder`) per R7.
- Surfaced on ReviewOrder Price Breakdown UI and OrderSuccess Bill Summary.
- Zero-regression contract preserved (§7): when `auto_service_charge !== 'Yes'` or `pct=0` or keys absent, output is byte-identical to pre-CR behaviour.

---

## 2. Bucket-wise implementation summary

| Bucket | Scope | Status |
|---|---|---|
| **A** | `ReviewOrder.jsx` math: SC keys, `serviceCharge`, `gstOnServiceCharge`, `scCgst/Sgst`, `finalCgst/Sgst/Vat`, `finalTotalTax`, `finalSubtotal`, new `totalToPay`. Extended `buildBillSummary` helper. | ✅ done |
| **B** | `helpers.js` `buildMultiMenuPayload`: destructured 4 new fields, added `gstOnSc` into root totals, updated 3 payload field values. | ✅ done |
| **C** | `ReviewOrder.jsx` wiring: passed `serviceCharge`, `gstOnServiceCharge`, `itemTotal`, `finalSubtotal` to all 4 outbound calls (placeOrder, placeOrder-retry, updateCustomerOrder ×2). Changed `totalTax` arg to `finalTotalTax`. | ✅ done |
| **D** | `ReviewOrder.jsx` UI: SC row (gated by `serviceCharge > 0`), Subtotal value → `finalSubtotal`, CGST/SGST values → `finalCgst/Sgst`, gate change `totalGst > 0` → `finalCgst > 0`. | ✅ done |
| **E** | `orderService.ts`: normal `placeOrder` + `updateCustomerOrder` payloads — pulled SC fields, added `total_service_tax_amount`, `service_gst_tax_amount: 0`, updated `order_sub_total_amount`/`order_sub_total_without_tax`. | ✅ done |
| **F** | `OrderSuccess.jsx`: persisted `serviceCharge` from passed/API bill summary, set on state, added bill row between Discount and Subtotal. | ✅ done |
| **G** | `orderService.test.js`: added 4 new tests (2 multi-menu + 2 normal-path, covering zero-baseline and positive cases). | ✅ done — 4/4 pass |

User explicit decision: one-shot implementation across all buckets, validation via 2 manual test cases (716 + 478) instead of bucket-by-bucket sign-off.

---

## 3. Files changed

| # | File | LOC delta |
|---|---|---|
| 1 | `frontend/src/pages/ReviewOrder.jsx` | +84 / −18 (helper extension + math block + 4 call sites + UI rows + gate) |
| 2 | `frontend/src/api/transformers/helpers.js` | +13 / −7 (`buildMultiMenuPayload` only) |
| 3 | `frontend/src/api/services/orderService.ts` | +27 / −6 (`placeOrder` normal path + `updateCustomerOrder`) |
| 4 | `frontend/src/pages/OrderSuccess.jsx` | +10 / −3 (recalc + bill row) |
| 5 | `frontend/src/__tests__/services/orderService.test.js` | +90 / −0 (4 new tests + helper) |

`taxCalculation.js` was **not** touched (handover §5.2(c) "Revised approach" supersedes §5.1).

---

## 4. Logic changed per file

### `ReviewOrder.jsx`
- `buildBillSummary({...})` signature now accepts `serviceCharge`, `finalSubtotal`, `finalCgst`, `finalSgst`, `finalVat`, `finalTotalTax`. Returns `subtotal: finalSubtotal`, `subtotalBeforeServiceCharge: subtotalAfterDiscount`, `cgst: finalCgst`, `sgst: finalSgst`, plus new `serviceCharge`.
- After `adjustedCgst/Sgst/Vat/TotalTax` (line ~585) inserted SC block: derives `scAutoApply`, `scPct`, `scGstRate`, `applyServiceCharge`, `isGstEnabledForSc`, then computes `serviceCharge`, `gstOnServiceCharge`, `scCgst`, `scSgst`, `finalCgst`, `finalSgst`, `finalVat`, `finalTotalTax`, `finalSubtotal`.
- `totalToPay` now = `finalSubtotal + finalTotalTax` (was `subtotalAfterDiscount + adjustedTotalTax`). When SC=0 these are byte-identical.
- All 3 `buildBillSummary` call sites (Razorpay 790, success 1064, 401-retry 1189) updated.
- 4 outbound API calls (placeOrder + retry + updateCustomerOrder ×2) now pass new SC fields. `totalTax: totalTax` → `totalTax: finalTotalTax`. `totalTax: adjustedTotalTax` → `totalTax: finalTotalTax`.
- Inline price breakdown UI: new SC row between Item Total and the existing rows; Subtotal value → `finalSubtotal`; CGST/SGST values → `finalCgst/Sgst`; gate `totalGst > 0` → `finalCgst > 0` (so a VAT-only cart with SC-GST still renders the rows per Q4).

### `helpers.js` — `buildMultiMenuPayload`
- Destructure adds: `serviceCharge=0`, `gstOnServiceCharge=0`, `itemTotal=0`, `finalSubtotal` (no default).
- Replaced root totals computation: split into `itemGstTaxAmount` / `itemVatTaxAmount`, then `totalGstTaxAmount = itemGstTaxAmount + gstOnSc`, `totalVatTaxAmount = itemVatTaxAmount` (untouched).
- `order_sub_total_amount`: `(finalSubtotal !== undefined ? finalSubtotal : subtotal)` — falls back when CR fields absent.
- `order_sub_total_without_tax`: `itemTotal > 0 ? itemTotal : subtotal`.
- `total_service_tax_amount`: `serviceCharge` (was hardcoded 0).
- `service_gst_tax_amount`: stays `0` per R9.
- `total_vat_tax_amount`: untouched.
- `tax_amount` (root): now = `totalGstTaxAmount + totalVatTaxAmount` so it picks up SC-GST automatically.

### `orderService.ts`
**`placeOrder` normal path:** pulls `serviceCharge`, `itemTotal`, `finalSubtotal` from `orderData`. `order_sub_total_amount` → `finalSubtotal`. `order_sub_total_without_tax` → `itemTotal > 0 ? itemTotal : subtotal`. Adds `total_service_tax_amount: serviceCharge`, `service_gst_tax_amount: 0`. `tax_amount` continues to use `orderData.totalTax` (which now holds `finalTotalTax` from ReviewOrder).
**`updateCustomerOrder`:** destructure adds `serviceCharge=0`, `gstOnServiceCharge=0`, `itemTotal=0`, `finalSubtotal` (no default). `effectiveSubtotal` falls back to existing `subtotal`. `effectiveItemTotal` falls back to `subtotal`. Adds `total_service_tax_amount`, `service_gst_tax_amount: 0`.

### `OrderSuccess.jsx`
- Recalc block at lines 293-331: derives `persistedServiceCharge = passedBillSummary?.serviceCharge || apiBillSummary.serviceCharge || 0`. `setBillSummary({...})` now spreads `serviceCharge: persistedServiceCharge`, `subtotal: subtotalAfterDiscount + persistedServiceCharge`.
- Bill rendering at lines 651-666: new conditional row between Discount and Subtotal.

### `orderService.test.js`
- Added `extractPayload(formArg)` helper that deserializes `formData.get('data')` into a JSON object (the existing 21 tests in the file rely on `payload.data` which is `undefined` — pre-existing test-infra issue, **out of scope per §6**).
- Added 4 tests:
  1. multi-menu zero-baseline (no SC fields when SC omitted).
  2. multi-menu positive (SC=60, gstOnSc=10.80, asserts `total_service_tax_amount=60`, `total_gst_tax_amount=46.80`, `order_sub_total_without_tax=1200`, `order_sub_total_amount=1260`).
  3. normal-path positive (SC=50, asserts payload field shape).
  4. normal-path zero-baseline.

---

## 5. Payload fields updated

| Writer | Field | Old | New |
|---|---|---|---|
| `buildMultiMenuPayload` | `order_sub_total_amount` | `subtotal` | `finalSubtotal` (fallback `subtotal`) |
| `buildMultiMenuPayload` | `order_sub_total_without_tax` | `subtotal` | `itemTotal` (fallback `subtotal`) |
| `buildMultiMenuPayload` | `total_service_tax_amount` | hardcoded `0` | `serviceCharge` |
| `buildMultiMenuPayload` | `total_gst_tax_amount` | item-GST sum | item-GST sum + `gstOnSc` |
| `buildMultiMenuPayload` | `tax_amount` (root) | item-GST + VAT | item-GST + `gstOnSc` + VAT |
| `buildMultiMenuPayload` | `service_gst_tax_amount` | `0` | `0` (R9, unchanged) |
| `buildMultiMenuPayload` | `total_vat_tax_amount` | item-VAT | item-VAT (unchanged) |
| Normal `placeOrder` | `order_sub_total_amount` | `subtotal` | `finalSubtotal` (fallback `subtotal`) |
| Normal `placeOrder` | `order_sub_total_without_tax` | `subtotal` | `itemTotal` (fallback `subtotal`) |
| Normal `placeOrder` | `total_service_tax_amount` | (not present) | `serviceCharge` |
| Normal `placeOrder` | `service_gst_tax_amount` | (not present) | `0` |
| Normal `placeOrder` | `tax_amount` | `orderData.totalTax` | `orderData.totalTax` (now = `finalTotalTax` from ReviewOrder) |
| `updateCustomerOrder` | mirror of normal `placeOrder` | — | — |

---

## 6. OrderSuccess / Bill Summary UI changes

ReviewOrder Price Breakdown:
```
Item Total
+ Service Charge (X%)             [NEW; gated by serviceCharge > 0]
  Coupon / Loyalty / Delivery (existing)
Subtotal                           [value now = finalSubtotal]
  CGST                             [value now = finalCgst; gate now = finalCgst > 0]
  SGST                             [value now = finalSgst]
  VAT                              [unchanged]
Grand Total                        [unchanged formula; driven by new totalToPay]
```

OrderSuccess Bill Summary:
```
Item Total
Loyalty/Discount
+ Service Charge                   [NEW; gated by billSummary.serviceCharge > 0]
Subtotal                           [now includes SC]
CGST / SGST / VAT
Grand Total
```

---

## 7. Validation performed (by Implementation Agent)

| Step | Result |
|---|---|
| Static lint of changed JS / JSX files | ✅ no issues |
| ESLint of `.ts` file | ⚠️ pre-existing TS-syntax parse error (lint config doesn't grok `.ts`); **NOT introduced by this CR** |
| Frontend webpack compilation (post supervisor restart) | ✅ "Compiled with warnings" (1 unrelated warning) |
| Backend & frontend supervisor status | ✅ both `RUNNING` |
| `curl http://localhost:3000/` | ✅ HTTP 200 |
| Unit tests for SC mapping (4 new tests) | ✅ 4/4 pass |
| `git diff --stat` scope check | ✅ exactly 5 in-scope files changed; nothing else |

Manual end-to-end validation (716 / 478 cart flows) is the user's pending step.

---

## 8. Acceptance criteria status

| § | Criterion | Status |
|---|---|---|
| 12 | Q1–Q6 positive cases (716 SC math + UI) | ⏳ awaiting user 716 manual test |
| 12 | Q7–Q12 regression cases | ⏳ awaiting user manual test |
| 12 | `orderService.test.js` passes green | ✅ for the 4 new SC tests; pre-existing 21 tests remain broken (out of scope) |
| 12 | No imports added/removed beyond spec | ✅ |
| 12 | No changes to `taxCalculation.js`, `CartContext.js`, `getTotalPrice()`, `transformCartItemForMultiMenu`, `LandingPage.jsx` | ✅ |
| 12 | New conditional rows render only when SC > 0 | ✅ both `serviceCharge > 0` and `billSummary.serviceCharge > 0` gates |
| 12 | No console errors when `restaurant` is null | ✅ all SC derivations use `restaurant?.x` and default to 0 / false |
| 12 | §6 must-not-change list respected | ✅ |

---

## 9. Known risks / runtime-TBC items (carry-over from handover §9)

| ID | Status |
|---|---|
| **R-runtime-1** — backend field acceptance for non-716 (`/place_order`) | ⏳ open — needs runtime verification on a non-716 (478) test order |
| **R-runtime-2** — `transformPreviousOrderItem` / `getOrderDetails` SC field mapping (so reloading OrderSuccess pulls SC from API) | ⏳ open — until first SC order is placed and order-details API shape captured. Current code uses `passedBillSummary.serviceCharge` fallback → SC visible in fresh-order success page; may show 0 after refresh until R-runtime-2 wired. |
| **R-runtime-3** — string vs number for `service_charge_percentage` / `service_charge_tax` | ✅ handled (parseFloat) |
| **R-adjacent-1** — `tax_type \|\| 'percentage'` zeroing item GST/VAT in `orderTransformer.ts` | 🚫 not fixed (out of scope per stakeholder direction) |
| **R-adjacent-2** — `Math.ceil` vs `parseFloat(toFixed(2))` divergence between writers | 🚫 not fixed (out of scope) |

---

## 10. Items intentionally not changed

- `frontend/src/utils/taxCalculation.js` (handover §5.2(c) override).
- `frontend/src/context/CartContext.js`, `useCart().getTotalPrice()`.
- `transformCartItemForMultiMenu`, `transformPreviousOrderItem`, `getOrderDetails`.
- `frontend/src/pages/LandingPage.jsx`.
- `frontend/src/components/ReviewOrderPriceBreakdown/*`.
- Coupon UI / Razorpay flow / `total_round` ceil logic.
- `frontend/src/api/transformers/orderTransformer.ts` (R-adjacent-1).
- Pre-existing 21 broken tests in `orderService.test.js` (FormData mock issue — different concern from SC CR).
- Admin app and any backend code (CR is frontend-only).

---

## 11. QA handover notes

**First validation cycle = 716 only** (per user direction):
1. Open 716 menu → add items → ReviewOrder. Verify Price Breakdown shows the new SC row and Subtotal/CGST/SGST values match handover §3 worked example for the configured SC%.
2. Place order → check network tab → confirm `total_service_tax_amount`, `total_gst_tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax` carry the values per §4.
3. Land on OrderSuccess → confirm Service Charge row visible → Grand Total matches Razorpay charged amount (and `total_round` ceil where enabled).

**Second cycle = 478** (after 716 sign-off):
1. Loyalty redemption + SC enabled: verify SC base = `subtotalAfterDiscount` (R2). E2E discount math intact.
2. Coupon flow with SC=0 (zero-regression): byte-identical payload to today.
3. Edit existing order on 478 → updateCustomerOrder payload carries SC fields.

**Optional smoke:** any restaurant with `auto_service_charge !== 'Yes'` → SC row hidden, payload mirrors pre-CR behaviour.

Suggested DevTools/network field check on the placed-order request:
```
total_service_tax_amount
service_gst_tax_amount = 0
order_sub_total_amount  (= itemTotal + serviceCharge − pointsDiscount)
order_sub_total_without_tax  (= itemTotal raw)
total_gst_tax_amount  (= item-GST + scGst)
tax_amount  (root)
```

---

## 12. Manual user approvals received per bucket

User explicitly opted out of bucket-by-bucket gates and chose **one-shot implementation**, gated by 2 manual test cases (716 + 478) at the end. Approvals on key spec decisions:

| Decision | User reply |
|---|---|
| Q1: SC-GST display | **A1** — fold into existing CGST/SGST rows (matches R4) |
| Q2: `subtotal` arg in `placeOrder` | **(a)** — keep existing `subtotal` arg as-is, add new fields |
| Implementation approach | **One-shot all buckets**, validate via 2 cases (716 + 478) |
| Local jest unit-test execution | **Yes**, since it's read-only |

---

## Final verdict

**implementation_done** — code changes complete, lint clean (for JS/JSX), webpack compiles, 4/4 new SC unit tests pass.

**Files changed (5):**
1. `frontend/src/pages/ReviewOrder.jsx`
2. `frontend/src/api/transformers/helpers.js`
3. `frontend/src/api/services/orderService.ts`
4. `frontend/src/pages/OrderSuccess.jsx`
5. `frontend/src/__tests__/services/orderService.test.js`

**Working tree contains only intended changes:** ✅ confirmed via `git diff --stat`.

**Pending user action:** manual end-to-end validation on 716 first, then 478. After approval, runtime-TBC items R-runtime-1 and R-runtime-2 can be addressed in a follow-up.
