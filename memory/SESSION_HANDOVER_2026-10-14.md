# SESSION HANDOVER — 2026-10-14

**App:** MyGenie Customer App (Scan & Order) · React + FastAPI + MongoDB
**Governance:** controlled lifecycle per `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`
(role-gated: Intake → Planning → Impl → QA → close; owner approves each gate).

---

## 1. What this session did (in order)

### 1a. Shipped CR-2026-10-12-005 — reverse Sheet→registry read (v1, READ-ONLY)
Owner ruling: **read-only, no auto-update, just show in chat what changed.** Write-back loop deferred.
- **Tool** `memory/tools/registry_sync.py`: new read-only `drift` command + helpers
  (`read_sheet_all_items`, `expected_all_items`, `classify_column`, `diff_all_items`, `drift`), wired into
  `__main__`. Reads live **All Items**, diffs vs an **index.yml-derived baseline** (via `build_views`),
  classifies every edited cell **ACCEPTED / INFORMATIONAL / IGNORED / OUT-OF-SCHEMA** + membership + new
  columns. **Writes nothing.** All marked `# CR-2026-10-12-005`.
- **Control prompt**: ROLE 14 SHEET DRIFT gained a `drift` step (dropped the "does NOT read the Sheet"
  caveat); ROLE 13 rule + §10 reverse row updated (reverse = read-only; governed write-back deferred).
- **Status:** IMPLEMENTED, self-tested V1–V12 + regression PASS (testing_agent N/A — CLI+OAuth, no app
  surface). Artefacts: INTAKE, IMPACT_ANALYSIS, IMPLEMENTATION_PLAN, DECISIONS, QA_HANDOVER in
  `memory/change_requests/CR-2026-10-12-005-reverse-sheet-read-governed-apply/`.
- **DEFERRED (future CR):** `reverse` (PENDING Change Log rows) + `apply` (owner-approved write to
  `index.yml`) + any whitelist/contract change. **Probes NOT yet deleted** — delete
  `memory/tools/reverse_drift_probe.py` + `reverse_drift_snapshot.py` after owner smoke-accepts.

### 1b. Ran SHEET DRIFT (ROLE 14) — live read
Live `drift` detected **13 Priority→P0 edits** (owner set them on the Sheet) + a new **"Release week"**
column. All classified IGNORED/OUT-OF-SCHEMA (0 ACCEPTED). `CR-2026-10-12-005` showed INDEX-ONLY (not
pushed yet). Local `audit` also flagged: `INV-2026-10-09-002` folder not in index, README lag (~24 items),
2 unadjudicated items.

### 1c. Investigation + reconciliation — INV-2026-10-14-001 (READ-ONLY, NOT registered)
Owner asked for code-verified true status of the 13 drifted items, suspecting they were already done
under other CRs. **Finding: NOT supported by code** — all 13 are registry INTAKE; **12/13 have zero code
markers**; each signature artefact is absent. Then reconciled against the recent CRM-contract/dead-API
batch. Docs:
- `memory/change_requests/INV-2026-10-14-001-drifted-13-items-status-verification/INVESTIGATION_REPORT.md`
- `.../RECONCILIATION_ADDENDUM.md`

---

## 2. Reconciliation result (key for next session)

### Already SHIPPED recently (code-verified) — only need owner SMOKE to close
CR-2026-10-03-001 (dead CRM-table calls + `/api/customer/*` shim removed) · CR-10-03-002 (api_key leak
fixed) · CR-10-03-003 (feedback schema) · CR-10-03-004 (pre-login → CRM API) · CR-09-15-001 (profile CRM
v2) · CR-09-15-004 (admin users read removed) · CR-09-12-004 (CORS + rate-limit) · CR-07-03-000 (runtime
creds removed). **These are the "dead APIs out + CRM contract" work. CRM axis done; POS axis NOT.**

