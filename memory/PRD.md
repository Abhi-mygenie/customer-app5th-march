# MyGenie Customer App — PRD & Session Memory

**Last updated:** 2026-11-27

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)
- Destination: `/app` (repo contents pulled directly, not a subfolder)

## Architecture
- **Frontend:** React (CRA + CRACO) on port 3000 — customer-facing QR scan-and-order app
- **Backend:** FastAPI on port 8001 — proxies to MyGenie POS (preprod.mygenie.online/api/v1)
- **Database:** MongoDB (local `mygenie` DB) + remote MyGenie API
- **Supervisor:** manages both frontend & backend processes

## What's Been Implemented

### 2026-11-27 — Repo Deployment & Sync
- Pulled `Abhi-mygenie/customer-app5th-march` (main branch, 74 commits) into `/app` via `git reset --hard origin/main`
- Preserved platform files: `.emergent/cron/`, `.emergent/markers/`, `emergent.yml`
- Installed missing dependencies: `slowapi` (backend), `typescript@4.9.5` (frontend, downgraded from 7.0.2 for react-scripts 5.0.1 compatibility)
- Configured `backend/.env`: DB_NAME=mygenie, CORS_ORIGINS=preview URL, all MyGenie API credentials
- Configured `frontend/.env`: REACT_APP_BACKEND_URL, all REACT_APP_* env vars
- Both services running: backend healthz `{"ok":true,"mongo":"up"}`, frontend renders login/browse page
- Memory dir: 62 root files + 145 change_request directories — fully in sync with remote

## Environment Variables

### backend/.env
- MONGO_URL: mongodb://localhost:27017
- DB_NAME: mygenie
- CORS_ORIGINS: https://genie-customer-app-3--3g2meu64.preview.emergentagent.com
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- GOOGLE_MAPS_API_KEY: (needs to be set via secrets panel)
- JWT_SECRET: (needs to be set via secrets panel)
- MYGENIE_POS_LOGIN_PHONE: +919579504871
- MYGENIE_POS_LOGIN_PASSWORD: Qplazm@10

### frontend/.env
- REACT_APP_BACKEND_URL: https://genie-customer-app-3--3g2meu64.preview.emergentagent.com
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_LOGIN_PHONE: +919579504871
- REACT_APP_LOGIN_PASSWORD: Qplazm@10
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: (needs to be set via secrets panel)
- REACT_APP_CRM_API_VERSION: v2

## Active Change Requests (from memory/change_requests/)
- **BUG-2026-11-26-001**: APS price shows ₹1 in CartBar, ReviewOrder, OrderSuccess — INVESTIGATION COMPLETE, awaiting implementation approval
- **CR-2026-11-26-001**: Banner redirect to specific category/item — PLANNING V2 COMPLETE, awaiting owner answers to 5 open questions

## Backlog / P0 Items
- Set real JWT_SECRET and GOOGLE_MAPS_API_KEY via secrets panel
- BUG-2026-11-26-001: Fix APS price display (3 files, display-only change)
- CR-2026-11-26-001 V2: Banner deep-link to category/item
