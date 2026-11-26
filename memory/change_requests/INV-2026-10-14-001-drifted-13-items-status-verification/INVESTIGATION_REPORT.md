# INVESTIGATION REPORT — 13 drifted registry items (code-verified actual status)

**ID:** INV-2026-10-14-001 (batch investigation; not yet registered in index.yml — read-only)
**Role:** INVESTIGATION (ROLE 6) · **Date:** 2026-10-14 · **Access:** READ-ONLY (no code / index.yml / Sheet writes)
**Trigger:** SHEET DRIFT showed 13 items set to Priority=P0 on the Sheet with blank Priority in `index.yml`.
Owner hypothesis: "these are either done or being done through some other CR." **Verdict: NOT confirmed** —
see table. All 13 are registry status **INTAKE**; 12 of 13 have **zero code markers** in source.

## Method
- Read each item's `index.yml` block + folder docs (INTAKE/CR/QA).
- Traced the actual frontend/backend source for each item's signature artefact (endpoint, file, dir, guard, token).
- Counted `CR/BUG-ID` code markers in `backend/server.py` + `frontend/src`.

## Headline
| Actual status | Count | Items |
|---|---|---|
| **DONE** | 0 | — |
| **PARTIAL** | 1 | BUG-2026-09-10-001 (Wave-0 hardening done; owner-confirmed S3 direction NOT done) |
| **NOT DONE (code)** | 9 | CR-07-03-009, -011, -012, -07-04-003, -04-004, -09-08-001, -09-12-006, -007, -008, -010 (see note) |
| **NOT CODE-VERIFIABLE (ops/data)** | 1 | CR-2026-07-03-008 (prod DB data remediation — no app code expected) |
| **UMBRELLA (status = children)** | 1 | CR-2026-09-12-001 (all traced children NOT DONE) |

*(count lists 10 ids in "NOT DONE" bucket — see per-item detail; CR-09-12-010 included.)*

---

## Per-item detail

