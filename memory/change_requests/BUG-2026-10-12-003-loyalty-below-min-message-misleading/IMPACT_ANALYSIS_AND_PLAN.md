# IMPACT ANALYSIS — BUG-2026-10-12-003
## Loyalty below-minimum message — wrong unit and wrong verb

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Status:** COMPLETE — awaiting gate

## Code Reality Check
| Item | Location | Status |
|---|---|---|
| Message built inline: `` `Add ₹${min_redemption_points - (available_points \|\| 0)} more to redeem` `` | `ReviewOrder.jsx` L2075–2077 | ✅ CONFIRMED |
| `data-testid="loyalty-points-below-min-subtext"` on the span | L2074 | ✅ CONFIRMED |
| Values come from CRM `POST /scan/max-redeemable`; both fields customer/config-level, independent of `bill_amount` | `crmGetMaxRedeemable`, L372–377 crmService | ✅ CONFIRMED (live probe in INTAKE) |
| No other occurrence of "more to redeem" in `src/` | grep | ✅ CONFIRMED |
| Existing fallback branch `'Not enough points to redeem'` | L2077 | unchanged |

## Data flow
CRM `max-redeemable` → `maxRedeemable` state → render branch `available_points < min_redemption_points` → this span. No write path. No consumer reads the string.

## Risk
**LOW** — static text; no logic, no state, no API. Hotspot file (`ReviewOrder.jsx`) → owner approval required by matrix §7, but regression surface is the loyalty section render only.

## Files
- WILL change: `frontend/src/pages/ReviewOrder.jsx` (1 line, L2076)
- WILL NOT touch: `crmService.js`, loyalty rules, `CartContext`, any CRM contract, test ids

## Owner decisions
Wording. Recommended: **`Earn ${n} more points to redeem`**. Alternatives: `${n} more points needed to redeem` · `You need ${n} more points`.

## Verification matrix
| # | Case | Expected |
|---|---|---|
| 1 | available 10, min 100 | "Earn 90 more points to redeem" |
| 2 | available 0 / null, min 100 | "Earn 100 more points to redeem" |
| 3 | available ≥ min | branch not rendered (Use button path) — unchanged |
| 4 | Add items to cart | text unchanged (expected — points balance doesn't move) |
| 5 | `loyalty-points-below-min-subtext` test id still present | yes |

---

# IMPLEMENTATION PLAN — BUG-2026-10-12-003

**Fast Lane eligible** (LOW, 1 file, 1 line, no API/auth/payment) **if** owner explicitly approves Fast Lane despite hotspot file; otherwise normal flow with QA spot-check.

1. `ReviewOrder.jsx` L2076 — replace
   `` `Add ₹${…} more to redeem` `` → `` `Earn ${…} more points to redeem` `` with marker `// BUG-2026-10-12-003: unit is points, not ₹; verb "Earn" — cart changes don't move it`.
2. Self-test: screenshot Review Order with Saurav (10 pts, min 100) → text reads "Earn 90 more points to redeem".
3. QA: verification matrix above (testing agent, frontend only) → SMOKE_BRIEF → owner smoke.
4. Registry: IMPLEMENTED → QA_PASS.
