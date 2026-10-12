# IMPACT ANALYSIS — CR-2026-10-12-002
## Coupon List Engine Path — CRM CR-122 Adoption

**ID:** CR-2026-10-12-002
**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-12
**Status:** COMPLETE — awaiting owner gate

---

## Code Reality Check (read 2026-10-12)

| Item | Location | Status |
|---|---|---|
| `crmGetCouponList(token, channel, restaurantId)` — no `order_total` | `crmService.js` L418–426 | ✅ CONFIRMED |
| `crmValidateCoupon` hard-codes `items: []` | `crmService.js` L392–405 | ✅ CONFIRMED |
| List fetch effect deps `[showCoupon, crmToken, numericRestaurantId, scannedOrderType]` — no `subtotal` | `ReviewOrder.jsx` L600–614 | ✅ CONFIRMED |
| `setCouponList(Array.isArray(data) ? data : data?.coupons)` — drops `recommended_code` | `ReviewOrder.jsx` L609 | ✅ CONFIRMED |
| `errorMap` has 9 codes; missing `MISSING_ITEMS_FOR_BXGY_COUPON`, `MISSING_ITEMS_FOR_ITEM_COUPON`, `NO_ELIGIBLE_BUY_ITEMS_IN_CART`, `PER_USER_LIMIT`, `NOT_FOUND` | `ReviewOrder.jsx` L917–927 | ✅ CONFIRMED |
| `handleApplyCoupon(overrideCode)` reusable for auto-apply; `handleTapCoupon` sets `couponCode` then applies | `ReviewOrder.jsx` L911–990 | ✅ CONFIRMED |
| Cart item shape: `{ itemId, quantity, totalPrice, item: { name, price, ... } }` | `ReviewOrder.jsx` L71–77, L1105 | ✅ CONFIRMED |
| `subtotal = getTotalPrice()` (pre-discount) — already what we send to `/validate` | `ReviewOrder.jsx` L571 | ✅ CONFIRMED |
| Max-redeemable already uses a 500 ms debounce on `subtotal` — pattern to copy | `ReviewOrder.jsx` L~580–598 | ✅ CONFIRMED |
| `formatDiscount` falls through to `₹{discount_value} off` when `rcv` falsy | `CouponDiscoveryList.jsx` L4–10 | ✅ CONFIRMED |
| Card title `display_title \|\| title` | `CouponDiscoveryList.jsx` L48 | ✅ CONFIRMED |
| Applied coupon is **not** re-validated when subtotal changes (pre-existing) | `ReviewOrder.jsx` — no effect on `appliedCouponCode`+`subtotal` | ⚠️ PRE-EXISTING GAP (see R5) |

## CRM contract (verified live, preprod r689)

- `GET /scan/coupons?order_total=N` → `data: { coupons[], recommended_code, recommended_discount }`. Every coupon has boolean `requires_cart_validation`, `expected_discount` (number or null), `time_window{configured, within_window_now, start_time, end_time, valid_days, tz, next_window_start}`, `offer_type`, `title`, `display_title`.
- Without `order_total` → legacy shape, `rcv` may be null, no recommendation.
- `/validate` `items[]`: `{ food_id, item_id, name, quantity, unit_price }`; min `food_id|item_id + quantity + unit_price`. Required for **all** `rcv:true` coupons — BXGY/BOGO/nth AND item/category-scoped simple coupons. Empty `items` → `MISSING_ITEMS_FOR_BXGY_COUPON` / `MISSING_ITEMS_FOR_ITEM_COUPON`.
- `recommended_code` is only ever a simple, in-window, applicable coupon; `null` when none.
- Anonymous rate limit 10/min/IP applies to list + validate → debounce is mandatory for B1.

## Files Changed

