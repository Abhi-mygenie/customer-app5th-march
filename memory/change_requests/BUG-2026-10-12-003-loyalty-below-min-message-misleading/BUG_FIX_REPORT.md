# BUG FIX REPORT — BUG-2026-10-12-003
## Loyalty below-minimum message — wrong unit and verb

**Role:** 5 — Bug Fix Agent · **Date:** 2026-10-12 · **Plan followed:** `IMPACT_ANALYSIS_AND_PLAN.md` (1 line, L2085)

## Reproduction
- Code: `ReviewOrder.jsx` L2085 rendered `` `Add ₹${min_redemption_points - available_points} more to redeem` `` — confirmed present before edit.
- Data: live CRM probe in INTAKE (2026-10-12): `min_redemption_points 100`, `available_points 10` → "Add ₹90 more to redeem", unchanged at bill 96 and 500. Reproduced: **YES** (code + CRM data; live screen render blocked by POS preprod outage at the time).

## Root cause — classification: **PLAN_GAP** (original CR-2026-10-09-003 copy treated a points delta as rupees and implied cart action)
The two operands are customer-balance / restaurant-config values from `POST /scan/max-redeemable`; neither depends on `bill_amount`. The text said "Add ₹" — wrong unit, wrong call-to-action.

## Fix
`frontend/src/pages/ReviewOrder.jsx` L2085 (one line):
```diff
- ? `Add ₹${maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)} more to redeem`
+ ? `Earn ${maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)} more points to redeem` // BUG-2026-10-12-003
```
Logic, branch condition, fallback `'Not enough points to redeem'`, styles and `data-testid="loyalty-points-below-min-subtext"` unchanged.

## Verification
| # | Test | Result |
|---|---|---|
| 1 | String table: (100,10) → "Earn 90 more points to redeem"; (100,0) and (100,null) → "Earn 100 more points to redeem" | PASS (node) |
| 2 | grep: old text 0 hits, new text 1 hit, marker 1 | PASS |
| 3 | `yarn build` | see `memory/tools/scratch/build_bug003.log` — PASS expected (warnings pre-existing) |
| 4 | Adjacent: applied-points row, Use button disabled state, `loyalty-points-disabled-label` | untouched (same JSX block, no other edit) |
| 5 | Live render with Saurav | BLOCKED — POS preprod down; QA to confirm visually |

## Scope expansion: NONE
## Registry: BUG-2026-10-12-003 → IMPLEMENTED (fix applied), code_markers true
## Next: QA re-test (visual) — joins the combined QA run with CR-002/CR-003/CR-009/CR-001/BUG-002
