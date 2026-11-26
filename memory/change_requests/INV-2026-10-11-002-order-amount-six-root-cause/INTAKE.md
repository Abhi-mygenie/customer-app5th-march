# INTAKE — INV-2026-10-11-002
## order_amount = ₹6 Root Cause — State Collapse Investigation

**ID:** INV-2026-10-11-002
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** INV-2026-10-11-001 (root causes 6b/6c, unresolved)
**Owner decision:** Separate CR — do not block CR-2026-10-11-001
**Status:** PARKED — open after CR-2026-10-11-001 ships

---

## What is known

From DB order `restaurant_order_id: 015060` (saurav, Oct 10, our preview):

```
order_amount:    6.0      ← wrong (expected ~₹109 or ~₹315)
tax_amount:      5.15
round_up:        0.85
coupon_discount: 197.0    (POS-applied)
loyalty_points:  0
```

`order_amount = tax_amount + round_up = 6.0` — implies `finalSubtotal = 0` at the moment of placement.

---

## Why this is NOT explained by CR-2026-10-11-001 alone

CR-001 fixes the case where `couponDiscount = 0` (CRM failed) but `couponCode = "MARRY"` still
reaches POS. In that scenario our formula gives `order_amount ≈ ₹315`, not ₹6.

For `finalSubtotal = 0` the formula requires `couponDiscount ≥ itemTotal (₹300)`.
This cannot happen unless `couponDiscount` was set to ≥ 300 in React state at order placement time.

Possible causes (uninvestigated):
- **6b** — Stale/wrong state snapshot: `couponDiscount` was set from a prior successful coupon
  apply attempt (different code, different session, or a reload that didn't clear state), and
  the order was placed before state fully reset.
- **6c** — State race condition: user typed MARRY (CRM 404 → couponDiscount stays 0) BUT a prior
  async `crmValidateCoupon` call resolved late and set `couponDiscount` to a large value
  after the user had already cleared/changed the coupon input.

---

## Trigger condition

- Only one DB instance found (saurav, Oct 10).
- All other orders show correct `order_amount`.
- May require specific timing or sequence to reproduce.

---

## Pre-conditions for investigation

1. CR-2026-10-11-001 must be shipped first — establishes clean baseline.
2. If `order_amount = 6` (or near-0) reappears after CR-001, raise investigation session.
3. If no recurrence within reasonable observation window, close as transient state race — resolved by CR-001.

---

## Status

```
PARKED — waiting for CR-2026-10-11-001 to ship and be observed in production.
Reopen if order_amount ≤ ₹10 recurs on any non-trivial order.
```
