# BUG FIX REPORT — BUG-2026-10-12-005 (Apply-coupon button crash)

**From:** Role 5 — Bug Fix Agent · **Date:** 2026-10-12
**Status:** FIXED (code) — awaiting retest QA
**Risk:** LOW · 1-line event-handler wiring change · no API/payload/auth/storage change

## Root cause (confirmed)
`handleApplyCoupon(overrideCode = null)` cleans input via `(overrideCode || couponCode).trim()`.
The Apply button was wired `onClick={handleApplyCoupon}`, so React passed the SyntheticEvent as
`overrideCode` (truthy, non-string) → `.trim()` threw `TypeError`, and the dev overlay blocked the UI.
String callers (auto-apply effect, card tap) were unaffected. Introduced by CR-2026-10-11-009.

## Fix
`frontend/src/pages/ReviewOrder.jsx` L2106:
- `onClick={handleApplyCoupon}` → `onClick={() => handleApplyCoupon()}`
Now the button invokes the function with no arg; `overrideCode` defaults to `null`, so `codeToUse`
falls back to the typed `couponCode`. Minimal, matches the tap-to-apply path.

## Self-test
- `grep` confirms the wrapped handler present; no bare `onClick={handleApplyCoupon}` remains (0).
- `yarn build` → BUILD_EXIT=0, clean.
- Live retest handed to QA (testing agent).

## Retest scope
- Manual Apply of a valid code applies discount (no crash).
- V9 error-map priority (invalid/expired → friendly message, not raw CRM detail).
- V8 cart re-validate removes invalid coupon (reduce below min → auto-remove + toast).
- Regression: tap-to-apply from the discovery list still works.
