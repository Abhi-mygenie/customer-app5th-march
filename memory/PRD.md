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

## Session log
- 2026-10-06 (s1): deploy from GitHub, env fixes
- 2026-10-06 (s2): CR-2026-10-04-006 Role 3 — registry_sync.py rewritten, 87 items pushed to Google Sheet
- 2026-10-06 (s3): CR-2026-10-04-006 Role 4 QA PASS 22/22; Role 2 planning (chat only, no artefacts yet) for BUG-2026-10-06-001 + CR-2026-10-03-003; CRM `POST /scan/feedback` validated (token=200, anonymous=403); INV-2026-10-03-001 remediation advice. Handover: `SESSION_HANDOVER_2026-10-06_PLANNING_TIER1.md`

## Governance
- Strict role gates per `control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`. No app code until owner says `Role 3 approved for <ID>`.
- Registry of record: `change_requests/index.yml` → mirrored to Google Sheet via `tools/registry_sync.py`.

## Backlog / Next
- Write IMPACT_ANALYSIS.md + IMPLEMENTATION_PLAN.md for BUG-2026-10-06-001 and CR-2026-10-03-003; get Gate 2; then Role 3 (P0)
- Owner decisions D1–D3 (see handover §5)
- Tier 2 owner rulings: CR-2026-10-06-001, CR-2026-10-06-002, CR-2026-10-04-005
- INV-2026-10-03-001: DevOps/CRM key rotation + UAT PII purge (operational)
- D-A2 OAuth consent publish; P7–P10 Band b; P12 ROLE 13 prompt edit
- Supply production env values when ready (CORS_ORIGINS for custom domain)
