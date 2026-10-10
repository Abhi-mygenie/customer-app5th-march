# MyGenie Customer App — Deployment Session Log

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: main

## Architecture
- Frontend: React (craco/react-scripts), TypeScript-capable, runs on port 3000
- Backend: FastAPI (Python), runs on port 8001
- Database: MongoDB at 52.66.232.149:27017 (mygenie db)
- External APIs: preprod.mygenie.online/api/v1, CRM at crm.mygenie.online/api

## What Was Done (2026-10-10)
- Cloned repo from GitHub (main branch) to /tmp/repo-clone
- Backed up platform-critical files: .emergent/emergent.yml, frontend REACT_APP_BACKEND_URL
- Synced all repo contents to /app via rsync (overlay, no code edits)
- Restored platform emergent.yml (no job_id from remote environment)
- Removed legacy jsconfig.json (old platform file conflicting with repo's tsconfig.json)
- Wrote backend/.env with all provided env vars; changed CORS_ORIGINS from * to explicit frontend URL (required by backend validation at line 71 of server.py)
- Wrote frontend/.env with all provided env vars + preserved REACT_APP_BACKEND_URL
- Installed frontend deps via yarn install
- Installed backend deps via pip install -r requirements.txt
- Restarted supervisor — both services running, MongoDB connected

## Current .env state

### backend/.env
- MONGO_URL: mongodb://mygenie_admin:...@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: https://mygenie-guest-app.preview.emergentagent.com
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- GOOGLE_MAPS_API_KEY: AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
- JWT_SECRET: set
- MYGENIE_POS_LOGIN_PHONE/PASSWORD: set

### frontend/.env
- REACT_APP_BACKEND_URL: https://mygenie-guest-app.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: set
- REACT_APP_CRM_API_VERSION: v2
- REACT_APP_LOGIN_PHONE/PASSWORD: set

## Memory Dir
- 47 files from repo + test_credentials.md (platform-managed) = 48 total in /app/memory/
- Fully in sync with remote

## Known constraints
- CORS_ORIGINS cannot be '*' when allow_credentials=True (server.py line 71)
- jsconfig.json must not coexist with tsconfig.json (react-scripts restriction)
