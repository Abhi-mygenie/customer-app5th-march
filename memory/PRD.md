# MyGenie Customer App — Deployment Record

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: main
- Deployed: 2026-10-10

## Architecture
- Frontend: React + craco (port 3000) — customer ordering app
- Backend: FastAPI (port 8001) — proxies POS API + local auth/session
- Database: MongoDB external (`mygenie` DB at 52.66.232.149:27017)

## Deployment Steps Done
1. Backed up platform files: `.emergent`, `backend/.env`, `frontend/.env`, `memory/`, `test_reports/`
2. Cleared `/app` (kept `.git`)
3. Cloned repo (`main` branch) to `/tmp/mygenie-repo`
4. Copied all repo contents to `/app` via rsync (excluding `.git`)
5. Created `backend/.env` with provided credentials
6. Created `frontend/.env` with platform URL + all provided vars
7. Fixed CORS: changed `CORS_ORIGINS=*` → explicit origins + `CORS_ORIGIN_REGEX=.*` (server.py rejects wildcard with allow_credentials=True)
8. Ran `yarn install --frozen-lockfile` in `/app/frontend`
9. Ran `pip install -r requirements.txt` in `/app/backend`
10. Restarted supervisor services
11. Verified memory dir fully in sync with remote (zero diff)

## Core Requirements (Static)
- No code edits — deploy and run as-is ✅
- Platform files preserved (.emergent, .git) ✅
- Memory dir in sync with remote ✅
- Env variables set as provided ✅

## What's Running
- Frontend: https://genie-order-app.preview.emergentagent.com
- Backend health: http://localhost:8001/api/healthz → `{"ok":true,"mongo":"up"}`

## Backend .env (key vars)
- MONGO_URL: mongodb://mygenie_admin@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: explicit origins + CORS_ORIGIN_REGEX=.*
- JWT_SECRET: set
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1

## Frontend .env (key vars)
- REACT_APP_BACKEND_URL: https://genie-order-app.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_CRM_API_VERSION: v2
- REACT_APP_GOOGLE_MAPS_API_KEY: set

## Change Management Log
- 2026-10-12 BUG-2026-10-12-006 **QA_PASS**: fixed coupon discovery strip overflowing the screen on mobile (cards bled past both edges + page panned sideways into an empty "gap"). Root cause: coupon wrapper inherited `align-items:center` from `.price-row`, and the strip had no width bound, so it grew to its 1113px content width. Fix (CSS-only): `.cdl-wrap{width:100%}` + `.cdl-strip{min-width:0;max-width:100%}`. Verified on 390px: no page overflow, strip contained & scrolls internally. (iteration_24)
- 2026-10-12 BUG-2026-10-12-005 **QA_PASS**: fixed Apply-coupon-button crash (`onClick={() => handleApplyCoupon()}` — event was being passed as the coupon code). Verified live: manual apply works, V9 error-map "Invalid coupon code" shows, no crash. (iteration_23)
- 2026-10-12 BUG-2026-10-12-003 **QA_PASS**: below-min loyalty wording "Earn 36 more points to redeem" verified live with account 9120004531; old "Add ₹X more" gone. (iteration_23)
- 2026-10-12 QA batch (iteration_22+23): CR-002 Part B, CR-003 Part A, CR-009 (new test-ids), CR-008 skip-OTP — all core cases PASS. Deferred: V8 auto-remove (testability gap, LOW-D). LOW items A–D registered in `_BACKLOG_LOW_2026-10-12.md`. CR-001 branding: accepted dynamic restaurant-name title.
- 2026-10-12 CR-2026-10-12-002 (Part B) IMPLEMENTED+QA_PASS; CR-2026-10-12-003 (Part A) IMPLEMENTED+QA_PASS.
- 2026-10-12 CR-2026-10-12-002 (Part B, B1–B3 + folded CR-2026-10-11-003) **IMPLEMENTED — awaiting QA**: coupon list adopts CRM CR-122 engine path (`order_total` → filtered list + `recommended_code`); validate sends cart `items[]`; silent auto-apply of recommended coupon (loyalty L-A guard → "Best offer" badge); B8 re-validates applied coupon on cart change; discovery strip rebuilt (mystery/disabled/best states, 12-hr time window). Retry place-order now carries `couponDiscount`/`couponTitle`. Supersedes BUG-2026-10-12-001 (BXGY ₹0) and CR-2026-10-11-003. Files: `crmService.js`, `ReviewOrder.jsx`, `CouponDiscoveryList.jsx`+`.css`. Build clean. ⚠ Test-id change: `coupon-list-item-{code}` → `coupon-card-{kind}-{code}`. QA handover in CR-002 folder.
- 2026-10-12 CR-2026-10-12-003 (Part A, E1–E5) **IMPLEMENTED — awaiting QA**: loyalty earn preview adopts CRM CR-123.

## Backlog / Next Steps
- P0: Verify end-to-end login flow (phone → OTP → browse menu → order)
- P1: Confirm external POS API connectivity from backend
- P1: Test Google Maps integration with provided key
- P2: Add health monitoring / uptime check
