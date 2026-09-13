# MyGenie Customer App — Deployment PRD

## Problem Statement
Deploy the existing React frontend repo directly into `/app` and run it as-is, with no code edits.
- Repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)
- Destination: `/app` (repo contents pulled directly into `/app`)
- No code edits — deploy and run as-is

## Architecture
- **Frontend**: React (CRA + CRACO) on port 3000, served via nginx proxy
- **Backend**: FastAPI (Python 3.11) on port 8001, managed by supervisor
- **Database**: MongoDB at external host `52.66.232.149:27017` (mygenie DB)
- **External API**: `https://preprod.mygenie.online/api/v1` (MyGenie POS)

## What Was Done (2026-09-07)
1. Cloned repo from GitHub (public, branch: main) into `/tmp/repo-preview`
2. Backed up platform files: `.emergent/`, backend/.env, frontend/.env
3. Synced repo backend/ → /app/backend/ (rsync, excluding .env)
4. Synced repo frontend/ → /app/frontend/ (rsync, excluding node_modules, .env)
5. Wrote provided backend .env (MONGO_URL, DB_NAME, JWT_SECRET, MYGENIE_API_URL, etc.)
6. Wrote provided frontend .env (REACT_APP_API_BASE_URL, REACT_APP_BACKEND_URL, etc.)
7. Ran `pip install -r requirements.txt` and `yarn install --ignore-engines`
8. Restarted both supervisor services — both running green
9. Confirmed: `GET /api/healthz` → `{"ok":true,"mongo":"up"}`
10. Confirmed: Frontend loads at https://customer-app-5th.preview.emergentagent.com

## Environment Variables
### Backend (/app/backend/.env)
- MONGO_URL: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
- DB_NAME: mygenie
- CORS_ORIGINS: *
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- JWT_SECRET: set
- MYGENIE_POS_LOGIN_PHONE/PASSWORD: set

### Frontend (/app/frontend/.env)
- REACT_APP_BACKEND_URL: https://customer-app-5th.preview.emergentagent.com
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_IMAGE_BASE_URL: https://preprod.mygenie.online
- REACT_APP_CRM_URL: https://crm.mygenie.online/api
- REACT_APP_GOOGLE_MAPS_API_KEY: set
- REACT_APP_LOGIN_PHONE/PASSWORD: set

## App Pages
- Landing / Customer Capture (phone + name input)
- Menu / DiningMenu
- ReviewOrder
- OrderSuccess
- Profile, Login, PasswordSetup
- DeliveryAddress, FeedbackPage, ContactPage, AboutUs
- AdminSettings (admin panel)

## Status
- Frontend: RUNNING (compiled with only ESLint warnings — non-blocking)
- Backend: RUNNING (all startup checks passed)
- MongoDB: UP (external host confirmed)

---

## Architecture Correction Programme — REGISTERED 2026-09-12 (Role 1 INTAKE done, owner decisions RECORDED, no code)
- Umbrella: `change_requests/CR-2026-09-12-001-architecture-correction-programme/` — `INTAKE_DOC.md`, `OWNER_DECISIONS_2026-09-12.md` (12 answers), `EXECUTION_PLAN.md` (Points 1–8).
- 13 child CRs + 1 INV, waves 0–5 + Phase B (MySQL, intake-only). Registry section: `change_requests/README.md`.
- **Now:** Point 1 (Wave 0 QA backlog, CR-2026-09-12-002) is APPROVED TO START — owner assigns the QA role. Wave 1 approved for Planning after Wave 0.
- Session handover: `SESSION_HANDOVER_2026-09-12.md`.
- Pre-intake proposal (reference only): `ARCHITECTURE_PLAN_2026-06_PHASE_A.md`.

