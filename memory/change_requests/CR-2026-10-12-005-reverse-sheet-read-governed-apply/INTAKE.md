# INTAKE — CR-2026-10-12-005

**Title:** Reverse Sheet→registry read (SHEET DRIFT reads the live Google Sheet + governed apply loop)
**Type:** CR · **Severity:** P2 · **Risk:** MEDIUM
**Registered:** 2026-10-12 · **Role:** INTAKE · **Status:** INTAKE
**Owner:** Abhishek Jain
**Origin:** Deferred reverse-read stream from CR-2026-10-12-004 (which shipped only the two owner-invoked roles + one-way push). Design/demo captured in `memory/inbox/REVERSE_SHEET_READ_design-and-demo_2026-10-12.md`.

---

## 1. Owner report (what was asked)

Make the registry↔Google-Sheet mirror **two-way on the read side**. Today:
- `SHEET PUSH` (ROLE 13) = one-way `index.yml` → Sheet overwrite (Change Log tab append-only).
- `SHEET DRIFT` (ROLE 14) v1 = **local-only** audit (`index.yml` vs CR folders vs README). It does **not** read the Sheet.

Owner wants `SHEET DRIFT` to actually **read the live Sheet**, **surface every owner edit in chat**, and — via a governed loop — let **approved** edits flow back into `index.yml`.

Explicit owner instruction (latest): **report ALL Sheet edits, classified** — not only the whitelisted fields.

## 2. Classification

| Field | Value |
|---|---|
| Type | CR (capability addition — process + tooling) |
| Severity | P2 (important governance capability; workaround = manual inspection via throwaway probes) |
| Risk | MEDIUM (reverse-write to `index.yml` is owner-gated; no app/payment/auth code; touches control prompt + registry tool) |
| Duplicate check | DISTINCT — no existing CR implements reverse read. CR-2026-10-12-004 explicitly deferred it; CR-2026-10-04-006 built the one-way tool + contract. |
| Code already exists? | PARTIAL — two **throwaway read-only probes** prove the approach but are NOT production: `memory/tools/reverse_drift_probe.py`, `memory/tools/reverse_drift_snapshot.py`. No governed read/merge/write in `registry_sync.py`. |
| Blast radius | MEDIUM — `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` (ROLE 13/14 + §10) and `memory/tools/registry_sync.py`. No application source (frontend/backend) touched. `index.yml` is written only on owner-approved apply. |

## 3. Scope — ONE CR, TWO edit streams

1. **Control prompt** (`memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`):
   - Upgrade **ROLE 14 — SHEET DRIFT**: add a step that reads the live Sheet and reports Sheet-vs-registry drift; remove the "v1 = local only / does NOT read the Sheet" caveat once built.
   - Touch **ROLE 13 — SHEET PUSH** and addendum **§10** as needed to describe the governed apply loop (PENDING → owner approval → apply) and the reverse-accepted whitelist.
2. **Tool** (`memory/tools/registry_sync.py`): implement the deferred read-merge-write:
   read Sheet → diff vs `index.yml` → surface every edit (classified) → append one PENDING row per edit to the **Change Log** tab → owner approves in chat → apply **only approved/whitelisted columns** to `index.yml` → reconcile.

## 4. Requested reporting behavior (owner-confirmed)

Surface **ALL** detected Sheet edits in chat, each **classified**:
- **ACCEPTED** — reverse-accepted whitelist column (current contract: Status / Registered / Closed).
- **INFORMATIONAL** — dashboard-owned (e.g., Assignee); shown, never written back.
- **IGNORED** — registry-owned column edited on the Sheet (e.g., Priority today); shown, overwritten on next push unless the contract is changed.
- **OUT-OF-SCHEMA** — new/unknown column or header (e.g., "Release week"); shown; adopt/reject decided in Planning.

## 5. Evidence (read-only demo, 2026-10-12)

Sheet `GOOGLE_SHEET_ID` (masked), live read via the two probes detected **14 edits**, all on **All Items**:
- 13 × Priority → P0 (classified IGNORED — registry-owned).
- 1 × new column header "Release week" (classified OUT-OF-SCHEMA).
- 0 × reverse-accepted (no Status/Registered/Closed edits).

Conclusion: read-back works AND the whitelist guardrail works (0 of 14 would auto-flow-back under current rules). Evidence/probes retained as reference; their logic to be folded into the tool, then probes deleted.

## 6. Open decisions deferred to PLANNING (not decided at Intake)

1. Whitelist: keep {Status, Registered, Closed}, or add Priority / Risk?
2. New columns ("Release week"): surface-and-ignore vs adopt-into-schema vs reject/warn.
3. Where drift surfaces: chat only vs also written as PENDING Change Log rows.
4. Apply mechanism: targeted edits to `index.yml` vs YAML round-trip (comment/ordering risk).
5. Legacy status values on read: reuse the same 8-enum validation.
6. Authoritative baseline: last-pushed `.registry_csv` snapshot vs regenerated expected views vs All Items tab.
7. Trigger: SHEET DRIFT stays owner-invoked (no cron/preamble — consistent with CR-004).

## 7. Out of scope (separate cleanup, NOT this CR)

- Backfill 13 items with empty Priority in `index.yml` (BUG-2026-09-10-001, CR-2026-07-03-008/009/011/012, CR-2026-07-04-003/004, CR-2026-09-08-001, CR-2026-09-12-001/006/007/008/010).
- `INV-2026-10-09-002` folder-vs-index reconcile; README lag behind `index.yml`.

## 8. Pointers

- Roles + one-way push: CR-2026-10-12-004 (IMPLEMENTED).
- Built the tool + contract: CR-2026-10-04-006.
- Contract: `memory/control/registry-sheet-contract.md` (v1.2 — reverse loop spec, marked deferrable).
- Auth: `/app/secrets/sheets_token.json` + `GOOGLE_OAUTH_*` / `GOOGLE_SHEET_ID` (validated, working).
- Tool helpers to reuse: `access_token()`, `api()`, `a1()`, `load_index()`, `HEADERS`, `.registry_csv` snapshot.
- Design/demo source: `memory/inbox/REVERSE_SHEET_READ_design-and-demo_2026-10-12.md`.

---

## Intake output

```text
Intake complete: CR-2026-10-12-005
Classification: CR
Severity: P2
Risk: MEDIUM
Duplicate check: DISTINCT (deferred from CR-2026-10-12-004; related to CR-2026-10-04-006)
Evidence: captured (14 live edits detected via read-only probes; design/demo note)
Blast radius: MEDIUM (control prompt + registry_sync.py; no app source; index.yml written only on owner-approved apply)
Docs updated: change_requests/CR-2026-10-12-005-reverse-sheet-read-governed-apply/INTAKE.md · index.yml
Next: Planning
```
