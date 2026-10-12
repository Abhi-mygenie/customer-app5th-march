# QA HANDOVER — CR-2026-10-11-009
## Coupon Discovery List — Browse and Tap to Apply

**ID:** CR-2026-10-11-009
**Handed over by:** Role 3 — Implementation Agent
**Date:** 2026-10-12
**Build:** CLEAN (Compiled successfully, +930B)
**Self-test:** 9/9 PASS

---

## What changed

1. **New `crmGetCouponList` function** in crmService.js — anonymous path uses `GET /scan/coupons?restaurant_id=689&channel=dine_in`, authenticated uses Bearer token.
2. **New `CouponDiscoveryList` component** — horizontal scroll card list with coupon name, discount, min order, usage count (authenticated), tap-to-apply.
3. **`handleApplyCoupon`** now accepts optional `overrideCode` param — tap fills code and applies in one action.
4. **`handleTapCoupon`** — pre-fills code input and calls apply immediately.
5. **List fetched once on screen open** — re-fetches when `crmToken` changes (anon → authenticated).
6. **List resets on restaurant change.**

---

## Test cases

### TC-1 — Anonymous, list shows generic coupons only
Navigate to /689/review-order (anonymous). Fill name + phone. Coupon section visible.
Expected: discovery list shows STO-GENERIC-10, STO-GENERIC-MIN, STO-DELIVERY. STO-STANDARD and STO-ONCE NOT shown.
data-testid: `coupon-discovery-list`, `coupon-list-item-STO-GENERIC-10`

### TC-2 — Authenticated, list shows all 5 coupons
Login as Saurav (9035133228). Go to review order.
Expected: all 5 coupons visible, `my_usage_count` shown on each card (e.g. "Used 0×").

### TC-3 — Tap generic coupon (STO-GENERIC-10) — anonymous
Tap the STO-GENERIC-10 card.
Expected: code fills in input, coupon applies immediately (10% off, toast), no login.

### TC-4 — Tap standard coupon (STO-STANDARD) — anonymous two-step
Tap STO-STANDARD card (anonymous user).
Expected: silent skip-otp → re-validate → 15% discount applied. No manual login prompt.

### TC-5 — `requires_cart_validation` card shows no amount
If any coupon on preprod has `requires_cart_validation: true`:
Expected: card shows title only + "Tap to see discount" hint, no rupee amount.

### TC-6 — List re-fetches after two-step authentication
Anonymous user taps STO-STANDARD → two-step fires → token acquired.
Expected: list re-fetches and now shows all 5 coupons (full personalised list).

### TC-7 — List hidden when coupon applied
Apply any coupon (applied row shows).
Expected: discovery list disappears. Only applied coupon row + Remove button shown.

### TC-8 — List reappears after Remove
Click Remove on applied coupon.
Expected: discovery list reappears.

### TC-9 — Manual code entry still works (regression)
Type STO-GENERIC-10 manually in the input, click Apply.
Expected: applies correctly — `overrideCode=null` falls back to `couponCode` state.

### TC-10 — Loading state shown briefly
On slow connection or first load: `data-testid="coupon-list-loading"` shows 2 skeleton cards.

---

## Credentials
- App: https://genie-customer-app-1.preview.emergentagent.com/689
- Test user: Saurav, phone 9035133228
- Restaurant: 689 (Kunafa Mahal preprod)
- CRM preprod: https://mygenie-crm-preprod.preview.emergentagent.com/api
- Generic coupons: STO-GENERIC-10, STO-GENERIC-MIN, STO-DELIVERY
- Standard coupons: STO-STANDARD, STO-ONCE
