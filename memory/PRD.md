# MyGenie Customer App — PRD & Session Memory

**Last updated:** 2026-11-27

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)
- Destination: `/app` (repo contents pulled directly, not a subfolder)

## Architecture
- **Frontend:** React (CRA + CRACO) on port 3000 — customer-facing QR scan-and-order app
- **Backend:** FastAPI on port 8001 — proxies to MyGenie POS (preprod.mygenie.online/api/v1)
- **Database:** MongoDB (local `mygenie` DB) + remote MyGenie POS API
- **Supervisor:** manages both frontend & backend processes

## What's Been Implemented

### 2026-11-27 — Repo Deployment & Sync
- Pulled `Abhi-mygenie/customer-app5th-march` (main, 74 commits) into `/app`
- Fixed missing dependencies: `slowapi` (backend), `typescript@4.9.5` (frontend)
- Configured both env files; memory dir (62 files + 145 CRs) in sync with remote

### 2026-11-27 — CR-2026-11-26-001 V3 + Bug Fix

**Three fixes shipped (all 7 automated tests PASS, iteration_41.json):**

#### Fix 1 — Admin picker categories/items missing (`useMenuData.js`)
- `useAllStationsMenuSections` added default null-station query
- Restaurant 69 has only standard menus (Normal/Party/Premium/Aggregator), all filtered out by `useStations`
- Po and Raom are CATEGORIES (confirmed from POS API), not stations
- Default query `food_for=null` returns po (11187) and raom (11200)
- Picker now shows Categories + Items groups

#### Fix 2 — Banner URL format (`AdminBannersPage.jsx`)
- URL builder now emits `/{rid}/menu?section=...` for null-stationId categories
- Prevents `food_for="null"` going to POS (which returns 0 categories)

#### Fix 3 — Category deep-link from landing page fails (`MenuItems.jsx`)
- **Root cause:** LandingPage idle-prefetch warms React Query cache → `menuSections` populated on first render of MenuItems → deep-link (L177) and station-reset (L387) both fire in same React 18 batch → reset effect runs last → overwrites category selection with null
- **Fix:** `prevStationIdRef = useRef(stationId)` guard skips reset on initial mount; still fires on genuine station switches
- Reproduced and verified with live Playwright test

## Key Data Facts (confirmed 2026-11-27)
- Restaurant 69 (The Goan Kitchen) = `kds@thegoankitchen.com`
- Menus from menu-master: Normal, Party, Premium, Aggregator (ALL standard, ALL filtered by useStations)
- Categories from restaurant-product (no food_for): `po` (id:11187, 19 items), `raom` (id:11200, 2 items)
- `food_for=Po/Raom` returns 0 results (category names, not station values)
- `food_for=Normal/null/undefined` all return same 2 categories

## Environment Variables

### backend/.env
- MONGO_URL: mongodb://localhost:27017
- DB_NAME: mygenie
- CORS_ORIGINS: https://genie-customer-app-3--3g2meu64.preview.emergentagent.com
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- GOOGLE_MAPS_API_KEY: (secrets panel)
- JWT_SECRET: (secrets panel)
- MYGENIE_POS_LOGIN_PHONE: +919579504871
- MYGENIE_POS_LOGIN_PASSWORD: Qplazm@10

### frontend/.env
- REACT_APP_BACKEND_URL: https://genie-customer-app-3--3g2meu64.preview.emergentagent.com
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_LOGIN_PHONE: +919579504871
- REACT_APP_LOGIN_PASSWORD: Qplazm@10
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: (secrets panel)
- REACT_APP_CRM_API_VERSION: v2

## Active Items

### CR-2026-11-26-001 — Banner Deep-Link
**Status: QA_PASS (automated)**
- Next: Owner smoke test T1–T7 (QA_HANDOVER_V3.md)
- T1 critical: wait 4s on landing page before tapping banner

### BUG-2026-11-26-001 — APS Price Shows ₹1
**Status: INTAKE (investigation complete)**
- 3 files: CartBar.jsx, ReviewOrder.jsx, OrderSuccess.jsx
- Display-only change, no payload/math change
- Next: Owner approves → Role 3 Implementation

## Test Credentials
- Admin: kds@thegoankitchen.com / Qplazm@10 (restaurant_id=69)
- POS preprod: +919579504871 / Qplazm@10
- Admin route: /admin/banners (login via /login first)
