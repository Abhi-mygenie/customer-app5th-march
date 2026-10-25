# INTAKE + IMPACT ANALYSIS — CR-2026-10-12-003
## Loyalty earn preview — adopt CRM CR-123 (`coupon_discount` + `points_to_redeem` in max-redeemable; net earn base)

**Registered by:** Role 2 — Planning Agent (owner forwarded CRM brief 2026-10-12) · **Date:** 2026-10-12
**Source:** `inbox/INBOUND_FROM_CRM_CR119_TO_CR123_LIVE_PLEASE_VALIDATE_2026-10-12.md` §4b
**Status:** IMPLEMENTED (Part A, E1–E5) 2026-10-12 — awaiting QA · owner-authorised as Session Part A

## Classification
| Field | Value |
|---|---|
| Type | CR (contract adoption / correctness) |
| Priority | P1 — the "You will earn N points" number diners see is **overstated** whenever a coupon or points are applied |
| Risk | MEDIUM — hotspot `ReviewOrder.jsx`; loyalty display only; no payment/POS payload change |
| Related | CR-2026-10-09-003 (max-redeemable), CR-2026-10-12-002 (coupon auto-apply changes `couponDiscount`), BUG-2026-10-12-003 |

## CRM CR-123 — what changed (validated live 2026-10-12, Saurav, r689)
| # | Check | Result |
|---|---|---|
| V9 | `{bill_amount:290, coupon_discount:43.5}` | `earn_base_preview 246.5`, `points_to_redeem_applied 0`, `projected_points_earned 24` (Saurav's tier ≈10 %; CRM's "12" assumed Bronze 5 % — formula holds) ✅ |
| V10 | `{bill_amount:290}` only | same keys as today + `earn_base_preview 290`, `points_to_redeem_applied 0`; `projected_points_earned 29` unchanged ✅ |
| V11 | `points_to_redeem: 9999` | clamped → `points_to_redeem_applied 36 == max_points_redeemable` ✅ |
| extra | base after clamp 290−43.5−(36×3.0)=138.5 → `projected_points_earned 0` | min-order gate applied to **net** base (as CRM states) — diner can earn 0 when redeeming heavily; UI must show "0 points" not hide |

**CRM's question answered:** we send `bill_amount = subtotal` = `getTotalPrice()` = cart item total, **pre-tax, pre-discount** ✅ (`ReviewOrder.jsx` L580, call at L596). We do **not** yet send `coupon_discount` / `points_to_redeem`.

## Code reality (what is wrong today)
| Item | Location | Finding |
|---|---|---|
| `crmGetMaxRedeemable(token, billAmount)` — 2 params | `crmService.js` L372–377 | no coupon/points fields |
| max-redeemable effect deps `[isAuthenticated, crmToken, subtotal]` | `ReviewOrder.jsx` L585–608 | **not** re-run when coupon applied/removed or points toggled → `projected_points_earned` stale/overstated |
| `projectedPointsEarned={maxRedeemable?.projected_points_earned}` | L2235 → `LoyaltyRewardsSection` | authoritative when present ✅ |
| Client fallback when null: `Math.round(totalToPay × earnPercent)` and `isEligible = totalToPay >= min_order_value` | `LoyaltyRewardsSection.jsx` L31–37 | **wrong base**: `totalToPay` is **post-tax, post-discount total** — CRM says never compute locally; GST inflates it. Used for anonymous diners (no token → no max-redeemable) and on CRM error |
| Post-order `points_earned` display | `OrderSuccess.jsx` | none — POS surfaces it; out of scope here |

## Scope
| # | Item | File |
|---|---|---|
| C1 | `crmGetMaxRedeemable(token, billAmount, { couponDiscount, pointsToRedeem })` → body adds the two optional fields when > 0 | `crmService.js` |
| C2 | Effect deps add `couponDiscount`, `isUsingPoints`, `pointsToRedeem`; pass them; same 500 ms debounce | `ReviewOrder.jsx` L585–608 |
| C3 | Use `points_to_redeem_applied` when `isUsingPoints` to keep `pointsToRedeem`/`pointsDiscount` honest if CRM clamps (should equal `max_points_redeemable` already — assert, log if differs) | `ReviewOrder.jsx` |
| C4 | Fallback in `LoyaltyRewardsSection`: **owner decision** — (a) remove the local estimate, show nothing for anonymous diners (CRM rule "never compute locally"); or (b) keep an explicitly-labelled estimate on `subtotal − couponDiscount` (pre-tax) with "approx." wording | `LoyaltyRewardsSection.jsx` |
| C5 | Earn % copy, if shown: "5 % on food value after discounts" | `LoyaltyRewardsSection.jsx` (check copy) |

## Interplay with CR-2026-10-12-002 (must be sequenced)
- CR-002 auto-apply / B8 change `couponDiscount` → with C2 that correctly re-fetches max-redeemable. Without C2, CR-002 makes the overstated preview *more* common (coupon applied on every checkout).
- CR-002's L-A reads `maxRedeemable.ok` — unaffected by C1/C2 (`ok` is independent of coupon).
- Loop guard: max-redeemable response does **not** change `couponDiscount`, and B8 does not read `maxRedeemable` → no effect ping-pong. State it in both plans.
- **Recommended order:** CR-003 (small) → CR-002, or implement C1–C3 inside the CR-002 session as its first step. Not after.

## Risks
| # | Risk | Mitigation |
|---|---|---|
| R1 | Diner redeems heavily → `projected_points_earned 0` → UI must not treat 0 as "hide"/null | render "You'll earn 0 points on this order" or the ineligible branch; test case |
| R2 | Extra max-redeemable calls on every coupon/points toggle (auth only, read-only, cheap per CRM) | existing debounce; no anon calls |
| R3 | Anonymous preview disappears (C4-a) | owner decision; CRM is explicit that local maths is wrong |

## Owner decisions
1. C4 — (a) drop local estimate for anonymous / error, or (b) keep as labelled "approx." on pre-tax net base.
2. Sequence — standalone CR-003 first, or fold C1–C3 into CR-002 implementation session.

## Files WILL change: `crmService.js`, `ReviewOrder.jsx` (effect L585–608 + deps), `LoyaltyRewardsSection.jsx`
## Files WILL NOT touch: `OrderSuccess.jsx`, POS payload, loyalty rules fetch, backend

### Owner rulings 2026-10-12
C4 = **(a) drop** client estimate · Sequence = **fold into CR-002 session (step 0b)** · Edit-mode `bill_amount` = **parked as BUG-2026-10-12-004**. See IMPLEMENTATION_PLAN.md.
