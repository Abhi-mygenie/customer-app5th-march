# QA HANDOVER — CR-2026-10-12-002 (Part B)
## Coupon list engine path — CRM CR-122 adoption (+ folded CR-2026-10-11-003)

**From:** Role 3 — Implementation Agent · **Date:** 2026-10-12
**Plan followed:** `IMPLEMENTATION_PLAN.md` Rev 3 (B1–B3 + B4 self-test) — no behavioural deviations
**Build:** `yarn build` → Compiled clean, `BUILD_EXIT=0` (pre-existing exhaustive-deps warnings only)
**Preview:** `REACT_APP_BACKEND_URL` in `frontend/.env` · restaurant `/689` (preprod) · CRM = preprod
**Risk:** MEDIUM — hotspot `ReviewOrder.jsx`; coupon list/validation + applied-coupon display. No payment-field semantics, auth, or storage-key change. Order payload only gains `couponDiscount`/`couponTitle` on the **retry** path (parity with the main path).

## What changed
1. `frontend/src/api/services/crmService.js` (B1)
   - `crmGetCouponList(token, channel, restaurantId, orderTotal)` — sends `order_total` → engine path (filtered list + `recommended_code`).
   - `crmValidateCoupon(token, code, orderTotal, channel, restaurantId, items)` — sends real cart `items[]` for `requires_cart_validation` coupons (was always `[]`).
2. `frontend/src/pages/ReviewOrder.jsx` (B2)
   - Module helpers `buildCrmItems()` and hoisted `COUPON_ERROR_MAP` (local `errorMap` removed; reads repointed).
   - New refs/state: `recommendedCode`, `autoApplyAttempted`, `autoAppliedCode`, `lastValidatedSubtotal`; all reset on restaurant change.
   - List effect now debounced 500 ms, re-fetches on subtotal change, keeps list on 429, stores `recommended_code`.
   - `handleApplyCoupon` sends `items[]` on both the direct and two-step (skip-OTP) validate calls; records `lastValidatedSubtotal`.
   - **Auto-apply effect (D-AUTO + L-A):** silently applies the CRM-recommended coupon once per mount — **unless** the diner can redeem loyalty points now and the coupon is non-stackable, in which case it only badges "Best offer" (no auto-apply).
   - **B8 re-validate effect:** when the cart changes, re-validates the applied coupon (debounced); updates discount or removes it with a toast if no longer valid.
   - Applied row shows a "Best offer applied" cue when the coupon was auto-applied.
   - Folded CR-2026-10-11-003: retry `placeOrder` now also carries `couponDiscount` + `couponTitle`.
3. `frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.jsx` + new `CouponDiscoveryList.css` (B3)
   - Rebuilt per design spec: normal / mystery (tap-to-see) / disabled (out-of-window) card states, "Best offer" badge, 12-hour time-window label (`windowLabel`), CRM `title` with fallbacks.

## ⚠ Breaking for QA scripts (test-id change)
Old `coupon-list-item-{code}` is **gone**. New ids:
`coupon-card-normal-{code}` · `coupon-card-mystery-{code}` · `coupon-card-disabled-{code}` · `coupon-best-offer-badge` · `coupon-strip-container` · `coupon-discovery-list` · `coupon-list-loading` · `coupon-auto-applied-cue`.
CR-2026-10-11-009 QA handover has been annotated with this change — QA both CRs together.

## Self-test done (Role 3)
| # | Check | Result |
|---|---|---|
| S1 | `yarn build` | PASS (BUILD_EXIT=0) |
| S2 | Marker counts: ReviewOrder `CR-2026-10-12-002`=23 (≥14), crmService=3, component=1 | PASS |
| S3 | Old `coupon-list-item-` across `src/` | 0 PASS |
| S4 | No dangling local `errorMap` in ReviewOrder | 0 PASS |
| S5 | node `fmt12`/`windowLabel` table ("Valid 5–7 PM", "Valid 11 AM–2 PM", "Valid 10 PM–2 AM · Fri, Sat", "5:30 PM") | 4/4 PASS |
| S6 | Live engine-path cases (V1/V4/V6/V7/V8) | **BLOCKED** — POS `restaurant-info` was timing out; needs healthy preprod |

