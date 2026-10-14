# IMPLEMENTATION PLAN — CR-2026-10-12-005

**Title:** Reverse Sheet→registry read (SHEET DRIFT reads the live Sheet + governed apply loop)
**Role:** PLANNING · **Risk:** MEDIUM · **Priority:** P2 · **Date:** 2026-10-12
**Prereq gate:** OWNER APPROVAL of this plan + the 7 decisions in IMPACT_ANALYSIS §6.
**Scope lock:** two files change in code terms (`registry_sync.py`, control prompt) + `index.yml` block + probe deletion at end. No app source. No column-schema or contract change (unless owner picks decision 1/2 → separate gate).

> This plan assumes the IMPACT_ANALYSIS §6 **recommended defaults** (3-column whitelist, surface-all-classified, targeted index edits, rebuilt-from-index baseline, owner-invoked). If the owner overrides any, the affected steps below are annotated "[decision N]".

---

## STREAM 1 — TOOL (`memory/tools/registry_sync.py`)

Implements the tool's own reserved **P7–P10 (read-merge-write)**. All new code reuses existing helpers (`access_token`, `api`, `a1`, `HEADERS`, `load_index`, `build_views`, `CHANGELOG`-style append). No edits to `build_views`, `push`, `row_for`, or the schema constants.

### T1 — Read the live Sheet (P7a)
Add `read_sheet_all_items(token, sheet_id) -> dict[rid] = {header: value}`:
- `GET {sheet_id}/values/{a1('All Items')}` (same call the probe uses).
- Row 0 = live header list (capture it — needed for OUT-OF-SCHEMA column detection).
- For each data row, map by **position** to `HEADERS`; key by the `ID` column (index 1). Preserve any extra trailing columns beyond the 22 known headers as `col<N>` / their live header text.
- Return `(sheet_items, live_header)`.

### T2 — Build the expected view from index.yml (P7b)
- `records = load_index()`; `expected_rows = build_views(records)["All Items"]` (header + rows).
- Convert to `expected_items[rid] = {HEADERS[i]: cell}` using the same positional mapping. This is the authoritative baseline [decision 6].

### T3 — Diff + classify every changed cell (P8a)
Add `diff_all_items(expected_items, sheet_items, live_header) -> list[Edit]` where `Edit = (rid, column, registry_value, sheet_value, classification)`:
- For every rid present in both: compare each of the 22 columns; emit an Edit for any difference.
- Classification function (fold in from `reverse_drift_snapshot.classify`):
  - `ACCEPTED` → column in `{Status, Registered, Closed}` (whitelist) [decision 1].
  - `INFORMATIONAL` → column == `Assignee` (dashboard-owned; never read into registry — contract §5.6; report only).
  - `IGNORED` → any other known agent-owned column (e.g. Priority, Risk, Title…).
  - `OUT-OF-SCHEMA` → a live header not in `HEADERS` (e.g. "Release week") [decision 2].
- Also emit membership edits: rid only on Sheet (`SHEET-ONLY`), rid only in index (`INDEX-ONLY`).
- **Exclusions (contract §5):** never emit `Last updated` as ACCEPTED (agent-computed-only); Assignee is INFORMATIONAL only.

### T4 — `drift` subcommand — SHEET DRIFT read-only report (P8b)
Add CLI `python registry_sync.py drift`:
- Runs T1–T3, prints **every** edit grouped by classification with counts (ALL edits surfaced, per owner instruction) [decision 3]:
  ```
  SHEET DRIFT (live Sheet vs index.yml)
  ACCEPTED (would flow back): N
      <rid> | <col>: registry='..' -> sheet='..'
  INFORMATIONAL (Assignee, dashboard-owned): N
  IGNORED (registry-owned, not reverse-accepted): N
  OUT-OF-SCHEMA (new column/header): N
  Membership: SHEET-ONLY=N INDEX-ONLY=N
  TOTAL edits: N
  ```
- **Writes nothing.** This is the command ROLE 14 invokes.

### T5 — `reverse --dry-run` / `reverse` — governed apply loop (P9)
Add CLI `python registry_sync.py reverse [--dry-run]`:
1. Runs T1–T3.
2. For each **ACCEPTED** edit, append one **PENDING** row to the **Change Log tab** (8 cols per contract §5): `Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision=PENDING · Decided at= · Note`. Use `values:append` on `'Change Log'` (never clear it). [decision 3: PENDING rows only for ACCEPTED].
3. IGNORED / OUT-OF-SCHEMA / INFORMATIONAL edits are **reported but not written** to the Change Log (keeps it free of never-appliable rows); they are shown in the console summary with their classification.
4. `--dry-run` prints what would be appended and writes nothing.
5. **No write to `index.yml` in this step** — apply happens only after owner approval (T6).

