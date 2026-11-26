# QA HANDOVER — CR-2026-10-12-003 (Part A)
## Loyalty earn preview — adopt CRM CR-123 (`coupon_discount` + `points_to_redeem` → net earn base)

**From:** Role 3 — Implementation Agent · **Date:** 2026-10-12
**Plan followed:** `IMPLEMENTATION_PLAN.md` Rev 2 (E1–E5) — **1 intentional deviation** (see below)
**Build:** `yarn build` → Compiled clean, `BUILD_EXIT=0` (+210 B main.js; pre-existing exhaustive-deps warnings only)
**Preview:** `REACT_APP_BACKEND_URL` in `frontend/.env` · restaurant `/689` (Kunafa Mahal, preprod) · CRM = preprod
**Risk:** MEDIUM — hotspot `ReviewOrder.jsx`; loyalty **display** + max-redeemable request shape only. No payment payload / POS payload / auth / storage-key change.

## What changed
1. `frontend/src/api/services/crmService.js` (E1) — `crmGetMaxRedeemable(token, billAmount, { couponDiscount, pointsToRedeem })`. Optional keys added to body **only when > 0** (back-compatible — legacy `{bill_amount}` unchanged).
2. `frontend/src/pages/ReviewOrder.jsx` (E2, E3) — max-redeemable effect now passes `couponDiscount` and (when redeeming) `pointsToRedeem`; deps extended to `[isAuthenticated, crmToken, subtotal, couponDiscount, isUsingPoints, pointsToRedeem]` so the preview re-fetches on coupon/points change. Diagnostic log when CRM clamps points. New `earnBasePreview` prop passed to `LoyaltyRewardsSection`.
3. `frontend/src/components/LoyaltyRewardsSection/LoyaltyRewardsSection.jsx` (E4) — **removed all client-side earn maths**. Variant 1 (identified) shows a number only when CRM returns `projected_points_earned`; below-min uses CRM `earn_base_preview`; otherwise a non-numeric "Earn rewards on this order!" prompt. Variant 3 (guest) now shows a static non-numeric prompt ("Enter your phone number above to see your points") — no local estimate.
Code markers: `CR-2026-10-12-003` on every edit.

## Deviation from plan (1)
- Plan E2 wrote `logger.warn('order', …)`. This codebase's `logger` (`src/utils/logger.js`) has **no `warn` method** — domain logs are `logger.order(…)` and the only two-arg call is `logger.error(domain, …)`. Used `logger.order('[CR-2026-10-12-003] CRM clamped …')` instead. Diagnostic-only; no behavioural impact. Classify as PLAN_GAP (plan referenced a non-existent API), not a code error.

## Self-test done (Role 3)
| # | Check | Result |
|---|---|---|
| S1 | Node assertion of E1 body shape: `(500)`→`{bill_amount}`; `(500,{cd:43.5})`→ +`coupon_discount`; `(500,{cd:43.5,ptr:36})`→ both; `(500,{ptr:36})`→ +`points_to_redeem` only | 4/4 PASS |
| S2 | `yarn build` | PASS (`BUILD_EXIT=0`) |
| S3 | Orphan check — `earnPercent` / `billAmount` / `isEligible` removed from LoyaltyRewardsSection; `tier`/`tierKey` retained | PASS |
| S4 | Live (auth, POS up): apply coupon → second max-redeemable call carries `coupon_discount`; "You will earn" number drops | **NOT RUN** — POS `restaurant-info` was timing out; needs healthy preprod |

## ⚠ Environment note for QA
- Live QA needs **POS preprod healthy** (restaurant-info) to render Review Order, and an **authenticated preprod customer with loyalty** (Saurav on r689) plus a coupon that produces `coupon_discount` (e.g. `STO-GENERIC-10`).
- The earn preview is now **CRM-authoritative**. If CRM returns no `projected_points_earned`, the UI shows the non-numeric prompt by design — this is **not** a bug.

## Acceptance criteria / test cases
| # | Case | Steps | Expected | Test ids |
|---|---|---|---|---|
| Q1 | Coupon lowers earn preview | auth Saurav `/689` → add items → note "You will earn N points" → open coupon → apply `STO-GENERIC-10` | Network: a 2nd `POST /scan/max-redeemable` fires carrying `coupon_discount`; displayed points **drop** to the CRM `projected_points_earned` for the discounted base | `logged-in-user-info` |
| Q2 | Remove coupon restores | from Q1 remove the coupon | preview re-fetches and rises back | `logged-in-user-info` |
| Q3 | Points redemption affects preview | toggle "Use points" on | `POST /scan/max-redeemable` carries `points_to_redeem`; preview reflects net base; if CRM clamps, console shows `[CR-2026-10-12-003] CRM clamped …` | `logged-in-user-info` |
| Q4 | Legitimate zero | heavy redemption makes `projected_points_earned = 0` | UI shows `You will earn 0 points on this order!` (number rendered, not hidden) **unless** CRM `earn_base_preview < min_order_value`, in which case "Almost there! / Add ₹X more to earn points" (X from `earn_base_preview`) | `logged-in-user-info` |
| Q5 | No client estimate | with loyalty settings present but CRM `projected_points_earned` null | shows "Earn rewards on this order! / Points are calculated on food value after discounts" — **no number** | `logged-in-user-info` |
| Q6 | Guest prompt | anonymous diner (no phone) on `/689` → Review Order | "Earn rewards on this order! / Enter your phone number above to see your points" — **no number** | `login-rewards-prompt` |
| Q7 | Regression — redemption cap | "Use points" still caps at CRM `max_points_redeemable`/`max_discount_value`; Below-min redemption message (BUG-2026-10-12-003 wording "Earn X more points to redeem") unchanged | unchanged | — |
| Q8 | Regression — order placement | place a dine-in order after applying coupon + points | POS payload unchanged by this CR; order places (BLOCKED not FAIL if preprod ordering down) | `place-order-btn` |

## Scope lock
Files changed: the 3 listed. **Not touched:** backend, `.env`, POS payload, AuthContext, CartContext, Landing, OrderSuccess, CR-002 coupon-engine work (separate Session Part B).