## Environment note for QA
Needs POS preprod healthy to render Review Order, and CRM preprod engine responses for r689. Auth identity (Saurav) + a recommended coupon that returns `recommended_code`; a BXGY/cart-validation coupon; and a time-windowed coupon are needed to cover all card states.

## Acceptance criteria / test cases (V-series from plan Rev 2 + V14)
| # | Case | Steps | Expected | Test ids |
|---|---|---|---|---|
| V1 | Auto-apply recommended | anon `/689`, cart meeting a recommended coupon's min | coupon auto-applies silently; applied row shows "Best offer applied" | `coupon-applied-row`, `coupon-auto-applied-cue` |
| V2 | Engine list filtered by order_total | open coupons at low subtotal then raise it | list re-fetches (500 ms debounce); min-order coupons appear only when eligible | `coupon-strip-container` |
| V3 | BXGY shows no "₹0 off" | open coupons with a BXGY in list | BXGY card shows "Tap to see discount" (mystery), not "₹0 off" | `coupon-card-mystery-{code}` |
| V4 | L-A loyalty guard | Saurav (has redeemable points) + non-stackable recommended coupon | **not** auto-applied; "Best offer" badge shown on the card; diner chooses | `coupon-best-offer-badge` |
| V5 | Tap mystery → real discount | tap a mystery/cart-validation card | validates with `items[]`; applies with computed discount, or shows a clear message (e.g. "Add the required items…") | `coupon-card-mystery-{code}`, `coupon-applied-row` |
| V6 | Out-of-window greyed | a coupon outside its time window | card greyed, non-clickable, shows e.g. "Valid 5–7 PM" | `coupon-card-disabled-{code}` |
| V7 | B8 re-validate on cart change (still valid) | apply coupon → change cart qty | discount updates to new computed value; coupon stays | `coupon-applied-row` |
| V8 | B8 re-validate removes invalid | apply min-order coupon → reduce cart below min | coupon auto-removed with toast "Coupon … removed — Minimum order value not met…" | toast |
| V9 | Error-map priority | invalid / expired / channel / usage-limit codes | friendly mapped message, not raw CRM detail | `coupon-error` |
| V10 | Two-step skip-OTP still works | anon apply standard coupon needing customer | skip-OTP acquires token, re-validates with `items[]`, applies | — |
| V11 | Remove coupon resets cues | apply (auto) → Remove | cue cleared; `autoAppliedCode`/`lastValidatedSubtotal` reset; list returns | `coupon-remove-button` |
| V12 | Restaurant switch reset | switch restaurant | recommended/auto/last-validated all cleared | — |
| V13 | 429 keeps list | hammer open/close | on 429 the previous list stays (no flash to empty) | `coupon-strip-container` |
| V14 | Folded retry payload | force a place-order retry with a coupon applied | retry payload includes `couponCode`, `couponDiscount`, `couponTitle` (parity with first attempt). BLOCKED not FAIL if preprod ordering down | `place-order-btn` |

## Interaction with Part A (CR-003)
B8 writes `couponDiscount`; CR-003's max-redeemable effect reads `couponDiscount` and writes only `maxRedeemable*`; auto-apply reads `maxRedeemable` but is guarded by `autoApplyAttempted`. No render loop (verified in plan loop-checks). QA should confirm the loyalty earn preview updates when a coupon auto-applies.

## Scope lock
Files changed: the 3 listed + new CSS. **Not touched:** backend, `.env`, POS payload semantics, AuthContext, CartContext, Landing, OrderSuccess, `payment_method`/`payment_type`.
