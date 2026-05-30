# PRD — Customer App (MyGenie)

## Original Problem
1. Pull and build project from https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use main branch
3. Connect to db `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie`
4. Wipe local /app and pull directly from repo
5. Make a handover document for next deployment agent

## Architecture
- FastAPI (single-file `server.py`) + Motor → remote MongoDB (`mygenie` DB on 52.66.232.149)
- React 19 + CRA/craco frontend → backend `/api/*` via Kubernetes ingress
- External APIs: MyGenie POS, MyGenie CRM, Image CDN, Google Maps
- Supervisor manages backend (8001), frontend (3000), mongod (unused)

## What's Been Done

### 2026-05-30 — Deployment refresh
- Wiped `/app` entirely (incl. .git, .emergent — per user)
- Cloned `customer-app5th-march` `main` (HEAD `2deb245`) into `/app`
- Created `/app/backend/.env` (5 vars) and `/app/frontend/.env` (11 vars)
- Installed deps; all services RUNNING; backend & frontend external ingress 200 OK; remote MongoDB reachable (20 collections, 3,861 customers, 32,573 orders)
- Wrote `/app/HANDOVER.md`

### 2026-05-30 — CR-2026-05-30-001 registered
- Three items: (1) config-driven OTP skip, (2) table scan creates "new table" prod-only, (3) room scan lands as walk-in
- Restaurant 716 carve-out: applies to Items 2/3 only — Item 1 honours the flag everywhere

### 2026-05-30 — Items 2 & 3: investigation only (no edits)
- `INVESTIGATION_AND_GAPS.md` — first-pass gaps for all 3 items
- `ITEM2_DEEP_DIVE.md` — production-only "new table" root cause analysis. 8 triggers ranked; the chilling property: once `finalTableId='0'`, every existing defensive guard is skipped (all are gated on `!= '0'`). Awaiting one failing `order_id` + restaurant_id to disambiguate client-side (T1-T7) from POS-side (T8)
- Status: NOT implemented. Same blocker as the May-8/May-9 work — need one real production datapoint

### 2026-05-30 — CR Item 1: IMPLEMENTED + tested (Plan C — new `skipOtp*` flag namespace)
- Integration playbook consulted, summarised in `HANDOVER.md` §10
- **Discovered late-stage that existing DB has explicit `otpRequired*=false` for all 3 restaurants** → reusing the dead flags would silently flip behaviour on Day 1. Reverted Plan A. Switched to **Plan C — new `skipOtp*` flag names**
- New files: `frontend/src/utils/otpPolicy.js` (`pickOtpFlag` + `shouldShowOtpPage`), `frontend/src/api/services/crmSkipOtpRetry.js` (retry wrapper)
- Edits: `crmService.js` (additive `error.retryAfterMs`), `RestaurantConfigContext.jsx` (6 new defaults + serializer entries), `VisibilityTab.jsx` (6 new admin toggle rows + section heading), `LandingPage.jsx` (imports, `setCrmAuth` destructure, 6 flag destructure, new `silentSkipOtpAndNavigate` helper, gate around the two `navigate('/password-setup')` calls)
- Backend: zero changes. The new `skipOtp*` fields flow through the existing `customer_app_config` find_one projection
- Tested via Playwright runtime mocking with restaurant 698 (Cafe Flora) — Scenarios 1, 2, 9, 13, 14 all PASS

### Item 1 — current behaviour
- All 3 existing restaurants and any new restaurant: `skipOtp*` fields absent in DB → `shouldShowOtpPage` returns true → `/password-setup` shown → identical to pre-CR behaviour ✅
- Admin can opt-in per order type via the new "Skip OTP for X Orders" toggles in `Visibility → Auth & OTP`
- When opted in for the matching mode: customer enters phone → silent `crmSkipOtp` call (with retry on 429/5xx) → on success, CRM token attached + `localStorage.guestCustomer` set → straight to menu (or `/delivery-address` for delivery, `/stations` for multi-menu)
- On 409 from CRM (phone locked to OTP): fall through to `/password-setup` (the only allowed fall-through, per Q1=b)
- On 4xx user errors (400/401/403/404/422): toast + stay on landing
- On 5xx / 429 / network: 3 attempts with exp. backoff + jitter, `Retry-After` honoured. If exhausted → degraded guest mode (proceed to menu without CRM token, toast "Continuing as guest")
- Path UNCHANGED: existing "Skip for now" button on `/password-setup` still calls bare `crmSkipOtp` (no retry wrapper) — risk isolation
- Restaurant 716: included in Item 1 (honours the flag like any other restaurant)
- Items 2/3 carve-outs in OrderSuccess.jsx/ReviewOrder.jsx UNTOUCHED — no regression risk

## Backlog / Next Actions
- **P0** — Item 2 (table → WC fallback prod-only): awaiting one failing `order_id` + restaurant_id + order-details response to choose fix path (G2/G3/G4/G5)
- **P0** — Item 3 (room → walk-in): same blocker as Item 2
- **P1** — Item 1 legacy cleanup: the dead `otpRequired*` toggles are still rendered in admin UI under the original section title. Consider a follow-up sub-CR to either delete them or annotate them as "(deprecated — use Skip OTP toggles below)"
- **P1** — Provide real `REACT_APP_GOOGLE_MAPS_API_KEY` (maps currently broken — pre-existing, unrelated)
- **P2** — Rotate `JWT_SECRET` + restrict `CORS_ORIGINS` for production
- **P2** — Move `REACT_APP_LOGIN_PASSWORD` server-side before production deploy
