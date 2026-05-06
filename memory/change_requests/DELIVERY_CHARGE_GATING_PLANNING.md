# Delivery Charge + Order-Type Gating — Planning Document

**CR Name:** `DELIVERY_CHARGE_GATING`
**Status:** Planning — **NO CODE CHANGES YET**, awaiting approval
**Workflow:** Approval-gated (same model as F1–F5)
**Prepared:** 2026-05-06
**Scope locked by stakeholder:** see Section 1
**Independent of:** SERVICE_CHARGE_MAPPING_478 (F1–F5) — that thread is closed

---

## 1. Locked scope (stakeholder, do not deviate)

| # | Rule | Source |
|---|---|---|
| **D1** | **Service charge MUST be 0 for delivery and takeaway** orders, regardless of `auto_service_charge` config. Dine-in and room continue to apply SC as today. | stakeholder |
| **D2** | **Delivery charge applies ONLY to `orderType === 'delivery'`** orders. Other order types must not show or compute delivery charge in totals. | stakeholder |
| **D3** | **Delivery charge MUST be included in subtotal and grand total** for delivery orders. Currently shown in UI but excluded from math. | stakeholder |
| **D4** | **Delivery GST = 0 flat unless backend config exists.** No hardcoded 5% rate. If `restaurant.delivery_charge_tax` (or equivalent) exists and is > 0, use it; else delivery GST = 0. | **stakeholder (corrected from earlier 5% assumption)** |
| **D5** | If delivery GST is non-zero, **split as CGST half + SGST half** (same convention as item-GST and SC-GST). | stakeholder |
| **D6** | **`updateCustomerOrder` writer MUST NOT hardcode `delivery_charge: '0'`.** It currently does at `orderService.ts:451`. Must accept caller-provided value. | stakeholder |
| **D7** | **All 5 `placeOrder` / `updateCustomerOrder` call sites in `ReviewOrder.jsx` MUST pass `deliveryCharge`.** Currently only 1 of 5 does. | stakeholder |
| **D8** | **Do NOT touch `OrderSuccess.jsx`** until request payload and backend response are validated end-to-end. UI changes for the response side come in a later phase. | stakeholder |

---

## 2. Out of scope (explicitly NOT in this CR)

