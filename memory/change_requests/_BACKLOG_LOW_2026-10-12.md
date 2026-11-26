# LOW-priority backlog — registered 2026-10-12 (from QA iteration_22/23)

Not being worked on. Registered per owner instruction for later triage.

## LOW-2026-10-12-A — CRM `/scan/auth/lookup` 429 fragility
During a normal landing→menu→review flow the CRM customer lookup sometimes returns
HTTP 429 "Too many lookups". When it does, the app silently treats the diner as anonymous:
the loyalty section flips to "Points redemption unavailable" and the L-A auto-apply guard is
bypassed (recommended coupon may auto-apply even when the diner could redeem points).
- Impact: intermittent wrong loyalty/coupon behaviour; not a crash.
- Suspected: `crmLookupCustomer` fires on multiple lifecycle paths without debounce/dedupe.
- Owner asked to be walked through before any investigation starts. **DO NOT start without approval.**

## LOW-2026-10-12-B — success/removal toasts not detectable via DOM selectors
Toasts are visually present (e.g. "Coupon applied — ₹5 off" seen in a screenshot) but the QA
harness couldn't find them via `[class*=toast]`, `[role=status]`, `[role=alert]`,
`[data-sonner-toast]`. Either non-standard markup or very short duration. Needs a check that the
"Coupon removed — …" (B8) toast actually renders.

## LOW-2026-10-12-C — anonymous diners don't see the coupon strip
A diner who hasn't entered a phone doesn't see the discovery list at all. Product question:
should guests be able to browse/apply coupons before identifying themselves?

## LOW-2026-10-12-D — V8 (cart re-validate auto-remove) testability gap
B8 auto-remove couldn't be force-triggered live because the available r689 coupons don't have a
min-order threshold positioned just below a typical test cart. Needs either a seeded coupon
(Min ~₹50–150) or a documented coupon→cart mapping so QA can deterministically drop below min.
Mechanism (B8 useEffect) is in code and builds clean; live confirmation deferred.
