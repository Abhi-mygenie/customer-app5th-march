# IMPACT ANALYSIS — CR-2026-10-09-002
## Wire coupon Apply button to `POST /scan/coupons/validate` + discount preview

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Based on:** INTAKE_DOC (updated) · ReviewOrder.jsx (exact lines) · orderService.ts (exact lines) · crmService.js · CRM contract v2.1 (CR-105) · design_guidelines.json
**Scope:** Apply button → CRM validate → discount preview → discount in order payload

---

## 1. What this CR does

Wires the coupon input Apply button so that:
1. Diner types `SAVE10`, taps Apply → app calls `POST /scan/coupons/validate` with the code + order total
2. CRM returns `computed_discount: 45.0` and `final_amount_preview: 455.0`
3. Price breakdown shows "SAVE10 — ₹45 off", Grand Total drops by ₹45
4. When order is placed, `coupon_code` + `coupon_discount_amount` + discounted `order_amount` are all sent to POS correctly

---

## 2. G1 resolved — POS payload confirmed

Inspection of `orderService.ts` reveals:

**`placeOrder` (line 377–388):**
```typescript
coupon_discount_amount: 0,           // ← hardcoded — MUST be updated
coupon_discount_title: null,         // ← hardcoded — MUST be updated
order_amount: Math.ceil(orderData.totalToPay || 0),  // feeds from totalToPay
coupon_code: orderData.couponCode !== '0' ? (orderData.couponCode || '') : '',
discount_amount: orderData.pointsDiscount || 0,      // loyalty uses same pattern
```

Pattern confirmed: **same as `pointsDiscount`/`discount_amount`.** POS expects `coupon_discount_amount` from us — it is a named field, not re-calculated. `order_amount` must reflect the final discounted total.

**`updateCustomerOrder` (edit-order, line 525–535):**
```typescript
coupon_discount_amount: 0,   // stays 0 — coupons not supported in edit mode
coupon_code: '',             // stays empty in edit mode (intentional)
```

Decision: **edit mode does not support coupon application.** Apply button is disabled when `isEditMode === true`.

---

## 3. `subtotalAfterDiscount` — how discount flows to `totalToPay`

Current (line 640):
```javascript
const subtotalAfterDiscount = Math.max(0, itemTotal - pointsDiscount);
```

`subtotalAfterDiscount` feeds → `finalSubtotal` → `totalToPay` → `order_amount` in POS payload.

**Must add `couponDiscount` here** so the entire downstream chain (tax recalculation, service charge base, totalToPay, order_amount) all reflect the coupon.

---

## 4. All touch points — confirmed with exact lines

### New state required (ReviewOrder.jsx, near line 247)

| State | Type | Purpose |
|---|---|---|
| `couponDiscount` | number (0) | ₹ discount from validated coupon |
| `appliedCouponCode` | string ('') | the code that was validated |
| `appliedCouponTitle` | string ('') | `data.title` from CRM response |
| `couponLoading` | boolean (false) | true while API call in-flight |
| `couponError` | string ('') | error message to show below input |

### Touch point table

| # | File | Lines | Current | Change |
|---|---|---|---|---|
| T1 | `crmService.js` | after `crmGetMaxRedeemable` | No `crmValidateCoupon` | Add function (~20 lines) |
| T2 | `ReviewOrder.jsx:~247` | state declarations | No coupon discount states | Add 5 states above |
| T3 | `ReviewOrder.jsx:640` | `subtotalAfterDiscount` | `itemTotal - pointsDiscount` | `itemTotal - pointsDiscount - couponDiscount` |
| T4 | `ReviewOrder.jsx:45 + 1076, 1420, 1593` | `buildBillSummary` (def + 3 call sites) | No `couponDiscount` param | Add `couponDiscount` to signature + all 3 calls |
| T5 | `ReviewOrder.jsx:1352` | `placeOrder` call | `couponCode` only | Add `couponDiscount`, `couponTitle: appliedCouponTitle` |
| T6 | `ReviewOrder.jsx:1833–1849` | coupon input + Apply button | no-op Apply | Wire Apply → `crmValidateCoupon` → states + applied display |
| T7 | `ReviewOrder.jsx:~382` | restaurant change cleanup | clears loyalty states | Also clear coupon states |
| T8 | `orderService.ts:377–378` | `placeOrder` payload | `coupon_discount_amount: 0` hardcoded | `coupon_discount_amount: orderData.couponDiscount \|\| 0` + `coupon_discount_title: orderData.couponTitle \|\| null` |

