# MyGenie Customer App — PRD

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: `7oct`
- Deployed: 2026-10-07 (re-deployed from branch 7oct)

## Architecture
- Frontend: React 19 + Craco + Tailwind (port 3000)
- Backend: FastAPI + Motor/MongoDB (port 8001)
- Database: Remote MongoDB at 52.66.232.149:27017/mygenie

## What's Implemented
- Full repo cloned from `7oct` branch into `/app` as-is (no code edits)
- rsync used to deploy repo contents directly into `/app`
- Platform files preserved: `.emergent/`, `memory/`, `test_reports/`
- Backend env configured: MONGO_URL, DB_NAME, CORS_ORIGINS (explicit origin, not wildcard — required by server.py security guard), JWT_SECRET, MYGENIE_API_URL, GOOGLE_MAPS_API_KEY, MYGENIE_POS_LOGIN_PHONE, MYGENIE_POS_LOGIN_PASSWORD
- Frontend env configured: REACT_APP_BACKEND_URL (platform-specific, preserved), REACT_APP_API_BASE_URL, REACT_APP_IMAGE_BASE_URL, REACT_APP_CRM_URL, REACT_APP_GOOGLE_MAPS_API_KEY, REACT_APP_CRM_API_VERSION, REACT_APP_LOGIN_PHONE, REACT_APP_LOGIN_PASSWORD
- Backend Python dependencies installed via pip (requirements.txt)
- Frontend JS dependencies installed via yarn (package.json)
- Both services running and healthy via supervisor
- Memory directory fully in sync with remote (verified with diff before /tmp cleanup)
- App UI confirmed loading at preview URL

## CORS Note
Server.py (line 71-75) has a security guard that rejects CORS_ORIGINS='*' when allow_credentials=True.
CORS_ORIGINS is set to the explicit preview origin: https://customer-app-deploy-4.preview.emergentagent.com

## Backend .env Keys
- MONGO_URL, DB_NAME, CORS_ORIGINS, MYGENIE_API_URL, GOOGLE_MAPS_API_KEY, JWT_SECRET
- MYGENIE_POS_LOGIN_PHONE, MYGENIE_POS_LOGIN_PASSWORD

## Frontend .env Keys
- REACT_APP_BACKEND_URL (platform-specific preview URL)
- REACT_APP_API_BASE_URL, REACT_APP_IMAGE_BASE_URL, REACT_APP_CRM_URL
- REACT_APP_GOOGLE_MAPS_API_KEY, REACT_APP_CRM_API_VERSION
- REACT_APP_LOGIN_PHONE, REACT_APP_LOGIN_PASSWORD
- WDS_SOCKET_PORT=443, ENABLE_HEALTH_CHECK=false

## Test Credentials (POS)
- Phone: +919579504871
- Password: Qplazm@10

## Prioritized Backlog
- P0: App is deployed and running — no outstanding blockers
- P1: Verify all routes/flows post-7oct branch changes
- P2: If CORS_ORIGINS needs to serve additional domains, add comma-separated list to backend/.env
