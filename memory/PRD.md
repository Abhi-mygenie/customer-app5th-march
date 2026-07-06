# PRD — Customer App (MyGenie)

## Original Problem Statement
Pull latest code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch: `3-july`) directly into `/app`, create required `.env` files, install deps and start services. Then act as an ongoing operating agent under `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`.

## Session Log

### 2026-07-03 (Initial pull)
- Cloned `3-july` branch into `/app` (merged into existing scaffold, preserved `.git`/`.emergent`).
- Removed conflicting `frontend/jsconfig.json` (repo ships `tsconfig.json`).
- Installed backend + frontend deps.
- Created `.env` files with placeholders for user secrets.
- Restarted supervisor — both services RUNNING.
- Later in the same session, switched `MONGO_URL` to shared MyGenie remote (`mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie` per `DEPLOYMENT_HANDOVER.md` §5.1).

### 2026-07-04 (Ongoing operating session)
- **CR-2026-07-03-010** ✅ SHIPPED — Registry hygiene: renamed `BUG_TRACKER_v2.md` → `BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md`; renamed hybrid folder `BUG-035-039-040-041-order-placement-fixes/` → `CR-2026-04-11-001-order-placement-fixes/`; added canonical BUG_TRACKER banner + freeze notice; new `## ID Scheme` section in registry README with tombstone convention; CR-006 tombstone row.
- **INV-2026-07-03-001** ✅ RESOLVED-BY-OWNER-ASSERTION — Order-create idempotency: owner asserted MyGenie POS enforces server-side idempotency. Recorded verbatim in `INV-001/CR.md §0` for future post-mortem attribution.
- **CR-2026-07-03-000** 🚧 IMPLEMENTED (QA-pending) — Removed hardcoded POS credentials from frontend bundle. New FastAPI endpoint `POST /api/pos/auth-token` (with IP logging per D-04(b)) issues short-lived POS tokens server-side. `frontend/src/utils/authToken.js loginForToken()` refactored to call FastAPI instead of POS directly. `REACT_APP_LOGIN_PHONE/PASSWORD` removed from `frontend/.env`. Bundle grep verifies `9579504871|Qplazm` = 0 hits.
- **CR-2026-07-03-011** 📝 REGISTERED — Full POS-proxy refactor (proxy ALL POS write calls through FastAPI). Remediates BUG-001/002. Blocked on CR-000 SHIPPED ✓ + owner decisions D-01..D-04.
- **CR-2026-07-03-012** 📝 REGISTERED — Doc scrub of 18 markdown files leaking `+919579504871 / Qplazm@10` + CI lint rule.
- **CR-2026-07-03-004** 🚧 IMPLEMENTED (QA-pending) — Frontend fetch timeouts + AbortController + design-agent Toast on config timeouts. New `fetchWithTimeout.js` helper. Axios split into `apiReadClient` (8 s) + `apiWriteClient` (15 s). QueryClient defaults changed to `retry:2, backoff cap 5 s`. 8 files touched. **Step 8b micro-fix:** `orderService.ts` swapped `apiClient` from default read (8 s) to `apiWriteClient as apiClient` (15 s) so legitimate slow orders don't get cancelled.

## Tech Stack
- Backend: FastAPI (single-file `server.py`, ~1800 lines), Motor/PyMongo, JWT auth, MyGenie POS + CRM upstream API integration, `httpx` for POS proxy calls.
- Frontend: React 19 + CRA + CRACO, Tailwind, TypeScript for some services (`orderService.ts`), shadcn/ui, `react-hot-toast`, `@tanstack/react-query`.
- DB: shared MyGenie MongoDB at `52.66.232.149:27017/mygenie` (per `DEPLOYMENT_HANDOVER.md` §5.1).

## Currently Running
- `backend RUNNING`, `frontend RUNNING`, `/api/healthz` → `{"ok":true,"mongo":"up"}`, public URL 200.

## Env Var Placeholders — user must fill
| File | Key | Note |
|---|---|---|
| `backend/.env` | `JWT_SECRET` | Placeholder truthy but insecure — `openssl rand -hex 32` |
| `backend/.env` | `MYGENIE_POS_LOGIN_PHONE` | Rotate in MyGenie CRM first, then paste rotated value |
| `backend/.env` | `MYGENIE_POS_LOGIN_PASSWORD` | Same as above |
| `frontend/.env` | `REACT_APP_GOOGLE_MAPS_API_KEY` | Domain-restrict via Google Cloud Console |

## Prioritized Backlog

### P0 / P1 Remaining
| ID | Status | Priority | Effort |
|---|---|---|---|
| CR-000 smoke close | 🚧 Awaiting owner smoke | P1 security | 15 min owner |
| CR-002 admin QA close | 🚧 Awaiting owner smoke | P1 | 30 min owner |
| CR-004 smoke close | 🚧 Awaiting owner smoke | P2 | 5 min owner |
| CR-007 prod deploy hardening | 📝 REGISTERED | P1 security | ½ day (ops/DBA/security) |
| CR-009 F-13 LB probe wiring | 📝 REGISTERED | P1 (F-13) | 30 min ops |
| CR-011 full POS proxy | 📝 REGISTERED | P1 | 2–3 dev-days |

### P2 / P3 Remaining
| ID | Status | Priority |
|---|---|---|
| CR-005 themeVersion + flags dedup | 📋 PLANNED | P3 |
| CR-008 prod DB data quality | 📝 REGISTERED (DATA) | P2 |
| CR-012 doc scrub + CI lint | 📝 REGISTERED | P2 |

### Follow-ups (not filed as CRs yet)
- CR-followup-A: update Alpha v0.1 addendum §10.1349 to reference canonical tracker name
- CR-followup-B: reconcile 39 items dropped from `BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md` vs canonical `BUG_TRACKER.md`
- CR-followup-C: audit legacy `memory_repo/change_requests/` (third ID pattern)
- CR-followup-D: port trackers to Jira/Linear/GitHub Issues
- CR-2026-07-04-001 (proposed, not filed): AlertDialog wiring on order-create + empty-state on menu-load + 5 AdminConfig CRUD/upload fetches with timeouts

## Next Actions
1. Owner runs 3 pending smokes (CR-000, CR-002, CR-004) — closes 3 CRs.
2. Owner rotates leaked CRM credential (`+919579504871 / Qplazm@10`) — enables CR-000 to fully activate + unblocks CR-012 doc scrub.
3. Pick next CR from backlog per session-start prompt priority.

## Session Handover Files (chronological)
- `memory/SESSION_HANDOVER_2026-07-03.md` (prior session)
- `memory/SESSION_HANDOVER_2026-07-04.md` (this session — see for full detail)
