# PRD — MyGenie Customer App (13sep branch deployment)

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: `13sep`
- Destination: `/app` (repo contents pulled directly, not a subfolder)

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, runs on port 3000 via `yarn start`
- **Backend**: FastAPI (Python), runs on port 8001 via uvicorn (supervisor-managed)
- **Database**: Remote MongoDB at `52.66.232.149:27017` (mygenie DB)
- **External API**: `https://preprod.mygenie.online/api/v1` (MyGenie POS)

## What Was Done (Sep 14, 2026)
1. Backed up platform-critical files: `.emergent/`, both `.env` placeholders
2. Cloned `13sep` branch from GitHub into `/tmp/repo_13sep`
3. Rsynced repo contents into `/app` (excluded `.git`, `.emergent`, `.env` files, `node_modules`)
4. Restored platform `.emergent/` from backup
5. Wrote backend `.env` with provided credentials (MONGO_URL, JWT_SECRET, MYGENIE_API_URL, POS credentials)
6. Wrote frontend `.env` with provided values + preserved `REACT_APP_BACKEND_URL`
7. Installed missing npm packages: `jszip`, `file-saver`, `react-icons` (needed by admin pages)
8. Ran `pip install -r requirements.txt` to ensure all Python deps are present
9. Restarted backend + frontend via supervisorctl
10. Confirmed: backend `/api/healthz` → `{"ok":true,"mongo":"up"}`, frontend compiled clean

## Key Services
| Service   | Port | Status  |
|-----------|------|---------|
| Frontend  | 3000 | RUNNING |
| Backend   | 8001 | RUNNING |
| MongoDB   | local| RUNNING |

## Environment Variables Applied
### Backend
- MONGO_URL: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: *
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- JWT_SECRET: set
- MYGENIE_POS_LOGIN_PHONE/PASSWORD: set

### Frontend
- REACT_APP_BACKEND_URL: https://customer-app-deploy-2.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: set
- REACT_APP_LOGIN_PHONE/PASSWORD: set

## Backlog / Next Steps
- P0: Supply real `REACT_APP_BACKEND_URL` if a new pod URL is needed
- P1: Verify OTP flow end-to-end with CRM SMS service
- P1: CR-2026-09-12-003 (OTP echo removal) — pending owner go-ahead
- P2: CR-2026-09-12-004 CORS lockdown (currently `*`)
- P2: Wave 2 CRs as listed in memory/PRD.md