| File | Change |
|---|---|
| `frontend/src/api/services/crmService.js` | `crmGetCouponList` gains `orderTotal`; `crmValidateCoupon` gains `items` param |
| `frontend/src/pages/ReviewOrder.jsx` | list effect (subtotal dep + debounce + keep `recommended_code`), `buildCrmItems(cartItems)`, pass items to both validate calls, auto-apply effect, `errorMap` +5 codes |
| `frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.jsx` | time-window grey-out, title preference, `offer_type` guard |

No backend. No `.env`. No new dependency.

## Behaviour change matrix

| Scenario | Today | After |
|---|---|---|
| Cart ₹96, coupon min ₹300 | Card shown → tap → error | Card not shown |
| BXGY coupon in list | "₹0 off" | "Tap to see discount" |
| Tap BXGY coupon | raw CRM text "BOGO/BXGY coupons require items[]…" | validate with cart → real discount or "Add the required items…" |
| Tap item-scoped coupon | raw CRM text | same as above |
| Open Review Order, recommended exists, no coupon applied | nothing | best coupon auto-applied silently; toast "Coupon applied — ₹96 off" |
| Diner removes auto-applied coupon | n/a | stays removed; no re-apply this session |
| Cart subtotal changes | list static | list re-fetched (debounced); recommended may change (NOT re-auto-applied — see R4) |
| Happy-hour coupon outside window | normal card → tap → error | greyed card "Valid 17:00–19:00", non-tappable |
| Anonymous diner | generic coupons, legacy shape | generic coupons, engine shape, recommendation available |
| Edit mode (`isEditMode`) | coupon UI disabled | unchanged — auto-apply guarded by `!isEditMode` |

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Auto-apply surprises diner / applies non-stackable coupon that silently removes loyalty points (D2=(a) in `applyValidResult`) | Auto-apply only when `!appliedCouponCode && !isUsingPoints && !couponCode`; existing toast informs. Owner accepted silent auto-apply |
| R2 | Auto-apply fires on every list re-fetch → re-apply loop after diner removes | `autoApplyAttempted` ref — once per screen mount |
| R3 | Rate limit 429 on anonymous list from rapid cart edits | 500 ms debounce (same as max-redeemable); on 429 keep previous list |
| R4 | Recommended changes after cart change but applied coupon is stale | Not auto-switching; keep diner's applied coupon. Pre-existing stale-discount gap (R5) |
| R5 | **Pre-existing**: applied coupon discount not re-validated on subtotal change (10% coupon stays ₹96 after cart grows) | Out of scope unless owner opts in as B8: re-validate applied code on debounced subtotal change. Recommend B8 — auto-apply makes stale discounts more visible |
| R6 | `items[]` unit_price source: `item.item?.price` may be null for customised items → fallback `totalPrice/quantity` (same as `buildOrderItems`) | Reuse exact `buildOrderItems` price expression |
| R7 | Money path: `coupon_code` sent to POS at Place Order unchanged; discount still from CRM `computed_discount` | No change to L1478/L1659 |
| R8 | CR-009 QA pending on legacy path | Sequence: QA CR-009 + CR-002 together after this lands |
| R9 | Legacy restaurants / CRM prod not yet on CR-122 | Engine path fields are additive; code must tolerate `recommended_code` undefined and `rcv` null (legacy) — B7 guard covers display |

## Dependencies
- CRM CR-122 live on **preprod only**. Prod deploy follows owner smoke. This CR must be smoke-tested on preprod and not promoted before CRM prod deploy.
- D-TW visual design discussion (owner) before B5 implementation.

## Test surface (for QA handover)
Preprod r689; test user Saurav (phone in CR-009 QA_HANDOVER). Coupons: `STO-GENERIC-MIN` (min filter), `SEED_V3B_BXGY_FLAT` (items 182043×3 + 182044), `SEED_V2_ITEMFLAT` (item 182041), `SEED_V3A_EVERYDAY` (window 17:00–19:00), `GYAN` (recommended anon), `MARRY` (recommended auth).