## Architecture Correction Track (2026-06) — superseded by programme above
- Handover: `/app/memory/SESSION_HANDOVER_2026-06-ARCHITECTURE-TRACK.md` (read first)
- Readiness summary: `/app/memory/master_outlet/PRE_MODULE_ARCHITECTURE_READINESS.md`
- Master Outlet architecture (paused until architecture decision): `/app/memory/master_outlet/ARCHITECTURE_REEVALUATION.md` + team HTML
- Owner instruction: correct the architecture first; next agent re-investigates and proposes next step.

## Active Change Requests

| CR ID | Title | Severity | Risk | Status |
|-------|-------|----------|------|--------|
| CR-2026-09-07-001 | Inventory stock-out control — FE three-layer defence | P1 | HIGH | **QA CLOSED ✅ — 2026-09-08** |
| CR-2026-09-08-001 | `MenuItem.jsx` no-image ADD button missing `isChannelAllowed` guard | P3 | MEDIUM | **INTAKE ✅ — awaiting Planning approval** |
| BUG-2026-09-08-001 | `response is not defined` crash on 422 in `handlePlaceOrder` | **P0** | CRITICAL | **✅ CLOSED — Wave 0 QA 10/10 PASS 2026-09-12** |
| BUG-2026-09-10-001 | Logo/image upload broken — replace Emergent object storage with local disk | P1 | MEDIUM | **✅ CLOSED — Wave 0 signoff 2026-09-12** (orig QA 25/25 PASS 2026-09-10) |
| INV-2026-09-10-001 | Razorpay script missing from index.html — payment TypeError at ReviewOrder:1139 | **P0** | CRITICAL | **✅ CLOSED — owner asserted pushed to main 2026-09-12** |
| CR-2026-07-03-000 | Remove hardcoded POS login credentials | P1 sec | MEDIUM | **✅ CLOSED — POS-auth proxy live (HTTP 200 JWT), Wave 0 QA 2026-09-12** |
| CR-2026-07-03-002 | Remove dead `/api/restaurant-info/{id}` fetch | P3 | LOW | **✅ CLOSED — Wave 0 QA 2026-09-12** |
| CR-2026-07-03-004 | Frontend fetch timeouts + AbortController (plumbing) | P2 | MEDIUM | **✅ CLOSED (plumbing scope) — Wave 0 QA 2026-09-12**. UI wiring folded into Wave 5 CR-012/013. |
| CR-2026-08-06-001 | Time-controlled ordering (per-channel hours) | P1 | CRITICAL | **✅ CLOSED — Wave 0 QA 30/30 code-verified 2026-09-12**. Owner UAT recommended (nice-to-have). |
| CR-2026-06-17-002 | Channel preview in admin (APP-9/7/10) | P2 | LOW | **✅ CLOSED — Wave 0 QA 2026-09-12** |
| CR-2026-06-17-003 | Customer menu availability (APP-11/12/13) | P1 | HIGH | **✅ CLOSED — Wave 0 QA 11/11 2026-09-12**. Owner UAT of a time-gated item recommended. |
| CR-2026-06-17-001 | Menu-order enhancements (Phase 1+2) | P1 | HIGH | **✅ CLOSED — owner sign-off 2026-09-12** |

## Wave 0 (CR-2026-09-12-002) — QA Backlog Closure

**Status:** ✅ CLOSED 2026-09-12 — 10/10 items PASS + 4/4 notes CLOSED, 0 FAIL.
**Summaries:** `/app/memory/change_requests/CR-2026-09-12-002-qa-backlog-closure/QA_SUMMARY.md` + `NOTES_CLOSURE_2026-09-12.md`
**Notes closed on 2026-09-12 (owner directive: zero backlog before Wave 1):**
- **N-1** ✅ FIXED — Fast Lane deletion of 4 stale keys from `frontend/.env`
- **N-2** ✅ VALIDATED — Live channel-hours admin→customer flow (Delivery grayed with "Opens 11:55 PM")
- **N-3** ✅ VALIDATED — Live `categoryTimings` PUT/GET + menu-page render (129 items, 0 errors)
- **N-4** ✅ VALIDATED — Upload path byte-perfect round-trip; legacy-URL cleanup remains an OPS task (see backlog)

