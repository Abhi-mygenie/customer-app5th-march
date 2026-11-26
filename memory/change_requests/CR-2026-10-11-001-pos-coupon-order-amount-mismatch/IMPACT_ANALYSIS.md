# IMPACT ANALYSIS — CR-2026-10-11-001
## POS-Only Coupon Bypasses CRM Validation → order_amount Mismatch

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-11
**Status:** OWNER APPROVED — Option B selected. Awaiting implementation gate open.

---

## Owner Decisions — RECORDED

| # | Decision | Owner choice | Date |
|---|---|---|---|
| D1 | Error message when CRM fails to validate coupon | **Option B** — change message to `"Coupon not recognized for online orders."` | 2026-10-11 |
| D2 | ₹6 mystery (root cause 6b/6c) — reproduce now or separate CR? | **Separate CR** — see INV-2026-10-11-002 registered below | 2026-10-11 |

---

## Code Reality

### Two coupon state variables

| Variable | Line | Set when | Value on CRM failure |
|---|---|---|---|
| `couponCode` | 187 | User types in input | Stays as typed ("MARRY") — never cleared |
| `appliedCouponCode` | 190 | CRM returns `valid: true` only | Stays `""` |
| `couponDiscount` | 189 | CRM returns `valid: true` only | Stays `0` |

### The bug — lines 1420 and 1601

```javascript
// Line 1420 (primary placeOrder call) — CURRENT (BUG)
couponCode,           // sends raw input "MARRY" even if CRM rejected it

// Line 1601 (retry path) — CURRENT (BUG)
couponCode,           // same bug in retry path
```

```javascript
// orderService.ts line 385 — sends whatever it receives
coupon_code: orderData.couponCode !== '0' ? (orderData.couponCode || '') : '',
```

---

## Implementation Plan

### Change 1 — ReviewOrder.jsx line 1420
```javascript
// BEFORE
couponCode,

// AFTER (CR-2026-10-11-001)
couponCode: appliedCouponCode,
```

### Change 2 — ReviewOrder.jsx line 1601
```javascript
// BEFORE
couponCode,

// AFTER (CR-2026-10-11-001)
couponCode: appliedCouponCode,
```

### Change 3 — ReviewOrder.jsx catch block in handleApplyCoupon (line ~919)
```javascript
// BEFORE
const msg = err?.status === 429
  ? 'Too many attempts. Please try again shortly.'
  : 'Could not validate coupon. Please try again.';

// AFTER (CR-2026-10-11-001, Owner Decision D1 = Option B)
const msg = err?.status === 429
  ? 'Too many attempts. Please try again shortly.'
  : 'Coupon not recognized for online orders.';
```

---

## Files WILL change

| File | Lines | Change |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | 1420, 1601 | `couponCode` → `couponCode: appliedCouponCode` |
| `frontend/src/pages/ReviewOrder.jsx` | ~919 | Error message text (Owner D1 = Option B) |

Total: **1 file, 3 line changes.**

## Files WILL NOT change

`orderService.ts`, `crmService.js`, `helpers.js`, `server.py`, `CartContext.js`, `AuthContext.jsx`

---

## Verification Matrix

| Scenario | Before | After |
|---|---|---|
| CRM validates coupon → `valid: true` | Sends validated code ✅ | Same ✅ |
| CRM returns 404 (POS-only coupon) | Sends raw code to POS ❌ | Sends `""` — POS applies nothing ✅ |
| CRM returns invalid (wrong code) | Sends raw code to POS (risk) | Sends `""` — safe ✅ |
| No coupon entered | Sends `""` ✅ | Same ✅ |
| Retry path (line 1601) | Same mismatch ❌ | Fixed ✅ |

---

## Code markers to add

```javascript
// CR-2026-10-11-001: send appliedCouponCode (CRM-validated) not raw couponCode input
```

---

## Gate status

```
Planning:           COMPLETE
Owner approval:     RECEIVED (Option B, separate CR for ₹6)
Implementation:     COMPLETE — 2026-10-11
                    ReviewOrder.jsx lines 919, 1420, 1601
Build:              CLEAN
QA handover:        WRITTEN — QA_HANDOVER.md
Next:               QA
```
