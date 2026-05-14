# PRD — Customer App (MyGenie) — Deployment Readiness Handover

## Original problem statement
Pull the latest code, validate frontend/backend build and compile readiness, check required environment variables, and create a deployment handover document for the next deployment agent.

- Repo: https://github.com/Abhi-mygenie/customer-app5th-march.git
- Branch: main (user confirmed)
- Workspace: replace /app with repo contents (user confirmed)
- Scope: validate + deploy to Emergent preview (user confirmed)
- MongoDB: provided full URI by user

## Architecture
- Backend: FastAPI 0.110 (single file /app/backend/server.py, ~1,613 lines) + Motor + remote MongoDB 7.0.30
- Frontend: React 19 + CRA 5 via Craco + TailwindCSS + shadcn/ui + react-router-dom v7
- Bulk of customer flows go directly from frontend to MyGenie POS API (`preprod.mygenie.online`) and CRM (`crm.mygenie.online`); FastAPI handles app config, auth, loyalty/customer lookup, file uploads, dietary tags, docs.

## What was done (2026-05-14)
- Erased `/app` (preserving `.git` and `.emergent`), rsynced from `origin/main` @ commit `3d5197c` (2026-05-13 18:03 UTC).
- Created `/app/backend/.env` (5 keys) and `/app/frontend/.env` (10 keys) from user-supplied values. Generated 64-char hex `JWT_SECRET`.
- Installed backend deps (`pip install -r requirements.txt`, 123 packages).
- Installed frontend deps (`yarn install --frozen-lockfile`, 69s).
- Validated backend: syntax OK, `import server` OK, supervisor `RUNNING`, `/api/` returns 200 locally and via external ingress.
- Validated MongoDB: connected to `52.66.232.149:27017`, MongoDB 7.0.30, 23 collections in `mygenie` DB.
- Validated frontend: dev server compiles and serves (200 local + external), production `yarn build` succeeds (490.8 kB JS + 36.91 kB CSS gzip).
- Ran deployment-readiness agent twice:
  - 1st pass: FAIL — `.gitignore` had 9 duplicate blocks ignoring `.env` files (blocker for Emergent deploy).
  - Fix: collapsed the 9 duplicate blocks, removed `.env`, `.env.*`, `*.env` entries.
  - 2nd pass: **PASS** — no blockers.
- Wrote comprehensive handover at `/app/DEPLOYMENT_HANDOVER.md`.

## Key requirements (static)
- Required backend env: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `MYGENIE_API_URL`, `CORS_ORIGINS`.
- Required frontend env: `REACT_APP_BACKEND_URL`, `REACT_APP_IMAGE_BASE_URL`, `REACT_APP_API_BASE_URL`, `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`, `REACT_APP_CRM_URL`, `REACT_APP_CRM_API_VERSION`, `REACT_APP_GOOGLE_MAPS_API_KEY`, `WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`.
- Optional but referenced by code: `REACT_APP_CRM_API_KEY` (JSON map of restaurantId → apiKey), `REACT_APP_RESTAURANT_ID`.

## Implemented (with dates)
- 2026-05-14 — fresh pull, env wiring, dep install, full readiness validation, deployment-agent PASS, handover doc.

## Backlog / Action Items for next deployment agent
- P0 — Replace truncated `REACT_APP_GOOGLE_MAPS_API_KEY=AIz...mj4` with the full key before Maps features go live.
- P1 — Decide whether `REACT_APP_CRM_API_KEY` (JSON map) and `REACT_APP_RESTAURANT_ID` should be set for the target environment.
- P1 — Tighten `CORS_ORIGINS` from `*` to explicit production origin(s).
- P1 — Rotate generated `JWT_SECRET` and store it in the platform secret manager.
- P1 — Confirm MongoDB `52.66.232.149:27017` IP allow-list covers the deployment cluster egress IP.
- P2 — Fix 10 `react-hooks/exhaustive-deps` warnings in 8 page files (only needed if pipeline uses `CI=true`).
- P2 — Move `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD` server-side, since `REACT_APP_*` variables are shipped to the browser.

## Live state
- Branch: `main` @ `3d5197c`
- Backend RUNNING on `0.0.0.0:8001`
- Frontend RUNNING on `0.0.0.0:3000`
- External preview: https://52f26ce3-b2cb-44e8-aeb2-60863bc96b52.preview.emergentagent.com (both `/` and `/api/` return 200)
- MongoDB connected (23 collections in `mygenie` DB)
- Deployment-agent verdict: **PASS**
