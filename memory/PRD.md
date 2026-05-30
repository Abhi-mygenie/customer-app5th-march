# PRD — Customer App (MyGenie)

## Original Problem
1. Pull and build project from https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use main branch
3. Connect to db `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie`
4. Wipe local /app and pull directly from repo
5. Make a handover document for next deployment agent

## Architecture
- FastAPI (single-file `server.py`) + Motor → remote MongoDB (`mygenie` DB on 52.66.232.149)
- React 19 + CRA/craco frontend → backend `/api/*` via Kubernetes ingress
- External APIs: MyGenie POS, MyGenie CRM, Image CDN, Google Maps
- Supervisor manages backend (8001), frontend (3000), mongod (unused)

## What's Been Done (2026-05-30)
- Wiped `/app` entirely (incl. .git, .emergent — per user)
- Cloned `customer-app5th-march` `main` (HEAD `2deb245`) into `/app`
- Created `/app/backend/.env` (5 vars) and `/app/frontend/.env` (11 vars)
- Installed backend deps (pip, 123 pkgs) and frontend deps (yarn)
- Started all services via supervisor — backend, frontend, mongodb, code-server, nginx-code-proxy RUNNING
- Verified backend `/api/` 200 OK (local + external ingress), frontend renders "MyGenie" landing
- Verified remote MongoDB reachable, 20 collections, 3,861 customers, 32,573 orders
- Wrote `/app/HANDOVER.md` (this run's deployment handover)

## Backlog / Next Actions
- P0: Provide real `REACT_APP_GOOGLE_MAPS_API_KEY` (maps currently broken)
- P1: Populate `REACT_APP_CRM_API_KEY` JSON map per restaurant
- P1: Rotate `JWT_SECRET` + restrict `CORS_ORIGINS` for production
- P2: Move `REACT_APP_LOGIN_PASSWORD` server-side before production deploy
- P2: Fix the 10 `react-hooks/exhaustive-deps` warnings so `CI=true yarn build` passes
