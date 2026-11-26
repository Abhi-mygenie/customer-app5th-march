# QA REPORT — CR-2026-10-11-008
## Anonymous Coupon Validation — Two-Step Flow + Error Code Handling

**ID:** CR-2026-10-11-008
**QA run by:** Role 4 — QA Agent
**Date:** 2026-10-12
**Test runs:** iteration_20.json (initial) · iteration_21.json (retest after bug fix)
**Result: PASS**

---

## Summary

| | Count | TCs |
|---|---|---|
| PASS | 11 | TC-1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| BLOCKED (environment) | 1 | TC-2 |
| PARTIAL (CRM data config) | 1 | TC-13 |
| FAIL | 0 | — |

**Code bugs found: 0**
**Bug fix from iteration_20 verified: YES** (error message priority — TC-3, 5, 7 all PASS on retest)

---

## Test Results

### TC-1 — Authenticated apply (regression)
**Result: PASS**
STO-STANDARD applied with token. 15% discount. Toast "Coupon applied — ₹90 off". Coupon row with Remove shown. Total reduced ₹597 → ₹507.

### TC-2 — CUSTOMER_USAGE_LIMIT_REACHED (STO-ONCE second use)
**Result: BLOCKED — environment constraint**
CRM only records usage on actual order placement, not on validate calls. Preprod restaurant 689 has all items SOLD OUT — ordering unavailable. TC cannot be executed in this environment.
**Action required:** Test manually when preprod ordering is available, or in production smoke test.

### TC-3 — CHANNEL_NOT_VALID error message (retest)
**Result: PASS**
STO-DELIVERY on dine-in (anonymous). Shows "This coupon is not valid for this order type". Bug fix confirmed.

### TC-4 — Anonymous generic coupon apply
**Result: PASS**
STO-GENERIC-10, anonymous user, order ₹597. Toast "Coupon applied — ₹60 off". No login prompt.

### TC-5 — MIN_ORDER_NOT_MET error message (retest)
**Result: PASS**
STO-GENERIC-MIN, order ₹199 < ₹300. Shows "Minimum order value not met for this coupon". Bug fix confirmed.

### TC-6 — MIN_ORDER_NOT_MET cleared when order total meets minimum
**Result: PASS**
STO-GENERIC-MIN, order ₹597 >= ₹300. Toast "Coupon applied — ₹50 off".

### TC-7 — CHANNEL_NOT_VALID anonymous (retest)
**Result: PASS**
Same fix as TC-3. Shows correct errorMap message.

### TC-8 — Two-step silent flow (CUSTOMER_REQUIRED → skip-otp → re-validate)
**Result: PASS**
STO-STANDARD, no token. App silently calls skip-otp for 9035133228. `crm_token_689` set in localStorage. Re-validation succeeds. Toast "Coupon applied — ₹90 off". User never asked to log in manually.

### TC-9 — INVALID_CODE
**Result: PASS**
Code "FAKEABCD" → "Invalid coupon code".

### TC-10 — Apply button active for anonymous user
**Result: PASS**
Button is active (not greyed/disabled) when anonymous user has typed a code.

### TC-11 — Apply button disabled when code is empty
**Result: PASS**
Button greyed/disabled with empty input.

### TC-12 — Remove coupon
**Result: PASS**
Remove clears row, grand total resets to original ₹627.

### TC-13 — Loyalty + coupon stacking
**Result: PARTIAL — CRM data config issue, not a code bug**
STO-GENERIC-10 applied (₹60 off). Loyalty "Use" button shows toast "Remove coupon first to use points".
Root cause: STO-GENERIC-10 coupon on CRM preprod is configured with `stackable_with_loyalty=false`. Spec says it should be `true`. App code is correct — it reads `stackable_with_loyalty` from the CRM response and guards accordingly.
**Action required:** CRM team to update STO-GENERIC-10 coupon config on preprod: set `stackable_with_loyalty=true`.

---

## Bug Fix Verification (from iteration_20)

| Bug | Fix applied | Verified |
|---|---|---|
| `detail` overriding `errorMap` — ReviewOrder.jsx lines 936, 943 | `errorMap[code] \|\| detail` | ✅ TC-3, 5, 7 all PASS |

---

## Findings Classification

| Severity | Count | Items |
|---|---|---|
| BLOCKER | 0 | — |
| MAJOR | 0 | — |
| MINOR | 0 | — |
| NOTE | 2 | TC-2 env blocked · TC-13 CRM coupon config |

---

## Actions for Owner / CRM team

| # | Action | Owner |
|---|---|---|
| 1 | Update STO-GENERIC-10 on CRM preprod: set `stackable_with_loyalty=true` | CRM team |
| 2 | After fix, retest TC-13 second half (STO-STANDARD non-stackable auto-removes loyalty) | QA |
| 3 | TC-2 (STO-ONCE usage limit) — test when preprod ordering is available or in prod smoke | Owner |

---

## Registry

```
QA status: PASS
Blockers: 0 code blockers
Deferred: TC-2 (env), TC-13 (CRM data config — not code)
Coverage: 11/13 fully executed; 2 environment-constrained
Next: SMOKE — owner acceptance testing
```