**Next gate open:** Wave 1 Planning (CR-2026-09-12-003, -004, -005, -007 F-07). Owner may assign Role 2.

**Wave 1 CR-005 split — Phase 2 registered 2026-09-12:** CR-2026-09-12-015 (GitHub Actions CI workflow) filed via Role 1. BLOCKED on owner git access + 6 repo secrets. See `CR-2026-09-12-015-.../INTAKE_DOC.md`.

**Wave 1 Impact Analyses (all 5 CRs) — COMPLETE 2026-09-12** — per docs in each CR folder. Blocking owner decisions outstanding: CR-003 (7) + CR-004 (8) + CR-007 F-07 (4) = 19 total. CR-005 P1 + CR-015 have zero outstanding decisions.

**CR-2026-09-12-005 Phase 1 Impact Analysis — APPROVED BY OWNER 2026-09-12.** Gate 2 (Planning — Impact Analysis stage) CLOSED for this CR. Owner literal: *"approved document this and close gate 2 session"*. Next owner-driven session will re-open Planning (Role 2) for IMPLEMENTATION_PLAN drafting; then owner "go" gates entry to Role 3 Implementation.

**CR-2026-07-03-007 F-07 Impact Analysis — APPROVED BY OWNER 2026-09-12.** Same-day Planning gate closed. All 4 D-007-* decisions + 2 Q-F07-* + 5 A-N assumptions frozen. Notable outcomes: rotation of POS creds + `JWT_SECRET` + Maps key stays inside CR-007 F-06 (existing scope); orphan `GOOGLE_MAPS_API_KEY` on backend deleted inside F-07; 2 dead FE source refs (`REACT_APP_CRM_API_KEY`, `REACT_APP_RESTAURANT_ID`) spun off to new CR-2026-09-12-016 (Wave 3) to be filed by owner via Role 1.

**CR-2026-09-12-004 Impact Analysis — APPROVED BY OWNER 2026-09-12.** Gate 2 CLOSED. Owner literal: *"as suggested above for this CR"*. All 8 D-004-* + 7 A-N decisions frozen. Locked outcomes: hybrid static-list + regex CORS allow-list (env-driven); rate-limit IP+phone via `slowapi` in-memory (10/5/5/3 per-min per-IP); 5 security headers; fail-fast on wildcard-CORS + credentials; 500-handler adds `request_id` UUID.

**Wave 1 IA phase — 100% CLOSED 2026-09-12.**

**Session handover for next agent:** `/app/memory/SESSION_HANDOVER_WAVE_1_CLOSURE_2026-09-12.md` — mandatory read; 10-section roadmap covering priority queue, blockers, gate rules, code truth, and Wave 1 success criteria.

**Wave 1 split — 2026-09-13 (Planning Role 2 session):**
Wave 1 formally split into Wave 1a (3 unblocked CRs, IA gates all closed, proceed to IMPLEMENTATION_PLAN) and Wave 1b→Wave 2 (3 blocked CRs, owner-side prerequisites outstanding).

**Wave 1a — IA gates ALL CLOSED 2026-09-13:**
- CR-2026-09-12-005 P1 (pytest + snapshots) — IA APPROVED, proceed to IMPLEMENTATION_PLAN
- CR-2026-07-03-007 F-07 (env housekeeping) — IA APPROVED, proceed to IMPLEMENTATION_PLAN
- CR-2026-09-12-004 (CORS + rate-limit + middleware) — IA APPROVED, proceed to IMPLEMENTATION_PLAN
- Build order: CR-005 P1 → CR-007 F-07 → CR-004

