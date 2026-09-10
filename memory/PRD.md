# MyGenie Customer App — Deployment PRD

## Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)
- Destination: `/app` (repo contents pulled directly into `/app`)
- No code edits — deploy and run as-is

## Architecture
- **Frontend**: React (CRA + CRACO) on port 3000, served via nginx proxy
- **Backend**: FastAPI (Python 3.11) on port 8001, managed by supervisor
- **Database**: MongoDB at external host `52.66.232.149:27017` (mygenie DB)
- **External API**: `https://preprod.mygenie.online/api/v1` (MyGenie POS)

## What Was Done (2026-09-07)
1. Cloned repo from GitHub (public, branch: main) into `/tmp/repo-preview`
2. Backed up platform files: `.emergent/`, backend/.env, frontend/.env
3. Synced repo backend/ → /app/backend/ (rsync, excluding .env)
4. Synced repo frontend/ → /app/frontend/ (rsync, excluding node_modules, .env)
5. Wrote provided backend .env (MONGO_URL, DB_NAME, JWT_SECRET, MYGENIE_API_URL, etc.)
6. Wrote provided frontend .env (REACT_APP_API_BASE_URL, REACT_APP_BACKEND_URL, etc.)
7. Ran `pip install -r requirements.txt` and `yarn install --ignore-engines`
8. Restarted both supervisor services — both running green
9. Confirmed: `GET /api/healthz` → `{"ok":true,"mongo":"up"}`
10. Confirmed: Frontend loads at https://customer-app-5th.preview.emergentagent.com

## Environment Variables
### Backend (/app/backend/.env)
- MONGO_URL: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: *
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- JWT_SECRET: set
- MYGENIE_POS_LOGIN_PHONE/PASSWORD: set

### Frontend (/app/frontend/.env)
- REACT_APP_BACKEND_URL: https://customer-app-5th.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: set
- REACT_APP_LOGIN_PHONE/PASSWORD: set

## App Pages
- Landing / Customer Capture (phone + name input)
- Menu / DiningMenu
- ReviewOrder
- OrderSuccess
- Profile, Login, PasswordSetup
- DeliveryAddress, FeedbackPage, ContactPage, AboutUs
- AdminSettings (admin panel)

## Status
- Frontend: RUNNING (compiled with only ESLint warnings — non-blocking)
- Backend: RUNNING (all startup checks passed)
- MongoDB: UP (external host confirmed)

---

## Active Change Requests

| CR ID | Title | Severity | Risk | Status |
|-------|-------|----------|------|--------|
| CR-2026-09-07-001 | Inventory stock-out control — FE three-layer defence | P1 | HIGH | **QA CLOSED ✅ — 2026-09-08** |
| CR-2026-09-08-001 | `MenuItem.jsx` no-image ADD button missing `isChannelAllowed` guard | P3 | MEDIUM | **INTAKE ✅ — awaiting Planning approval** |
| BUG-2026-09-08-001 | `response is not defined` crash on 422 in `handlePlaceOrder` | **P0** | CRITICAL | **IMPLEMENTATION COMPLETE — awaiting QA** |
| BUG-2026-09-10-001 | Logo/image upload broken — replace Emergent object storage with local disk + StaticFiles | P1 | MEDIUM | **INTAKE COMPLETE ✅ — awaiting Planning** |

## Active Investigations (session — not yet filed as separate INV docs)

| Ref | Description | Outcome |
|-----|-------------|---------|
| INV-2026-09-07-001 | Stock-out gap analysis — FE vs BE contracts | COMPLETE — feeds CR-2026-09-07-001 |

---

## Re-Deploy Session (2026-09-08 — this pod)
1. Cloned repo (branch: main) from `/tmp/customer-app` → synced `/app/backend/` and `/app/frontend/`
2. Preserved platform files: `.emergent/`, supervisor configs
3. Copied full `memory/` tree from repo → `/app/memory/`
4. Wrote backend `.env`: MONGO_URL, DB_NAME, CORS_ORIGINS, MYGENIE_API_URL, JWT_SECRET, POS creds
5. Wrote frontend `.env`: REACT_APP_BACKEND_URL (platform URL), REACT_APP_API_BASE_URL, image/maps/CRM keys
6. Ran `yarn install --ignore-engines` and `pip install -r requirements.txt`
7. Restarted both services via supervisorctl — both confirmed RUNNING
8. Verified: `GET /api/healthz` → `{"ok":true,"mongo":"up"}`
9. Verified: Frontend compiles, loads at https://react-app-preview-12.preview.emergentagent.com
