# PRD — Customer App Deployment Validation Handover

**Original problem statement:** Pull latest code from `Abhi-mygenie/customer-app5th-march`, branch `7-may` (user-corrected from `6-may`). Validate frontend/backend build + compile readiness. Check required env vars. Produce a deployment handover doc for the next deployment agent.

## Scope
- Clone branch `7-may` (confirmed exists on remote; HEAD `9ab9781`).
- Install backend + frontend deps.
- Validate backend imports, routes, compile (ruff), runtime boot.
- Validate frontend dev server, production build (`CI=false` and `CI=true`).
- Verify MongoDB connectivity and upstream API reachability.
- Document all required env vars (backend + frontend).
- Emit `/app/DEPLOYMENT_HANDOVER.md` for the deployment agent.

## What's been implemented / completed — 2026-05-06
- Repo cloned from branch `7-may` (commit `9ab9781`); branch existence confirmed before pull.
- `/app/backend` and `/app/frontend` synced from repo (cloned via temp dir + rsync, preserving platform `.git`).
- `/app/backend/.env` and `/app/frontend/.env` populated with user-supplied values + missing `REACT_APP_BACKEND_URL` (platform preview URL).
- Backend: `pip install` OK (124 pkgs), 47 routes load, `py_compile` OK, ruff = 3 F401 warnings, uvicorn boot OK, all `/api/*` smoke endpoints return 200 (local + preview).
- Frontend: `yarn install` OK (peer-dep warnings only), `yarn install --frozen-lockfile` OK after lockfile generated, dev server 200, prod `CI=false yarn build` OK (485.89 kB gzip JS, 48 MB build/), prod `CI=true yarn build` FAILS (15+ react-hooks/exhaustive-deps warnings — known blocker for CI pipelines).
- MongoDB ping OK; 23 collections in `mygenie` DB; TCP `52.66.232.149:27017` reachable.
- Upstream APIs reachable: `preprod.mygenie.online` (404 on root, expected), `manage.mygenie.online` (200), `crm.mygenie.online` (301 redirect).
- `/app/DEPLOYMENT_HANDOVER.md` written with full deployment recipe, env var inventory, 13 action items, validation transcript, and `7-may` vs `6-may` delta.

## Delta `6-may` → `7-may` (functional)
- Single CR: **D-5 DELIVERY_CHARGE_GATING** — `frontend/src/pages/ReviewOrder.jsx` (+18/-4) and `frontend/src/api/services/orderService.ts` (+2/-2). Wires gated `effectiveDeliveryCharge` into all order-write paths and adds `row-delivery-cgst` / `row-delivery-sgst` UI rows. No backend / API contract changes.
- Repo cleanup: `backend_test.py`, ~30 internal `memory/*.md` docs, and old `test_reports/iteration_*.json` files removed.

## Findings summary (for PM / deployment agent)
- **Blocker for CI builds**: `CI=true yarn build` fails — 15+ `react-hooks/exhaustive-deps` warnings treated as errors. Fix = set `CI=false` (or `DISABLE_ESLINT_PLUGIN=true`) in build pipeline.
- **Must-change-before-prod**: `JWT_SECRET`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`.
- **Operational gap**: no committed `frontend/yarn.lock`; `backend/uploads/` is local FS (16 files; not durable on ephemeral hosts).
- **Minor**: 3 ruff F401 warnings in `server.py` (auto-fixable).

## Next tasks / backlog
- [ ] Handover doc consumed by deployment agent (next phase).
- [ ] P1: Clean `react-hooks/exhaustive-deps` warnings so `CI=true` builds pass natively.
- [ ] P1: Commit `frontend/yarn.lock` to repo.
- [ ] P2: Migrate `backend/uploads/` to S3 / object store.
- [ ] P2: Auto-fix ruff F401 warnings (`ruff check --fix server.py`).
- [ ] P2: Restrict prod `REACT_APP_GOOGLE_MAPS_API_KEY` to prod referrer.
- [ ] P3: Manual smoke of Review-Order delivery CGST/SGST rows after deploy (D-5 CR verification).

## Files produced/updated
- `/app/DEPLOYMENT_HANDOVER.md` (UPDATED for `7-may`).
- `/app/backend/.env`, `/app/frontend/.env` — set for validation run.
- `/app/memory/PRD.md` (this file).
