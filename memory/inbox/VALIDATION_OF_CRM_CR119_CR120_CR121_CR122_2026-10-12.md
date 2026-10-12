# Validation of CRM reply — CR-119 / CR-120 / CR-121 / CR-122 (preprod)
**Role:** Planning (read-only; no source changes)
**Date:** 2026-10-12 · Validated live against preprod CRM, restaurant r689
**Source:** `INBOUND_FROM_CRM_CR119_CR120_CR121_CR122_LIVE_PLEASE_VALIDATE_2026-10-12.md`
**Replies to:** `OUTBOUND_TO_CRM_COUPON_LIST_UX_THREE_ISSUES_2026-10-12.md`

---

## 1. CRM checklist V1–V8 — live results

| # | CRM claim | Live result | Verdict |
|---|---|---|---|
| V1 | skip-otp accepts `name`, echoes it; existing customer name not overwritten | Sent `name:"PlanningProbe"` for existing test user → `is_new_customer:false`, `name:"saurav"` (on-file name returned, not overwritten) | PASS |
| V2 | anonymous `/validate` STO-GENERIC-10 @450 → 45 | `valid:true, computed_discount:45, final_amount_preview:405` | PASS |
| V3 | STO-STANDARD anonymous → `CUSTOMER_REQUIRED`; with token → valid | anon: `CUSTOMER_REQUIRED`; token: `valid:true, computed_discount:67.5` | PASS |
| V4 | anonymous list hides STO-STANDARD | legacy list (no `order_total`): 3 coupons `[GYAN, STO-GENERIC-10, STO-GENERIC-MIN]`, no STO-STANDARD | PASS |
| V5 | `order_total=96` → STO-GENERIC-MIN absent; `960` → present | 96: 5 coupons, no STO-GENERIC-MIN · 960: 6 coupons, STO-GENERIC-MIN present | PASS |
| V6 | `order_total=960` → `recommended_code` non-null; `requires_cart_validation` boolean on every coupon | anon: `recommended_code:"GYAN", recommended_discount:96` · auth (26 coupons): `"MARRY", 197` · null `requires_cart_validation` count = 0 in both | PASS |
| V7 | BXGY → `expected_discount:null`, `requires_cart_validation:true`; `/validate` with `items[]` returns a number | SEED_V3B_BXGY_FLAT: `rcv:true, expected_discount:null`. `/validate` with items `[182043×3, 182044×1]` → `valid:true, computed_discount:99` | PASS (see note A) |
| V8 | anonymous `/validate` without `restaurant_id` → 422 | HTTP 422 | PASS |

**All 8 pass.** No contract objections.

### Notes / deviations found
- **A. CRM doc example item is wrong.** §4 shows `food_id "202959"` (Golden Caramel) — validating SEED_V3B_BXGY_FLAT with it returns `NO_ELIGIBLE_BUY_ITEMS_IN_CART`. The real buy id is `182043` (from `eligible_match_hint.buy.values`). Doc typo only; engine is correct. Mention in reply.
- **B. Item-scoped *simple* coupons also need `items[]`.** `SEED_V2_ITEMFLAT` (`offer_type:simple`, `discount_scope:item`) has `requires_cart_validation:true` and `/validate` with `items:[]` → `MISSING_ITEMS_FOR_ITEM_COUPON`. So the rule is "drive off `requires_cart_validation`", NOT off `offer_type`. This answers outbound Q5.
- **C. Our current app sends `items: []` on every validate** (`crmValidateCoupon`). Tapping any `requires_cart_validation:true` coupon today fails with `MISSING_ITEMS_FOR_BXGY_COUPON` / `MISSING_ITEMS_FOR_ITEM_COUPON` — neither code is in our `errorMap`, so the diner sees the raw CRM `detail` text.
- **D. Time-window coupons are returned, not filtered** (3 of 6 anonymous coupons at 960 are `within_window_now:false`). CRM left grey-out vs hide to us. Tapping one → `OUTSIDE_TIME_WINDOW` (already mapped).
- **E. `display_title` collapses in engine path.** GYAN, STO-GENERIC-10, SEED_V3A_OVERNIGHT all render as "10% off"; only `code` differentiates cards. `title` is the descriptive one (e.g. "Buy 3 Golden Caramel Get 1 Ras Bhari Mango at Rs.99"). Our card currently prefers `display_title` → three identical-looking cards.
- **F. Recommendation ties.** At 960 GYAN and STO-GENERIC-10 both give 96; CRM picks GYAN. Fine — we just use `recommended_code`.
- **G. Legacy path unchanged.** Without `order_total`, `requires_cart_validation` is still `null` and no `recommended_code`. Our current list call is on the legacy path → this is why BUG-2026-10-12-001 reproduces today.
- **H. Field renames in engine path:** `start_date/end_date` → `valid_from/valid_until`; `description` gone (folded into `title`). We don't read either today — no impact.

---

## 2. Our three outbound issues — status

| Outbound issue | CRM answer | Unblocked? |
|---|---|---|
| 1. Non-applicable coupons shown | `?order_total=` → min-order, per-user-exhausted, wrong-channel excluded. Time-window coupons kept + flagged via `time_window.within_window_now` | **YES** (server-side); time-window display is our call |
| 2. BXGY "₹0 off" | `requires_cart_validation` always boolean in engine path; `expected_discount:null` when true; `items[]` shape given | **YES** — but only if we pass `order_total` AND send `items[]` on tap |
| 2b. `items[]` shape | `{food_id, item_id, name, quantity, unit_price}`; min `food_id`+`quantity`+`unit_price` | **YES** |
| 3. Recommendation | top-level `recommended_code` + `recommended_discount` (Option A, as we asked). Simple in-window coupons only; null without `order_total` | **YES** |
| Q5 other types needing cart validation | Implicitly answered: item/category-scoped simple coupons also set `rcv:true` (note B) | **YES** |

