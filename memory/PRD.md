# PRD — Customer App Deployment Validation Run

**Date:** 2026-05-08
**Owner:** E1 Agent (validation only, no deploy)
**Repo:** https://github.com/Abhi-mygenie/customer-app5th-march.git @ branch `main`

## Original Problem Statement
Pull the latest code, validate frontend/backend build and compile readiness, check required environment variables, and create a deployment handover document for the next deployment agent. Before deploying tell last remote date and time.

## Scope of THIS Run (per user choice)
"Just deploy run and compile" — i.e. install deps, start services, verify they compile and respond. No production deploy, no testing-agent run.

## What Was Done (2026-05-08)
- Pulled `main` @ `b89587dc933776542e659b8fdb4d6a9d18106a63` (commit dated **2026-05-07 10:16:21 UTC**) into `/app`, replacing scaffold while preserving `.git` and `.emergent`.
- Wrote `/app/backend/.env` (5 keys) and `/app/frontend/.env` (9 keys) per user-supplied values; de-duplicated `MONGO_URL=MONGO_URL=` typo.
- Installed backend deps (`pip install -r requirements.txt` — 124 packages, OK).
- Installed frontend deps (`yarn install` — OK with peer-dep warnings only).
- Restarted supervisor; backend RUNNING (pid 587), frontend RUNNING.
- Smoke-tested:
  - `GET /api/` → 200 `{"message":"Customer App API"}`
  - `GET :3000/` → 200 (7.4 KB SPA shell)
  - MongoDB connection to `52.66.232.149:27017/mygenie` → OK, 23 collections, server v7.0.30
  - Webpack: "compiled with 1 warning, No issues found"
- Authored `/app/DEPLOYMENT_VALIDATION_HANDOVER.md` with full audit, env gap analysis, and checklist for next agent.

## Key Findings
- Backend is fail-fast on `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `MYGENIE_API_URL`. All set ✅
- `JWT_SECRET` is a placeholder — must be rotated for prod.
- **Frontend env gaps (BLOCKERS for prod):**
  - `REACT_APP_BACKEND_URL` not supplied — 14 source files need it (Auth, Login, AdminSettings, AdminQR, RestaurantConfig, useMenuData, ReviewOrder, FeedbackPage, dietaryTags, …).
  - `REACT_APP_CRM_API_KEY` not supplied — required by `crmService.js` (no fallback).
  - `REACT_APP_RESTAURANT_ID` optional, has fallback.
- Architecture: app uses **two backends** — preprod MyGenie POS API (`REACT_APP_API_BASE_URL`) AND a local FastAPI in `/app/backend` (`REACT_APP_BACKEND_URL`). Both must be deployed.

## P0 / Backlog for Next Deployment Agent
- [P0] Resolve missing `REACT_APP_BACKEND_URL`, `REACT_APP_CRM_API_KEY` before deploy.
- [P0] Run `yarn build` for production bundle and verify exit code 0.
- [P0] Rotate `JWT_SECRET` to a 64-char secure random.
- [P1] Tighten `CORS_ORIGINS` from `*` to deployed frontend origin.
- [P1] Plan persistent storage for `/app/backend/uploads/` (volume or S3).
- [P2] Clean up `react-hooks/exhaustive-deps` warnings (non-blocking).
- [P2] Reconcile TipTap version mismatch (`3.20.0` vs runtime `3.22.5`).

## Files of Interest
- `/app/DEPLOYMENT_VALIDATION_HANDOVER.md` — full handover (this run)
- `/app/DEPLOYMENT_HANDOVER.md` — previous handover (kept intact)
- `/app/backend/server.py` — 1614 lines, 47 routes
- `/app/backend/.env`, `/app/frontend/.env` — env files written this run
