# QA HANDOVER — CR-2026-10-09-003

**Written by:** Role 3 — Implementation Agent
**Date:** 2026-10-09
**Status:** Self-test complete, TDZ bug found + fixed by testing agent, retest 100% PASS

---

## Self-test results

| ST | Test | Result |
|---|---|---|
| ST1 | No old G3 client-side cap logic in ReviewOrder.jsx | **0 lines** ✅ |
| ST2–ST5 | All 10 edits confirmed via grep | **All present** ✅ |
| ST6 | Backend smoke + contract | **60/60 pass** ✅ |
| ST7 | `yarn build` | **Clean, 0 errors** ✅ |
| iteration_11 | Testing agent (first run) | **TDZ crash found + fixed** |
| iteration_12 | Testing agent (retest) | **100% PASS** ✅ |

## Bug found and fixed during testing

**ReferenceError: Cannot access 'subtotal' before initialization**

The E5 `useEffect` was originally placed at line ~156 (after the loyalty-rules effect). However, `subtotal = getTotalPrice()` is declared at line 550 — below the hook. JavaScript `const` has a Temporal Dead Zone, so accessing `subtotal` in the effect body and dependency array before its declaration causes a crash on every Review Order page load.

**Fix:** Testing agent moved the useEffect to line 552, immediately after `subtotal` is declared. Plan's apply order specified "after fetchLoyaltyRules effect (~line 153)" but that was stale — `subtotal` is declared further down. The fix is correct and confirmed.

## What changed — files and edits

| Edit | File | Change |
|---|---|---|
| E1 | `crmService.js` | Added `crmGetMaxRedeemable(token, billAmount)` |
| E2 | `ReviewOrder.jsx:41` | Added `crmGetMaxRedeemable` to import |
| E3 | `ReviewOrder.jsx:90` | Added `crmToken` to `useAuth()` destructure |
| E4 | `ReviewOrder.jsx:265–267` | Added `maxRedeemable` + `maxRedeemableLoading` states |
| E5 | `ReviewOrder.jsx:552` | Added max-redeemable effect (debounced, after `subtotal`) |
| E6 | `ReviewOrder.jsx:850–856` | Replaced `handleUsePoints` (27 lines → 4 lines, server-authoritative) |
| E7 | `ReviewOrder.jsx:1852–1945` | Replaced inline loyalty display (4 states: applied/loading/below-min/normal) |
| E8 | `ReviewOrder.jsx:2052` | Added `projectedPointsEarned` prop to LoyaltyRewardsSection |
| E9 | `LoyaltyRewardsSection.jsx:19` | Added `projectedPointsEarned` prop |
| E10 | `LoyaltyRewardsSection.jsx:34` | Use CRM earn value with client-side fallback |

## QA test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | r689, Gold diner, ₹500+ order | loyalty-points-inline-row shows "Use up to 36 pts (₹108 off)" · 2,000 pts available · Use enabled |
| T2 | Tap Use | Applied row: "Using 36 points (−₹108)" · Grand Total drops · Remove visible |
| T3 | Tap Remove | Discount cleared, total restores |
| T4 | ₹10 order | Loyalty row shows redeemable (1pt = ₹3) because CRM returns ok:true for Gold even at low amounts |
| T5 | CRM down (offline) | maxRedeemable=null → Use disabled, no crash |
| T6 | Guest (not authenticated) | max-redeemable NOT called; earn preview uses client-side calculation |
| T7 | Earn preview Gold/₹500 | "You will earn 150 points on this order! Worth ₹450" |
| T8 | `yarn build` | Clean |
| T9 | Backend smoke 60/60 | All pass |

## data-testids added

`loyalty-points-inline-row` · `loyalty-points-label` · `loyalty-points-balance-subtext` · `loyalty-points-use-button` · `loyalty-points-applied-row` · `loyalty-points-applied-label` · `loyalty-points-remove-button` · `loyalty-points-loading-skeleton` · `loyalty-points-disabled-row` · `loyalty-points-disabled-label` · `loyalty-points-below-min-subtext` · `loyalty-points-disabled-button`
