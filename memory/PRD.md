# PRD — Customer App (MyGenie)

## Original Problem Statement
Pull latest code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch: `3-july`) directly into `/app`, create required `.env` files, install deps and start services.

## Session Log
- **2026-01 (initial pull)**
  - Cloned `3-july` branch from repo to `/tmp/customer-app5th-march`, then rsynced into `/app` (merged over existing scaffold, excluding `.git`).
  - Removed conflicting `/app/frontend/jsconfig.json` (repo ships `tsconfig.json`; CRA errors if both present).
  - Installed backend deps via `pip install -r /app/backend/requirements.txt`.
  - Installed frontend deps via `yarn install` (repo package.json includes `react-icons`, `qrcode.react`, `jszip`, `file-saver`, etc.).
  - Cleared `frontend/node_modules/.cache`.
  - Restarted `backend` + `frontend` via supervisor — both RUNNING.
  - Verified: `curl /api/` → 200 `{"message":"Customer App API"}`; frontend HTTP 200 on public preview URL; browser renders loading skeleton (React app mounted).

## Tech Stack
- Backend: FastAPI (single-file `server.py`, ~65k), Motor/PyMongo, JWT auth, MyGenie upstream API integration.
- Frontend: React 19 + CRA + CRACO, Tailwind, tsconfig.
- DB: MongoDB (default local `mongodb://localhost:27017`, DB `mygenie`).

## Env Vars Created

### `/app/backend/.env`
| Key | Value | Notes |
|---|---|---|
| `MONGO_URL` | `mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie` | Shared MyGenie remote Mongo (per handover §5.1) |
| `DB_NAME` | `mygenie` | From deployment handover |
| `CORS_ORIGINS` | `*` | |
| `JWT_SECRET` | **`REPLACE_WITH_STRONG_RANDOM_SECRET_openssl_rand_hex_32`** | ⚠️ Placeholder — user must replace |
| `MYGENIE_API_URL` | `https://preprod.mygenie.online/api/v1` | Upstream API |

### `/app/frontend/.env`
| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://repo-sync-july.preview.emergentagent.com` |
| `WDS_SOCKET_PORT` | `443` |
| `ENABLE_HEALTH_CHECK` | `false` |
| `REACT_APP_IMAGE_BASE_URL` | `https://manage.mygenie.online` |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/api/v1` |
| `REACT_APP_LOGIN_PHONE` | **`REPLACE_WITH_LOGIN_PHONE`** ⚠️ placeholder |
| `REACT_APP_LOGIN_PASSWORD` | **`REPLACE_WITH_LOGIN_PASSWORD`** ⚠️ placeholder |
| `REACT_APP_CRM_URL` | `https://crm.mygenie.online/api` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | **`REPLACE_WITH_GOOGLE_MAPS_API_KEY`** ⚠️ placeholder |
| `REACT_APP_CRM_API_VERSION` | `v2` |

## Action Items for User (Placeholders to Fill)
1. Backend `JWT_SECRET` — generate via `openssl rand -hex 32`.
2. Frontend `REACT_APP_LOGIN_PHONE` + `REACT_APP_LOGIN_PASSWORD` (pre-prod hardcoded test creds).
3. Frontend `REACT_APP_GOOGLE_MAPS_API_KEY` (domain-restricted key from Google Cloud Console).
4. If pointing at remote Mongo, update `MONGO_URL` to actual connection string (e.g. handover doc lists `mongodb://mygenie_admin:...@52.66.232.149:27017/mygenie`).

## Next Actions
- User to replace placeholder secrets in `/app/backend/.env` and `/app/frontend/.env`, then `sudo supervisorctl restart backend frontend`.
- End-to-end feature/functional testing (login, order flows, admin pages) once real credentials are in place.