CR-119 (`name` in skip-otp) — already consumed by CR-2026-10-11-006 (QA_PASS). Nothing new to build.
CR-120 (anonymous validate) — already consumed by CR-2026-10-11-008 (QA_PASS). Nothing new to build.
CR-121 (anonymous list) — already consumed by CR-2026-10-11-009 (IMPLEMENTED, QA pending).
CR-122 (engine path) — **nothing on our side uses it yet.** This is the build.

---

## 3. What needs to be built on our side (proposed CR: "Coupon list engine path — CR-122 adoption")

All frontend. No backend change. Files: `crmService.js`, `ReviewOrder.jsx`, `CouponDiscoveryList.jsx`.

| # | Item | Why | Size |
|---|---|---|---|
| B1 | `crmGetCouponList` — add `order_total` param (cart subtotal); `ReviewOrder` passes `subtotal` and re-fetches when subtotal changes (debounced, like max-redeemable) | Switches to engine path → fixes Issue 1, Issue 2 display, enables Issue 3. Current fetch is "once on open" — list must now track the cart | S |
| B2 | `crmValidateCoupon` — accept `items[]`; `ReviewOrder` builds from `cartItems` → `{food_id: String(itemId), item_id, name: item.name, quantity, unit_price: item.price}`; always send (harmless for simple coupons) | Tapping any `requires_cart_validation:true` coupon fails today (note C). Also required for typed BXGY codes | S |
| B3 | `errorMap` — add `MISSING_ITEMS_FOR_BXGY_COUPON`, `MISSING_ITEMS_FOR_ITEM_COUPON`, `NO_ELIGIBLE_BUY_ITEMS_IN_CART`, `PER_USER_LIMIT`, `NOT_FOUND` (CRM §2 names) | Diner-facing copy for new codes; B2 makes the MISSING_* ones unreachable but keep as safety net | XS |
| B4 | `CouponDiscoveryList` — read `data.recommended_code`; `ReviewOrder` auto-applies it once on list load if no coupon is applied and diner hasn't removed one → runs existing `handleApplyCoupon(code)` (validate confirms) | Issue 3 — the UX the owner asked for | S |
| B5 | `CouponDiscoveryList` — time-window coupons (`time_window.within_window_now === false`): grey-out with "Valid 17:00–19:00" (or hide) — **owner decision needed** | Issue 1 residual (note D) | XS |
| B6 | `CouponDiscoveryList` — card title: prefer `title` over `display_title` (or show both: `title` main, `display_title` as the discount chip) | Note E — identical cards | XS |
| B7 | `CouponDiscoveryList` — keep "Tap to see discount" branch; the `formatDiscount` fallthrough to `₹{discount_value} off` is now only reachable on the legacy path. Add `offer_type !== 'simple'` guard as defence (closes BUG-2026-10-12-001 as a side-effect of B1) | Safety net; BUG-001 root cause is fixed server-side once B1 lands | XS |

Decision points for owner before implementation:
1. **D-TW:** time-window coupons out of window — grey-out with window text (recommended) or hide?
2. **D-AUTO:** auto-apply `recommended_code` silently, or show a one-tap "Best offer: GYAN saves ₹96 — Apply" banner? (CRM says auto-apply is safe; UX-wise a banner avoids surprising the diner and avoids re-apply loops on cart change.) Recommended: banner on first load, auto-apply only if owner insists.
3. **D-REFETCH:** on subtotal change, re-fetch list (engine filters by min-order) — yes (recommended) or keep once-on-open?
4. **D-TITLE:** B6 title preference.

Dependencies / sequencing:
- CR-2026-10-11-009 QA (pending) should run **after** this CR, not before — otherwise QA tests the legacy path we're about to retire.
- BUG-2026-10-12-001 → fold into this CR (resolved by B1 + B7). Do not ship the standalone `discount_value > 0` patch.
- CR-2026-10-11-007 (identity update) untouched.

---

## 4. Reply to CRM (owner sends)
- V1–V8: all PASS on preprod r689 (2026-10-12).
- Doc fix: §4 example `food_id 202959` is not the buy item for SEED_V3B_BXGY_FLAT; use `182043` (buy) / `182044` (get).
- Confirm: item/category-scoped simple coupons also return `requires_cart_validation:true` and need `items[]` — we will send `items[]` on every validate.
- No contract objections. We will migrate to `?order_total=` and `items[]`; ETA after owner approves our CR.
- Time-window coupons: we will grey-out (pending owner decision).

---
## Addendum — CR-123 (revised brief `…CR119_TO_CR123…`, same day)
| # | Claim | Live (Saurav, r689) | Verdict |
|---|---|---|---|
| V9 | `{290, coupon_discount 43.5}` → `earn_base_preview 246.5`, `points_to_redeem_applied 0` | 246.5 / 0 / `projected_points_earned 24` (tier ≈10 %, not Bronze — formula correct) | PASS |
| V10 | without new fields → old keys + 2 new, projected unchanged | 29 / base 290 / applied 0 | PASS |
| V11 | `points_to_redeem 9999` → applied == max | 36 == 36 | PASS |
Note: with 36 pts × ratio 3.0 redeemed, base 138.5 → `projected_points_earned 0` (min-order gate on net base). UI must render 0, not hide.
**Our answer to CRM's question:** `bill_amount` = pre-tax, pre-discount cart sub-total ✅. We do not yet send `coupon_discount`/`points_to_redeem` → new CR-2026-10-12-003. Client-side fallback in `LoyaltyRewardsSection` uses post-tax `totalToPay` — wrong, in CR-003 scope.
