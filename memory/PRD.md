# PRD — Customer App Deployment Validation Handover

**Original problem statement:** Pull latest code from `Abhi-mygenie/customer-app5th-march`, branch `6-may`. Validate frontend/backend build + compile readiness. Check required env vars. Produce a deployment handover doc for the next deployment agent.

## Scope
- Clone branch `6-may` (confirmed exists on remote; HEAD `acabff0`).
- Install backend + frontend deps.
- Validate backend imports, routes, compile (ruff), runtime boot.
- Validate frontend dev server, production build (`CI=false` and `CI=true`).
- Verify MongoDB connectivity and upstream API reachability.
- Document all required env vars (backend + frontend).
- Emit `/app/DEPLOYMENT_HANDOVER.md` for the deployment agent.

## What's been implemented / completed — 2026-05-06
- Repo cloned from branch `6-may` (commit `acabff0`).
- `/app/backend` and `/app/frontend` synced from repo.
- Backend: `pip install` OK (124 pkgs), 47 routes load, uvicorn boot OK, all `/api/*` smoke endpoints return 200.
- Frontend: `yarn install` OK (peer-dep warnings only), dev server 200, prod `CI=false yarn build` OK (476 kB gzip JS).
- MongoDB ping OK; 23 collections in `mygenie` DB.
- Upstream APIs reachable: `preprod.mygenie.online` (404 on root, expected), `manage.mygenie.online` (200), `crm.mygenie.online` (301 redirect).
- `/app/DEPLOYMENT_HANDOVER.md` written with full deployment recipe, env var inventory, and 11 action items (see §6 of the doc).

## Findings summary (for PM)
- **Blocker for CI builds**: `CI=true yarn build` fails — 15+ `react-hooks/exhaustive-deps` warnings treated as errors. Fix = set `CI=false` in build pipeline.
- **Must-change-before-prod**: `JWT_SECRET`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`.
- **Operational gap**: no committed `yarn.lock`; `backend/uploads/` is local FS (not durable on ephemeral hosts).
- **Minor**: 3 `ruff F401` warnings in `server.py` (auto-fixable).

## Next tasks / backlog
- [ ] Handover doc consumed by deployment agent (next phase).
- [ ] P1: Clean `react-hooks/exhaustive-deps` warnings so `CI=true` builds pass natively.
- [ ] P1: Commit `yarn.lock` to repo.
- [ ] P2: Migrate `backend/uploads/` to S3 / object store.
- [ ] P2: Auto-fix ruff F401 warnings.

## Files produced/updated
- `/app/DEPLOYMENT_HANDOVER.md` (NEW) — full deployment handover.
- `/app/backend/.env`, `/app/frontend/.env` — set for validation run.
- `/app/memory/PRD.md` (this file).