**Note on edit mode (T5):** `updateCustomerOrder` calls (lines 1185, 1224, 1486) do NOT receive `couponDiscount` — coupons are for new orders only. Apply button must be `disabled={isEditMode}`.

---

## 5. CRM contract — confirmed live (CR-105)

**Base URL:** `REACT_APP_CRM_URL` (= `crm-preprod-7.preview.emergentagent.com/api`)
**Auth:** Customer Bearer token — `crmToken` from `useAuth()` (already destructured for CR-2026-10-09-003)
**Rate limit:** 10/min IP → handle 429 with toast

**Request:**
```json
POST /scan/coupons/validate
Authorization: Bearer <token>
{ "code": "SAVE10", "order_total": 500.0, "channel": "dine_in", "items": [] }
```
- `channel`: derive from `scannedOrderType` → `'dine_in'` / `'delivery'` / `'takeaway'`
- **Strip whitespace from `code` before sending** (§4 DB bug — trailing spaces in some DB entries)
- `order_total` = `subtotal` (pre-discount cart total, same as what max-redeemable uses)

**Success (HTTP 200, `data.valid: true`):**
```json
{ "data": { "valid": true, "code": "SAVE10", "title": "Weekend Offer",
  "discount_type": "percentage", "discount_value": 10.0,
  "computed_discount": 50.0, "final_amount_preview": 450.0,
  "stackable_with_loyalty": false } }
```

**Errors (HTTP 200, `data.valid: false`):**

| `error.code` | Toast copy |
|---|---|
| `INVALID_CODE` | "Invalid coupon code" |
| `EXPIRED` | "This coupon has expired" |
| `MIN_ORDER_NOT_MET` | Use `error.detail` ("Minimum order ₹200 required") |
| `PER_USER_LIMIT` | "You've already used this coupon the maximum number of times" |
| `NOT_APPLICABLE` | "This coupon is not available for your order type" |

**HTTP 429:** "Too many attempts. Please try again shortly."

---

## 6. Stacking conflict — `stackable_with_loyalty: false`

When CRM returns `stackable_with_loyalty: false` on a successfully validated coupon:
- If **loyalty points are already applied** (`isUsingPoints === true`): auto-call `handleRemovePoints()` and show toast "Coupon applied — loyalty points removed (cannot stack)"
- If **coupon is active** and user taps Use for points: call `handleApplyCoupon` sets `stackable_with_loyalty: false` state, so `handleUsePoints` is blocked — show toast "Remove coupon first to use points"

This is D2 (owner decision).

---

## 7. Applied state display — design from design_guidelines.json

**Normal (input + Apply button):**
```
🏷️ [Enter coupon code         ] [Apply]
```

**Loading:** Apply button shows spinner or "Checking..."

**Applied (replace row):**
```
🏷️ SAVE10 — ₹45 off                      [Remove]
```
Input disappears. Row uses `.price-loyalty-applied` green text + ghost Remove button.

**Error:** Apply tapped → error toast below row (resets after 3s or on next keystroke)

**Disabled (edit mode or not authenticated):** Apply button greyed out

---

## 8. Owner decisions — required before Gate 3

### D1 — G1 (POS payload) → **RESOLVED in this IA**
`coupon_discount_amount` is a named field in the POS payload (hardcoded 0). `subtotalAfterDiscount` must subtract `couponDiscount` so the full chain (tax, finalSubtotal, totalToPay, order_amount) is correct. Same pattern as `pointsDiscount`. Coupons not applied in edit mode.

### D2 — Stacking conflict UX: `stackable_with_loyalty: false`

| Option | Behaviour |
|---|---|
| **(a) Last-applied wins** | Applying coupon auto-removes loyalty points; applying points when coupon is active removes coupon |
| **(b) Explicit conflict choice** | Show a conflict banner: "This coupon cannot be combined with loyalty points — use one" with [Use coupon] / [Use points] buttons |

