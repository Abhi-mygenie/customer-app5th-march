# IMPLEMENTATION PLAN — CR-2026-10-12-003
## Loyalty earn preview — CRM CR-123 adoption

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Risk:** MEDIUM
**Gate:** HOLD — implemented as **step 0b of the CR-2026-10-12-002 session** (owner ruling), under CR-002's approval. Single QA pass covers both.

## Owner rulings 2026-10-12
| # | Ruling |
|---|---|
| C4 | **Drop** the client-side estimate. Earn number shown only when CRM `projected_points_earned` is present. Anonymous diners see a generic prompt without a number |
| Sequence | Fold C1–C4 into CR-002 implementation session, first |
| Edit-order `bill_amount` (new items only) | Out of scope → registered **BUG-2026-10-12-004** (P3) |

## Edits
**E1 `crmService.js`** — `crmGetMaxRedeemable(token, billAmount, { couponDiscount = 0, pointsToRedeem = 0 } = {})`; body adds `coupon_discount` when `> 0`, `points_to_redeem` when `> 0`. Marker `// CR-2026-10-12-003`.

**E2 `ReviewOrder.jsx` L585–608** — effect deps `[isAuthenticated, crmToken, subtotal, couponDiscount, isUsingPoints, pointsToRedeem]`; call `crmGetMaxRedeemable(crmToken, subtotal, { couponDiscount, pointsToRedeem: isUsingPoints ? pointsToRedeem : 0 })`. Keep 500 ms debounce and `setMaxRedeemable(null)` on error. **No loop:** this effect never writes `couponDiscount`/`pointsToRedeem`; CR-002 B8 never reads `maxRedeemable`.

**E3 `ReviewOrder.jsx` `handleUsePoints`** — unchanged (`max_points_redeemable` is already the clamp). Add one `logger.warn` if a later response has `points_to_redeem_applied` ≠ `pointsToRedeem` while `isUsingPoints` (diagnostic only; no auto-correction — avoids yanking the diner's selection mid-edit). Owner may upgrade later.

**E4 `LoyaltyRewardsSection.jsx`** —
- Variant 1 (identified): remove `earnPercent × totalToPay` fallback. If `projectedPointsEarned != null` → "You will earn {N} points on this order!" (N may be **0** → still render the sentence; eligibility hint below). Else → "Earn rewards on this order!" + "Points are calculated on food value after discounts" (no number).
- Eligibility hint: pass new prop `earnBasePreview` (from `maxRedeemable.earn_base_preview`); when `projectedPointsEarned === 0 && earnBasePreview != null && earnBasePreview < loyaltySettings.min_order_value` → "Add ₹{min − earnBasePreview} more to earn points". Otherwise no hint.
- Variant 3 (guest): remove the computed number. Title "Earn rewards on this order!", subtitle "Enter your phone number above to see your points" .
- Remove now-unused `totalToPay` maths; keep prop until CR-002 session confirms no other consumer (`grep totalToPay` → only ReviewOrder L2233).
- `data-testid`s unchanged: `logged-in-user-info`, `login-rewards-prompt`.

**E5 `ReviewOrder.jsx` L2235** — add `earnBasePreview={maxRedeemable?.earn_base_preview ?? null}`.

## Verification matrix
| # | Case | Expected |
|---|---|---|
| L1 | auth, no coupon, no points, ₹290 | N = CRM value (29 for Saurav); body has no optional fields |
| L2 | apply coupon ₹43.5 | re-fetch within 500 ms; N drops (24); request body `coupon_discount: 43.5` |
| L3 | Use points (36) with coupon | request `points_to_redeem: 36`; N = 0 → sentence renders "0 points"; hint "Add ₹X more to earn points" only if base < min-order |
| L4 | Remove coupon → N back to 29 | |
| L5 | anonymous diner | guest prompt without a number; no max-redeemable call |
| L6 | looked-up (phone entered, not yet token) | identified variant without number |
| L7 | CRM error / 429 | identified variant without number; Use button disabled (existing D3) |
| L8 | edit-order mode | behaviour unchanged (BUG-004 parked) |
| L9 | CR-002 auto-apply fires → coupon applied → max-redeemable re-fetched with coupon_discount | single extra call, no loop (network tab) |

## Files WILL change: `crmService.js`, `ReviewOrder.jsx` (effect + 1 prop), `LoyaltyRewardsSection.jsx`
## Files WILL NOT touch: `OrderSuccess.jsx`, loyalty-rules fetch, POS payload, backend
## Registry on completion: CR-003 → IMPLEMENTED alongside CR-002; `code_markers: true`.
