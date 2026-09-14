# PRD — MyGenie Customer App (13sep branch)

## Original Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march
- Branch: `13sep`
- Destination: `/app` (repo contents pulled directly, not a subfolder)

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, runs on port 3000 via `yarn start`
- **Backend**: FastAPI (Python), runs on port 8001 via uvicorn (supervisor-managed)
- **Database**: Remote MongoDB at `52.66.232.149:27017` (mygenie DB)
- **External POS API**: `https://preprod.mygenie.online/api/v1`
- **CRM**: `https://crm.mygenie.online/api` (v2, frontend-direct)

## Programme Wave Status

| Wave | Status | Notes |
|---|---|---|
| Wave 0 | ✅ CLOSED | 10/10 QA backlog items + 4 notes (2026-09-12) |
| Wave 1a | ✅ IMPLEMENTED — QA pending | CR-005, CR-007, CR-004 all complete; 22/22 tests PASS |
| Wave 1b → restructured | see below | CR-017 cancelled, CR-003 re-scoped, CR-015 blocked |
| Wave 2+ | not started | Backend split (CR-006) opens when Wave 1a closes |

## Wave 1a Detail

| CR | Status |
|---|---|
| CR-005 P1 (pytest snapshots) | ✅ CLOSED — 22/22 tests |
| CR-007 F-07 (env hardening) | ✅ CLOSED — 8/8 QA checks |
| CR-004 (CORS + rate-limit + headers) | ✅ IMPLEMENTED — QA (Role 4) + owner smoke next |

## Wave 1b / CR-017 / CR-003 Disposition (updated 2026-09-14)

### CR-017 — CANCELLED (2026-09-14)
Premise invalidated. CRM already handles SMS delivery end-to-end via frontend-direct calls
(`crmSendOtp()` → `https://crm.mygenie.online/api/scan/auth/request-otp`).
Backend wiring is not needed. If CRM SMS delivery fails → file as a CRM-team issue.

### CR-003 — RE-SCOPED (2026-09-14)
- **Part A** (delete `otp_for_testing` 1-line): deferred until owner confirms real SMS arrives on device
- **Parts B+C** (Mongo OTP store + attempt cap): deferred until OTP feature is turned ON for a restaurant
- Downgraded from P0/CRITICAL to P1/LOW — backend endpoint is never called by the frontend

### CR-015 — BLOCKED (owner-side)
Waiting on: git repo write access + 6 GitHub Actions secrets from owner.

## Key OTP Findings (2026-09-14 investigation)
- Backend `/api/auth/send-otp` is **dead code** — frontend never calls it
- CRM v2 `/scan/auth/request-otp` responds HTTP 200, returns `dev_otp` (dev mode)
- CRM `/scan/auth/skip-otp` works — primary customer path today
- **Forgot/reset password via OTP is broken**: `crmForgotPassword`/`crmResetPassword` are v1-only, return 404 on v2 CRM (UX-GAP-02)
- All `skipOtp*` flags = `false` → customers always land on `/password-setup`
- **One owner action needed**: confirm real SMS physically arrives on test phone `9579504871`

## CR-004 Implementation Detail (Sep 14, 2026)
- CORS_ORIGINS: explicit list (no wildcard)
- `slowapi==0.1.10`: rate-limits on 5 auth endpoints (login 5/min, send-otp 10/min, verify-password 5/min, reset-password 3/min, pos/auth-token 5/min)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Request-ID
- Global 500 handler with request_id
- 22/22 PASS · QA_HANDOVER.md written

## Environment Variables (current pod)
### Backend
- MONGO_URL: `mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie`
- DB_NAME: `mygenie`
- CORS_ORIGINS: `https://customer-app-deploy-2.preview.emergentagent.com,https://preprod.mygenie.online,https://crm.mygenie.online`
- CORS_ORIGIN_REGEX: `^https://.*\.mygenie\.online$`
- MYGENIE_API_URL / JWT_SECRET / POS credentials: set

### Frontend
- REACT_APP_BACKEND_URL: `https://customer-app-deploy-2.preview.emergentagent.com`
- REACT_APP_CRM_URL: `https://crm.mygenie.online/api`
- REACT_APP_CRM_API_VERSION: `v2`
- REACT_APP_API_BASE_URL / IMAGE_BASE_URL / GOOGLE_MAPS_API_KEY: set

## Next Actions (priority order)

### P0 — Before anything else
1. **Owner**: confirm real SMS arrives on phone `9579504871` when OTP is sent via the app

### P1 — Wave 1a closure
2. QA (Role 4) for CR-004 → 25-step smoke test guide documented
3. Owner browser smoke (open `/478`, login, check headers in DevTools)
4. Mark Wave 1a **CLOSED**

### P2 — Then Wave 2
5. INV-2026-09-12-001: legacy route trace (Role 6)
6. CR-006: backend modular split planning (Role 2)

### P3 — OTP (when feature turned on)
7. CR-003 Part A: delete `otp_for_testing` (1-line, Role 3)
8. Fix UX-GAP-02: CRM team to add v2 forgot/reset-password endpoints
9. CR-003 Parts B+C: persistent OTP store + attempt cap

## Key Artefacts
| Artefact | Path |
|---|---|
| Session handover | `/app/memory/SESSION_HANDOVER_2026-09-14.md` |
| CR registry | `/app/memory/change_requests/README.md` |
| CR-004 QA handover | `/app/memory/change_requests/CR-2026-09-12-004-.../QA_HANDOVER.md` |
| Wave 1a smoke guide | documented in session (25 steps) |
| Test credentials | `/app/memory/test_credentials.md` |
| Gate rules | `/app/memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` |
