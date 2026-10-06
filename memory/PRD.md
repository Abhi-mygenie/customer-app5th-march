# MyGenie Customer App — PRD

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: 6oct
- Deployed: 2026-10-06

## Architecture
- Frontend: React (craco) at /app/frontend — runs on port 3000
- Backend: FastAPI at /app/backend — runs on port 8001 (uvicorn, hot-reload)
- Database: External MongoDB at 52.66.232.149:27017/mygenie (mygenie_admin)
- External API: https://preprod.mygenie.online/api/v1

## What Was Done (2026-10-06)
- Backed up platform files (.emergent, memory, test_reports, tests, backend .env)
- Cleared /app and cloned branch 6oct directly into /app (frontend/ and backend/ dirs)
- Synced /app/memory with all 30+ repo memory/handover files
- Set backend/.env with MongoDB connection, JWT_SECRET, CORS, MYGENIE API keys
- Set frontend/.env with REACT_APP_API_BASE_URL, image base URL, CRM URL, maps key
- Fixed CORS_ORIGINS (changed from '*' to explicit origins — server.py rejects wildcard with credentials)
- Installed all Python deps (pip install -r requirements.txt)
- Installed all Node deps (yarn install)
- Both services running and healthy

## Environment Variables

### Backend
- MONGO_URL: external MongoDB (mygenie_admin@52.66.232.149)
- DB_NAME: mygenie
- CORS_ORIGINS: explicit origin list (platform URL + mygenie domains)
- JWT_SECRET: set
- MYGENIE_API_URL, GOOGLE_MAPS_API_KEY: set
- MYGENIE_POS_LOGIN_PHONE/PASSWORD: set

### Frontend
- REACT_APP_BACKEND_URL: https://react-customer-app-4.preview.emergentagent.com (platform)
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1 (external)
- REACT_APP_IMAGE_BASE_URL, REACT_APP_CRM_URL, REACT_APP_GOOGLE_MAPS_API_KEY: set
- REACT_APP_LOGIN_PHONE/PASSWORD: set

## Backlog / Next
- Supply production env values when ready (CORS_ORIGINS for custom domain)
- Run end-to-end tests on QR scan → menu → cart → order flow
