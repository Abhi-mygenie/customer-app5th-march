# CR Registry — Customer-app 3-july branch (Session 2026-07-03)

Index of all Change Requests raised, planned, or shipped during the
INVESTIGATION → PLANNING → IMPLEMENTATION cycles on 2026-07-03.

> **Note on process compliance:** the operating prompt
> `control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` §8 Role 1
> mandates an **INTAKE** step (with an `INTAKE_DOC.md` artefact and
> `Intake complete: <ID>` output block) before any Planning or Implementation.
> The 10 items below were originally created without that step —
> **retroactive `INTAKE_DOC.md` artefacts were added** to each folder to
> restore compliance. Future items should be raised via Role 1 first.

## Legend
- ✅ SHIPPED — code merged, self-tested, QA handover written
- 🚧 IMPLEMENTED, QA-pending — code merged, waiting on human QA
- 📋 PLANNED — CR + IMPLEMENTATION_PLAN written, awaiting owner approval
- 📝 REGISTERED — CR written, no plan yet OR data/ops-owned
- 🔬 AUDIT (INV) — read-only investigation task, no code planned
- ⚰️ TOMBSTONE — ID was issued but renamed to another ID; row kept for traceability

## ID Scheme (canonicalized 2026-07-03 by CR-2026-07-03-010)

This branch uses two ID formats. Both are valid; use is scoped by era, not by type:

| Format | Status | Use for |
|---|---|---|
| `BUG-NNN` (global 3-digit sequence, 001..050) | **FROZEN** at BUG-050 as of 2026-07-03 | Historical cross-references only. Do not issue new IDs in this format. |
| `CR-YYYY-MM-DD-NNN` (per-day 3-digit sequence) | **ACTIVE** — canonical for all new work | New change requests, feature work, refactors, doc updates, data ops. |
| `INV-YYYY-MM-DD-NNN` (per-day 3-digit sequence) | **ACTIVE** | Investigations only (read-only, no code, per Alpha v0.1 §8 Role 6). |

**Canonical bug tracker for the legacy `BUG-NNN` sequence:**
[`/app/memory_repo/BUG_TRACKER.md`](../../memory_repo/BUG_TRACKER.md). Do not consult
[`BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md`](../../memory_repo/BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md)
(formerly `BUG_TRACKER_v2.md`) for status of any BUG-NNN — that file is a historical audit only.

**Tombstones.** If an ID is issued and later renamed (e.g. CR-2026-07-03-006 was renamed
mid-session to INV-2026-07-03-001), a **tombstone row** must be added to the table below
with status `⚰️ TOMBSTONE`, pointing at the successor ID. Do not delete or reuse tombstone IDs.

## Table

