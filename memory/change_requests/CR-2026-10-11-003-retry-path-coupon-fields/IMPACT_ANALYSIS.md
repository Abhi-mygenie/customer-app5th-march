# IMPACT ANALYSIS + IMPLEMENTATION PLAN — CR-2026-10-11-003
## Retry placeOrder Call Missing couponDiscount and couponTitle

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-11
**Status:** PLANNING COMPLETE — awaiting owner approval to implement

---

## Owner Decisions Required

None — this is a clear parity fix. Primary call already has these fields.
No business rule ambiguity. No API contract change.

---

## Code Reality

### Primary `placeOrder` call (line 1414) — CORRECT

```javascript
couponCode: appliedCouponCode,  // CR-2026-10-11-001 ✅
couponDiscount,                  // CR-2026-10-09-002 ✅
couponTitle: appliedCouponTitle, // CR-2026-10-09-002 ✅
```

### Retry `placeOrder` call (line 1595) — MISSING 2 FIELDS

```javascript
couponCode: appliedCouponCode,  // CR-2026-10-11-001 ✅
// couponDiscount   ← MISSING — defaults to 0 in orderService.ts line 377
// couponTitle      ← MISSING — defaults to null
```

### What happens on retry with a valid coupon applied

```
User applied MARRY → couponDiscount = 197, appliedCouponTitle = "MARRY"
Token expires mid-order → 401 → app gets new token → retry fires

Retry payload sent to POS:
  coupon_code:             "MARRY"  ✅ (CR-001 fixed this)
  coupon_discount_amount:  0        ❌ (missing → defaults to 0)
  coupon_discount_title:   null     ❌ (missing → defaults to null)
```

POS receives the code but no discount amount.
POS record has wrong coupon_discount_amount = 0.

---

## Exact Edit

**File:** `frontend/src/pages/ReviewOrder.jsx`
**After line 1601 — insert 2 lines**

```javascript
// BEFORE
              couponCode: appliedCouponCode,  // CR-2026-10-11-001
              restaurantId,

// AFTER — CR-2026-10-11-003
              couponCode: appliedCouponCode,  // CR-2026-10-11-001
              couponDiscount,                  // CR-2026-10-11-003
              couponTitle: appliedCouponTitle, // CR-2026-10-11-003
              restaurantId,
```

**Total change: 2 lines inserted. Zero lines modified or deleted.**

---

## Files WILL change

| File | Change |
|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | 2 lines inserted after line 1601 |

## Files WILL NOT change

All others — `orderService.ts`, `crmService.js`, `server.py`, `CartContext.js`, `AuthContext.jsx`

---

## Out-of-scope observation (do not fix here)

`gstEnabled: isGstEnabled` (primary) vs `gstEnabled: isGstEnabledForSc` (retry)
→ Different variable names, identical values. Naming inconsistency only. Not a bug.

---

## Risk

MEDIUM — ReviewOrder.jsx is a CRITICAL hotspot. Change is purely additive (2 lines added, nothing removed or modified). Low functional risk.

---

## Verification matrix

| Scenario | Before | After |
|---|---|---|
| Retry fires, no coupon | coupon_discount_amount: 0 ✅ | Same ✅ |
| Retry fires, coupon applied | coupon_discount_amount: 0 ❌ | coupon_discount_amount: 197 ✅ |
| Primary path (non-retry) | Unaffected | Same ✅ |

---

## Gate status

```
Planning:           COMPLETE
Owner approval:     NOT YET RECEIVED
Implementation:     NOT STARTED
```
