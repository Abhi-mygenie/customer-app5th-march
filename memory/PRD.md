# MyGenie Customer App — Deployment Record

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: main
- Deployed: 2026-10-10

## Architecture
- Frontend: React + craco (port 3000) — customer ordering app
- Backend: FastAPI (port 8001) — proxies POS API + local auth/session
- Database: MongoDB external (`mygenie` DB at 52.66.232.149:27017)

## Deployment Steps Done
1. Backed up platform files: `.emergent`, `backend/.env`, `frontend/.env`, `memory/`, `test_reports/`
2. Cleared `/app` (kept `.git`)
3. Cloned repo (`main` branch) to `/tmp/mygenie-repo`
4. Copied all repo contents to `/app` via rsync (excluding `.git`)
5. Created `backend/.env` with provided credentials
6. Created `frontend/.env` with platform URL + all provided vars
7. Fixed CORS: changed `CORS_ORIGINS=*` → explicit origins + `CORS_ORIGIN_REGEX=.*` (server.py rejects wildcard with allow_credentials=True)
8. Ran `yarn install --frozen-lockfile` in `/app/frontend`
9. Ran `pip install -r requirements.txt` in `/app/backend`
10. Restarted supervisor services
11. Verified memory dir fully in sync with remote (zero diff)

## Core Requirements (Static)
- No code edits — deploy and run as-is ✅
- Platform files preserved (.emergent, .git) ✅
- Memory dir in sync with remote ✅
- Env variables set as provided ✅

## What's Running
- Frontend: https://genie-order-app.preview.emergentagent.com
- Backend health: http://localhost:8001/api/healthz → `{"ok":true,"mongo":"up"}`

## Backend .env (key vars)
- MONGO_URL: mongodb://mygenie_admin@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: explicit origins + CORS_ORIGIN_REGEX=.*
- JWT_SECRET: set
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1

## Frontend .env (key vars)
- REACT_APP_BACKEND_URL: https://genie-order-app.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_CRM_API_VERSION: v2
- REACT_APP_GOOGLE_MAPS_API_KEY: set

## Backlog / Next Steps
- P0: Verify end-to-end login flow (phone → OTP → browse menu → order)
- P1: Confirm external POS API connectivity from backend
- P1: Test Google Maps integration with provided key
- P2: Add health monitoring / uptime check
