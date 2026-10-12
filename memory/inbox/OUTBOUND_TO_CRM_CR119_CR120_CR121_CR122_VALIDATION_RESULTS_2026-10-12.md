# Scan & Order → CRM — CR-119 / CR-120 / CR-121 / CR-122 validation results (preprod)
**From:** Scan & Order (Customer App) team
**To:** CRM team
**Date:** 2026-10-12
**Re:** `CRM_TO_SCAN_ORDER_CR119_CR120_CR121_CR122_LIVE_PLEASE_VALIDATE_2026_10_12.md`
**Owner sends; agents never send.**

---

## V1–V8 — all PASS (preprod r689, 2026-10-12 ~12:20 IST)

| # | Result |
|---|---|
| V1 | skip-otp with `name` on existing customer → `is_new_customer:false`, on-file name returned, not overwritten ✅ |
| V2 | anonymous `/validate` STO-GENERIC-10 @450 → `computed_discount:45`, `final_amount_preview:405` ✅ |
| V3 | STO-STANDARD anonymous → `CUSTOMER_REQUIRED`; with token → `valid:true` (67.5) ✅ |
| V4 | anonymous `GET /scan/coupons?restaurant_id=689` → `[GYAN, STO-GENERIC-10, STO-GENERIC-MIN]`, no STO-STANDARD ✅ |
| V5 | `order_total=96` → STO-GENERIC-MIN absent (5 coupons); `960` → present (6) ✅ |
| V6 | `order_total=960` → anon `recommended_code:"GYAN"/96`; auth `"MARRY"/197`; `requires_cart_validation` boolean on all 26 auth + 6 anon coupons ✅ |
| V7 | SEED_V3B_BXGY_FLAT → `rcv:true, expected_discount:null`; `/validate` with `items[182043×3, 182044×1]` → `computed_discount:99` ✅ |
| V8 | anonymous `/validate` without `restaurant_id` → 422 ✅ |

**No contract objections.** Lock it.

## Two things to note

1. **Doc typo in §4.** The example `food_id "202959"` (Golden Caramel) is not the buy item for `SEED_V3B_BXGY_FLAT` — validating with it returns `NO_ELIGIBLE_BUY_ITEMS_IN_CART`. The coupon's `eligible_match_hint` says buy `182043`, get `182044`. Please correct the example so the next consumer doesn't chase a false negative.

2. **`requires_cart_validation:true` is wider than BXGY.** Item- and category-scoped *simple* coupons (`SEED_V2_ITEMFLAT`, `SEED_V2_CAT*`, `SEED_V2_ITEMS_MULTI`) also return `rcv:true` and reject empty `items` with `MISSING_ITEMS_FOR_ITEM_COUPON`. That answers our Q5 — we will key off `requires_cart_validation` only, never `offer_type`, and we will send `items[]` on **every** validate. Please confirm this is intended and stable.

## What we are building (our CR-2026-10-12-002)

- `GET /scan/coupons` always with `order_total` (cart subtotal), debounced on cart change.
- `items[]` `{food_id, item_id, name, quantity, unit_price}` on every `POST /scan/coupons/validate`.
- `recommended_code` → silent auto-apply on checkout open, confirmed via `/validate`.
- Time-window coupons with `within_window_now:false` → shown greyed-out with the window, not tappable.
- New error codes mapped: `MISSING_ITEMS_FOR_BXGY_COUPON`, `MISSING_ITEMS_FOR_ITEM_COUPON`, `NO_ELIGIBLE_BUY_ITEMS_IN_CART`, `PER_USER_LIMIT`, `NOT_FOUND`.

## Questions

1. Does `PER_USER_LIMIT` replace `CUSTOMER_USAGE_LIMIT_REACHED` (which we map today), or do both exist? We will keep both mapped.
2. `recommended_code` ties (GYAN and STO-GENERIC-10 both 96 at ₹960) — is tie-break deterministic (e.g. created order)? Not blocking; for QA repeatability.
3. Prod timeline for CR-122 — our CR will be preprod-only until CRM prod is live.

Preprod remains our test target until you confirm prod.
