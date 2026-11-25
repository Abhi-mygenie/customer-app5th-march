# MyGenie Customer App — PRD

## Original Problem Statement
Deploy the existing React frontend repo (Abhi-mygenie/customer-app5th-march, main branch) directly into `/app` and run it as-is with no code edits.

## Architecture
- **Frontend**: React (CRA + CRACO), TypeScript, served on port 3000
- **Backend**: FastAPI (Python), served on port 8001
- **Database**: MongoDB (local, `mygenie` DB)
- **External API**: preprod.mygenie.online/api/v1

## What's Been Implemented

### 2026-11-25 — Full Repo Deployment
- Cloned `Abhi-mygenie/customer-app5th-march` (main) into `/app` via `git reset --hard origin/main`
- Platform files preserved: `.emergent/emergent.yml`, `.emergent/markers/`
- Backend `.env` configured: DB_NAME=mygenie, CORS_ORIGINS set to preview URL, MYGENIE_API_URL, POS credentials, JWT_SECRET (via secrets panel), GOOGLE_MAPS_API_KEY (via secrets panel)
- Frontend `.env` configured: all REACT_APP_ vars, CRM URL, image base URL, login credentials
- REACT_APP_GOOGLE_MAPS_API_KEY added via secrets panel
- Python dependencies installed; yarn install completed
- Backend health: `{"ok":true,"mongo":"up"}`
- Frontend renders login/browse page (MyGenie branded)
- Memory directory synced: 53 files from repo

## Core Requirements
- No code edits — deploy and run repo as-is
- Env variables configured as placeholders (sensitive keys via secrets panel)
- Platform files preserved after clone
- Memory dir in sync with remote

## Env Keys Status
| Key | File | Status |
|-----|------|--------|
| MONGO_URL | backend | localhost:27017 (platform) |
| DB_NAME | backend | mygenie |
| CORS_ORIGINS | backend | preview URL |
| MYGENIE_API_URL | backend | preprod.mygenie.online |
| GOOGLE_MAPS_API_KEY | backend | set via secrets panel |
| JWT_SECRET | backend | set via secrets panel |
| MYGENIE_POS_LOGIN_PHONE | backend | +919579504871 |
| MYGENIE_POS_LOGIN_PASSWORD | backend | Qplazm@10 |
| REACT_APP_BACKEND_URL | frontend | platform preview URL |
| REACT_APP_API_BASE_URL | frontend | preprod.mygenie.online |
| REACT_APP_IMAGE_BASE_URL | frontend | preprod.mygenie.online |
| REACT_APP_CRM_URL | frontend | crm.mygenie.online |
| REACT_APP_GOOGLE_MAPS_API_KEY | frontend | set via secrets panel |
| REACT_APP_CRM_API_VERSION | frontend | v2 |
| REACT_APP_LOGIN_PHONE | frontend | +919579504871 |
| REACT_APP_LOGIN_PASSWORD | frontend | Qplazm@10 |

## Backlog / Next Steps
- Test full customer flow: QR scan → browse menu → add to cart → order
- Add production domain to CORS_ORIGINS when going live
- Test login flow with phone +919579504871
