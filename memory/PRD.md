# MyGenie Customer App — PRD

## Source
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: `6oct`
- Deployed: 2026-10-07

## Architecture
- Frontend: React 19 + Craco + Tailwind (port 3000)
- Backend: FastAPI + Motor/MongoDB (port 8001)
- Database: Remote MongoDB at 52.66.232.149:27017/mygenie

## What's Implemented
- Full repo cloned from `6oct` branch into `/app` as-is (no code edits)
- Backend env configured: MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS, MYGENIE_API_URL, GOOGLE_MAPS_API_KEY
- Frontend env configured: REACT_APP_API_BASE_URL, REACT_APP_IMAGE_BASE_URL, REACT_APP_CRM_URL, REACT_APP_GOOGLE_MAPS_API_KEY
- Platform `.emergent/` preserved and restored
- Memory directory fully in sync with remote (verified with diff)
- Dependencies installed (yarn + pip)
- Both services running and healthy

## Backend .env Keys
- MONGO_URL, DB_NAME, CORS_ORIGINS, MYGENIE_API_URL, GOOGLE_MAPS_API_KEY, JWT_SECRET
- MYGENIE_POS_LOGIN_PHONE, MYGENIE_POS_LOGIN_PASSWORD

## Frontend .env Keys
- REACT_APP_API_BASE_URL, REACT_APP_IMAGE_BASE_URL, REACT_APP_CRM_URL
- REACT_APP_GOOGLE_MAPS_API_KEY, REACT_APP_CRM_API_VERSION
- REACT_APP_LOGIN_PHONE, REACT_APP_LOGIN_PASSWORD
- REACT_APP_BACKEND_URL (commented out — intentional)

## Session 2026-10-07 — Role 2 Planning (Impact Analysis) · no app code changed
- Operating prompt: `control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`
- BUG-2026-10-06-001 → `IMPACT_ANALYSIS.md` written; index.yml `INTAKE → PLANNING`. New finding: 200/rid rolling cap will be consumed by allow events (D4). Owner decisions open: D1, D4, D5, D6
- CR-2026-10-03-003 → `IMPACT_ANALYSIS.md` written; index.yml `INTAKE → PLANNING`. CRM anonymous path re-probed → still 403. Owner decisions open: D2, D3, D7, D8, D9
- INV-2026-10-03-001 → `REMEDIATION_ADVICE.md` written (rotate → restrict → re-seed scrubbed → policy). Registrar to set `blocked_on: [INFRA, CRM]`
- Gate position: both Tier-1 items at **Gate 2 (owner acceptance of Impact Analysis)**. Implementation Plan not yet written. Nothing coded until "Role 3 approved for <ID>"
- `registry_sync.py sync` NOT run this session (OAuth token may be expired; owner to confirm)
- 2026-10-07 Gate 2 rulings recorded — BUG-001: D1=a, D4=b, D5=b, D6=yes · CR-003: D2=a, D3=a, D7=b/i, D8=yes, D9=here. Owner holding at Gate 2; Implementation Plans NOT written; registry sync deferred
- 2026-10-07 Gate 2 ACCEPTED for BUG-2026-10-06-001 → IMPLEMENTATION_PLAN.md written (E1–E6, T1–T16). Gate 3 not open. CR-003 still at Gate 2
- 2026-10-07 Gate 3 accepted → Role 3 applied E1–E6 (5 files + new smoke test, markers BUG-2026-10-06-001) → self-test 11/16 PASS (rest deferred) → Role 4 QA via testing agent **PASS 11/11** (`test_reports/iteration_1.json`). index.yml `SMOKE`; owner smoke pending. Handover: `SESSION_HANDOVER_2026-10-07.md`
- 2026-10-07 Owner convention: **SMOKE_BRIEF.md + .pdf mandatory after every BUG/CR QA PASS** (control prompt §9 + Role 8 updated). Tool: `memory/tools/smoke_brief.py` (markdown → PDF via headless Chrome; `pip install markdown`). First instance: BUG-2026-10-06-001/SMOKE_BRIEF.pdf (2 pages)
- 2026-10-07 Gate 2 ACCEPTED for CR-2026-10-03-003 → IMPLEMENTATION_PLAN.md (E1–E4, T1–T12). P1 flagged: diner sign-in is on landing page (/login is admin-only). Gate 3 not open
- 2026-10-07 CR-003 gap G1–G5 found (phone on landing ≠ login except skipOtp/password-complete path) → owner ruled D10=a. Follow-up CR-2026-10-07-001 registered (blocked on CRM CR-096). CRM Wave-1 change log received → `memory/inbox/` + SUMMARY (OTP routes deleted; our calls already quarantined; 3 owner questions open). CR-003 awaiting Gate 3 phrase
- 2026-10-07 Owner: (1) new CR for permanent OTP deletion → CR-2026-10-07-002 registered (INTAKE, 31 markers/8 files, skipOtp* out of scope); (2) identity-path intent → validation questions drafted for CRM `inbox/OUTBOUND_DRAFT_CRM_QUESTIONS_2026-10-07.md` (owner sends); (3) CR-084 confirmation only AFTER deletion ships. Registry 89 items. Gates unchanged: BUG-001 SMOKE · CR-003 awaiting Gate 3
- 2026-10-07 Gate 3 accepted CR-2026-10-03-003 → Role 3 (E1–E4 + contract test update + setRestaurantScope restore) → self-test → Role 4 QA **PASS 11/11** (`test_reports/iteration_2.json`) → SMOKE_BRIEF.pdf → index `SMOKE`. Deviation: order_id never attaches until CR-2026-09-15-001 fixes crmGetOrders v1 path. CRM_NOTE_FEEDBACK_PURGE.md drafted (owner sends)
