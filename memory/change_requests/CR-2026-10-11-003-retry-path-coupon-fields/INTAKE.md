# INTAKE — CR-2026-10-11-003
## Retry placeOrder Call Missing couponDiscount and couponTitle

**ID:** CR-2026-10-11-003
**Date registered:** 2026-10-11
**Registered by:** Role 4 — QA Agent (observed during CR-2026-10-11-001 QA)
**Status:** REGISTERED — not yet planned

---

## What is wrong

The 401-token-refresh retry path in ReviewOrder.jsx (line 1595) passes `couponCode`
(now fixed to `appliedCouponCode` by CR-001) but does NOT pass:
- `couponDiscount` — defaults to 0 in orderService.ts
- `couponTitle` (appliedCouponTitle) — defaults to null

This means if a user's token expires mid-order and a retry fires, the POS payload
receives `coupon_discount_amount: 0` and `coupon_discount_title: null` even if a
valid coupon was applied. The coupon code itself is now correctly sent (CR-001 fix)
but the discount amount is lost on retry.

## Severity: P2
- Workaround exists: token expiry during order placement is rare
- The primary placeOrder call (line 1414) is correct — this only affects the retry
- Predates CR-001

## Files
- `frontend/src/pages/ReviewOrder.jsx` — lines 1595-1627 (retry placeOrder call)

## Source
- Observed during CR-2026-10-11-001 QA (iteration_18.json)
- Pre-existing gap, not introduced by CR-001
