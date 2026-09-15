# MyGenie Customer App - Deployment PRD

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.

- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: `sep15`
- Destination: `/app` (repo contents pulled directly into `/app`, not a subfolder)

## Architecture

### Stack
- **Frontend**: React (CRA + Craco), deployed at `/app/frontend/`, runs on port 3000
- **Backend**: FastAPI (Python), deployed at `/app/backend/`, runs on port 8001
- **Database**: External MongoDB at `52.66.232.149:27017` (mygenie DB)
- **External API**: `https://preprod.mygenie.online/api/v1`

### Services (Supervisor-managed)
- `frontend`: `yarn start` (craco) from `/app/frontend/`
- `backend`: `uvicorn server:app` from `/app/backend/`
- `mongodb`: Local MongoDB (not used — app uses external DB)
- `nginx-code-proxy`: Nginx reverse proxy

## What Was Done

### Deployment (2026-09-15)
1. Backed up platform files: `.emergent/`, `memory/`, `.env` files
2. Added remote `https://github.com/Abhi-mygenie/customer-app5th-march.git`
3. Fetched and checked out `sep15` branch directly into `/app`
4. Restored platform `.emergent/` (current platform version preserved over repo version)
5. Merged `memory/`: kept repo's rich content (22 files), added `test_credentials.md` from backup
6. Wrote backend `.env` with all provided values
7. Wrote frontend `.env` with all provided values (kept `REACT_APP_BACKEND_URL` protected var)
8. Fixed CORS: changed `CORS_ORIGINS=*` → explicit platform URLs + regex (server.py blocks wildcard+credentials combo)
9. Ran `yarn install` in `/app/frontend/`
10. Restarted backend and frontend via supervisorctl

### Platform File Preservation
- `.emergent/`: Preserved current platform version (cron, emergent.yml, markers, system_deps.txt)
- `memory/`: All 22 files from repo preserved + test_credentials.md added
- `test_reports/`: Preserved from repo
- `.env` files: Written fresh from provided values (not tracked in git)
- Supervisor configs: Unchanged (in `/etc/supervisor/conf.d/`, outside `/app`)

## Environment Variables

### Backend (.env)
- `MONGO_URL`: External MongoDB at 52.66.232.149
- `DB_NAME`: mygenie
- `CORS_ORIGINS`: Explicit platform URLs (not wildcard)
- `CORS_ORIGIN_REGEX`: `https://.*\.preview\.emergentagent\.com`
- `MYGENIE_API_URL`, `GOOGLE_MAPS_API_KEY`, `JWT_SECRET`, `MYGENIE_POS_LOGIN_*`

### Frontend (.env)
- `REACT_APP_BACKEND_URL`: Platform backend URL (protected)
- `REACT_APP_API_BASE_URL`: `https://preprod.mygenie.online/api/v1`
- `REACT_APP_IMAGE_BASE_URL`, `REACT_APP_CRM_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`
- `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`

## Current Status
- Frontend: RUNNING (compiled successfully, serving on port 3000)
- Backend: RUNNING (FastAPI on port 8001)
- App: Accessible at https://react-app-deploy-12.preview.emergentagent.com
- Memory dir: 22 files, fully in sync with repo

## Notes
- No code edits made — repo deployed as-is
- Only configuration (.env) adjusted: CORS_ORIGINS set to explicit URLs (required by server.py validation)
- Platform overlay packages (`@emergentbase/overlay`, `@emergentbase/visual-edits`) not in repo's package.json — overlay system degrades gracefully, app functions normally


## Investigations (read-only, no code)
### INV-2026-09-15-001 — Profile Orders/Points/Wallet 404 on CRM v2 (2026-09-15)
- Root cause (HIGH confidence): `crmService.js` `crmGetOrders/crmGetPoints/crmGetWallet` still call CRM v1 `/customer/me/*`; CRM v2 returns 404. Header profile via `/scan/auth/me` is alive.
- Live probes captured; `/scan/orders` exists (contract unknown); no v2 points/wallet route found; no v2 forgot/reset-password.
- Artifact to send to CRM team: `memory/change_requests/INV-2026-09-15-001-profile-data-crm-v2-contract-gap/CRM_CONTRACT_VERIFICATION_REQUEST.md` (Profile data + OTP routes).
- Next: CRM reply → Planning role → new CR for v2 branches (owner approval required before any code).
- INV-2026-09-12-001 "delete outright" wording withdrawn pending owner decision.
- 2026-09-15 CRM reply (INV-017) validated: `/scan/orders`, `/scan/loyalty`, `/scan/points/history`, `/scan/wallet/history` live-confirmed. Report: `CRM_REPLY_VALIDATION.md` — 4 CRM discrepancies (D1 403→401, D2 openapi.json missing, D3 env unknown, D4 `total` semantics), 10 app gaps (G1–G10; G7 skip-otp silently logs in password customers, G8 x-api-key dead, G10 duplicate config source CRM `/scan/config` vs our `/api/config`). Owner decisions OD-1..OD-6 pending before Planning.
- 2026-09-15 later: OpenAPI received (26 ops; response schemas untyped `{}`), `crm.mygenie.online` = UAT (prod CRM URL unknown → release checklist). OpenAPI reveals CRM also serves `/scan/config/{rid}` (PUT too), `/scan/menu/dietary-tags/{rid}`, call-waiter, request-bill, feedback → parallel copy of our app-config surface (G10 widened). Proposed next items (CRM_REPLY_VALIDATION.md §9): CR-A Profile v2 adapter · CR-B skip-otp bypass · INV-2026-09-15-002 config source of truth · G6+G8 fold into CR-2026-09-12-007. Gate: owner answers OD-2..OD-6 → INTAKE → PLANNING CR-A.
- **2026-09-15 OWNER FACT: CRM and Customer App share the same MongoDB** (verified: `/api/config/478` ≡ CRM `/scan/config/478`, same `updated_at`). Consequences in `CRM_REPLY_VALIDATION.md` §10: OD-2 moot (one `showWallet`); G10 = two writers/defaults on one collection; **any collection drop/migration (CR-006, CR-014, INV-2026-09-12-001 feeds) is cross-team CRITICAL and needs CRM + owner approval**; prod DB must be CRM's prod DB; addendum §2 updated (Alpha v0.1a). New OD-7: who owns writes to `customer_app_config`.
- **2026-09-15 INTAKE (Role 1) — owner decisions recorded** in `memory/control/OWNER_DECISIONS_2026-09-15.md`: **Option A** (CRM owns customer data, we own app shell), OD-3 accept, OD-4 yes-after-approval, OD-7 we own config writes, UAT rid **689** (admin login in `test_credentials.md`). Registered: **CR-2026-09-15-001** Profile CRM v2 adapter (P1/HIGH, next = Planning), **CR-2026-09-15-002** skip-otp dead-branch cleanup (P3, parked), **INV-2026-09-15-002** shared-DB ownership map (P1 gating). Fold-ins G6/G8 → CR-007; SHARED-DB guards appended to CR-006 and CR-014 intake docs. INV-2026-09-15-001 CLOSED. **No code changed.**