### 1. BUG-2026-09-10-001 — image upload writes to local disk → **PARTIAL**
- **Claimed:** move image upload to POS S3 endpoint; read logo from POS profile (owner-confirmed direction 2026-10-10).
- **Code reality:** `server.py` L921-936 **still writes to local disk** (`uploads_dir / filename).write_bytes(...)`; L1327-1328 code marker `# BUG-2026-09-10-001: ensure uploads dir exists on startup`. 4 markers in source.
- **What's done:** Wave-0 hardening — persistent uploads dir (survives restart), 401 on unauth upload, 404 on missing file. `QA_REPORT_WAVE_0_SIGNOFF.md` (2026-09-12) records 25/25 PASS, owner "smoke-ready", "Next: CLOSED".
- **What's NOT done:** the POS S3 migration + read-logo-from-POS-profile (status_note: "Blocked on POS reply").
- **Conflict:** QA doc says effectively closed (Wave-0 scope); index.yml still INTAKE and tracks the *newer* S3 direction. The S3 functionality is **not** in the code.

### 2. CR-2026-07-03-008 — prod DB data-quality remediation → **NOT CODE-VERIFIABLE (ops/data)**
- **Claimed:** DATA-only cleanup on prod Atlas (15 users w/o config, 9 orphan configs, double-slash logo URLs, booleans-as-strings). Intake explicitly: "write-path code fixes deferred".
- **Code reality:** nothing to find in the app repo — this is a DB operation. 0 markers.
- **Status:** cannot be confirmed from the codebase; needs a prod DB check by ops. Not an app-code item.

### 3. CR-2026-07-03-009 — observability + LB probe → **NOT DONE (code side)**
- **Claimed:** F-13 wire LB/probe to `/api/healthz`; F-12 structured alerting on Mongo timeouts.
- **Code reality:** `/api/healthz` exists (`server.py` L961, shipped earlier by CR-2026-07-03-003). **No** structured alerting / F-12 code. 0 markers.
- **Status:** F-13 probe wiring is ops-owned (outside this repo). F-12 code = NOT DONE.

### 4. CR-2026-07-03-011 — full POS-proxy refactor → **NOT DONE**
- **Claimed:** proxy all POS write calls through FastAPI; remove `order_auth_token` from browser; deprecate `authToken.js` helpers; rewrite interceptors.
- **Code reality:** `frontend/src/utils/authToken.js` **still active** — `order_auth_token` storage key (L6), `storeToken` (L61), `loginForToken` (L87, called L140/149/155). Token still lives in browser localStorage. 0 markers.
- **Status:** NOT DONE (HIGH-risk architectural refactor; still pending). Addresses P0 BUG-001/002.

### 5. CR-2026-07-03-012 — leaked-cred doc scrub + CI lint → **NOT DONE (prework staged)**
- **Claimed:** redact `9579504871`/`Qplazm` across 18 docs; fix `PasswordSetup.jsx` example; add `scripts/check-no-secrets-in-bundle.sh` CI lint.
- **Code reality:** the credential **still appears in many docs** (incl. the target CR-07-03-000 docs, `DEPLOYMENT_HANDOVER.md`, etc.). **No** `scripts/` dir / CI lint installed. Prework staged but unapplied: `memory/v2/check_no_secrets.sh`, `memory/v2/phase1_doc_redaction.patch`, `memory/v2/phase1_guardrail_new_file.patch`. 0 markers.
- **Status:** NOT DONE (patches drafted, never applied).

### 6. CR-2026-07-04-003 — CR-004 residual (menu empty-state + 5 AdminConfig CRUD timeout swaps) → **NOT DONE**
- **Claimed:** empty-state-with-CTA on menu-load timeout (`data-testid="timeout-error-menu-load-retry-button"`); swap 5 raw `fetch` in `AdminConfigContext.jsx` to `apiWriteClient`; success criterion S-03 = `grep "await fetch(" == 0`.
- **Code reality:** `AdminConfigContext.jsx` **still has 5 `await fetch(`** (S-03 fails). **No** `timeout-error-menu-load-retry-button` testid anywhere. 0 markers.
- **Status:** NOT DONE (both halves).

### 7. CR-2026-07-04-004 — client telemetry to Mongo → **NOT DONE**
- **Claimed:** `POST /api/telemetry/client-event`, `client_telemetry_events` collection (30-day TTL), `sendTelemetry()` hook in `fetchWithTimeout.js` + ErrorBoundary, admin read endpoint, IP-hash salt env.
- **Code reality:** **no** telemetry endpoint, collection, or `sendTelemetry` anywhere in backend/frontend. 0 markers.
- **Status:** NOT DONE (no telemetry infra exists).

### 8. CR-2026-09-08-001 — MenuItem no-image ADD missing `isChannelAllowed` → **NOT DONE**
- **Claimed:** add `isChannelAllowed` to the no-image ADD-button condition (L~165) to match the image layout (L~235).
- **Code reality:** `MenuItem.jsx` L165 still `isAvailable && isOnlineOrderEnabled` (**omits** `isChannelAllowed`); L235 image layout correctly includes it. The P3 defect **still exists**. 0 markers.
- **Status:** NOT DONE (one-line defence-in-depth gap remains).

### 9. CR-2026-09-12-001 — Architecture Correction Programme (umbrella) → **status = children; children NOT DONE**
- **Claimed:** umbrella owning sequencing of children (backend split, FE facade, route guard, config SSOT, POS proxy…). No code of its own.
- **Code reality:** every traced child below is NOT DONE. 0 markers.
- **Status:** umbrella still open; no child shipped.

### 10. CR-2026-09-12-006 — backend modular split → **NOT DONE**
- **Claimed:** split `server.py` into `backend/app/{core,db,models,repositories,services,routers}`; delete dead `/api/docs/*`.
- **Code reality:** **no `backend/app/` dir**; `server.py` is still a single file (**1,329 lines** — down from 1,829, i.e. it shrank over time but was never modularised). 0 markers.
- **Status:** NOT DONE.

### 11. CR-2026-09-12-007 — FE API-client facade + `session.js` → **NOT DONE**
- **Claimed:** `src/api/clients/{own,pos,crm}.js` + `src/session/session.js`; migrate raw fetch / env / storage call-sites.
- **Code reality:** **no `src/api/clients/` dir, no `src/session/` dir**. 0 markers.
- **Status:** NOT DONE.

### 12. CR-2026-09-12-008 — FE `ProtectedRoute` / `RoleGuard` → **NOT DONE**
- **Claimed:** `components/guards/{ProtectedRoute,RoleGuard}.jsx`; wrap admin + profile routes.
- **Code reality:** **no `frontend/src/components/guards/` dir**. Admin still guarded only by `AdminLayout` post-render redirect (per intake). 0 markers.
- **Status:** NOT DONE.

### 13. CR-2026-09-12-010 — config defaults single source of truth → **NOT DONE**
- **Claimed:** single `DEFAULTS` in `services/config_service.py`; `GET /api/app-config/defaults`; FE bootstraps from it; backfill script.
- **Code reality:** **no `/api/app-config/defaults` endpoint**; FE `RestaurantConfigContext.jsx` still carries hardcoded `DEFAULT_CONFIG` (L28); backend defaults still in `get_app_config()`. Triplication intact. 0 markers.
- **Status:** NOT DONE.

---

## Conclusion
- **The owner hypothesis is NOT supported by the code.** None of the 13 were quietly completed under another CR. 12/13 have zero code markers; the signature artefact for each is absent from the source.
- **Only exception:** BUG-2026-09-10-001 is PARTIAL — a Wave-0 hardening (persistent local disk) was done and QA-signed, but the owner-confirmed POS-S3 direction is NOT in the code.
- The Sheet's "P0" on these items reflects **triage priority the owner set on the Sheet**, not delivery — they remain genuinely open (mostly the architecture-correction track, CR-09-12-001 and its children).

## Recommendation (owner decides — read-only role, no action taken)
1. These stay **open**; the Priority=P0 you set on the Sheet is reasonable for the security/architecture ones (CR-011 POS proxy, CR-008 route guard, CR-012 cred scrub) — but it won't persist until written into `index.yml` (reverse write-back is deferred; do it via SHEET PUSH direction decision).
2. **Quick wins** that are cheap and self-contained: CR-09-08-001 (one-line guard), CR-07-04-003 S-03 (5 fetch swaps), CR-07-03-012 (apply the already-drafted redaction patches + add the staged `check_no_secrets.sh`).
3. **Heavy architecture items** (CR-06 backend split, CR-07 FE facade, CR-08 guard, CR-10 config SSOT, CR-11 POS proxy) belong to the CR-09-12-001 programme — sequence via Planning, not ad-hoc.
4. BUG-09-10-001: decide whether Wave-0 (local disk, already QA-passed) is acceptable to **close**, or keep open pending the POS S3 reply.
5. CR-07-03-008 (prod data) + CR-07-03-009 F-13 (LB probe) are **ops/DB tasks** — verify outside this repo.

**Recommended next role:** PLANNING (to sequence the architecture track) and/or a registry-hygiene pass to set real Priority on these 13 in `index.yml`. Not started — awaiting owner.
