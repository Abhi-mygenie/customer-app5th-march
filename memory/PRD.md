# PRD — Customer App (MyGenie) — Deployment Prep Session

## Original Problem Statement
Pull the latest code from `https://github.com/Abhi-mygenie/customer-app5th-march.git` (branch `main`), validate frontend/backend build & compile readiness, check required environment variables, run a basic smoke test, report the last remote commit date/time, and produce a deployment handover document for the next deployment agent.

## User-confirmed Choices
- Repo: public; no PAT required
- Branch: `main` only
- MONGO_URL: cleaned (duplicate `MONGO_URL=MONGO_URL=` prefix removed)
- Validation scope: build/compile + basic smoke test
- Deployment target: skipped (defaults assumed)

## Architecture
- Backend: FastAPI 0.110 + Motor (MongoDB), single `server.py` exposing 14 `/api` routes; runs on supervisor unit `backend` at `:8001`.
- Frontend: React 19 + Craco + Tailwind + shadcn/ui; runs on supervisor unit `frontend` at `:3000`; production build via `yarn build`.
- DB: MongoDB 7.0.30 (remote `52.66.232.149:27017`, DB `mygenie`, 23 collections).
- External: MyGenie POS (`preprod.mygenie.online/api/v1`), CRM (`crm.mygenie.online/api`), Image CDN (`manage.mygenie.online`), Google Maps.

## Tasks completed (2026-05-13)
- Cloned latest `main` (HEAD `3d5197c`, commit time 2026-05-13 18:03:56 UTC) and synced into `/app`.
- Wrote `/app/backend/.env` (5 keys; JWT_SECRET freshly generated; MONGO_URL prefix cleaned).
- Wrote `/app/frontend/.env` (10 keys; preserved platform `REACT_APP_BACKEND_URL`).
- Installed backend deps (`pip install -r requirements.txt` — 123 pkgs).
- Installed frontend deps (`yarn install --frozen-lockfile` — done in 71 s).
- Verified Python syntax + module import of `server.py` (`Customer App API` app loads).
- Restarted supervisor; both backend & frontend RUNNING.
- Backend `/api/` returns 200 locally and through ingress.
- Verified MongoDB connectivity (23 collections, MongoDB 7.0.30).
- `yarn build` succeeded — 490 kB gz JS, 37 kB gz CSS.
- Playwright screenshot of ingress URL confirms MyGenie welcome screen renders.
- Updated `/app/DEPLOYMENT_HANDOVER.md` with full deployment-ready report.

## Known Non-Blocking Items (Backlog)
- P2: ~10 `react-hooks/exhaustive-deps` warnings (only breaks `CI=true` builds).
- P2: tiptap / react-day-picker / recharts peer-dep warnings (no runtime impact).
- P1 (hardening before prod cutover): tighten `CORS_ORIGINS`, rotate `JWT_SECRET`, confirm MongoDB IP allow-list, replace dev server with static serve, swap `REACT_APP_BACKEND_URL` to prod URL.

## Next Actions
- Hand off `/app/DEPLOYMENT_HANDOVER.md` to the deployment agent.
- Apply the production-hardening items in Section 8/9 of the handover doc.
