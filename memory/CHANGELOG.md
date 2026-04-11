# Customer App - Change Log

## Version History

---

## [2026-03-31] Session 9 - Razorpay Payment Type Fix

### BUG-034: Incorrect payment_type for Razorpay Orders

**Status:** ✅ FIXED  
**Priority:** P0  
**Date Fixed:** March 31, 2026  
**Reported By:** User (Abhi)

---

### Problem Statement

When placing orders with Razorpay payment:
- Orders were being created with `payment_type: 'postpaid'` instead of `'prepaid'`
- The POS system expects `payment_type: 'prepaid'` for all Razorpay transactions
- This caused incorrect order status mapping in the POS backend

### Root Cause Analysis

| Location | Issue |
|----------|-------|
| `ReviewOrder.jsx` (Line 926-945) | `placeOrder()` call did NOT pass `paymentType` parameter |
| `orderService.ts` (Line 287) | Default fallback: `orderData.paymentType \|\| 'postpaid'` |
| Result | All Razorpay orders incorrectly tagged as `'postpaid'` |

### Code Changes

**File:** `/app/frontend/src/pages/ReviewOrder.jsx`

**Change 1: Main placeOrder call (Line 926)**
```jsx
// BEFORE:
response = await placeOrder({
  cartItems,
  customerName,
  // ... other params
  gstEnabled: isGstEnabled
});

// AFTER:
const isRazorpayEnabled = !!restaurant?.razorpay?.razorpay_key;

response = await placeOrder({
  cartItems,
  customerName,
  // ... other params
  gstEnabled: isGstEnabled,
  paymentType: isRazorpayEnabled ? 'prepaid' : 'postpaid'
});
```

**Change 2: Retry placeOrder call (Line 1136)**
```jsx
// BEFORE:
retryResponse = await placeOrder({
  // ... params without paymentType
});

// AFTER:
const isRazorpayEnabledRetry = !!restaurant?.razorpay?.razorpay_key;

retryResponse = await placeOrder({
  // ... other params
  paymentType: isRazorpayEnabledRetry ? 'prepaid' : 'postpaid'
});
```

### Logic Flow

```
┌─────────────────────────────────────────────────┐
│ User clicks "Place Order" / "Pay & Proceed"     │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Check: restaurant?.razorpay?.razorpay_key       │
└─────────────────────────────────────────────────┘
          │                         │
     Key EXISTS               Key NOT EXISTS
          │                         │
          ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ paymentType:     │    │ paymentType:         │
│ 'prepaid'        │    │ 'postpaid'           │
└──────────────────┘    └──────────────────────┘
          │                         │
          └───────────┬─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ placeOrder() API Call                           │
│ → payment_type sent to POS                      │
└─────────────────────────────────────────────────┘
```

### Testing Checklist

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Place order - Razorpay enabled restaurant (510) | `payment_type: 'prepaid'` in API payload | ⬜ Pending |
| Place order - COD restaurant (709) | `payment_type: 'postpaid'` in API payload | ⬜ Pending |
| Retry order - Razorpay enabled | `payment_type: 'prepaid'` in retry payload | ⬜ Pending |

### Related Files

- `/app/frontend/src/pages/ReviewOrder.jsx` - Modified
- `/app/frontend/src/api/services/orderService.ts` - Reference (handles paymentType param)
- `/app/frontend/src/api/transformers/helpers.js` - Reference (multi-menu already uses 'prepaid')

### Impact Assessment

| Area | Impact |
|------|--------|
| Razorpay Payment Flow | ✅ Correctly tagged as prepaid |
| COD Orders | ✅ No change (still postpaid) |
| Multi-menu Orders | ✅ No change (already prepaid in helpers.js) |
| Order Edit/Update | ⚠️ Uses separate `updateCustomerOrder()` - not affected |

### Rollback Plan

Revert changes in `ReviewOrder.jsx`:
1. Remove `isRazorpayEnabled` variable declaration
2. Remove `paymentType` parameter from both `placeOrder()` calls

---

## [2026-03-31] Session 8 - Theme & Audit Fixes

### Changes Made:
1. **Theme Color Flash Fix** - Created `/app/frontend/src/constants/theme.js`
2. **CRITICAL-006 Fix** - Hardcoded Razorpay URLs → ENDPOINTS pattern
3. **Code Audit V1** - Created `/app/memory/AUDIT_V1.md`

---

## [2026-03-26] Session 7 - Razorpay Integration

### Features Added:
1. **Razorpay Payment Integration** - Full SDK integration
2. **QR Code Page Filters** - Type + Menu Master filters
3. **Payment Verification** - OrderSuccess page verification flow

---