- ❌ `OrderSuccess.jsx` rendering changes (D8) — deferred to a later phase
- ❌ Backend persistence of `delivery_charge_gst_amount` (out of frontend scope; backend coordination doc separate if needed)
- ❌ `/order-details` mapping in `getOrderDetails` (orderService.ts:138-247) — until backend echoes a delivery-GST field
- ❌ Multi-menu autopaid path (716) modifications — verify only that 716 still works, no functional change there
- ❌ Refactoring the SC math block beyond the order-type gate addition
- ❌ New restaurant config fields (backend's responsibility if/when they choose)
- ❌ Coupon / loyalty / rounding logic changes
- ❌ `food_id` / `restaurant_id` type changes
- ❌ Any change to `OrderSuccess.jsx`, `helpers.js` allocation logic, `transformCartItemForApi`/`transformCartItemForMultiMenu`

---

## 3. Current state of code (recap from investigation)

### 3.1 SC gate (existing, before fix)
**File:** `frontend/src/pages/ReviewOrder.jsx`
**Lines:** 624-640

```js
const scAutoApply        = restaurant?.auto_service_charge === 'Yes';
const scPct              = parseFloat(restaurant?.service_charge_percentage) || 0;
const scGstRate          = parseFloat(restaurant?.service_charge_tax) || 0;
const applyServiceCharge = scAutoApply && scPct > 0;             // ← no orderType check
const isGstEnabledForSc  = restaurant?.gst_status === true || restaurant?.gst_status === 'Yes';

const serviceCharge      = applyServiceCharge
                            ? subtotalAfterDiscount * scPct / 100
                            : 0;
const gstOnServiceCharge = (applyServiceCharge && isGstEnabledForSc && scGstRate > 0)
                            ? serviceCharge * scGstRate / 100
                            : 0;
```

### 3.2 Delivery charge math (existing, before fix)
**File:** `frontend/src/pages/ReviewOrder.jsx`
**Lines:** 657, 660

```js
const finalSubtotal = parseFloat((subtotalAfterDiscount + serviceCharge).toFixed(2));
//                                                       ↑ NO deliveryCharge
const totalToPay    = parseFloat((finalSubtotal + finalTotalTax).toFixed(2));
//                                                  ↑ NO delivery-GST in finalTotalTax
```

### 3.3 Delivery GST (existing)
**File:** entire `src/`
**Status:** Concept absent. Zero references to `deliveryGst`, `delivery_gst_tax_amount`, etc.

### 3.4 Call sites & writers (existing)

| Site | Line | Function | Currently passes `deliveryCharge`? | Currently sends correct `delivery_charge` field? |
|---|---|---|---|---|
| 1 | ReviewOrder.jsx:972 | `updateCustomerOrder` edit primary | ❌ no | ❌ writer hardcodes `'0'` (orderService.ts:451) |
| 2 | ReviewOrder.jsx:1007 | `updateCustomerOrder` edit fail-safe | ❌ no | ❌ same |
| 3 | ReviewOrder.jsx:1090 | `placeOrder` primary | ✅ yes (l.1113) | ✅ writer reads it (orderService.ts:321) |
| 4 | ReviewOrder.jsx:1206 | `updateCustomerOrder` 401-retry | ❌ no | ❌ same hardcode |
| 5 | ReviewOrder.jsx:1241 | `placeOrder` 401-retry | ❌ no | ✅ writer would read it (if passed) |

### 3.5 Restaurant config keys (currently consumed)
```
restaurant.auto_service_charge          ← present
restaurant.service_charge_percentage    ← present
restaurant.service_charge_tax           ← present
restaurant.gst_status                   ← present
restaurant.total_round                  ← present
restaurant.delivery_charge_tax          ← ❓ NOT CURRENTLY READ — need to verify if backend exposes
```

**ACTION ITEM A (preflight, before D1 planning):** verify with backend team / restaurant-info API whether a `delivery_charge_tax` (or equivalent) key exists in the `/restaurant-info` response for restaurant 478 / 716. If yes → use it (D4 satisfied with non-zero rate). If no → D4 falls back to `0` (no delivery GST until backend adds the config). This determines whether D5 ever activates.

---

## 4. Proposed buckets (planning only — sequential, approval-gated)

Same workflow we used for F1–F5: each bucket is reviewed, approved, applied, validated, then the next one is planned.

### Bucket D-1 — SC order-type gating (smallest, lowest risk)
**Scope:** Make `applyServiceCharge` also require `isDineInOrRoom(scannedOrderType)`.

**Files:** `frontend/src/pages/ReviewOrder.jsx` only. 1 line changed (+ 1 comment).

**Net effect:** Takeaway and delivery orders → `serviceCharge = 0` → cascades automatically to:
- `gstOnServiceCharge = 0`, `scCgst = 0`, `scSgst = 0`
- `finalSubtotal = subtotalAfterDiscount` (no SC added)
- Payload: `total_service_tax_amount: 0`, `service_gst_tax_amount: 0`, per-item `service_charge: 0`
- UI: SC row + scCgst/scSgst rows hide automatically (existing `> 0` guards)

**Risk:** Very low. Single condition flip. No math change beyond the gate.

### Bucket D-2 — Delivery charge inclusion in subtotal/grand total
**Scope:** Add `deliveryCharge` to `finalSubtotal` math, gated by `scannedOrderType === 'delivery'`.

**Files:** `frontend/src/pages/ReviewOrder.jsx` only. ~3 lines (+ 1 comment).

**Math additions:**
```js
const includeDelivery = scannedOrderType === 'delivery';
const effectiveDeliveryCharge = includeDelivery ? (parseFloat(deliveryCharge) || 0) : 0;
const finalSubtotal = parseFloat((subtotalAfterDiscount + serviceCharge + effectiveDeliveryCharge).toFixed(2));
```

**Net effect:** Delivery orders → subtotal includes delivery charge → grand total includes it.

**Risk:** Low. New variable, additive, gated. No regression for non-delivery orders.

### Bucket D-3 — Delivery GST computation (gated by backend config)
**Scope:** Compute `gstOnDeliveryCharge`, `deliveryCgst`, `deliverySgst` only if `restaurant.delivery_charge_tax > 0`. Otherwise zero (per D4).

**Files:** `frontend/src/pages/ReviewOrder.jsx` only. ~5-7 lines (+ comment).

**Math additions (parallel to SC pattern):**
```js
const deliveryGstRate = parseFloat(restaurant?.delivery_charge_tax) || 0;
const applyDeliveryGst = includeDelivery
                       && isGstEnabledForSc
                       && deliveryGstRate > 0
                       && effectiveDeliveryCharge > 0;
const gstOnDeliveryCharge = applyDeliveryGst
                          ? effectiveDeliveryCharge * deliveryGstRate / 100
                          : 0;
const deliveryCgst = parseFloat((gstOnDeliveryCharge / 2).toFixed(2));
const deliverySgst = parseFloat((gstOnDeliveryCharge / 2).toFixed(2));
```

Then add to `finalCgst` / `finalSgst` aggregation:
```js
const finalCgst = parseFloat((adjustedCgst + scCgst + deliveryCgst).toFixed(2));
const finalSgst = parseFloat((adjustedSgst + scSgst + deliverySgst).toFixed(2));
```

**Net effect (when backend config absent):** `deliveryGstRate = 0` → `gstOnDeliveryCharge = 0` → `deliveryCgst = 0` → `deliverySgst = 0` → no UI/payload change vs D-2 alone. **Safe default** — D4 satisfied.

**Net effect (when backend exposes config):** delivery GST applied correctly, split into CGST/SGST per D5.

**Risk:** Low. All gated; defaults to zero when config missing.

### Bucket D-4 — Wire `deliveryCharge` to all 5 call sites
**Scope:** Add `deliveryCharge: deliveryCharge || 0,` argument to the 4 call sites that currently miss it (sites 1, 2, 4, 5).

**Files:** `frontend/src/pages/ReviewOrder.jsx` only. 4 sites × 1 line = 4 lines added (+ minor comments).

**Risk:** Low. Per-site additions only; existing args untouched.

### Bucket D-5 — `updateCustomerOrder` writer fix
**Scope:** Replace `delivery_charge: '0'` (hardcoded) at `orderService.ts:451` with `String(orderData.deliveryCharge || 0)`.

**Files:** `frontend/src/api/services/orderService.ts` only. 1 line changed.

**Risk:** Very low. Single-line write fix; mirrors `placeOrder` writer at l.321 already.

### Bucket D-6 — Validation & evidence (no code changes)
**Scope:** Same as F5. Capture before/after JSON for delivery, takeaway, dinein, room order types. Confirm regressions on 716 multi-menu (autopaid) path are zero.

**Files:** Documentation only.

---

## 5. Acceptance criteria

After all buckets D-1 through D-5 are applied:

### 5.1 Math reconciliation per order type

| `?orderType=` | Expected `serviceCharge` | Expected `effectiveDeliveryCharge` | Expected `finalSubtotal` |
|---|---|---|---|
| `dinein` | non-zero (if SC config on) | 0 | item + SC |
| `room` | non-zero (if SC config on) | 0 | item + SC |
| `takeaway` (or `take_away`) | **0** | 0 | item only |
| `delivery` | **0** | non-zero (from cart context) | item + delivery |
| (none / legacy QR) | non-zero (if SC config on) | 0 | item + SC (backward compat) |

### 5.2 Payload assertions for a delivery order (item ₹100, delivery ₹10, GST 5% item, no delivery GST config)

Place-order request payload MUST contain:
```json
{
  "order_type": "delivery",
  "delivery_charge": "10",
  "total_service_tax_amount": 0,    // D1
  "service_gst_tax_amount":  0,     // D1
  "order_sub_total_amount":  110,   // D3 (item + delivery, NO SC)
  "order_sub_total_without_tax": 100,
  "tax_amount":               5,    // item-GST only (no delivery GST when config absent)
  "total_gst_tax_amount":     5,
  "total_vat_tax_amount":     0,
  "order_amount":             115   // ceil(110 + 5)
}
```

When backend later exposes `delivery_charge_tax: "5.00"`:
```json
{
  "tax_amount":               5.50,  // item-GST 5 + delivery-GST 0.50
  "total_gst_tax_amount":     5.50,
  "order_amount":             116    // ceil(110 + 5.50)
}
```

### 5.3 UI assertions on ReviewOrder for delivery (D8: not OrderSuccess)

- ✅ "Service Charge (Optional)" row: **HIDDEN** (was wrongly shown before)
- ✅ "Delivery Charge ₹10.00" row: visible
- ✅ "Subtotal ₹110.00" row: includes delivery
- ✅ "CGST 2.5% ₹2.50" / "SGST 2.5% ₹2.50": item-GST only
- ✅ "CGST on SC" / "SGST on SC" rows: **HIDDEN** (no SC)
- ✅ "CGST on Delivery" / "SGST on Delivery" rows: **HIDDEN** when config absent (D4 default), or visible with split when config present
- ✅ "Grand Total ₹115.00" matches Pay & Proceed button
- ✅ Repro URL `https://18march.mygenie.online/478?type=walkin&orderType=delivery&foodFor=Normal` produces this exact bill

### 5.4 Regression assertions

- Dinein order (any restaurant): identical bill to today, byte-for-byte
- 716 multi-menu autopaid (room/QR): identical bill to today, byte-for-byte
- Edit-order on a dine-in order: identical to today + still no delivery row
- Edit-order on a delivery order: delivery charge correctly preserved (was zero pre-D5; now correct)
- Legacy QR codes (no `orderType` param): SC behavior unchanged (still applied)

---

## 6. Approval workflow (mirror of F1-F5)

For each bucket below, the workflow is:
1. **Plan** the bucket — show the exact diff to be applied (this document)
2. **STOP** — wait for stakeholder approval
3. **Apply** the diff via `search_replace` (single, surgical)
4. **Validate** — `tsc --noEmit`, ESLint on touched file, dev-server compile, AST scan to confirm structure
5. **Confirm** all constraints in Section 7 below pass
6. **Move** to next bucket — back to step 1

| Bucket | Type | Files | Lines | Risk | Status |
|---|---|---|---|---|---|
| D-1 | SC order-type gate | `ReviewOrder.jsx` | +2 | Very Low | ⏳ awaiting approval |
| D-2 | Delivery charge in totals | `ReviewOrder.jsx` | +3 | Low | ⏳ awaiting approval |
| D-3 | Delivery GST (config-gated) | `ReviewOrder.jsx` | +7 | Low | ⏳ awaiting approval |
| D-4 | Wire `deliveryCharge` to 4 sites | `ReviewOrder.jsx` | +4 | Low | ⏳ awaiting approval |
| D-5 | Fix `updateCustomerOrder` hardcode | `orderService.ts` | ~1 | Very Low | ⏳ awaiting approval |
| D-6 | Validation & evidence | docs only | 0 | Zero | ⏳ awaiting approval |

**Total proposed code change:** ~17 lines added in 2 files (`ReviewOrder.jsx`, `orderService.ts`).

**Approval-gated checkpoints:**
- After D-1: confirm SC=0 on takeaway/delivery via captured payload before proceeding to D-2
- After D-2: confirm subtotal/grand-total includes delivery before proceeding to D-3
- After D-3: confirm delivery-GST is 0 when config absent (per D4) before proceeding
- After D-4: confirm all 5 sites pass `deliveryCharge` correctly via AST scan
- After D-5: confirm edit-order delivery_charge is non-zero in update payload via captured request
- After D-6: write CR closure summary

---

## 7. Constraints (carry forward from F-series workflow)

Strict do-not-touch list:
- ❌ `OrderSuccess.jsx` (D8: deferred to later phase)
- ❌ `helpers.js` `transformCartItemForApi` / `transformCartItemForMultiMenu` (per-item taxes are item-driven; delivery is order-level only)
- ❌ `helpers.js` `allocateServiceChargePerItem` (delivery is not allocated per-item)
- ❌ `helpers.js` `buildMultiMenuPayload` (716 path; verify-only, not modify)
- ❌ Backend POS API (no backend code in this CR)
- ❌ Coupon, loyalty, points-redeem, discount math
- ❌ Rounding logic (`Math.ceil`, `total_round` flag)
- ❌ `food_id` / `restaurant_id` type conventions
- ❌ Razorpay payment flow
- ❌ Edit-order detection logic (`isEditMode`, `editingOrderId`)
- ❌ `useCart`, `CartContext.js` (the source of `deliveryCharge` value — its setter is out of scope)
- ❌ `useScannedTable` hook (the source of `scannedOrderType`)

Allowed-to-touch list (this CR):
- ✅ `frontend/src/pages/ReviewOrder.jsx`:
  - SC math block (l.624-640): add order-type gate (D-1)
  - Subtotal/total math (l.657-660): add delivery charge (D-2)
  - Tax aggregation (l.653-656): add delivery-GST (D-3)
  - 4 call sites (l.972, 1007, 1206, 1241): add `deliveryCharge` arg (D-4)
- ✅ `frontend/src/api/services/orderService.ts`:
  - `updateCustomerOrder` payload (l.451): unhardcode (D-5)

That's it. Two files. Surgical edits. Each bucket is independently revertible.

---

## 8. Test/Validation plan (D-6)

After D-1 through D-5 are applied:

### 8.1 Static validation (automated)
- `tsc --noEmit -p tsconfig.json` → no new errors
- `eslint` on both changed files → no new errors (existing pre-existing warnings unchanged)
- AST scan of all 5 call sites in `ReviewOrder.jsx` → all pass `deliveryCharge`
- `git diff` review → exact match to approved diffs in this doc

### 8.2 Runtime validation (manual, by stakeholder)
Capture the place-order request payload via DevTools for each scenario, paste back to the agent, and the agent will diff against §5.2 expected shape.

| # | Test scenario | URL | Expected payload outcome |
|---|---|---|---|
| 1 | 478 dine-in (current happy path) | `?type=table&orderType=dinein&tableId=…` | Identical to current — SC applied, no delivery, item-GST only |
| 2 | 478 takeaway | `?type=walkin&orderType=takeaway` | SC=0, delivery=0, item-GST only |
| 3 | 478 delivery | `?type=walkin&orderType=delivery` (with delivery address) | SC=0, delivery=10, delivery-GST=0 (no config), item-GST=5, total=115 |
| 4 | 478 room (per D-1 dineIn-equivalent) | `?type=room&orderType=dinein&tableId=…` | Identical to test 1 |
| 5 | 478 legacy URL (no orderType) | `?type=walkin` (no orderType param) | SC applied (backward compat), delivery=0 |
| 6 | 716 multi-menu autopaid | (room QR scan) | Byte-for-byte identical to current 716 baseline (no regression) |
| 7 | Edit-order on a 478 delivery | place delivery first, then edit | `delivery_charge` is non-zero in update payload (D-5 unhardcoded) |
| 8 | If/when backend exposes `delivery_charge_tax`: re-run scenario 3 | same as #3 | delivery-GST > 0, split into CGST/SGST, total adjusts |

---

## 9. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| `restaurant.delivery_charge_tax` field name unknown | Low | Defensive read with `|| 0` fallback; D4 default to 0 covers this; investigate via Action Item A in §3.5 before D-3 planning |
| `deliveryCharge` from `useCart` could be string in some flows | Low | Use `parseFloat() || 0` defensively (mirrors SC pattern) |
| Edit-order on a previously-placed dinein-with-SC switching to delivery | Very Low | Order type is locked to URL on edit; cannot switch mid-flow |
| Multi-menu (716) autopaid with `orderType=delivery` | Low | `buildMultiMenuPayload` reads same `orderData.deliveryCharge`; same gate flows through. Verify via test #6. |
| Backend rejecting non-zero `delivery_charge` on update endpoint | Low-Medium | D-5 unhardcodes; if backend rejects, that's a new backend bug to file separately. Test via #7 first to surface. |
| Customer who changed delivery address (refresh cart's `deliveryCharge`) mid-flow | Low | `deliveryCharge` is reactive from `useCart`; recomputes on render |
| `total_round = 'Yes'` interaction with delivery charge | Very Low | `roundedTotal = Math.ceil(totalToPay)` runs after delivery is added; rounds the inclusive total. Acceptable. |

---

## 10. Future phases (NOT this CR)

After this CR closes, deferred phases (separate planning docs):

### Phase 2 — OrderSuccess UI (D8 deferral)
- Add Delivery Charge row to OrderSuccess Bill Summary (mirror SC row)
- Add CGST/SGST on Delivery rows (when delivery-GST > 0)
- Confirm Screen 1 (local) and Screen 2 (API) parity for delivery orders
- Update `getOrderDetails` mapping in `orderService.ts` to read delivery-GST from response
- Re-run F5-style validation

### Phase 3 — Backend coordination (out of frontend scope)
- Backend persists `delivery_charge_gst_amount` (or split fields) on `/customer/order/place` and `/customer/order/update-customer-order`
- Backend echoes them on `/customer/order/order-details/<id>` response
- Backend exposes `delivery_charge_tax` in `/restaurant-info` response
- Mirrors what 716 SC fields already do for non-716 endpoints

---

## 11. Sign-off section (to be filled when CR closes)

```
[ ] D-1 applied & validated
[ ] D-2 applied & validated
[ ] D-3 applied & validated
[ ] D-4 applied & validated
[ ] D-5 applied & validated
[ ] D-6 evidence captured: dinein, takeaway, delivery, room, legacy, 716, edit-delivery
[ ] Stakeholder visual UAT on repro URL
[ ] CR closed
```

---

## 12. Open questions for stakeholder (BEFORE D-1 planning) — ✅ ANSWERED

These were answered by stakeholder on 2026-05-06:

**Q1 — `delivery_charge_tax` field on `/restaurant-info` API**
> "if yes we need to use this for gst on delivery charge just like how we are using gst on service charge"

**Resolution:** Defensive read pattern, mirror SC. Code:
```js
const deliveryGstRate = parseFloat(restaurant?.delivery_charge_tax) || 0;
```
- Works whether backend currently exposes the field or not (D4 default-zero behaviour preserved).
- The day backend exposes a non-zero value, delivery-GST activates automatically without further frontend change.
- Same shape as `service_charge_tax` consumption at `ReviewOrder.jsx:628`.

**Q2 — Room service treatment**
> "room service orders are treated as dine in no change in it wrt service charge"

**Resolution:** Use existing `isDineInOrRoom(scannedOrderType)` helper as-is. Returns `true` for both `'dinein'` and `'room'`, so both get SC applied. No new helper needed; no strict-equality variant.

**Q3 — Rounding**
> "yes only final total round off no interim round offs"

**Resolution:** Confirmed. `Math.ceil` applies once to the **inclusive** `totalToPay = finalSubtotal + finalTotalTax`, where `finalSubtotal` includes item + SC + delivery and `finalTotalTax` includes item-GST + SC-GST + delivery-GST. No interim rounding on intermediate sub-quantities. Matches existing pattern at `ReviewOrder.jsx:660-664`.

**Q4 — Edit-order delivery_charge persistence**
> "need to check run time, but delivery orders cant be edited, but we will check this run time, even if edit is allowed it shd not break, in future"

**Resolution:** D-5 remains in scope as a defensive future-proof fix. Today, delivery orders are not editable in the customer flow (no UI path), but the writer-level hardcode `'0'` is a latent bug. Unhardcoding it costs 1 line and removes a foot-gun. If backend rejects non-zero `delivery_charge` on update, that's a backend defect to file separately — not a reason to keep the hardcode.

**Q5 — Deferred OrderSuccess UI work**
> "only when backend ships all value, running runtime we validate missing value"

**Resolution:** D8 confirmed. OrderSuccess.jsx stays untouched in this CR. Phase 2 (OrderSuccess delivery rows + `getOrderDetails` mapping) starts only after backend ships:
- `delivery_charge_gst_amount` (or split `delivery_charge_cgst` / `delivery_charge_sgst`) on `/customer/order/order-details/<id>` response
- `restaurant.delivery_charge_tax` in `/restaurant-info` response (if not already there)

Until then, ReviewOrder will show correct totals and OrderSuccess will show whatever backend echoes (Subtotal/Grand Total correct; the SC-GST-style breakdown rows missing for delivery — acceptable interim per stakeholder).

---

**Status:** ✅ All blocking questions answered. **D-1 planning unblocked.**
