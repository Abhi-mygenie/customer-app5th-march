# Service Charge Mapping — Implementation Summary (Final)

| Field | Value |
|---|---|
| **CR name** | `SERVICE_CHARGE_MAPPING` |
| **Repo / Branch** | `customer-app5th-march` / `abhi-2-may` |
| **Implementation Agent** | E1 |
| **Final verdict** | **implementation_done** — 716 validated end-to-end; 478 pending |

---

## 1. Requirement implemented

Complete service-charge billing flow wired into customer-app:
- 3 `restaurant_details` keys (`auto_service_charge`, `service_charge_percentage`, `service_charge_tax`) fully consumed.
- Tax math in ReviewOrder: SC on `subtotalAfterDiscount`, SC-GST computed + split CGST/SGST.
- Payload sent in all 3 writers identically (multi-menu, normal `placeOrder`, `updateCustomerOrder`), including per-item `service_charge` allocation and root-level aggregates.
- OrderSuccess Bill Summary refactored to pure-API mapping (zero client-side recompute).
- Compliance-grade display: CGST/SGST/VAT rows + CGST-on-SC/SGST-on-SC rows with `%` suffix. Conditional hiding when amounts are zero.
- Feature-flag-gated hide of pre-round bracket + internal order ID on Collect Bill page.
- Adjacent fix: manually-selected room/table (716 flow) now persists to `sessionStorage` (pre-order UX) and reads from API post-order.

---

## 2. Final file list (8 files touched across the CR lifetime)

| File | Role |
|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | Math, UI rows, payload wiring, sessionStorage persist |
| `frontend/src/api/transformers/helpers.js` | `buildMultiMenuPayload` + `allocateServiceChargePerItem` helper |
| `frontend/src/api/services/orderService.ts` | `placeOrder` / `updateCustomerOrder` payload fields; `getOrderDetails` pure-API mapping |
| `frontend/src/pages/OrderSuccess.jsx` | Bill Summary refactor, tax row splits, UI flags, table fallback |
| `frontend/src/types/models/order.types.ts` | `BillSummary` interface extended with `serviceCharge`, `scCgst`, `scSgst`, `gstRate`, `vatRate`, `scGstRate` |
| `frontend/src/__tests__/services/orderService.test.js` | 6 new SC unit tests (+ extractPayload helper) |
| `frontend/yarn.lock` | dep install only; no manual changes |

`taxCalculation.js`, `CartContext.js`, `getTotalPrice()`, `transformCartItemForMultiMenu`, `transformPreviousOrderItem`, `LandingPage.jsx`, coupon/Razorpay/loyalty flows — all untouched per handover §6.

---

## 3. Final payload contract (from all 3 writers)

**Per cart item:**
```json
{
  "gst_tax_amount": <item-only GST>,
  "vat_tax_amount": <item-only VAT>,
  "service_charge": <allocated proportionally>
}
```

**Root level:**
```json
{
  "total_service_tax_amount": <SC total>,
  "service_gst_tax_amount": <SC-GST total>,            // deviates from handover R9 (was 0); now populated per stakeholder direction
  "total_gst_tax_amount": <item GST + SC-GST combined>,
  "total_vat_tax_amount": <item VAT total>,
  "tax_amount": <grand total tax, root>,
  "order_sub_total_amount": <itemTotal + SC>,
  "order_sub_total_without_tax": <itemTotal>
}
```

---

## 4. Final retrieval contract (`getOrderDetails` — pure API mapping)

Reads from backend response fields directly with defensive fallbacks:
- `firstDetail.order_sub_total_without_tax` → `itemTotal`
- `firstDetail.order_sub_total_amount` → `subtotal` (post-SC)
- `firstDetail.total_tax_amount` → `totalTax`
- `firstDetail.total_vat_tax_amount` (or Σ item `vat_tax_amount`) → `totalVat`
- `firstDetail.total_service_tax_amount` (or Σ item `service_charge`) → `serviceCharge`
- `firstDetail.payload_total_gst_tax_amount` (or `totalTax − totalVat`) → `totalGst`
- `firstDetail.service_gst_tax_amount` (or derived) → `scGst`
- `totalGst − scGst` → `itemGst` → `cgst` / `sgst` = `itemGst / 2`
- `scGst / 2` → `scCgst` / `scSgst`
- `firstDetail.order_amount` → `grandTotal`
- Rates: uniform GST / VAT rates from items (null if mixed); `scGstRate` derived from `scGst / serviceCharge × 100`
- `firstDetail.table_type` → `tableType` (new)

No client-side recomputation. No `calculateTaxBreakdown` call. No `taxRatio` adjustment.

---

## 5. UI contract (final)

### ReviewOrder Price Breakdown
```
Item Total                  ₹X
Service Charge (Optional)   ₹SC              [hidden if SC=0]
────────────────────────────────
Subtotal                    ₹X+SC
CGST 9%                     ₹itemCgst        [hidden if itemGst=0]
SGST 9%                     ₹itemSgst        [hidden if itemGst=0]
VAT 22%                     ₹VAT              [hidden if itemVat=0]
CGST on SC 9%               ₹scCgst          [hidden if scGst=0]
SGST on SC 9%               ₹scSgst          [hidden if scGst=0]
────────────────────────────────
Grand Total  ₹ceil(total) (₹preRound)  ← bracket visible (pre-round shown)
```

