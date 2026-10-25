# RECONCILIATION ADDENDUM — INV-2026-10-14-001

**Date:** 2026-10-14 · **Role:** INVESTIGATION (read-only) · Builds on INVESTIGATION_REPORT.md
**Purpose:** Reconcile the 13 drifted items + architecture track against what the recent
CRM-contract / dead-API batch (CR-2026-10-03-*, CR-2026-09-15-*, CR-2026-09-12-004) actually shipped,
then list the CRs still to take, grouped Security / Data / Cleanup.

## A. Already SHIPPED in the recent batch (code-verified) — only needs owner SMOKE to close
| ID | What it did | Code evidence |
|---|---|---|
| CR-2026-10-03-001 (SMOKE) | Deleted the 14 dead CRM-table call sites + legacy `/api/customer/*` shim | `server.py`: no `/api/customer/*`, no `crm_db`/table reads |
| CR-2026-10-03-002 (SMOKE) | **Security:** stopped admin `db.users` reads leaking CRM `api_key`/`authkey_api_key` | no `api_key` refs left in `server.py` |
| CR-2026-10-03-003 (SMOKE) | **Data:** feedback no longer written into CRM's `feedback` collection in wrong schema | — |
| CR-2026-10-03-004 (SMOKE) | Pre-login reads → CRM API (`check-customer`→`/scan/auth/lookup`, loyalty-settings) | — |
| CR-2026-09-15-001 (SMOKE) | Profile orders/points/wallet via CRM v2 `/scan/` | — |
| CR-2026-09-15-004 (SMOKE) | Removed admin-login direct read of CRM `users` (Direction D) | — |
| CR-2026-09-12-004 (shipped) | **Security:** CORS lockdown + in-memory rate-limit (5/min on sensitive routes) + security headers | `server.py` L19-84, `@limiter.limit` |
| CR-2026-07-03-000 (shipped) | Removed hardcoded login creds from the runtime bundle | no `REACT_APP_LOGIN_PASSWORD` in `src` |

➡️ **These are done in code.** They are the "dead APIs out + CRM contract" work the owner remembered.
Recommend a single SMOKE session to formally close the SMOKE ones.

## B. STILL OPEN — code-verified not done (the CRs to take)

### B1. SECURITY
| Proposed CR | Problem | Status now |
|---|---|---|
| **POS-proxy refactor** (= CR-2026-07-03-011) | Browser still holds POS `order_auth_token` in localStorage and calls POS directly for order writes; XSS can steal it. Move all POS writes behind FastAPI. | NOT DONE (confirmed: `authToken.js` live) |
| **FE route guard** (= CR-2026-09-12-008) | `/admin/*` guarded only by post-render redirect; `/profile` unguarded at route level → brief unauthorised render. Add `ProtectedRoute`/`RoleGuard`. | NOT DONE (no `components/guards/`) |
| **table-config CRM token pin** (= CR-2026-10-04-001) | `GET /api/table-config` falls back to CRM `users.mygenie_token`, pinning one CRM session for all. | INTAKE |
| **CRM lookup 429 fragility** (backlog; new CR) | `/scan/auth/lookup` 429s under burst → known diner silently downgraded to guest → loyalty guard skipped, non-stackable coupon can auto-apply. | OPEN (investigation not started) |
| **Doc cred scrub + CI lint** (= CR-2026-07-03-012) | Real phone/password still in ~18 committed docs; no CI guard against `REACT_APP_*_PASSWORD/SECRET/TOKEN` in the bundle. Patches drafted in `memory/v2/`, never applied. | NOT DONE (prework staged) |

### B2. DATA / INTEGRITY
| Proposed CR | Problem | Status now |
|---|---|---|
| **Prod DB data-quality remediation** (= CR-2026-07-03-008) | 15 restaurants w/o config, 9 orphan/malformed configs, double-slash logo URLs, booleans-as-strings in prod Atlas. | OPEN (ops/DB task, not app code) |
| **Config defaults single source of truth** (= CR-2026-09-12-010) | Defaults triplicated (backend `get_app_config`, FE `DEFAULT_CONFIG`, DB docs) and drifting; backfill restaurants missing config docs. | NOT DONE (no `/api/app-config/defaults`) |
| **Duplicate coupon application** (= BUG-2026-10-11-005) | CRM coupon can be applied on both scan channel + POS. | OPEN (POS-side confirmation needed) |
| **Client telemetry to Mongo** (= CR-2026-07-04-004) | No persistence of client timeouts/errors; can't debug incidents after the fact. (data-capture, 30-day TTL) | NOT DONE |