### The 13 drifted items — actual status (code-verified)
| Item | Status |
|---|---|
| BUG-2026-09-10-001 image upload | **PARTIAL** — Wave-0 local-disk hardening done & QA-passed; POS-S3 direction NOT in code (blocked on POS) |
| CR-2026-07-03-008 prod DB data | NOT CODE-VERIFIABLE (ops/DB) |
| CR-2026-07-03-009 observability/LB probe | NOT DONE (healthz exists; alerting/probe not) — ops-owned |
| CR-2026-07-03-011 POS proxy | NOT DONE (`order_auth_token` still in browser) |
| CR-2026-07-03-012 cred scrub + CI lint | NOT DONE (patches drafted in `memory/v2/`, unapplied) |
| CR-2026-07-04-003 CR-004 residual | NOT DONE (5 `await fetch` in AdminConfigContext; no retry empty-state) |
| CR-2026-07-04-004 telemetry | NOT DONE (no endpoint/collection/hook) |
| CR-2026-09-08-001 MenuItem guard | NOT DONE (L165 omits `isChannelAllowed`) |
| CR-2026-09-12-001 architecture umbrella | OPEN (children not done) |
| CR-2026-09-12-006 backend split | NOT DONE (no `backend/app/`; `server.py` 1,329 lines) |
| CR-2026-09-12-007 FE facade | NOT DONE (no `api/clients/`, no `session/`) |
| CR-2026-09-12-008 route guard | NOT DONE (no `components/guards/`) |
| CR-2026-09-12-010 config defaults SSOT | NOT DONE (no `/api/app-config/defaults`; triplication intact) |

**Closeable now: none.** (BUG-09-10-001 label is ambiguous — Wave-0 vs S3; owner to decide.)

### Batches agreed with owner (work next session)
- **SECURITY:** CR-07-03-011 (POS proxy) · CR-09-12-008 (route guard) · CR-07-03-012 (cred scrub) ·
  CR-10-04-001 (table-config CRM token pin, adjacent) · **CRM-429 identity-downgrade (new)**
- **DATA:** CR-07-03-008 (prod DB) · CR-09-12-010 (config SSOT) · CR-07-04-004 (telemetry) ·
  BUG-10-11-005 (duplicate coupon, adjacent)
- **CLEANUP:** dead `/api/docs/*` delete (9 routes, `server.py` L1190-1261) · CR-09-12-006 (backend split) ·
  CR-09-12-007 (FE facade) · CR-09-12-009 (478/pos_id/+91 hardcoding) · CR-07-04-003 (menu empty-state +
  fetch swaps) · CR-09-08-001 (MenuItem guard) · CR-07-03-009 (observability)
- **GOVERNANCE:** CR-09-12-001 umbrella sequences 006/007/008/010/011; close 8 SMOKE items; registry-hygiene.

### Readiness
- ✅ **READY to start now:** CR-2026-09-08-001 · CR-2026-07-04-003 · CR-2026-07-03-012
- ⚠️ **READY after 2 owner inputs:** CR-2026-07-04-004 (retention 30d? rate-limit 5/IP/min?)
- ⛔ **BLOCKED/sequenced/ops:** CR-09-12-006/007/008/010, CR-07-03-011, CR-07-03-008, CR-07-03-009,
  BUG-09-10-001, CR-09-12-001 (see RECONCILIATION_ADDENDUM §C for exact blockers)

---

## 3. Recommended next-session start
1. Pick a role per the control prompt (Intake for a new CR; Planning to sequence).
2. **Quick wins first:** CR-09-08-001 (one-line), CR-07-04-003, CR-07-03-012 (apply drafted patches).
3. **Sharpest live risk:** CRM-429 identity-downgrade — start READ-ONLY investigation (count
   `crmLookupCustomer` call sites, confirm CRM rate limit) before any fix. Do NOT start until owner asks.
4. Heavy architecture (006/007/008/010/011) stays under the CR-09-12-001 umbrella — sequence, don't ad-hoc.
5. Optional: register INV-2026-10-14-001 in `index.yml` and set real Priorities on the 13.

## 4. Do-not-retry / guardrails (carried forward)
- SHEET DRIFT `drift` is READ-ONLY; SHEET PUSH overwrites non-Change-Log tabs (destructive) — owner-gated.
- Reverse write-back (Sheet→index.yml) is NOT built; Sheet edits are overwritten on next push.
- Never reuse ``+91${phone.replace(/^\+?91/,'')}`` (corrupts Indian numbers) — BUG-2026-10-12-002.
- CRM `requires_cart_validation` boolean governs coupon cart-validation, not `offer_type`.
- Auth work = integration; call integration_expert before touching auth code.
- Don't regenerate `/app/design_guidelines.json` blindly.

## 5. Key paths
- Control prompt: `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`
- Registry (114 items): `memory/change_requests/index.yml`
- Sheet tool: `memory/tools/registry_sync.py` (commands: bootstrap/migrate/audit/**drift**/propose/sync)
- This session's investigation: `memory/change_requests/INV-2026-10-14-001-drifted-13-items-status-verification/`
- CR shipped this session: `memory/change_requests/CR-2026-10-12-005-reverse-sheet-read-governed-apply/`
- Prior handovers: `SESSION_HANDOVER_2026-10-11.md`, `SESSION_HANDOVER_2026-10-12.md`
