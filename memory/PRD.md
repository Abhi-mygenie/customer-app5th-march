# MyGenie Customer App — PRD

## BUG-2026-11-26-001 — IMPLEMENTED 2026-11-26
- APS price (₹1) display mask applied to CartBar, ReviewOrder (Item Total/Subtotal/Grand Total/button), OrderSuccess (top total/per-item/bill summary)
- 12 edits across 3 files — display-only, zero payload/math change. Build PASS. 12/12 self-test PASS (iteration_36)
- Status: QA — OrderSuccess live smoke (V-14–V-19) pending owner test on restaurant 69

## Deployment: 2026-11-26 (Latest)
- Synced repo `Abhi-mygenie/customer-app5th-march` (main → `23c9886`) into `/app` via `git reset --hard origin/main`
- Platform files preserved: `.emergent/emergent.yml`, `.emergent/cron/`, supervisor configs
- Installed missing pip pkg: `slowapi`; downgraded `typescript` from 7.x → 4.9.5 (react-scripts compat)
- Backend running on :8001 (FastAPI + Motor/MongoDB); Frontend on :3000 (CRA + CRACO)
- Health: `GET /api/healthz` → `{"ok":true,"mongo":"up"}`
- Secrets set: GOOGLE_MAPS_API_KEY, REACT_APP_GOOGLE_MAPS_API_KEY (via secrets panel)
- JWT_SECRET: auto-generated temp secret in backend/.env (replace via secrets panel when needed)
- CORS_ORIGINS: set to preview URL `https://mygenie-guest-1--2wcycild.preview.emergentagent.com`
- Memory dir: fully synced with remote — 623 tracked files match remote exactly

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)
- Destination: `/app`

## Architecture
- **Frontend**: React (CRA + CRACO), port 3000, TypeScript + JS mixed codebase
- **Backend**: FastAPI (Python), port 8001, MongoDB via Motor
- **Database**: MongoDB (local `mygenie` DB)
- **Platform**: Emergent preview pod, supervisord-managed

## What Was Done (2026-11-25)

### Deployment
1. Added git remote `origin` → `https://github.com/Abhi-mygenie/customer-app5th-march.git`
2. Fetched and hard-reset to `origin/main` (commit `f444068`) — synced all tracked files
3. Memory dir now fully synced: **608 files** across subdirs (change_requests, control, inbox, master_outlet, tools, v2)

### Env Setup
- **backend/.env**: DB_NAME=mygenie, CORS_ORIGINS=preview URL, MYGENIE_API_URL, login creds
- **frontend/.env**: REACT_APP_BACKEND_URL (preserved), all REACT_APP_* vars set
- `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`, `REACT_APP_GOOGLE_MAPS_API_KEY` → managed via secrets panel

### Dependency Fixes (no code edits)
- Installed `slowapi` (missing from venv but in requirements.txt)
- Installed `typescript@5.8.3` (repo specifies 7.x but react-scripts 5.x requires ≤5.x)
- Both fixes are purely node_modules/venv level — no source file changes

### Services Status
- Backend: RUNNING — `/api/healthz` → `{ok: true, mongo: up}`
- Frontend: RUNNING — webpack compiled, app rendering correctly
- MongoDB: RUNNING

## Backlog / Next Steps
- P0: Fill in `REACT_APP_GOOGLE_MAPS_API_KEY` live slot when ready for production
- P1: Set `CORS_ORIGINS` to include production domain when deploying live
- P2: Consider pinning `typescript` to `5.x` in package.json for reproducibility
