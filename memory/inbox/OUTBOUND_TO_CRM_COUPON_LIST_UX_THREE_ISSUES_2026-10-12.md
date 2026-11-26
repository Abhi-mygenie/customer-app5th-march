# OUTBOUND TO CRM — Coupon Discovery List: Three UX Issues
**From:** Scan & Order (Customer App) team
**To:** CRM team
**Ref:** CR-2026-10-11-009 (Coupon Discovery List) · Live on preprod r689
**Date:** 2026-10-12
**Priority:** High — affects diner experience on every checkout screen

---

## Context

We shipped the coupon discovery list on the Review Order (checkout) screen this week. Diners can now browse available coupons and tap to apply. We have been testing live with restaurant 689 (Kunafa Mahal) and have found three UX problems that require changes on the CRM side. We are writing this brief so CRM can confirm what is feasible and what changes are coming, before we code anything new on our side.

---

## Issue 1 — Non-applicable coupons are showing in the list

### What is happening

The `GET /scan/coupons` endpoint returns all active, customer-eligible coupons — **regardless of whether they are currently applicable** to the diner's order. On a live session for restaurant 689, the endpoint returned 22 coupons. Of those, a large number are not applicable to the current context:

| Coupon | Problem | Diner sees |
|---|---|---|
| SEED_V3A_WEEKEND (min ₹600) | Diner's cart is ₹96 — minimum not met | Card with "Min ₹600" — diner taps → error |
| STO-GENERIC-MIN (min ₹300) | Diner's cart is ₹96 — minimum not met | Same |
| SEED_V3A_LUNCH (12:00–15:00 weekdays) | Outside the valid time window | Diner taps → "This coupon is only valid during specific hours" |
| SEED_V3A_EVERYDAY (17:00–19:00) | Same — outside window | Same |
| SEED_V3A_OVERNIGHT (Fri+Sat 22:00–02:00) | Wrong day and time | Same |
| SEED_V3A_WEEKEND (Sat+Sun only) | Wrong day | Same |

**Diner experience:** The diner sees a long list of coupons, taps the most attractive one, and gets an error. This is more frustrating than no list at all.

### What we are asking CRM

We would like `GET /scan/coupons` to accept optional filtering parameters so the app can request only the coupons that are actually usable right now:

**Option A (preferred) — Server-side filtering via query params:**

```
GET /scan/coupons?channel=dine_in&order_total=96&filter_applicable=true
```

With `filter_applicable=true`:
- Exclude coupons where `min_order_value > order_total`
- Exclude coupons where current time is outside `start_time`–`end_time`
- Exclude coupons where current day is not in `valid_days`

**Option B — Add an `applicable` flag per coupon in the response:**

```json
{
  "code": "SEED_V3A_WEEKEND",
  "applicable": false,
  "not_applicable_reason": "MIN_ORDER_NOT_MET",
  ...
}
```

This lets us grey/dim non-applicable coupons rather than hiding them — shows the diner what exists but makes clear why they cannot use it right now.

**Option C — Both:** Return all coupons with `applicable: true/false` per item, and also support `filter_applicable=true` to get only the usable subset.

**Our preference:** Option A for the default (hide non-applicable entirely — cleanest UX). Option B as an enhancement if CRM wants to support "greyed-out" discovery later.

---

## Issue 2 — BXGY / BOGO / nth_item coupons show "₹0 off" on cards

### What is happening

Coupons of type `offer_type: bxg`, `bogo`, or `nth_item` are returned with:
```json
"discount_type": "flat",
"discount_value": 0.0,
"requires_cart_validation": null
```

Because `discount_value` is `0.0` and `requires_cart_validation` is null (not `true`), our display code correctly formats it as "₹0 off" — which is technically what the data says. The diner reads this as: "this coupon gives me nothing."

**Actual coupons affected in r689:**
- SEED_V3B_BXGY_FLAT — "Buy 3 Golden Caramel Get 1 Ras Bhari Mango at Rs.99"
- SEED_V3B_BXGY_FREE — "Buy 2 Kunafas Get 1 Pista-Biscoff Koshari Free"
- SEED_V3B_BXGY_PCT — "Buy 1 Kunafa Get 1 Nutella-pista Affair 50% Off"
- SEED_V3B_CAPPED — "BOGO Signature Trio (Max 2)"
- SEED_V3C_EVERY2_CAPPED, SEED_V3C_EVERY3_FREE, SEED_V3C_EVERY5_PCT — nth_item types

### What we are asking CRM

**Please set `requires_cart_validation: true` on all coupons where `offer_type` is one of `bxg`, `bogo`, or `nth_item`.**