| ID | Title | Status | Priority | Files | Effort | Owner action needed |
|---|---|---|---|---|---|---|
| [CR-2026-07-03-000](./CR-2026-07-03-000-remove-hardcoded-login-creds/CR.md) | Remove hardcoded POS login credentials from frontend bundle (Option 1 — FastAPI proxy for token issuance) | 🚧 IMPLEMENTED (QA-pending — needs rotated POS creds in `backend/.env` + owner smoke) | **P1 security** | 4 (2 FE + 2 BE incl. `.env`) | done ✓ | paste rotated creds + 4-step smoke ([QA_HANDOVER §4](./CR-2026-07-03-000-remove-hardcoded-login-creds/QA_HANDOVER.md#4-owner-action-required-to-close-the-last-3-checks)) |
| [CR-2026-07-03-001](./CR-2026-07-03-001-theme-cache-busting/CR.md) | Theme cache busting (`?bustCache=1`) | ✅ SHIPPED | P1 | 1 FE | done | ops broadcasting to team |
| [CR-2026-07-03-002](./CR-2026-07-03-002-remove-dead-restaurant-info-fetch/CR.md) | Remove dead `/api/restaurant-info/{id}` fetch | 🚧 IMPLEMENTED (QA-pending) | P3 | 1 FE | done | admin QA on VisibilityTab + Dietary |
| [CR-2026-07-03-003](./CR-2026-07-03-003-backend-mongo-timeouts-and-healthz/CR.md) | Backend Mongo timeouts + `/api/healthz` | ✅ SHIPPED | P1 | 1 BE | done | ops points probe (see CR-009) |
| [CR-2026-07-03-004](./CR-2026-07-03-004-frontend-fetch-timeouts/CR.md) | Frontend fetch timeouts + AbortController + error UI (plumbing scope; AlertDialog + empty-state deferred to follow-up) | 🚧 IMPLEMENTED (QA-pending — plumbing shipped, error UI wiring deferred) | P2 | 7 FE (~80/−32 LOC) | done ✓ | 6-step smoke ([QA_HANDOVER §5](./CR-2026-07-03-004-frontend-fetch-timeouts/QA_HANDOVER.md#5-owner-smoke-test-5-min)) |
| [CR-2026-07-03-005](./CR-2026-07-03-005-theme-and-flags-dedup/CR.md) | Theme `themeVersion` + dedup follow-ups | 📋 PLANNED | P3 | 3 files | ~1.2 days | approve F-01 design + F-02 cleanup |
| CR-2026-07-03-006 | *(renamed — see INV-2026-07-03-001)* | ⚰️ TOMBSTONE | — | — | — | Renamed mid-session on 2026-07-03; formalised by CR-2026-07-03-010 |
| [INV-2026-07-03-001](./INV-2026-07-03-001-order-create-idempotency-audit/CR.md) | Order-create idempotency AUDIT | ✅ RESOLVED-BY-OWNER-ASSERTION (D-02, 2026-07-04) | **P1** (BLOCKER for CR-004 — CLEARED) | 0 | resolved | none — audit trail in [CR.md §0](./INV-2026-07-03-001-order-create-idempotency-audit/CR.md#0-resolution--owner-assertion-2026-07-04) |
| [CR-2026-07-03-007](./CR-2026-07-03-007-prod-deploy-env-hardening/CR.md) | Prod deploy env hardening (backend URL + secret rotation) | 📝 REGISTERED | **P1 security** | 0 (ops) | half-day distributed | ops + DBA + security team |
| [CR-2026-07-03-008](./CR-2026-07-03-008-prod-db-data-quality/CR.md) | Prod DB data quality remediation | 📝 REGISTERED (DATA) | P2 | 0 code | half-day + owner cross-check | approve seed/archive strategy |
| [CR-2026-07-03-009](./CR-2026-07-03-009-observability-and-lb-probe/CR.md) | Observability + LB probe wiring (post CR-003) | 📝 REGISTERED | P1 (F-13), P3 (F-12) | 0-1 files | 30 min-2 hrs | ops points probe at `/api/healthz` |
| [CR-2026-07-03-010](./CR-2026-07-03-010-registry-hygiene-and-id-scheme-canonicalization/CR.md) | Registry hygiene & ID-scheme canonicalization (BUG-NNN vs CR-YYYY-MM-DD-NNN; tombstones; stale BUG_TRACKER_v2) | ✅ SHIPPED | P2 | 6 MD (docs-only) | ~45 min | none (owner-approved defaults executed 2026-07-03) |
| [CR-2026-07-03-011](./CR-2026-07-03-011-full-pos-proxy-refactor/CR.md) | Full POS-proxy refactor (proxy ALL POS write calls through FastAPI; remediates BUG-001/BUG-002) | 📝 REGISTERED (Role 1 done) | P1 | ~15 files (BE+FE) | 2.5–3.5 dev-days | CR-000 SHIPPED + INV-001 COMPLETE + D-01..D-04 |
| [CR-2026-07-03-012](./CR-2026-07-03-012-leaked-cred-doc-scrub-and-ci-lint/CR.md) | Leaked-credential doc scrub (18 files) + CI lint rule for `REACT_APP_*_PASSWORD/SECRET/TOKEN` | 📝 REGISTERED (Role 1 done) | P2 | 18 MD + 1 FE comment + 1 new CI script | ~1.5 hrs | approve D-01..D-04 + CRM rotation timing |
| [CR-2026-07-04-002](./CR-2026-07-04-002-registry-finish-up/CR.md) | Registry finish-up (A: Alpha v0.1 §10.1349 ref update · B: 39-item reconciliation · C: legacy `memory_repo/change_requests/` README) | 📝 REGISTERED (Role 1 done) | P3 | 1 prompt file + 40+ tracker rows + 1 dir README | 3–4 hrs | approve D-01..D-03 (prompt versioning) |
| [CR-2026-07-04-003](./CR-2026-07-04-003-cr004-residual-scope/CR.md) | CR-004 residual scope (empty-state on menu-load timeout + 5 AdminConfig CRUD timeout swaps) | 📝 REGISTERED (Role 1 done) | P2 | 3-5 FE (menu component + AdminConfigContext) | 2.5–3 hrs | approve D-01..D-04 or wait for user-pain report |
| [CR-2026-07-04-004](./CR-2026-07-04-004-client-telemetry/CR.md) | Client telemetry to Mongo (POST fetch-timeout + React ErrorBoundary events, 30-day TTL, admin read endpoint) | 📝 REGISTERED (Role 1 done) | P2 | 2 BE endpoints + 1 Mongo collection + ~15 LOC FE | ~4 hrs | approve D-01..D-06 (retention, rate-limit, hashing) |

## Architecture Correction Programme (registered 2026-09-12 — Role 1 INTAKE)

Umbrella + children. Owner request: split `server.py`, fix high/critical bugs, remove hardcoding, prepare for multi-brand; MySQL as Phase B.
**Owner decisions (12) recorded 2026-09-12** → `CR-2026-09-12-001/OWNER_DECISIONS_2026-09-12.md`. Numbered plan → `CR-2026-09-12-001/EXECUTION_PLAN.md`.
Gate status: Wave 0 APPROVED TO START (owner assigns QA role) · Wave 1 APPROVED FOR PLANNING after Wave 0 · Waves 2–5 + Phase B sequencing approved, each needs own Planning gate · CR-2026-08-03-001 owner re-read pending.

| ID | Title | Status | Priority / Risk | Wave | Owner action needed |
|---|---|---|---|---|---|
| [CR-2026-09-12-001](./CR-2026-09-12-001-architecture-correction-programme/INTAKE_DOC.md) | **Architecture Correction Programme (umbrella)** | 📝 REGISTERED — owner decisions RECORDED 2026-09-12 | P0 / CRITICAL | — | assign role for Point 1 |
| [CR-2026-09-12-002](./CR-2026-09-12-002-qa-backlog-closure/QA_SUMMARY.md) | QA backlog closure — 10 IMPLEMENTED/QA-pending items | ✅ **CLOSED 2026-09-12 — 10/10 PASS** (owner inputs supplied; 4 non-blocking NOTEs filed) | P1 / LOW | 0 | none — Wave 1 Planning may now open |
| [CR-2026-09-12-003](./CR-2026-09-12-003-otp-echo-removal-persistent-otp-store/IMPACT_ANALYSIS.md) | Remove OTP echo + persistent throttled OTP store (GAP-003) | 🔍 **RE-SCOPED 2026-09-14** — investigation found: (1) backend `/api/auth/send-otp` is never called by the frontend (dead code); (2) CRM is already the SMS provider via frontend-direct calls; (3) CR-017 blocker is INVALID. **New scope:** Part A (delete `otp_for_testing` key — 1-line, zero deps) deferred until owner confirms OTP E2E works on a real device. Parts B+C (Mongo store + attempt cap) deferred until OTP feature is turned ON. | **P1 / LOW** (downgraded from P0 — frontend never calls the leaking endpoint) | **deferred** | Owner to confirm: (a) real SMS arrives on test phone for `crmSendOtp`, (b) decision to turn on OTP — then assign Role 3 for Part A only |
| [CR-2026-09-12-004](./CR-2026-09-12-004-cors-lockdown-rate-limit-middleware/QA_HANDOVER.md) | CORS hybrid static+regex allow-list + auth rate-limit + middleware stack (GAP-005/004) | ✅ **Wave 1a · IMPLEMENTED 2026-09-14** — 22/22 PASS. 6 surgical server.py edits, slowapi rate-limit on 5 auth routes, security headers, CORS fail-fast. QA_HANDOVER.md written. Awaiting QA (Role 4). | **P0 / CRITICAL** | **1a** | QA (Role 4) |
| [CR-2026-09-12-005](./CR-2026-09-12-005-ci-gate-contract-snapshots/IMPACT_ANALYSIS.md) | CI gate + API contract snapshots + smoke tests on UAT Mongo (GAP-009) | ✅ **Wave 1a · CLOSED 2026-09-13** — 22/22 PASS (QA agent verified). Snapshots committed. Safety net live. | P1 / MEDIUM | **1a** (Phase 1) | none — owner drives next session |
| CR-2026-07-03-007 (F-07) | `.env.example` + purge dead FE env keys + rotation checklist — **folded into CR-007** | ✅ **Wave 1a · CLOSED 2026-09-13** — QA agent 8/8 PASS. .env.example files, .gitignore, ROTATION_CHECKLIST created; orphan key deleted. | P1 / LOW | **1a** | none — owner drives next session |
| [CR-2026-09-12-006](./CR-2026-09-12-006-backend-modular-split/INTAKE_DOC.md) | Backend modular split + delete dead `/api/docs/*` (GAP-013/018) | 📝 REGISTERED (Role 1 done) | P1 / CRITICAL | 2 | none until CR-005 CLOSED |
| [INV-2026-09-12-001](./INV-2026-09-12-001-legacy-customer-routes-usage-trace/INVESTIGATION_REPORT.md) | Legacy `customer/*` routes + `AdminSettings.jsx` usage trace (GAP-020) | 🔬 REPORT WRITTEN 2026-09-15 — FE does not call FastAPI `/api/customer/*` (TRUE). **Deletion wording withdrawn** pending owner decision; feature health is CRM-side → see INV-2026-09-15-001 | — | 2 | owner decision on `/api/status` external callers |
| [INV-2026-09-15-001](./INV-2026-09-15-001-profile-data-crm-v2-contract-gap/INVESTIGATION_REPORT.md) | Profile page Orders/Points/Wallet tabs 404 on CRM v2 (`crmGetOrders/Points/Wallet` still on v1 `/customer/me/*`) + CRM contract verification request incl. OTP routes | ✅ **CLOSED 2026-09-15** — root cause confirmed, CRM reply validated, shared-DB fact recorded (§10). Spawned CR-2026-09-15-001/-002, INV-2026-09-15-002, fold-ins to CR-007, guards on CR-006/-014. Owner decisions in `control/OWNER_DECISIONS_2026-09-15.md`. | **P1** | 2 | none |
| [CR-2026-09-15-001](./CR-2026-09-15-001-profile-crm-v2-adapter/INTAKE_DOC.md) | Profile → CRM v2 adapter: orders/points/wallet via `/scan/*`, points sign mapping, `order_type` labels, wallet-tab gating (G1–G5) | 📝 REGISTERED (Role 1 done, 2026-09-15) | **P1 / HIGH** | 2 | Planning; UAT rid 689 |
| [CR-2026-09-15-002](./CR-2026-09-15-002-skip-otp-dead-branch-cleanup/INTAKE_DOC.md) | Remove dead skip-otp 409/429/Retry-After branches (OD-3 accept) | 📝 REGISTERED — PARKED behind CR-2026-09-15-001; coordinate with CR-013 | P3 / HIGH (hotspot file) | 2 | none |
| [INV-2026-09-15-002](./INV-2026-09-15-002-shared-db-collection-ownership-map/INTAKE_DOC.md) | Shared-MongoDB collection ownership map (reads/writes, defaults, config write-lock OD-7, auth-secret overlap) — gates CR-006/010/014 | 📝 REGISTERED (Role 1 done, 2026-09-15) | **P1** (gating) | 2 | owner "go" + CRM counterpart |
| [INV-2026-09-15-003](./INV-2026-09-15-003-direct-crm-table-access-audit/INVESTIGATION_REPORT.md) | Direct CRM-table access audit — 8 collections, 20 sites (14 dead / 6 live). CRM reply INV-022 validated. | ✅ COMPLETE · **Owner decisions 2026-10-03:** F1 ✅ F2=(a) ✅ F4 frozen ✅. CRM reply v2 APPROVED TO SEND. O7 approved. O5 blocked — Q-CA-6 raised. P4 parked. | **P1** | 1 | POS P1 (owner checking) · POS P5 (owner sharing) |
| [CR-2026-09-15-004](./CR-2026-09-15-004-admin-login-users-table-dependency/INTAKE_DOC.md) | Remove admin login direct read of CRM `users`. Direction D (POS direct). P0 projection sub-item. | 📝 REGISTERED — **P0 projection fix approved by owner 2026-10-03**, ship independently. F3 pending impact doc after POS P5. | **P1** (P0 approved) | 2 BE + 2 FE | P0: go to Planning · F3: after P5 |
| [CR-2026-09-15-003](./CR-2026-09-15-003-canonical-phone-alignment/INTAKE_DOC.md) | Canonical phone alignment POS↔CRM↔App: `extractPhoneNumber` blanks non-`+91` numbers (order unlinkable) | 🅿️ **PARKED 2026-10-03** — India-only confirmed by owner. Re-open if international numbers introduced. | P2 / CRITICAL | 2 | none — parked |
| [CR-2026-09-12-007](./CR-2026-09-12-007-fe-api-client-and-session-facade/INTAKE_DOC.md) | FE API-client facade + `session.js` storage facade (GAP-014/011) | 📝 REGISTERED (Role 1 done) | P1 / CRITICAL | 3 | NEW-2, NEW-3 |
| [CR-2026-09-12-008](./CR-2026-09-12-008-fe-route-guard/INTAKE_DOC.md) | FE `ProtectedRoute` / `RoleGuard` (GAP-006) | 📝 REGISTERED (Role 1 done) | P1 / HIGH | 3 | NEW-2 |
| CR-2026-08-03-001 | 716 hardcoding → config flags — **adopted into programme** | 📋 PLANNED (plan complete) — owner re-reading | P1 / HIGH | 3 | read CR.md + IMPLEMENTATION_PLAN.md, then "go" |
| [CR-2026-09-12-009](./CR-2026-09-12-009-remove-default-rid-posid-countrycode-hardcoding/INTAKE_DOC.md) | Remove `478` default → "Restaurant not found" page, `pos_id`, `+91` hardcoding | 📝 REGISTERED (D-478 = remove) | P2 / MEDIUM | 3 | none |
| [CR-2026-09-12-010](./CR-2026-09-12-010-config-defaults-single-source-of-truth/INTAKE_DOC.md) | Config defaults master → **DB record, admin-editable, versioned** (GAP-008) | 📝 REGISTERED (G0.7 = DB) | P1 / HIGH | 3 | approve `config_defaults` schema at Planning |
| [CR-2026-09-12-011](./CR-2026-09-12-011-multi-brand-tenant-readiness/INTAKE_DOC.md) | Multi-brand tenant readiness (`resolveTenant`, `get_tenant()`, namespaced storage) | 📝 REGISTERED (Role 1 done) | P1 / HIGH | 4 | none until CR-006/007 CLOSED |
| CR-2026-07-03-011 | Full POS proxy (BFF) — **re-sequenced into programme Wave 4**, phased, money/credential calls first (NEW-3) | 📝 REGISTERED | P1 | 4 | none until CR-007 CLOSED |
| [CR-2026-09-12-012](./CR-2026-09-12-012-thick-page-decomposition-revieworder/INTAKE_DOC.md) | Thick-page decomposition — `ReviewOrder.jsx` | 📝 REGISTERED (Role 1 done) | P2 / CRITICAL | 5 | none until CR-005/007 CLOSED |
| [CR-2026-09-12-013](./CR-2026-09-12-013-thick-page-decomposition-landing-delivery-ordersuccess/INTAKE_DOC.md) | Thick-page decomposition — Landing / DeliveryAddress / OrderSuccess / legacy AdminSettings | 📝 REGISTERED (Role 1 done) | P2 / HIGH | 5 | none until CR-012 |
| [CR-2026-09-12-014](./CR-2026-09-12-014-phase-b-mysql-migration/INTAKE_DOC.md) | **Phase B — MySQL migration** (INTAKE ONLY) | 📝 REGISTERED — Planning BLOCKED | P2 / CRITICAL | B | D-B1 at Planning time |
| [CR-2026-09-12-015](./CR-2026-09-12-015-github-actions-ci-workflow/IMPACT_ANALYSIS.md) | **GitHub Actions CI workflow** — Phase 2 of the CR-005 split | 🔒 **DEFERRED TO WAVE 2 — 2026-09-13** (was Wave 1b). Blocked on git access + 6 repo secrets + CR-005 P1 close. | P1 / LOW-MEDIUM | **2** (deferred) | grant git access + add 6 secrets after CR-005 P1 closes |
| [CR-2026-09-12-017](./CR-2026-09-12-017-crm-sms-finalization-for-otp/INTAKE_DOC.md) | **CRM SMS finalization for OTP** — prereq for CR-003 | ❌ **PREMISE INVALIDATED 2026-09-14** — investigation (code + live probe) confirmed: CRM is already the SMS provider; frontend calls CRM directly via `crmSendOtp()` → `POST /scan/auth/request-otp`; backend wiring is not needed. CRM v2 endpoint returns HTTP 200 with `dev_otp` in response. **Action:** cancel this CR; real question is whether SMS is physically delivered (owner to confirm on real device). If SMS delivery fails → re-file as a CRM-team investigation, not a customer-app backend CR. | ~~P0~~ **CANCELLED** | — | Owner to check: does SMS arrive on phone `9579504871` when OTP is sent? Answer determines if CRM-team action needed. |

| [CR-2026-09-14-001](./CR-2026-09-14-001-otp-sms-removal/QA_HANDOVER.md) | **Comment out broken OTP SMS path** — frontend (PasswordSetup OTP UI, crmSendOtp/Verify/ForgotPassword/ResetPassword), backend (send-otp endpoint, otp_store, generate_otp, verify_otp, OTPRequest, reset-password, otpRequired* config), admin config (otpRequired* + skipOtp* admin toggles). Code commented with `OTP-DEFERRED` markup, not deleted. Supersedes CR-003 Part A. | 🚧 **IMPLEMENTED 2026-09-15** — 21/21 tests PASS. QA_HANDOVER.md written. Awaiting QA (Role 4). | P2 / LOW | **2** | QA (Role 4) |

Dependencies: `002 → {003,004,005,007(F-07)} → 006 → {007,008,009,010, CR-2026-08-03-001} → 011 → (Master Outlet ∥ 012 → 013) → 014`.
Superseded reference: `/app/memory/ARCHITECTURE_PLAN_2026-06_PHASE_A.md` (pre-intake proposal).

## Shared-DB boundary remediation (registered 2026-10-03 — Role 1 INTAKE)

Gap-closure pass over INV-2026-09-15-003 (direct CRM-table access audit) + CRM reply INV-022 +
owner decisions of 2026-10-03. Every remaining live/dead violation now has a registered ID; the
INV folders keep the evidence, these CRs carry the work. **No code changed at intake.**

| ID | Title | Status | Severity / Risk | Files | Blocked on |
|---|---|---|---|---|---|
| [CR-2026-10-03-001](./CR-2026-10-03-001-delete-dead-crm-table-call-sites/INTAKE_DOC.md) | Delete the 14 dead CRM-table call sites in `server.py` (legacy customer API shim) | 📝 REGISTERED — **owner approved (O7)**, READY FOR PLANNING | P3 / HIGH (hotspot file) | 1 BE | nothing — sequence before CR-2026-09-15-004 |
| [CR-2026-10-03-002](./CR-2026-10-03-002-users-read-projection/INTAKE_DOC.md) | **BUG (security)** — admin-auth `db.users` reads load CRM's `api_key`/`authkey_api_key`/`mygenie_token`; add 7-field projection | 📝 REGISTERED — **owner approved 2026-10-03**, READY FOR PLANNING | **P0** / CRITICAL (admin auth path) | 1 BE (2 lines) | nothing — shortest path to ship |
| [CR-2026-10-03-003](./CR-2026-10-03-003-feedback-wrong-schema-crm-collection/INTAKE_DOC.md) | **BUG (data integrity)** — feedback written into CRM's `feedback` collection in our own schema, unreadable by anyone; migrate to `POST /scan/feedback` | 📝 REGISTERED — **A9-b decided 2026-10-03 (hybrid); design frozen**, blocked on CRM shipping the additive CR | P1 / CRITICAL (live write to CRM collection) | 2 FE + 1 BE | CRM feedback CR number + ship date (contract **O-8**) |
| [CR-2026-10-03-004](./CR-2026-10-03-004-pre-login-lookups-to-crm-api/INTAKE_DOC.md) | Pre-login reads → CRM API: `check-customer` → `/scan/auth/lookup`, `loyalty-settings` → `/scan/loyalty-rules/{rid}`, retire `customer-lookup` (F2 = a) | 📝 REGISTERED — BLOCKED | P1 / CRITICAL (`LandingPage.jsx`, `ReviewOrder.jsx`) | 3 FE + 1 BE | CRM **CR-093** + **CR-094** not yet shipped (contract **O-9**) |
| [CR-2026-10-03-005](./CR-2026-10-03-005-call-waiter-pay-bill-no-op-buttons/INTAKE_DOC.md) | **BUG (customer-visible)** — Call Waiter / Pay Bill buttons are silent no-ops in the live UI | 📝 REGISTERED — **Q-CA-6 answered: the endpoints were correct all along, premise withdrawn.** Blocked on POS consumption + owner direction | P2 / HIGH (two hotspot pages) | 3 FE | POS **P1** + owner direction (contract **O-4**); interim mitigation decidable today |

| [CR-2026-10-03-006](./CR-2026-10-03-006-franchise-multi-outlet-admin/INTAKE_DOC.md) | **Franchise support** — an admin managing several outlets must be able to choose which one they administer (POS confirmed `restaurants[]` can hold multiple entries) | 📝 REGISTERED — BLOCKED | P2 / CRITICAL (admin auth + every per-restaurant write) | 4 FE + 1 BE | POS multi-entry response shape (**O-13**); must land **after** CR-2026-09-15-004 |

Already-registered siblings on this track: **CR-2026-09-15-001** (profile v2 adapter, approved to
plan) · **CR-2026-09-15-002** (skip-otp dead branch, parked) · **CR-2026-09-15-003** (canonical
phone, parked — India-only) · **CR-2026-09-15-004** (admin login off CRM `users`, Option D, gated
on F3 + POS P5; its P0 sub-item is now **CR-2026-10-03-002**).

Not registered as CRs (deliberately): CRM-side work (CR-093/094/095, board JSON, GAP-11), POS
questions (P1/P4/P5), signing `OWNERSHIP_MAP.md`, and `CR-2026-09-15-004/IMPACT_AND_NEW_FLOW.md`
(a Planning artefact inside an existing CR, not a new item).

Boundary scorecard after all five close: direct touches on CRM-owned collections **20 → 0**.

### Contract freeze (2026-10-03)

CRM replied twice to INV-022. Round 2 settled A9-b and Q-CA-6, so the exchange has been collapsed
into one signable document: **`/app/memory/control/CONTRACT_CUSTOMER_APP_CRM_v1.0.md` (v1.0-RC1)**.
Part 1 (ground rules · collection ownership · identity · endpoint-by-endpoint API contract ·
accepted limitations · execution sequence) is **ready to sign**. Part 2 (§7) lists the 9 items
that still block a full freeze — the biggest being **O-1**, CRM's ownership-board JSON, which was
referenced in round 2 but never reached us and which gates `OWNERSHIP_MAP.md` (and therefore
CR-2026-09-12-006, CR-010 and CR-014).

**Update — CRM's ownership-board JSON received 2026-10-03 (contract item O-1 closed).** 39
collections, code-scanned with read/write counts and file:line. Reconciled in
`INV-002/RECONCILIATION_CRM_BOARD_2026-10-03.md`: **36 of 39 rows agree**, including all 8 rows we
had previously assigned by elimination. Contract bumped to **v1.0-RC2** with §2 completed; O-1, O-2
and O-3 closed; four new items opened — **D-1** `pos_event_logs` owner semantics (CRM assigns
ownership to the consumer, our rule assigns it to the sole writer), **D-2** `orders`/`order_items`
"Shared (POS-origin)" label, **D-3** `otp_tokens` contradicts CRM's own round-1 E3, and **O-10** a
`users` change-notice gap created by CRM withdrawing B4 while we still read that collection on
every admin request. **`OWNERSHIP_MAP.md` deliberately still unedited** — the CRM half is in, but
POS P1/P4/P5 and three owner rulings remain.

**Owner rulings 2026-10-03 → contract v1.0-RC3.** **D-1** `pos_event_logs` owner = **CRM** (the sole
writer), consumer = POS required, inert until POS consumes — CRM's proposal to assign ownership to
the consumer was declined so that "owner = writer" stays consistent across all 39 rows. **D-2**
`orders`/`order_items` owner = **CRM**, annotated "originates in POS via webhook"; the "Shared"
label rejected. **O-4** (Call Waiter / Pay Bill direction) and the **Pay-Bill definition** referred
to **POS** → `INV-002/QUESTIONS_FOR_POS_2026-09-15.md` extended with **P1-refined, P5, P6, P7**
(P2/P3 closed by CRM, P4 parked). Pay-Bill semantics reserved as contract clause **§3 I6**: a
request to settle at the table, **never** an in-app payment. **All 39 ownership rows now have an
owner; Part 1 of the contract is ready for signature.** Remaining blocker is **POS**, plus F3.

**CRM SIGNED Part 1 on 2026-10-03** (`INV-003/crm_replies/CONTRACT_v1.0_CRM_SIGNOFF.md`; validated
clean in `INV-003/VALIDATION_OF_CRM_SIGNOFF_2026-10-03.md` — no conflicts, no conditional clauses).
CRM **concurs** with the D-1/D-2 rulings, so those rows are now mutually agreed rather than
unilaterally ruled. **D-3, O-8 and O-10 closed**: `otp_tokens` confirmed as a separate staff
password-reset store (E3 was scoped to customer OTP); feedback CR = **CR-096**, `restaurant_id` =
short form; and **CRM agreed to give advance notice before renaming any of the six `users` fields**
until our POS switch lands — the item most likely to have caused a silent admin-login outage.
**CONTRACT PART 1 §1-§6 IS NOW FROZEN — countersigned by the owner 2026-10-03.** It may only change under §8 change control (written agreement from both teams + version bump). §7 stays open and is owed by **POS** (P1-refined, P5, P6, P7) and the **owner** (F3, O-7); nothing in §7 reopens Part 1, and POS is not a Part-1 signatory.
Two findings from validating the sign-off: CRM's per-tier `*_earn_percent` warning is **already
satisfied** in our code (`LoyaltyRewardsSection.jsx:29`), so CR-094 is a URL swap; and CR-093's
`exists` **must** be mapped to our `found` flag or the first-visit-bonus line will show for every
diner — both recorded in CR-2026-10-03-004 §1a.

**Owner decisions on the POS reply (2026-10-03):** amendment **A-1 drafted** for CRM
(`control/AMENDMENT_A-1_pos_event_logs_consumer.md`, awaiting owner sign-off) · POS **not** being
chased for the two missing shapes — they said they would come back · **franchise support split out
as CR-2026-10-03-006**, so CR-2026-09-15-004 stays single-outlet on `restaurants[0]` (no
regression — identical to today's behaviour and CRM's) with a new acceptance criterion that the
backend **warns when it ignores extra outlets** · Call Waiter "not live" clarified as **not built
yet, not cancelled** → CR-2026-10-03-005 is **parked, not withdrawn**; buttons, flags and CRM
endpoints all stay in place · **still in INTAKE** — no code, no Planning artefacts.

**POS replied 2026-10-03** (`INV-002/VALIDATION_OF_POS_REPLY_2026-10-03.md`). **P1 = (b): POS does
not read `pos_event_logs`** — so with CRM write-only and us never touching it, **no component
anywhere reads that collection**; Call Waiter / Pay Bill cannot work in the current architecture,
not merely "not yet wired". POS then **parked** the direction (P2) and the Pay-Bill semantics (P3)
— "feature is not live" — so **CR-2026-10-03-005 is PARKED** with evidence. **P4.2: `restaurants[]`
CAN hold multiple entries, for franchises** → **CR-2026-09-15-004 scope widened**: it now needs an
outlet picker and a selected-outlet concept threaded through every per-restaurant admin operation,
not just an identity swap. Two shapes still owed by POS (**O-14** profile path + shape — their "ok"
acknowledged rather than answered P4.1; **O-13** multi-entry shape), plus **P4.3** (rate limit /
token lifetime / refresh), whose rationale is written up for them.

🔴 **First change-control event: contract amendment A-1.** Frozen §2d annotates `pos_event_logs` as
*"consumer = POS — required"*, which POS's answer makes factually wrong. **It has not been edited** —
§2 is frozen, so under **§8 C1** this needs written agreement from CRM plus a version bump to
**v1.1**. Proposed text: *consumer = NONE as at 2026-10-03; a consumer must be designated before
any producer is wired.* Ownership unchanged (CRM remains sole writer).

**Measured, not assumed:** the owner's "buttons are already hidden by configuration" was verified
against the live shared DB — true for **12 of 13** tenants, but restaurant **`672`** has
`showLandingPayBill: true` and is showing a dead Pay Bill button today. Also found: the two
`showLanding*` flags have **no admin toggle** (`VisibilityTab.jsx` / `AdminVisibilityPage.jsx`
expose only `showCallWaiter`/`showPayBill`), so 672's flag cannot be cleared from the admin UI.
Both recorded in CR-2026-10-03-005 §1b.

Supporting artefacts: `INV-003/VALIDATION_OF_CRM_REPLY_ROUND2.md` (row-by-row verdict, 2 corrections
to our own record) · `INV-003/REPLY_TO_CRM_ROUND2_AND_FREEZE.md` (draft reply + freeze request,
awaiting owner sign-off) · `INV-003/crm_replies/INV_022_CRM_REPLY_TO_CUSTOMER_APP_ROUND2.md`.

### Security escalation — INV-2026-10-03-001 (2026-10-03)

Contract item **O-16** has been **escalated out of the contract** into its own security
investigation on owner instruction: [INV-2026-10-03-001](./INV-2026-10-03-001-uat-secrets-and-pii-exposure/INTAKE_DOC.md).
Two findings: (1) preprod issues a **static `dp_live_`-prefixed CRM credential** — obtainable by
anyone with a preprod POS account, and almost certainly the `api_key` on CRM's `users` row;
(2) the **shared UAT database holds real customer PII**, including **114 `customer_documents`**
(hotel guest identity documents), admin emails and `password_hash`.

**P1 SECURITY · owning team DevOps/Ops** (+ CRM, POS). **No Customer App code change expected** —
the defect is in environment and data-handling practice, so filing it as a code CR would bury it in
a queue nobody who can fix it reads. Brief ready to send:
`INV-2026-10-03-001/BRIEF_FOR_DEVOPS_UAT_DATA_HYGIENE.md`. The secret value is **not recorded in
any document**; raw HTTP responses were deleted; no production access was attempted and no DB
writes were made. Its **Q9** (preprod/production shared secrets) pairs with contract **O-7**.

Direct consequence for the registry: **this finding is the evidence that CR-2026-10-03-002 is a
real P0** — the `api_key` it projects away is demonstrably a live-prefixed credential, not a
theoretical secret.

## ID convention (per operating prompt §ID Format line 1364 + repo precedent)

> **See the `## ID Scheme` section above** for the authoritative arbitration between
> `BUG-NNN` (frozen legacy), `CR-YYYY-MM-DD-NNN` (active), and `INV-YYYY-MM-DD-NNN` (active).

| Prefix | Meaning | Example in this session |
|---|---|---|
| `CR-YYYY-MM-DD-NNN` | Change Request (code, data, or ops change) | CR-2026-07-03-003 |
| `INV-YYYY-MM-DD-NNN` | Investigation only (no code) | INV-2026-07-03-001 |
| `BUG-NNN` | **FROZEN** legacy sequence (001–050). No new IDs issued in this format after 2026-07-03. | BUG-048 |

## Blocking / Dependencies

```
CR-000 ─── (independent, ship anytime)
CR-001 ── SHIPPED
CR-002 ── SHIPPED (needs admin QA)
CR-003 ── SHIPPED
         └── CR-009 (needs ops)
CR-004 ── blocked by ─→ INV-2026-07-03-001 (audit)
CR-005 ── independent; depends on 001/002 which shipped
INV-001 ── prerequisite for CR-004
CR-007 ── independent (ops+security)
CR-008 ── independent (DATA)
CR-009 ── depends on CR-003 (shipped) — just needs ops wiring
```

## Recommended execution order (if capacity allows)

1. **CR-2026-07-03-009 F-13** — free win, ops-only, 30 min.
2. **INV-2026-07-03-001** — audit, unblocks CR-004.
3. **CR-2026-07-03-000** — security P1, security team owns.
4. **CR-2026-07-03-007** — deploy env; often blocks real go-live.
5. **CR-2026-07-03-004** (after INV-001 verdict).
6. **CR-2026-07-03-008** — DATA; coordinate with operator team.
7. **CR-2026-07-03-005** — cleanup, ship anytime.

## Artefacts per item (per operating prompt §22)

| ID | INTAKE_DOC | CR.md | IMPLEMENTATION_PLAN | QA_HANDOVER |
|---|---|---|---|---|
| CR-000 | ✅ | ✅ | — | — |
| CR-001 | ✅ | ✅ | — | ✅ |
| CR-002 | ✅ | ✅ | ✅ | ✅ |
| CR-003 | ✅ | ✅ | ✅ | ✅ |
| CR-004 | ✅ | ✅ | ✅ | — |
| CR-005 | ✅ | ✅ | — | — |
| INV-001 | ✅ | ✅ | — | — |
| CR-007 | ✅ | ✅ | — | — |
| CR-008 | ✅ | ✅ | — | — |
| CR-000 | ✅ | ✅ | ✅ (FINDINGS + IMPACT + PLAN) | — |
| CR-010 | ✅ | ✅ | ✅ (IMPACT + PLAN) | ✅ |
| CR-011 | ✅ | ✅ | — | — |
| CR-012 | ✅ | ✅ | — | — |
| CR-2026-07-04-002 | ✅ | ✅ | — | — |
| CR-2026-07-04-003 | ✅ | ✅ | — | — |
| CR-2026-07-04-004 | ✅ | ✅ | — | — |
| CR-2026-09-12-001 … 014, INV-2026-09-12-001 | ✅ (15 items) | — (INTAKE_DOC carries CR content) | — | — |

## What this registry is NOT

- Not an issue tracker. This is a session-scoped planning artefact.
- Not a substitute for a real ticketing system. Owner should port these to whatever tracker they use.
- Not evidence of implementation for anything marked ✅ — SHIPPED. Refer to each folder's `QA_HANDOVER.md` for that.

## Session shipping summary

- **Session dates:** 2026-07-03 (initial) + 2026-07-04 (continuation)
- **Items raised:** 16 (14 CR + 1 INV + 1 tombstone; CR-006 tombstoned in favour of INV-2026-07-03-001)
- **Shipped (code merged + self-tested):** 3 (001, 002, 003)
- **Shipped (docs-only, self-tested):** 1 (010 — registry hygiene)
- **Resolved by owner assertion:** 1 (INV-001 — order-create idempotency, D-02)
- **Implemented, awaiting owner smoke:** 2 (000, 004)
- **Planned (Role 2 complete, awaiting owner approval / prereqs):** 1 (005)
- **Registered (Role 1 complete):** 8 (007, 008, 009, 011, 012, plus new 2026-07-04 items 002/003/004)
- **Process compliance:** Role 1 (INTAKE) was skipped initially; retroactively remediated on 2026-07-03. Full ID-scheme canonicalization performed by CR-2026-07-03-010. CR-000 upgraded from stub to full Role 6+2+3 flow; CR-011 (full POS proxy) and CR-012 (doc scrub + CI lint) filed as its architectural + hygiene follow-ups. CR-004 shipped in plumbing scope; residual UI + admin work filed as CR-2026-07-04-003. Owner-asked telemetry gap filed as CR-2026-07-04-004. Registry canonicalization finish-up (A/B/C from CR-010 §8) filed as CR-2026-07-04-002.