### T6 — Apply approved rows (P10)
Add CLI `python registry_sync.py apply`:
1. Read the Change Log tab; select rows with `Decision == APPROVED` (owner sets this in chat → agent writes APPROVED, or owner types it in the cell — per contract D-A7, chat approval is SO's choice).
2. For each approved row, validate: column ∈ whitelist; if column == Status, value ∈ `STATUSES` else REJECT with note "invalid enum" [decision 5].
3. Apply via **targeted edit** to `index.yml` [decision 4]: locate the item block by `- id: <rid>` and replace only the single field line (`status:` / `registered:` / `closed:`), preserving all other lines, comments, ordering, and block spacing. Never rewrite the whole file.
4. Also bump that item's `last_updated` to today (agent-computed) and mark the Change Log row `APPLIED` with `Decided at`.
5. Rows failing validation → mark `REJECTED` with reason; their sheet cell is reverted to the registry value on the next `sync`.
6. Conflict rule: registry wins unless the row is owner-APPROVED (contract §5.4).

### T7 — Docstring + help
Update the module docstring: move P7–P10 from "deferrable" to implemented; document `drift`, `reverse`, `apply`. Wire the three new commands into `__main__`.

---

## STREAM 2 — CONTROL PROMPT (`...AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`)

### C1 — ROLE 14 (SHEET DRIFT) upgrade
- Add a step: *"Run `python memory/tools/registry_sync.py drift` (read-only) to read the live Sheet and report Sheet-vs-registry drift, classified (ACCEPTED / INFORMATIONAL / IGNORED / OUT-OF-SCHEMA) + membership."*
- Keep the existing local `audit` step (still useful for folders↔index↔README).
- **Remove** the "Scope / v1 limit … does NOT read the Google Sheet" caveat; replace with the new two-source capability (local `audit` + live `drift`).
- Keep "Read-only. Never write `index.yml`, never push, never edit code."

### C2 — ROLE 13 (SHEET PUSH) + §10 governed apply loop
- ROLE 13: add a note that the governed **reverse apply loop** (`reverse` → owner approval → `apply`) is the sanctioned path for Sheet→registry, owner-gated, whitelist = {Status, Registered, Closed}; `reverse`/`apply` are run only under an owner-approved SHEET DRIFT/PUSH session.
- §10 addendum "Reverse (Sheet → registry)" row: change from "Not automated / not built" to a short description of the governed loop (diff → PENDING Change Log rows → owner approval → apply whitelisted columns), citing contract §5 and the 3-column whitelist. Note that non-whitelisted edits are reported but overwritten on next push.

### C3 — Preserve CR-004 invariants
- Do NOT disturb the §3 role-decision-tree rows or the 14-role contiguity. After edits, re-verify: 14 role headers present & contiguous, `## 9` appears once, code fences balanced, only this file changed in the step.

---

## STREAM 3 — REGISTRY + CLEANUP

### R1 — index.yml block
Update `CR-2026-10-12-005` at each gate (PLANNING now → IMPLEMENTED after code). Exit-Gate: status, status_note, artefacts (+IMPACT_ANALYSIS, +IMPLEMENTATION_PLAN), last_updated.

### R2 — Delete throwaway probes (AFTER QA passes)
Remove `memory/tools/reverse_drift_probe.py` and `memory/tools/reverse_drift_snapshot.py` once their logic is folded into `registry_sync.py` and QA is green. Not before.

---

## VERIFICATION MATRIX

| # | Check | How | Expected |
|---|---|---|---|
| V1 | `drift` reads the live Sheet | run `drift` | prints ACCEPTED/INFORMATIONAL/IGNORED/OUT-OF-SCHEMA + membership, no exception |
| V2 | ALL edits surfaced | seed a Priority edit + a Status edit + a new column on the Sheet | all three appear, correctly classified (Priority=IGNORED, Status=ACCEPTED, new col=OUT-OF-SCHEMA) |
| V3 | `drift` writes nothing | diff `index.yml` + Sheet revisions before/after | unchanged |
| V4 | Baseline is index-derived | edit `index.yml`, re-run `drift` without push | diff reflects new index value (no stale-snapshot false positive) |
| V5 | `reverse --dry-run` writes nothing | run it | prints planned PENDING rows; Change Log tab unchanged |
| V6 | `reverse` appends PENDING only for ACCEPTED | run with 1 Status edit + 1 Priority edit | exactly 1 PENDING row (Status) appended; Priority reported, not appended |
| V7 | Change Log never cleared | run `reverse`, then `sync` | prior Change Log rows intact (append-only) |
| V8 | `apply` writes only whitelisted field, targeted | approve the Status row, run `apply` | only that item's `status:` line changes in `index.yml`; comments/order intact; row marked APPLIED |
| V9 | enum guard | approve a Status row with an invalid value | REJECTED with "invalid enum"; `index.yml` unchanged |
| V10 | `Last updated` never accepted | edit Last updated on Sheet | classified IGNORED, never ACCEPTED/PENDING (contract §5.5) |
| V11 | Assignee informational only | set Assignee on Sheet | reported INFORMATIONAL; never read into registry, never a PENDING row |
| V12 | index.yml still valid | `load_index()` after `apply` | validation passes, 114 items |
| V13 | control prompt integrity | structural check | 14 roles contiguous, `## 9` once, fences balanced, caveat removed from ROLE 14, §10 updated |
| V14 | no app code touched | `git diff --stat` | only `registry_sync.py`, control prompt, `index.yml`, (deleted probes) |

**QA note:** reverse-sheet tests require live Sheet access (OAuth token + `GOOGLE_*`). QA will seed edits on a throwaway revision, verify, then restore. No application regression needed (no app code changed), but a 1-line backend `curl` + frontend smoke confirms nothing was disturbed.

---

## EXIT GATE (Implementation will satisfy)
1. index.yml updated (this item)
2. (registry = this item's tracker; no separate issue tracker)
3. File ownership: documented in this plan (files WILL/WON'T change)
4. Code markers: `# CR-2026-10-12-005:` on new functions/commands in `registry_sync.py`
5. Tool runs clean: `drift`, `reverse --dry-run`, `apply` on seeded edits
6. Self-test V1–V14
7. QA_HANDOVER written
