# INTAKE — BUG-2026-10-12-001
## Coupon Discovery List — BXGY Coupons Show "₹0 off" Instead of Hiding Discount

**ID:** BUG-2026-10-12-001
**Date registered:** 2026-10-12
**Registered by:** Role 1 — Intake Agent
**Source:** Owner screenshot — Review Order screen showing live coupon list
**Status:** INTAKE COMPLETE

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 — UX misleading: "₹0 off" implies coupon gives no benefit; diner may skip valid coupons |
| Risk | LOW — one function, one file (`CouponDiscoveryList.jsx`) |
| Blast radius | SMALL — coupon card display only, no order flow impact |
| Duplicate check | DISTINCT |
| Related | CR-2026-10-11-009 (introduced this bug) |

---

## What is wrong — plain English

On the Review Order screen, the coupon discovery list (introduced by CR-009) shows coupon cards for all available coupons. For BXGY-type coupons ("Buy 3 Get Y", "Buy 2 Get Y", "Buy 1 Get Y"), the card displays **"₹0 off"** in orange below the coupon title.

This is wrong and misleading. These coupons have real value (e.g. "Buy 3 Golden Caramel Kunafas, get one free") but show ₹0 because CRM returns `expected_discount: 0` for them — the actual discount can only be computed once CRM knows the cart contents. The card should show no rupee amount and instead display a neutral cue like "Tap to see discount."

---

## Evidence — screenshot (2026-10-12)

Screenshot from owner shows the live coupon list on Review Order:

| Coupon code | Card title | Displayed | Expected |
|---|---|---|---|
| SEED_V3B_BXGY_FLAT | "Buy 3 Golden Cara..." | **₹0 off** | No amount, "Tap to see discount" |
| SEED_V3B_BXGY_FREE | "Buy 2 Kunafas Get..." | **₹0 off** | No amount, "Tap to see discount" |
| (partially visible) | "Buy 1 Ku..." | **₹0 off** | No amount, "Tap to see discount" |

---

## Root Cause — confirmed in code

`frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.jsx` lines 4–9:

```js
const formatDiscount = (coupon) => {
  if (coupon.requires_cart_validation) return null;         // ← only hides if explicitly true
  if (coupon.expected_discount != null) return `₹${coupon.expected_discount.toFixed(0)} off`;
  //                                   ↑ 0 is not null → shows "₹0 off"
  ...
};
```

CRM returns `expected_discount: 0` (not `null`) for BXGY coupons when no cart context is provided. The `!= null` check passes for `0`, so "₹0 off" is rendered.

**Fix:** Change the condition to also exclude zero:

```js
if (coupon.expected_discount != null && coupon.expected_discount > 0)
  return `₹${coupon.expected_discount.toFixed(0)} off`;
```

This single character change (`> 0` guard) means:
- `expected_discount: 45` → shows "₹45 off" ✅
- `expected_discount: 0` → shows nothing → falls through to `discount_type`/`discount_value` formatting ✅
- `expected_discount: null` → already handled (unchanged) ✅

---

## Scope

| File | Change | Risk |
|---|---|---|
| `frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.jsx` | Add `&& coupon.expected_discount > 0` to line 6 | LOW |

**Files NOT in scope:** ReviewOrder.jsx, crmService.js, any backend file.

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT REQUIRED — root cause confirmed, fix is 1 condition in 1 file (Fast Lane eligible after owner approval)
OWNER DECISIONS: None required
Gate:            Owner says "Fix BUG-2026-10-12-001" → implement
```