Recommendation: **(a)** — simpler, no extra UI state. Matches standard checkout behaviour.

### D3 — `order_total` sent to validate: `subtotal` (pre-discount cart) or `subtotalAfterDiscount`?

When user has loyalty points applied AND enters a coupon, what `order_total` do we send to `/scan/coupons/validate`?
- **(a) `subtotal`** — pre-discount cart value. POS and CRM both see the original cart, each discount is independent.
- **(b) `subtotalAfterDiscount`** — post-loyalty total. Coupon applies on top of already-discounted amount.

Recommendation: **(a) `subtotal`** — simpler, consistent with max-redeemable (which also uses `subtotal`). Coupon min_order_value check should be against the original cart.

---

## 9. Files WILL change

| File | Changes |
|---|---|
| `frontend/src/api/services/crmService.js` | Add `crmValidateCoupon` |
| `frontend/src/pages/ReviewOrder.jsx` | T2–T7 (states, subtotalAfterDiscount, buildBillSummary, placeOrder, Apply button wiring, cleanup) |
| `frontend/src/api/services/orderService.ts` | T8 — `coupon_discount_amount` + `coupon_discount_title` in `placeOrder` only |

## 10. Files WILL NOT touch

`AuthContext.jsx` · `CartContext.js` · `server.py` · `App.js` · `LoyaltyRewardsSection.jsx` · `updateCustomerOrder` payload (edit mode, no coupon support)

---

## 11. Risk

| Area | Rating | Reason |
|---|---|---|
| Overall | **CRITICAL** | ReviewOrder.jsx hotspot + orderService.ts (payment path) |
| `subtotalAfterDiscount` change (T3) | **CRITICAL** | Tax, service charge, totalToPay all feed from this — wrong value → wrong charge |
| `buildBillSummary` additions (T4) | **HIGH** | 3 call sites — missing one → silent wrong bill summary |
| `coupon_discount_amount` in POS (T8) | **HIGH** | Money path — POS uses this to apply discount |
| Apply button wiring (T6) | MEDIUM | UI only, graceful error handling |

No Fast Lane. CRITICAL — owner Gate 3 required.

---

## 12. Verification matrix

| T | Scenario | Expected |
|---|---|---|
| T1 | `curl POST /scan/coupons/validate` with valid code | `valid:true, computed_discount > 0` |
| T2 | Type `SAVE10` + tap Apply | Row shows "SAVE10 — ₹45 off", Grand Total drops |
| T3 | `subtotalAfterDiscount` with coupon applied | `itemTotal - pointsDiscount - couponDiscount` |
| T4 | `coupon_discount_amount` in POS payload | Equals `couponDiscount` (not 0) |
| T5 | Invalid code → `INVALID_CODE` | Toast "Invalid coupon code" |
| T6 | Below minimum → `MIN_ORDER_NOT_MET` | Toast with CRM detail message |
| T7 | Remove coupon | Discount cleared, input shown again, total restores |
| T8 | `stackable_with_loyalty:false` + points applied | Points cleared, toast shown |
| T9 | Edit mode | Apply button disabled |
| T10 | Not authenticated | Apply button disabled |
| T11 | `yarn build` | Clean |

---

```
Planning complete: CR-2026-10-09-002
Stage: Impact Analysis
Code reality: FULL — 8 touch points confirmed with exact lines
Risk: CRITICAL
Files WILL change: crmService.js · ReviewOrder.jsx · orderService.ts
Files WILL NOT touch: AuthContext.jsx · CartContext.js · server.py · App.js · LoyaltyRewardsSection.jsx
Owner decisions: D1=RESOLVED (subtotalAfterDiscount + coupon_discount_amount in payload) · D2 (stacking UX — rec: a) · D3 (order_total to validate — rec: a/subtotal)
Docs: memory/change_requests/CR-2026-10-09-002-coupon-apply-crm-validate/IMPACT_ANALYSIS.md
Next: D2 + D3 confirmed → Implementation Plan → "Gate 3 accepted for CR-2026-10-09-002"
```
