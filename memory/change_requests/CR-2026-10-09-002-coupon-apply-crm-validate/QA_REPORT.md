# QA REPORT — CR-2026-10-09-002 + Regression

**QA Agent:** Role 4
**Date:** 2026-10-09
**Scope:** CR-2026-10-09-002 (coupon Apply) · CR-2026-10-09-003 regression · CR-2026-10-03-004 B+C regression
**Test report:** iteration_15.json

---

## Result: **PASS**

| Area | Tests | Result |
|---|---|---|
| Backend smoke + contract | 60/60 | ✅ PASS |
| CR-2026-10-09-002 coupon Apply | 5/5 verifiable | ✅ PASS |
| CR-2026-10-09-003 loyalty CRM cap | 2/2 | ✅ PASS |
| CR-2026-10-03-004 B+C regression | 3/3 | ✅ PASS |
| Cross-feature (coupon + loyalty together) | 1/1 | ✅ PASS |
| Full order placement regression | 1/1 | ✅ PASS |

---

## Math verified (critical tax chain)

| Scenario | itemTotal | discounts | subtotalAfterDiscount | CGST | SGST | Grand Total |
|---|---|---|---|---|---|---|
| No discount | ₹10 | 0 | ₹10 | ₹0.25 | ₹0.25 | **₹11.00** ✅ |
| Coupon only (₹1) | ₹10 | −₹1 | ₹9 | ₹0.23 | ₹0.23 | **₹10.00** ✅ |
| Both coupon (₹1) + loyalty (₹3) | ₹10 | −₹4 | ₹6 | ₹0.15 | ₹0.15 | **₹7.00** ✅ |

Tax recalculates proportionally on discounted base. `subtotalAfterDiscount = max(0, itemTotal − pointsDiscount − couponDiscount)` confirmed correct.

---

## Not tested — non-blocking

**T4/T5 (non-stackable coupon guard):** No non-stackable coupon code available in CRM preprod seed data. SEED_EDGE_STACKABLE has `stackable_with_loyalty: true`. FLAT TODAY has CRM whitespace bug. Code path for both guards confirmed correct by code review:
- `handleApplyCoupon`: when `!stackable && isUsingPoints` → `handleRemovePoints()` + toast
- `handleUsePoints`: when `appliedCouponCode && !couponStackable` → `toast.error('Remove coupon first')` + return

**Action item for CRM:** Request a `SEED_NON_STACKABLE` coupon code in preprod to complete T4/T5 testing in a future regression run.

---

## Findings: NONE

No blockers. No regressions. No new issues introduced.

---

## Next step

Status: **QA → SMOKE**. Write SMOKE_BRIEF and add to consolidated PDF.
