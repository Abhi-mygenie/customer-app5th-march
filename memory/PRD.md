# MyGenie Customer App — Deployment Record

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: main
- Deployed: 2026-11-26

## Architecture
- **Frontend**: React (CRA + CRACO), runs on port 3000 via supervisor
- **Backend**: FastAPI (Python), runs on port 8001 via supervisor
- **Database**: MongoDB (local), DB name: `mygenie`

## What Was Done
- Cloned repo (branch: main) directly into `/app` via rsync (no nested subfolder)
- Preserved platform files: `.git`, `.emergent/emergent.yml` (pod-specific image name)
- Memory dir fully synced from remote (57 files)
- Backend `.env` configured with all required keys
- Frontend `.env` configured with all required keys
- `CORS_ORIGINS` set to explicit preview URL (wildcard blocked when credentials=true)
- `JWT_SECRET` auto-generated + user-updated via secrets panel
- Google Maps API keys set via secrets panel (`GOOGLE_MAPS_API_KEY`, `REACT_APP_GOOGLE_MAPS_API_KEY`)
- Frontend dependencies installed via `yarn install`
- Backend dependencies installed via `pip install -r requirements.txt`
- Both services running healthy

## Environment Variables

### Backend (`/app/backend/.env`)
| Key | Value |
|-----|-------|
| MONGO_URL | mongodb://localhost:27017 |
| DB_NAME | mygenie |
| CORS_ORIGINS | https://mygenie-customer-2--36818awr.preview.emergentagent.com |
| MYGENIE_API_URL | https://preprod.mygenie.online/api/v1 |
| GOOGLE_MAPS_API_KEY | (set via secrets panel) |
| JWT_SECRET | (set via secrets panel) |
| MYGENIE_POS_LOGIN_PHONE | +919579504871 |
| MYGENIE_POS_LOGIN_PASSWORD | Qplazm@10 |

### Frontend (`/app/frontend/.env`)
| Key | Value |
|-----|-------|
| REACT_APP_BACKEND_URL | https://mygenie-customer-2--36818awr.preview.emergentagent.com |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_IMAGE_BASE_URL | https://preprod.mygenie.online |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/api/v1 |
| REACT_APP_LOGIN_PHONE | +919579504871 |
| REACT_APP_LOGIN_PASSWORD | Qplazm@10 |
| REACT_APP_CRM_URL | https://crm.mygenie.online/api |
| REACT_APP_GOOGLE_MAPS_API_KEY | (set via secrets panel) |
| REACT_APP_CRM_API_VERSION | v2 |
| MYGENIE_POS_LOGIN_PHONE | 9579504871 |
| MYGENIE_POS_LOGIN_PASSWORD | Qplazm@10 |

## Notes
- No code edits were made — deployed as-is from repo
- Backend requires explicit CORS_ORIGINS (wildcard blocked due to allow_credentials=True)
- Frontend compiles with lint warnings only (no errors)
