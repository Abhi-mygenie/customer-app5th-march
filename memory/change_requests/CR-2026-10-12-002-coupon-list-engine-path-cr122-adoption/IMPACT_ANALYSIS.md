# IMPACT ANALYSIS — CR-2026-10-12-002
## Coupon List Engine Path — CRM CR-122 Adoption

**ID:** CR-2026-10-12-002
**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-12
**Status:** COMPLETE — Rev 2 (2026-10-12, re-verified after BUG-2026-10-12-002 landed) — awaiting owner gate

> **Rev 2 changes:** line references shifted +9 (BUG-002 added a 9-line helper at top of `ReviewOrder.jsx`); new finding **R10 — loyalty vs auto-apply conflict** (live data: every r689 coupon is `stackable_with_loyalty:false`); conflict check updated; environment note (POS preprod down). See §Rev 2 at the end.

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

---

## Rev 2 — re-verification 2026-10-12 (post BUG-2026-10-12-002)

### Code reality (current line numbers)
| Item | Was | Now |
|---|---|---|
| `couponList` / `couponListLoading` state | L198–199 | L207–208 |
| list fetch effect (`crmGetCouponList(crmToken \|\| null, channel, …)`) | L600–614 | L609–623 |
| max-redeemable 500 ms debounce (pattern to copy) | L~580–598 | L585–605 |
| `errorMap` | L917 | L926 |
| `crmValidateCoupon` calls | L946 / L955 | L955 / L964 |
| `handleRemoveCoupon` / `handleTapCoupon` | L977 / L986 | L986 / L995 |
| `handleUsePoints` non-stackable guard (`'Remove coupon first to use points'`) | — | L899–904 |
| `<CouponDiscoveryList>` render | L1984 | L1993 |
| BUG-003 target line (independent region) | L2076 | L2085 |
All other reality-check rows unchanged. `crmService.js` and `CouponDiscoveryList.jsx` untouched since Rev 1.

### Conflict check (updated)
| Item | State | Conflict |
|---|---|---|
| BUG-2026-10-12-002 | IMPLEMENTED (ReviewOrder.jsx top helper + 3 pre-fill lines) | none — disjoint region; merge order irrelevant |
| BUG-2026-10-12-003 | gated (1 line, loyalty subtext) | none — disjoint |
| CR-2026-10-11-009 | IMPLEMENTED, QA pending | this CR **modifies** CR-009 code → QA both together |
| CR-2026-10-11-007 | IA stage | reads `customerPhone`, no coupon overlap |

### R10 — NEW: silent auto-apply blocks loyalty redemption (owner decision needed)
Live r689 (`order_total=960`, anon and auth): **every** coupon — including the recommended `GYAN` and `MARRY` — has `stackable_with_loyalty:false`.
Existing rule (CR-2026-10-09-002 D2=(a), `ReviewOrder.jsx` L899–904): if a non-stackable coupon is applied, **Use points** is refused with toast "Remove coupon first to use points".
Consequence of D-AUTO as ruled: a loyalty-eligible diner lands on checkout, `GYAN` is applied silently, they tap **Use points** → refused. They must notice the auto-applied coupon and remove it. Worse when points would have saved more than the coupon (e.g. 200 redeemable points vs ₹96 coupon).

| Option | Behaviour | Pros / cons |
|---|---|---|
| **L-A (recommended)** | Auto-apply **unless** diner is loyalty-eligible right now (`maxRedeemable?.ok === true`) **and** the recommended coupon is non-stackable. In that case show the coupon as a "Best offer" badge on its card instead of applying it | Never steals the diner's choice; zero new logic beyond one condition + existing badge; coupon still one tap away |
| L-B | Auto-apply always; when non-stackable and loyalty-eligible, change the toast to "Coupon applied — ₹96 off · Remove it to use points instead" | Simplest; still a surprise block on Use points |
| L-C | Auto-apply the better of the two: compare `recommended_discount` vs `maxRedeemable.max_discount_value`; apply coupon only if it saves more, otherwise leave for points | Best savings for diner; adds a comparison + depends on max-redeemable having loaded first (timing) |
| L-D | Auto-apply only when `stackable_with_loyalty !== false` | On r689 today this means never — kills the feature until merchants flag stackables |

Anonymous diners (no token → `maxRedeemable` null) are unaffected: auto-apply proceeds in all options.
Timing note: `maxRedeemable` arrives via its own 500 ms debounce; the auto-apply effect must wait until `maxRedeemableLoading === false` for authenticated diners (or L-A/L-C can't decide). Adds `maxRedeemableLoading` to the effect deps.

### R11 — environment
POS preprod (`preprod.mygenie.online`) was timing out at 07:35 UTC 2026-10-12 → landing/menu skeleton for all restaurants. Blocks any live QA of this CR until POS responds. CRM preprod is up (validated same hour).

### Owner decisions — consolidated (gate opens when all answered)
1. **D-TW** grey-out visual (style, 24h vs 12h, "Valid 17:00–19:00" wording)
2. **D-TITLE** `title` over `display_title` — yes/no
3. **B8** re-validate applied coupon on debounced subtotal change — in/out
4. **R10 / D-LOYALTY** — L-A / L-B / L-C / L-D
