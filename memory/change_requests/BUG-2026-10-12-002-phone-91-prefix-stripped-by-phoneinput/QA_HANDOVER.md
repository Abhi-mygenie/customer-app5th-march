# QA HANDOVER — BUG-2026-10-12-002
## Phone starting with "91" loses two digits on Review Order pre-fill

**From:** Role 3 — Implementation Agent · **Date:** 2026-10-12
**Plan followed:** `IMPLEMENTATION_PLAN.md` (4 edits, 1 file) — no deviations
**Build:** `yarn build` → Compiled with warnings (pre-existing exhaustive-deps only; +21 B)
**Preview:** `REACT_APP_BACKEND_URL` in `frontend/.env` · restaurant `/689` (Kunafa Mahal, preprod) · CRM = preprod

## What changed
`frontend/src/pages/ReviewOrder.jsx`
- new module helper `toE164India(phone)` (after `buildOrderItems`)
- 3 pre-fill sites (sessionStorage L~318, guestCustomer L~346, authenticated `user.phone` L~366) now call it instead of `` `+91${phone.replace(/^\+?91/, '')}` ``
- 4 code markers `BUG-2026-10-12-002`

## Root cause being fixed
Regex stripped the first two digits of a **bare 10-digit** number starting `91` (CRM returns `user.phone` bare) → `+9135133228` → "Please enter a valid phone number". Library (`react-phone-number-input`) was NOT the cause.

## Self-test done (Role 3)
| # | Check | Result |
|---|---|---|
| S1 | Helper table (9 rows incl. `9135133228→+919135133228`, E.164 passthrough, 12-digit `91…`, 8-digit garbage, empty/null) evaluated from the real source | 9/9 PASS |
| S2 | `yarn build` | PASS (warnings pre-existing) |
| S3 | markers = 4, old regex = 0 | PASS |
| S4 | Live, 91-prefixed authenticated number | **NOT RUN** — no 91-prefixed preprod customer available; owner to provide or approve creation |
| S5 | Live regression, normal number | deferred to QA (Q2) |

## ⚠ Trap for QA — stale sessionStorage
Review Order writes `customerPhone` back to `sessionStorage`. A tab that already holds the corrupted `+91 35133228` will keep it after the fix (E.164 passthrough). **Use a fresh tab / clear sessionStorage before each case.**

## Test cases
Test identity: Saurav — phone in `CR-2026-10-11-009-coupon-discovery-list/QA_HANDOVER.md`. 91-prefixed number: owner-provided (or create via landing skip-otp on r689 if owner approved).

| # | Case | Steps | Expected | Test ids |
|---|---|---|---|---|
| Q1 | Auth, 91-number (the bug) | fresh tab → `/689` → phone `91xxxxxxxx` (10 digits, no +91) → Browse Menu → add item → cart → Review Order | phone field shows `+91 91xxx xxxxx` (10 local digits), **no** "Please enter a valid phone number" | `capture-phone-input`, Customer Details phone input |
| Q2 | Auth, normal number | same with Saurav | unchanged, valid | |
| Q3 | Guest path | if landing capture allows optional phone: type 91-number, Browse Menu without lookup | Review Order phone correct | |
| Q4 | Edit-order mode | after a placed order, Edit → Review Order | phone pre-filled from session, correct | |
| Q5 | **Money path** | Q1 → Place Order (dine-in) | POS payload `customerPhone` = `+9191xxxxxxxx`; order placed. If preprod ordering unavailable → **BLOCKED**, not FAIL | `place-order-btn` |
| Q6 | CR-008 two-step with 91-number | anonymous → apply `STO-STANDARD` | skip-otp succeeds, coupon applied (phone sent as 10 digits) | `coupon-input`, `apply-coupon-btn`, `coupon-applied-row` |
| Q7 | Same-tab reload after Q1 | reload Review Order | still correct | |
| Q8 | Legacy session value | devtools: `sessionStorage` customer phone = `919135133228` → reload | `+919135133228` | |
| Q9 | Regression — CR-006 name prefill, CR-009 coupon list render | during Q1/Q2 | unchanged | `coupon-discovery-list` |

## Files NOT changed (verify untouched)
`CustomerDetails.jsx`, `LandingCustomerCapture.jsx`, `LandingPage.jsx`, `AuthContext.jsx`, `crmService.js`, `isPhoneNumberValid`, `stripCountryCode` (dead code), POS payload lines.

## Exit criteria
Q1, Q2, Q7, Q8 PASS mandatory. Q5 PASS or BLOCKED-by-environment. Then → SMOKE_BRIEF.
