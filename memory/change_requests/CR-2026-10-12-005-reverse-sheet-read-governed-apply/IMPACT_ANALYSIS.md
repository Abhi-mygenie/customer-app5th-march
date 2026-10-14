# IMPACT ANALYSIS — CR-2026-10-12-005

**Title:** Reverse Sheet→registry read (SHEET DRIFT reads the live Sheet + governed apply loop)
**Role:** PLANNING · **Risk:** MEDIUM · **Priority:** P2
**Stage:** Impact Analysis · **Date:** 2026-10-12
**Reads:** control prompt (ROLE 13/14, §10), `registry-sheet-contract.md` v1.2, `registry_sync.py`, `reverse_drift_probe.py`, `reverse_drift_snapshot.py`, `index.yml`, INTAKE.md

---

## 1. Item is registered

`CR-2026-10-12-005` exists in `index.yml` (status INTAKE, P2, MEDIUM). INTAKE.md present. ✅

## 2. Code reality

**PARTIAL.** The spec exists; the production code does not.

| Layer | Today | Gap |
|---|---|---|
| Contract `registry-sheet-contract.md` v1.2 §5 | Fully specifies the governed reverse loop: diff sheet→registry, append one PENDING row per edit to the Change Log tab, owner approves, agent applies & marks APPLIED/REJECTED. Whitelist = Status/Registered/Closed. Assignee excluded. `Last updated` never accepted. | None at spec level. Whitelist is 3 columns — narrower than "surface ALL edits" the owner now wants (reporting ≠ apply; see §6). |
| `registry_sync.py` | Docstring lists **"P7–P10: read-merge-write (Band b, deferrable)"** — NOT implemented. `sync` is one-way; `audit` is local-only. `build_views()` already produces the authoritative expected `All Items` rows. Helpers `access_token()`, `api()`, `a1()`, `HEADERS`, `load_index()`, `changelog()` all reusable. The Change Log tab is created/kept append-only by `push()` and is excluded from `batchClear`. | No Sheet **read**, no diff-vs-expected, no classification, no PENDING-row append to the Change Log tab, no owner-approved apply to `index.yml`. |
| Probes (`reverse_drift_probe.py`, `reverse_drift_snapshot.py`) | Read-only PoCs that PROVE Sheet read + diff + classify works. `_probe` diffs All Items whitelist+Assignee vs `index.yml`; `_snapshot` diffs live vs `.registry_csv` across all tabs and classifies ACCEPTED/INFO/IGNORED/OUT-OF-SCHEMA. | Throwaway. Not wired into the tool or any role. `_snapshot` depends on a `.registry_csv` that only exists right after a push (stale otherwise). |
| Control prompt ROLE 14 (SHEET DRIFT) | Explicit caveat: *"`audit` compares LOCAL artefacts only … does NOT read the Google Sheet."* | Must gain a real Sheet-read step and drop the caveat once built. |
| Control prompt ROLE 13 (SHEET PUSH) / §10 | One-way only; "Reverse read-back is a separate future CR." | Must describe the governed apply loop and the reverse-accepted whitelist. |

## 3. Conflicts / interactions

