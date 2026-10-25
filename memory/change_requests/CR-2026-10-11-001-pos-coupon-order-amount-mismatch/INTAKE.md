# INTAKE — CR-2026-10-11-001
## POS-Only Coupon Bypasses CRM Validation → order_amount Mismatch

**ID:** CR-2026-10-11-001
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** INV-2026-10-11-001 (Order #015060, r689 Kunafa Mahal)
**Status:** PLANNING COMPLETE — awaiting owner approval to implement

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P0 — revenue loss, Razorpay charges wrong amount |
| Risk | CRITICAL |
| Blast radius | LARGE — order placement, Razorpay charge, loyalty earn, POS record |
| Duplicate check | DISTINCT |

---

## What is wrong

When a customer types a coupon code that POS knows but CRM does not (e.g. MARRY):

1. `handleApplyCoupon` calls CRM `/scan/coupons/validate`
2. CRM returns 404 → catch block runs → `couponDiscount` stays `0`, `appliedCouponCode` stays `""`
3. BUT `couponCode` (raw input) stays as `"MARRY"` — never cleared
4. When order is placed, `couponCode` (not `appliedCouponCode`) is sent to `placeOrder`
5. `orderService.ts` sends `coupon_code: "MARRY"` to POS
6. POS applies its own ₹197 discount → POS total = ₹109
7. Our app calculated total using `couponDiscount = 0` → our total = ~₹315
8. `order_amount: ~315` is what we send. POS stores ₹109. Razorpay is charged wrong amount.
9. CRM awards earn points on our `order_amount` value → points wrong.

---

## Cascades fixed by this CR

| Issue | How fixed |
|---|---|
| I6 — order amount mismatch | Our total and POS total will agree |
| I3 — Razorpay wrong charge | Razorpay receives correct totalToPay |
| I7 — POS shows wrong amount | order_amount will match POS calculation |
| I1 — loyalty points not credited | Correct order_amount flows to CRM earn engine |

---

## Evidence

- DB order `restaurant_order_id: 015060`, `coupon_discount: 197.0` (POS-applied), `order_amount: 6.0` (wrong)
- `couponCode` passed at ReviewOrder.jsx line 1420 (primary) and line 1601 (retry path)
- `appliedCouponCode` never passed to placeOrder in either path

---

## Related items

- INV-2026-10-11-001 — source investigation
- CR-2026-10-09-002 — original coupon feature implementation (shipped, the gap was introduced here)