**Wave 1b → deferred to Wave 2:**
- CR-2026-09-12-015 (GitHub Actions CI): blocked on git access + 6 GitHub secrets
- CR-2026-09-12-017 (CRM SMS): blocked on CRM API contract + DLT registration + SMS template + sender ID + UAT phones
- CR-2026-09-12-003 (OTP echo removal): blocked on CR-017 closing first

**Docs updated this session:** OWNER_DECISIONS_2026-09-12.md (addendum), EXECUTION_PLAN.md (v1.1), all 6 Wave 1 CR IA/INTAKE docs, README.md, PRD.md (this section), SESSION_HANDOVER_2026-09-13.md (new).

**Next gate open:** Wave 1a IMPLEMENTATION_PLAN phase. Owner assigns Role 2 for IMPLEMENTATION_PLAN drafting for each Wave 1a CR (in build order). No code until each IMPLEMENTATION_PLAN has owner "go".

**Wave 1 · IA phase — CLOSED 2026-09-12.** All 6 Wave-1 items have Impact Analyses on disk:
- CR-005 P1: APPROVED (Gate 2 CLOSED)
- CR-015: complete (blocked on git access + secrets)
- CR-007 F-07: APPROVED (Gate 2 CLOSED)
- CR-017: intake done, awaiting Planning
- CR-003: PARTIALLY FROZEN, blocked on CR-017
- CR-004: **FROZEN 2026-09-12** — all 8 D-004-* + 7 A-N decisions locked; awaiting owner APPROVED to close its Gate 2. Key outcomes: hybrid static-list + regex allow-list (env-driven, no DB collection); rate-limit (IP+phone) on all auth endpoints via `slowapi` in-memory; 5 security headers; fail-fast on wildcard-CORS + credentials at startup; 500-handler adds `request_id` UUID.

**Wave 1 build order revised 2026-09-12:** CR-005 P1 → CR-007 F-07 → CR-2026-09-12-017 (CRM SMS finalization) → CR-003 → CR-004 → CR-015 (Phase 2).

**CR-2026-09-12-017 registered 2026-09-12** via Role 1 INTAKE (this session). Status: NEXT ROLE Planning (Role 2). Blocked on owner supplying: CRM API contract for `/customer/send-otp`, DLT registration status, SMS template, sender ID, UAT phone list, fallback decision (MSG91 pivot?). Full owner-side prereq list in `CR-2026-09-12-017-.../INTAKE_DOC.md §7`.

## Ops Backlog (non-code)

| Item | Owner | Priority | Detail |
|------|-------|----------|--------|
| Notify 4 restaurant admins (364, 716, 523, 672) to re-upload logos via Admin UI | Restaurant ops team | P3 | Legacy URLs on `app.mygenie.online//api/uploads/...` are 404. Upload path is functional. |

## Active Investigations (session — not yet filed as separate INV docs)

| Ref | Description | Outcome |
|-----|-------------|---------|
| INV-2026-09-07-001 | Stock-out gap analysis — FE vs BE contracts | COMPLETE — feeds CR-2026-09-07-001 |

---

## Re-Deploy Session (2026-09-08 — this pod)
1. Cloned repo (branch: main) from `/tmp/customer-app` → synced `/app/backend/` and `/app/frontend/`
2. Preserved platform files: `.emergent/`, supervisor configs
3. Copied full `memory/` tree from repo → `/app/memory/`
4. Wrote backend `.env`: MONGO_URL, DB_NAME, CORS_ORIGINS, MYGENIE_API_URL, JWT_SECRET, POS creds
5. Wrote frontend `.env`: REACT_APP_BACKEND_URL (platform URL), REACT_APP_API_BASE_URL, image/maps/CRM keys
6. Ran `yarn install --ignore-engines` and `pip install -r requirements.txt`
7. Restarted both services via supervisorctl — both confirmed RUNNING
8. Verified: `GET /api/healthz` → `{"ok":true,"mongo":"up"}`
9. Verified: Frontend compiles, loads at https://react-app-preview-12.preview.emergentagent.com