The `requires_cart_validation` field already exists in the contract. When it is `true`, our app shows no rupee amount and displays "Tap to see discount" instead — which is the correct UX for these coupon types.

This is a data correction, not a schema change. The field just needs to be populated.

```json
// After fix — what CRM should send for BXGY coupons:
{
  "code": "SEED_V3B_BXGY_FLAT",
  "offer_type": "bxg",
  "requires_cart_validation": true,   ← set this
  "discount_value": 0.0,
  ...
}
```

**What the diner sees after the fix:**
Card shows "Buy 3 Golden Caramel Get 1 Free" with "Tap to see discount" instead of "₹0 off". Diner taps → validate call fires with cart items → actual discount shown.

**Note:** For the validate call on tap for these coupon types, CRM currently returns an error when `items: []` (empty array). We will send the actual cart items in future (separate CR). For now, we ask CRM to confirm: what `items` format does `POST /scan/coupons/validate` expect for BXGY coupons? Please share the expected item object shape.

---

## Issue 3 — No recommendation signal for best-discount auto-apply

### What we want to build

When the checkout screen opens, we would like to automatically apply the best available coupon to the diner's order — the one that gives the highest actual discount with no extra action from the diner. This would be a significant UX improvement: the diner arrives at checkout and their discount is already applied.

### What CRM sends today

We checked the live `GET /scan/coupons` response for all 22 coupons returned for customer 7505242126. Every coupon has:
```
recommended:  null
best_coupon:  null
auto_apply:   null
```

CRM sends no recommendation signal at all.

### What we are asking CRM

**Option A (preferred) — Add a top-level `recommended_code` field to the list response:**

```json
{
  "success": true,
  "data": {
    "coupons": [...],
    "recommended_code": "GYAN",        ← best coupon for this customer + order context
    "recommended_discount": 9.60       ← pre-computed discount amount for the recommended code
  }
}
```

CRM already knows:
- The diner's cart total (if we pass `order_total` as a query param)
- The diner's eligibility for each coupon
- The applicable discount for simple coupons

CRM is better placed to rank these than the app (it has full business context — e.g. merchant-prioritised coupons, loyalty interaction rules, etc.)

**Option B — Add `recommended: true` on the individual coupon object:**

```json
{
  "code": "GYAN",
  "recommended": true,
  "expected_discount": 9.60,
  ...
}
```

Only one coupon should have `recommended: true` in a given response.

**Option C — Our app computes it client-side (no CRM change):** We sort by `discount_value` and apply the highest applicable simple coupon. This works but is a less complete signal — CRM may have business rules (e.g. merchant-preferred coupons) we are unaware of. We would prefer CRM's input.

**Our preference:** Option A — pass `order_total` in the list request and get back a `recommended_code`. Minimal change, maximum value.

---

## Summary of requests

| # | Issue | What we need from CRM | Priority |
|---|---|---|---|
| 1 | Non-applicable coupons shown | `filter_applicable=true` param on `GET /scan/coupons` (or `applicable` flag per coupon) | **High** |
| 2 | BXGY/BOGO/nth_item show "₹0 off" | Set `requires_cart_validation: true` on all `offer_type: bxg/bogo/nth_item` coupons | **High** |
| 2b | BXGY validate items format | Confirm expected `items[]` object shape for `POST /scan/coupons/validate` with BXGY coupons | **Medium** |
| 3 | No auto-apply recommendation | Add `recommended_code` + `recommended_discount` to list response (pass `order_total` from us) | **Medium** |

---

## What we will do on our side (no CRM change needed)

- BUG-2026-10-12-001: We will add a client-side guard on `offer_type` so BXGY/BOGO/nth_item cards never show "₹0 off" even before CRM fixes the `requires_cart_validation` field. This is a safety net — CRM fixing the field is still required.

---

## Questions for CRM

1. Is `filter_applicable=true` (or `order_total` as a param) feasible for `GET /scan/coupons`? What is the timeline?
2. Can `requires_cart_validation` be set to `true` on BXGY/BOGO/nth_item coupons for all existing and future coupons of those types? Is this a CRM-side fix or does each merchant have to update coupons manually?
3. What is the expected `items[]` object shape for `POST /scan/coupons/validate` for BXGY coupon types?
4. Is `recommended_code` feasible? Would CRM use business rules (merchant priority, etc.) to pick it, or purely highest discount?
5. Are there any other coupon types (beyond `bxg`, `bogo`, `nth_item`) where `requires_cart_validation` should be `true`?

---

**We are ready to update our CR registry and build once CRM confirms the above.
Please reply to this brief with feasibility and tentative timelines.**