### B3. CLEANUP / ARCHITECTURE HYGIENE
| Proposed CR | Problem | Status now |
|---|---|---|
| **Delete dead `/api/docs/*` routes** (slice of CR-2026-09-12-006) | 9 dead doc routes still served (`server.py` L1190-1261). Cheap, low-risk delete. | NOT DONE |
| **Backend modular split** (= CR-2026-09-12-006 main) | `server.py` still one ~1,329-line file; all DB access inline. Multi-brand blocker. | NOT DONE |
| **FE API-client + session facade** (= CR-2026-09-12-007) | 3 backends wired from 20+ files; mixed axios/fetch; 56 scattered storage calls. | NOT DONE |
| **Remove `478`/`pos_id`/`+91` hardcoding** (= CR-2026-09-12-009) | Hardcoded defaults block multi-brand; "Restaurant not found" page needed. | INTAKE |
| **Menu-load empty-state + 5 AdminConfig fetch swaps** (= CR-2026-07-04-003) | Frozen skeleton on menu timeout; 5 admin raw `fetch` at 90s default. | NOT DONE |
| **MenuItem no-image channel guard** (= CR-2026-09-08-001) | No-image ADD button omits `isChannelAllowed` (one-line). | NOT DONE |
| **Observability / LB probe + Mongo alerting** (= CR-2026-07-03-009) | `/api/healthz` exists but no probe wired; no timeout alerting. | Ops-owned + small code; NOT DONE |

### B4. GOVERNANCE (not security/data/cleanup, listed for completeness)
- **Architecture Correction Programme umbrella** (= CR-2026-09-12-001) — sequences B1/B2/B3 architecture children; still open.
- **Registry hygiene** — set real Priority on these items in `index.yml`; reconcile `INV-2026-10-09-002` folder + README lag (from SHEET DRIFT).

## C. READINESS — which of the 13 can be SUMMONED (started) now
"Summonable" = no blocker, no pending prerequisite/decision → can go Intake→Planning→Impl immediately.
**None are DONE / closeable** (code trace confirms each is still open; only BUG-09-10-001 has partial shipped code for the old local-disk scope).

| Readiness | Items | Note |
|---|---|---|
| ✅ **READY NOW** | CR-2026-09-08-001 · CR-2026-07-04-003 · CR-2026-07-03-012 | self-contained; 09-08-001 one-line; 07-04-003 prereqs met; 07-03-012 patches already drafted in `memory/v2/` |
| ⚠️ **READY after 2 owner inputs** | CR-2026-07-04-004 | needs retention (30d?) + rate-limit (5/IP/min?) decisions |
| ⛔ **BLOCKED / sequenced / ops** | CR-2026-09-12-006 (needs CR-09-12-005 contract snapshots) · CR-09-12-007 (NEW-2+NEW-3) · CR-09-12-008 (NEW-2) · CR-09-12-010 (G0.7, after 006) · CR-2026-07-03-011 (idempotency INV + endpoint sign-off, HIGH risk) · CR-2026-07-03-008 (ops/DB) · CR-2026-07-03-009 (ops probe) · BUG-2026-09-10-001 (POS reply) · CR-2026-09-12-001 (umbrella, orchestrates children) | |

## D. BATCHES for next session (the 13 + adjacent items found during reconciliation)
- **SECURITY batch:** CR-07-03-011 (POS proxy) · CR-09-12-008 (route guard) · CR-07-03-012 (cred scrub + CI lint) · *(adjacent)* CR-10-04-001 (table-config CRM token pin) · *(new)* CRM-429 identity-downgrade
- **DATA batch:** CR-07-03-008 (prod DB cleanup) · CR-09-12-010 (config defaults SSOT) · CR-07-04-004 (telemetry) · *(adjacent)* BUG-10-11-005 (duplicate coupon)
- **CLEANUP batch:** dead `/api/docs/*` delete (slice of CR-09-12-006) · CR-09-12-006 (backend split) · CR-09-12-007 (FE facade) · CR-09-12-009 (478/pos_id/+91 hardcoding) · CR-07-04-003 (menu empty-state + fetch swaps) · CR-09-08-001 (MenuItem guard) · CR-07-03-009 (observability)
- **Governance:** CR-09-12-001 umbrella sequences the architecture children (006/007/008/010/011); close the 8 recent SMOKE items; registry-hygiene (set real Priority, reconcile INV-2026-10-09-002 folder + README lag).

## E. Notes
- The recent batch closed the **CRM axis** (dead CRM calls, api_key leak, feedback schema, pre-login lookups) and **CORS/rate-limit**. It did **not** touch the **POS axis** (CR-011) or the FE/BE structural work.
- Nothing here is money-path-breaking today; the sharpest live risk is the **429 identity downgrade** (security + revenue via coupon guard).
- This INV (INV-2026-10-14-001) is **not yet registered in `index.yml`** (read-only role). Register it at next session's intake if you want it tracked.