- **CR-2026-10-12-004 (IMPLEMENTED)** created ROLE 13/14 + §10 wording. This CR edits the SAME control-prompt sections — no parallel active work on that file, so no conflict, but edits must preserve the §3 role-decision-tree rows and the 14-role contiguity (CR-004's self-test invariants V1–V7).
- **CR-2026-10-04-006** built `registry_sync.py` + contract v1.2. This CR extends the SAME tool. The tool's own docstring reserves "P7–P10" for exactly this work — no schema change to the 22-column layout or the 8-column Change Log is required.
- **No application code** (frontend/backend) is touched. No payment/auth/customer-data path. The only data write is to `index.yml` and the Change Log tab, both owner-gated.

## 4. Data flow (target)

```
live Google Sheet (All Items)                index.yml (registry)
        │ read (values.get)                         │ load_index()
        ▼                                            ▼
   sheet rows ──────────► diff ◄──────── expected rows = build_views()["All Items"]
                           │
                           ▼  classify every changed cell
        ACCEPTED (whitelist) · INFORMATIONAL (Assignee) · IGNORED (registry-owned) · OUT-OF-SCHEMA (new col/header)
                           │
          ┌────────────────┴───────────────────┐
   SHEET DRIFT (read-only)              governed apply loop
   print ALL edits, classified          append PENDING row per ACCEPTED edit → Change Log tab
   → owner decides in chat              → owner approves (chat) → apply whitelisted cols to index.yml
                                        → mark APPLIED; REJECTED rows reverted on next push
```

**Baseline for the diff:** the **expected All Items view rebuilt from `index.yml`** (via `build_views`), NOT the `.registry_csv` snapshot. Rationale: the snapshot only exists right after a push and goes stale after any `index.yml` edit, producing false positives; rebuilding from `index.yml` is always current and is exactly what the next push would write. (Design decision 6 — recommended, owner to confirm.)

## 5. Affected files

**WILL change (Implementation):**
1. `memory/tools/registry_sync.py` — add Sheet-read + diff + classify + read-only `drift` report + governed apply (new subcommands; reuse existing helpers). No change to `build_views`/`push`/column schema.
2. `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` — ROLE 14 (add Sheet-read step, drop "local only" caveat), ROLE 13 + §10 (describe governed apply loop + whitelist).
3. `memory/change_requests/index.yml` — this item's block updated at each gate (Exit Gate requirement).
4. (cleanup at end) delete the two throwaway probes **after** their logic is folded in and QA passes.

**WILL NOT touch:**
- Any `frontend/**` or `backend/**` source.
- `build_views()`, `push()`, the 22-column `All Items` schema, the 8-column Change Log schema.
- `registry-sheet-contract.md` — **unless** owner expands the whitelist (decision 1) or adopts a new column (decision 2); a contract change is cross-project (POS/CRM/INV/INFRA) and would be its own gated edit, flagged here, not done silently.
- `.emergent/**`, `.env` files, OAuth token.

## 6. Owner decisions — RULED 2026-10-12 (see DECISIONS.md)

Owner ruling: **v1 = READ-ONLY. No auto-update. Just show in chat what changed.** The `reverse`/`apply`
governed write-back loop is **DEFERRED** to a future CR. v1 writes nothing (no Sheet writes, no Change
Log rows, no `index.yml` data writes).

| # | Decision | Ruling |
|---|---|---|
| 1 | Apply-back whitelist | N/A in v1 (nothing applied). Priority edits shown as IGNORED. No contract change now. |
| 2 | New columns ("Release week") | Surface-and-report as OUT-OF-SCHEMA. No schema change. |
| 3 | Where drift surfaces | Chat only. No Change Log writes in v1. |
| 4 | Apply mechanism | N/A in v1 (deferred; when built: targeted index.yml edits). |
| 5 | Legacy status on read | Reuse 8-value enum for classification; nothing written so no risk. |
| 6 | Diff baseline | Expected view rebuilt from `index.yml` (always current), not `.registry_csv`. |
| 7 | Trigger | Owner-invoked only (no cron), consistent with CR-2026-10-12-004. |

## 7. Risk assessment

- **MEDIUM.** The only destructive operations are (a) writing approved edits to `index.yml` and (b) appending to the Change Log tab — both owner-gated and reversible (git history; Change Log is append-only audit). `drift` itself is strictly read-only.
- **Guardrails:** apply touches only whitelisted columns of owner-APPROVED rows; conflict rule = registry wins unless owner overrides; `Last updated` never accepted (self-feeding-diff trap, contract §5.5); Assignee never read/written on All Items.
- **No contract drift:** if owner keeps the 3-column whitelist, no cross-project contract edit is needed.

## 8. Planning output

```text
Planning complete: CR-2026-10-12-005
Stage: Impact Analysis (Implementation Plan in sibling doc)
Code reality: PARTIAL (spec exists in contract v1.2 §5; tool P7–P10 deferred/unbuilt; probes prove feasibility)
Risk: MEDIUM
Files WILL change: memory/tools/registry_sync.py · control prompt ROLE 13/14/§10 · index.yml (this item) · (delete 2 probes at end)
Files WILL NOT touch: frontend/** · backend/** · build_views/push/schema · contract (unless owner expands whitelist/adopts column) · .env · OAuth token
Owner decisions: 7 (see §6) — recommend defaults; decisions 1 & 2 may trigger a separate contract v1.3 gate
Docs: INTAKE.md · IMPACT_ANALYSIS.md · IMPLEMENTATION_PLAN.md
Next: Gate approval → Implementation
```