### OrderSuccess Bill Summary (Collect Bill)
Same 6 tax-band rows with same hide rules. Grand Total shows **without** pre-round bracket (flag `SHOW_PRE_ROUND_BRACKET=false`).
Order ID row shows `#000XXX` only (internal id hidden via `SHOW_INTERNAL_ORDER_ID=false`).
Room/Table row: prefers API `table_no`/`table_type`; fallback to sessionStorage.

`%` suffix sourced from uniform rate across items (single-rate carts), from restaurant config (`service_charge_tax`) for SC rows. Mixed-rate carts show labels without `%`.

---

## 6. Deviations from handover (documented)

| Rule | Original | Final | Reason |
|---|---|---|---|
| **R9** `service_gst_tax_amount=0` | locked to 0 | populated with actual SC-GST | stakeholder direction post-handover; field name matches semantics |
| **R4** SC-GST merged into CGST/SGST | single CGST/SGST row | **split** into 4 rows (item + SC) | compliance requirement (restaurant receipt format) |
| **§5.1** change `taxCalculation.js` | required | NOT changed | §5.2(c) revised approach overrides §5.1 |

All other locked rules (R1 gate, R2 SC base, R3 GST gate, R5 single round, R7 all-writers-identical, R8 VAT untouched) preserved.

---

## 7. Validation status

### Unit tests
✅ 6/6 SC tests pass:
1. multi-menu zero-baseline
2. multi-menu positive (worked example from §3)
3. multi-menu per-item allocation (3 items, remainder handling)
4. multi-menu zero-SC per-item regression
5. normal-path positive
6. normal-path zero-baseline

### Manual validation (716)
✅ Single-item cart with SC (GST-only) — ReviewOrder & OrderSuccess reconcile
✅ Multi-item cart (GST + VAT + SC) — all tax rows correct, numbers match backend response
✅ Per-item `service_charge` allocation (last-item-remainder) verified
✅ Page refresh on OrderSuccess → values persist (pure API)
✅ Grand Total bracket visible on ReviewOrder, hidden on OrderSuccess
✅ Internal order ID hidden on OrderSuccess
✅ `%` suffix rendered for all tax rows

### Pending
🟡 478 flow validation (loyalty + coupon + wallet + edit-order) — requires stakeholder testing
🟡 Room/table display on 716 Collect Bill — pending user validation after this iteration

---

## 8. Backend contract changes (deployed during CR)

Backend team added these fields to `/order-details` response during CR testing:
- `total_vat_tax_amount`
- `total_service_tax_amount`
- `service_gst_tax_amount`
- `payload_total_gst_tax_amount` (correctly-labeled total GST; `total_gst_tax_amount` keeps its legacy combined-with-tax semantic)

Also fixed backend data-persistence issues:
- `order_sub_total_amount` / `order_sub_total_without_tax` now persist correctly (were stored as 0 initially)
- Per-item `service_charge` now persists and echoes correctly

---

## 9. Known residual backend gaps (out of CR scope — flag to backend team)

| Priority | Gap |
|---|---|
| Low | `total_gst_tax_amount` in response still mislabeled (= total_tax); frontend uses `payload_total_gst_tax_amount` instead. Rename in backend for clarity. |
| Low | `transaction_reference` duplicates `order_sub_total_amount`. Either rename or deprecate. |
| Low | Echo consistency: `service_gst_tax_amount` is sent in our payload but inconsistently echoed in response (sometimes absent). |

---

## 10. Adjacent fix included in CR (explicit note)

**Room/Table display on OrderSuccess for 716 (manual room-selection flow).**

- **Problem**: 716 uses a dropdown for room selection instead of QR URL → `useScannedTable` never got populated → Collect Bill hid the room row.
- **Fix**:
  1. ReviewOrder writes manually-picked room/table into `sessionStorage` using same key shape as `useScannedTable` → pre-order screens (menu, ReviewOrder, etc.) work.
  2. OrderSuccess fetches `table_no` + `table_type` from `/order-details` API as **primary** source post-order; sessionStorage used as fallback only. Matches stakeholder direction: "after order is placed, everything should come from API".
- **Zero impact on QR-flow restaurants**: their sessionStorage was already populated; their render path also now prefers API (both sources agree).

---

## 11. Final verdict

**implementation_done.**

**Files changed (final, 7 source files + 1 lockfile + this summary):**
1. `frontend/src/pages/ReviewOrder.jsx`
2. `frontend/src/api/transformers/helpers.js`
3. `frontend/src/api/services/orderService.ts`
4. `frontend/src/pages/OrderSuccess.jsx`
5. `frontend/src/types/models/order.types.ts`
6. `frontend/src/__tests__/services/orderService.test.js`
7. `frontend/yarn.lock` (generated)

**Working tree scope:** ✅ only intended files changed.

**Next steps:** stakeholder validation on 716 (current iteration output) and 478 (full loyalty/coupon/wallet cycle). If 478 reveals issues, address in a follow-up iteration.
