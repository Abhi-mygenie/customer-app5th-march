# Deployment — 22 Oct 2026

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: main
- Deployed to: /app (rsync, no nested folders, no code edits)

## What was done
1. Cloned repo to /tmp/customer-app
2. Backed up platform `emergent.yml` (env_image_name: release-22102026-1)
3. Cleared /app and rsynced all repo contents (excluding .git)
4. Restored platform's `.emergent/emergent.yml`
5. Set backend/.env with external MongoDB + CORS fixed for preview URL
6. Set frontend/.env with all REACT_APP_* vars + preserved REACT_APP_BACKEND_URL
7. Installed Python deps (pip install -r requirements.txt)
8. Installed Node deps (yarn install in /app/frontend)
9. Restarted supervisor (backend + frontend)

## Key env decisions
- CORS_ORIGINS set to `https://genie-customer.preview.emergentagent.com` (not `*` — blocked by server.py check)
- CORS_ORIGIN_REGEX added for *.emergentagent.com and *.mygenie.online
- MongoDB: external `mygenie` DB at 52.66.232.149
- Frontend: REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1

## Status
- backend: RUNNING (pid 55)
- frontend: RUNNING (pid 57)
- mongodb: RUNNING (pid 60)
- /api/healthz: {"ok":true,"mongo":"up"}
- memory dir: 50 files synced from repo
