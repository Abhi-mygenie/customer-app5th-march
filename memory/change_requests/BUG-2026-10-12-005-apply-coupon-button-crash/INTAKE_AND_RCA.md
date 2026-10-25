# BUG-2026-10-12-005 — "Apply" coupon button crashes (manual code entry broken)

**Registered:** 2026-10-12 · **Found by:** QA (Role 4), iteration_22.json
**Severity:** HIGH · **Status:** QA_PASS (iteration_23) 2026-10-12 — fixed & verified live
**Area:** `frontend/src/pages/ReviewOrder.jsx` → `handleApplyCoupon` + apply button wiring

## Symptom
Typing any coupon code into the manual input and clicking **Apply** throws
`TypeError: (overrideCode || couponCode).trim is not a function`. React's dev overlay
then intercepts pointer events and blocks the rest of the screen. Only tap-to-apply from
the discovery list works. Blocks QA case **V9** (error-map priority) end-to-end and all
manual coupon entry.

## Root cause (confirmed)
- `handleApplyCoupon = async (overrideCode = null) => { const codeToUse = (overrideCode || couponCode).trim(); ... }` (L970–971)
- Apply button is wired `onClick={handleApplyCoupon}` (L2106) → React passes the **SyntheticEvent**
  as the first positional arg, so `overrideCode` = event (truthy, non-string) → `.trim()` throws.
- String callers are fine: auto-apply effect and card tap (`handleApplyCoupon(code)`) pass a plain string.

## Provenance
Introduced by **CR-2026-10-11-009** (commit `14c6521`): that CR added the `overrideCode` param
for tap-to-apply but left the button as `onClick={handleApplyCoupon}`. Before CR-009 the function
took no args, so the forwarded event was harmless. CR-009 was built/self-tested only, never QA'd —
this is the first QA to exercise the manual Apply button on the new signature.

## Proposed fix (minimal, 1 line — lowest risk)
`onClick={handleApplyCoupon}` → `onClick={() => handleApplyCoupon()}`  (L2106)

Optional hardening (defensive, protects all future callers):
`const codeToUse = (typeof overrideCode === 'string' ? overrideCode : couponCode || '').trim();` (L971)

## Scope
Single file, 1 (optionally 2) line(s). No API/payload/auth/storage change.

## Retest after fix
- V9 error-map priority (invalid/expired code → friendly message, not raw CRM detail)
- V8 cart re-validate removes invalid coupon (reduce qty below min → auto-remove + toast)
- Regression: manual Apply of a valid code applies discount; tap-to-apply still works.
