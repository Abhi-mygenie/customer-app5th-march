# IMPLEMENTATION PLAN — CR-2026-10-12-005 (v1, read-only)

**Title:** Reverse Sheet→registry read — SHEET DRIFT reads the live Sheet and reports ALL edits in chat
**Role:** PLANNING · **Risk:** MEDIUM · **Priority:** P2 · **Date:** 2026-10-12
**Owner ruling (DECISIONS.md):** v1 = **READ-ONLY. No auto-update. Show in chat what changed.**
No write-back to `index.yml`, no Sheet writes, no Change Log rows. `reverse`/`apply` write-loop **DEFERRED**.

**Scope lock (v1):**
- CHANGE: `memory/tools/registry_sync.py` (add read-only `drift`) · control prompt ROLE 14 (+ small ROLE 13/§10 note) · `index.yml` (this item).
- DO NOT TOUCH: `frontend/**`, `backend/**`, `build_views`/`push`/`row_for`/schema constants, contract, `.env`, OAuth token, Change Log tab, `index.yml` data of other items.
- DEFER: `reverse` (PENDING append) + `apply` (write to index) + any whitelist/contract change → future CR.

---

## STREAM 1 — TOOL: `memory/tools/registry_sync.py` (read-only `drift`)

All additions **reuse** existing helpers: `access_token()` (L582), `api()` (L602), `a1()` (L611),
`HEADERS` (L102-107), `load_index()` (L303), `build_views()` (L506). Nothing existing is modified except
the docstring and the `__main__` dispatch.

### T1 — Docstring: promote the read-only reverse command (edit L7-21)
In the module docstring command list (currently lines 7-13), add one line under `audit`:
```
    python registry_sync.py drift           # read-only: diff LIVE Sheet vs index.yml, classify, print
```
In the P-note block (lines 17-21), change the `P7-P10` line to record that **v1 ships the read-only
drift report; the governed write-back (PENDING→approve→apply) remains deferred**.

### T2 — Classification constants (insert after HEADERS, ~L108)
Add, with a `# CR-2026-10-12-005:` marker:
```python
# CR-2026-10-12-005: reverse read-only classification (contract §5 whitelist + §5.6 Assignee)
REVERSE_ACCEPTED = {"Status", "Registered", "Closed"}   # would flow back (write-loop deferred)
REVERSE_INFO     = {"Assignee"}                          # dashboard-owned, informational only
REVERSE_NEVER    = {"Last updated"}                      # agent-computed-only, never accepted (§5.5)
```

### T3 — `read_sheet_all_items(token, sheet_id)` (new fn, place in the push/read area ~after L690)
```python
# CR-2026-10-12-005: read the live All Items tab (read-only)
def read_sheet_all_items(token, sheet_id):
    resp = api("GET", token, f"{sheet_id}/values/{a1('All Items')}")
    rows = resp.get("values", [])
    if not rows:
        return {}, []
    live_header = [str(c).strip() for c in rows[0]]
    items = {}
    for r in rows[1:]:
        rid = str(r[1]).strip() if len(r) > 1 else ""
        if not rid:
            continue
        items[rid] = {live_header[i] if i < len(live_header) else f"col{i}":
                      (str(r[i]).strip() if i < len(r) else "") for i in range(len(live_header))}
    return items, live_header
```
Notes: keyed by the `ID` column (position 1, same as the probe). Trailing cells beyond the known
headers are keyed by their live header text (or `col<N>` if blank) — this is how OUT-OF-SCHEMA
columns like "Release week" get surfaced.

### T4 — `expected_all_items()` (new fn)
```python
# CR-2026-10-12-005: expected All Items rebuilt from index.yml (authoritative baseline, decision 6)
def expected_all_items():
    records = load_index()
    rows = build_views(records)["All Items"]
    header = [str(c).strip() for c in rows[0]]
    items = {}
    for r in rows[1:]:
        rid = str(r[1]).strip() if len(r) > 1 else ""
        if rid:
            items[rid] = {header[i]: (str(r[i]).strip() if i < len(r) else "")
                          for i in range(len(header))}
    return items, header
```
Reuses `build_views` so the baseline is exactly what the next push would write — never a stale snapshot.

### T5 — `classify_column(col)` (new fn)
```python
# CR-2026-10-12-005: classify a changed column for the read-only drift report
def classify_column(col):
    if col in REVERSE_NEVER:    return "IGNORED"          # §5.5 never accepted
    if col in REVERSE_ACCEPTED: return "ACCEPTED"         # would flow back (write deferred)
    if col in REVERSE_INFO:     return "INFORMATIONAL"    # Assignee, dashboard-owned
    if col in HEADERS:          return "IGNORED"          # registry-owned agent column
    return "OUT-OF-SCHEMA"                                # new column/header on the sheet
```

### T6 — `diff_all_items(expected, sheet)` (new fn)
```python
# CR-2026-10-12-005: per-cell diff; returns (edits, sheet_only_ids, index_only_ids)
def diff_all_items(expected, sheet):
    edits = []
    for rid in sorted(set(expected) & set(sheet)):
        exp, got = expected[rid], sheet[rid]
        cols = list(dict.fromkeys(list(exp.keys()) + list(got.keys())))
        for col in cols:
            if col == "ID":
                continue
            ev, sv = exp.get(col, ""), got.get(col, "")
            if ev != sv:
                edits.append((rid, col, ev, sv, classify_column(col)))
    sheet_only = sorted(set(sheet) - set(expected))
    index_only = sorted(set(expected) - set(sheet))
    return edits, sheet_only, index_only
```
Compares the union of known + live-only columns so an added column is caught on every row.

### T7 — `drift()` command (new fn, read-only report)
```python
# CR-2026-10-12-005: SHEET DRIFT read-only — read live Sheet, classify, print. Writes NOTHING.
def drift():
    token, sheet_id = access_token()
    sheet, live_header = read_sheet_all_items(token, sheet_id)
    expected, _ = expected_all_items()
    edits, sheet_only, index_only = diff_all_items(expected, sheet)
    buckets = ["ACCEPTED", "INFORMATIONAL", "IGNORED", "OUT-OF-SCHEMA"]
    print(f"SHEET DRIFT (live Sheet vs index.yml) — {len(edits)} edited cell(s)\n")
    for b in buckets:
        rows = [e for e in edits if e[4] == b]
        label = {"ACCEPTED": "ACCEPTED (whitelisted; write-back deferred, NOT applied)",
                 "INFORMATIONAL": "INFORMATIONAL (Assignee, dashboard-owned)",
                 "IGNORED": "IGNORED (registry-owned / never-accepted)",
                 "OUT-OF-SCHEMA": "OUT-OF-SCHEMA (new column on the sheet)"}[b]
        print(f"{label}: {len(rows)}")
        for rid, col, ev, sv, _ in rows:
            print(f"    {rid} | {col}: index='{ev}' -> sheet='{sv}'")
    print(f"\nMembership: SHEET-ONLY={len(sheet_only)} {sheet_only[:10]} | "
          f"INDEX-ONLY={len(index_only)} {index_only[:10]}")
    new_cols = [h for h in live_header if h and h not in HEADERS]
    if new_cols:
        print(f"New columns on sheet (out-of-schema): {new_cols}")
    print("\n(READ-ONLY — nothing written to the Sheet or index.yml. No auto-update.)")
```

### T8 — Wire `drift` into `__main__` (edit L749-763)
Add before the final `else:`:
```python
    elif command == "drift":
        drift()
```

### T9 — NO changes to
`build_views`, `push`, `row_for`, `sync`, `changelog`, `audit`, column/enum constants, Change Log tab.

---

## STREAM 2 — CONTROL PROMPT

### C1 — ROLE 14 SHEET DRIFT (edit lines 769-791)
- **Insert** a new step after the current step 1 (`audit`):
  `2. Run `python memory/tools/registry_sync.py drift` (read-only) to read the LIVE Google Sheet and report every edited cell vs index.yml, classified: ACCEPTED / INFORMATIONAL / IGNORED / OUT-OF-SCHEMA, plus membership (SHEET-ONLY / INDEX-ONLY) and any new columns.`
  (renumber the old steps 2→3, 3→4.)
- **Replace** the "Scope / v1 limit" block (lines 775-777) with:
  `Scope / v1: `audit` = LOCAL drift (index.yml vs folders vs README). `drift` = LIVE Sheet-vs-index.yml drift, READ-ONLY report in chat. No write-back: Sheet edits are NEVER auto-applied to index.yml in v1 (governed write-back — PENDING→owner approval→apply — is a deferred future CR).`
- **Keep** the Rules block ("Read-only. Never write index.yml, never push, never edit code.").
- Update the Output block to add a line: `Sheet drift (live): <N edits: ACCEPTED/INFO/IGNORED/OUT-OF-SCHEMA>`.

### C2 — ROLE 13 SHEET PUSH (edit line 741) + §10 (edit line 1435)
- ROLE 13 rule (line 741): keep "One-way only" but amend the parenthetical to:
  `(reverse is READ-ONLY drift reporting via SHEET DRIFT; governed write-back to the registry is a deferred future CR, not built).`
- §10 "Reverse (Sheet → registry)" row (line 1435): change to note that **reading** the Sheet for a
  read-only, classified drift report now exists (SHEET DRIFT `drift`), but **writing** Sheet edits
  back into `index.yml` is still not built; Sheet edits remain overwritten by the next SHEET PUSH.

### C3 — Preserve CR-004 invariants
After edits re-verify: 14 role headers present & contiguous; `## 9` appears exactly once; code fences
balanced; only this file changed in the step. (Same self-test CR-004 used.)

---

## STREAM 3 — REGISTRY + CLEANUP

### R1 — `index.yml` block (this item)
Implementation Exit-Gate: status → IMPLEMENTED, status_note (what shipped: read-only `drift` + ROLE 14),
artefacts += DECISIONS, last_updated. No other item touched.

### R2 — Delete throwaway probes AFTER QA passes
Remove `memory/tools/reverse_drift_probe.py` + `memory/tools/reverse_drift_snapshot.py` once `drift`
is QA-green. Their logic is fully folded into T3/T5/T6.

---

## VERIFICATION MATRIX (v1)

| # | Check | How | Expected |
|---|---|---|---|
| V1 | `drift` reads the live Sheet without error | `python registry_sync.py drift` | prints 4 buckets + membership, exit 0 |
| V2 | Status edit → ACCEPTED | set a Status cell on the Sheet, run `drift` | that cell listed under ACCEPTED |
| V3 | Priority edit → IGNORED | the 13 live Priority→P0 edits | listed under IGNORED (not ACCEPTED) |
| V4 | New column → OUT-OF-SCHEMA | "Release week" column | listed under OUT-OF-SCHEMA + in "New columns" line |
| V5 | Assignee → INFORMATIONAL | set an Assignee cell | listed under INFORMATIONAL |
| V6 | `Last updated` never ACCEPTED | edit Last updated on Sheet | classified IGNORED |
| V7 | baseline is index-derived (no stale snapshot) | edit `index.yml`, re-run `drift` (no push) | diff reflects the new index value |
| V8 | writes NOTHING | capture Sheet revision + `git status` before/after `drift` | Sheet unchanged; only console output; no file writes |
| V9 | membership | an id only in index / only on sheet | shown under INDEX-ONLY / SHEET-ONLY |
| V10 | `index.yml` still valid | `load_index()` | passes, 114 items |
| V11 | control prompt integrity | structural check | 14 roles contiguous, `## 9` once, fences balanced, caveat replaced |
| V12 | no app code touched | `git diff --stat` | only `registry_sync.py`, control prompt, `index.yml` (+ probe deletions) |

**QA note:** needs live Sheet access (OAuth token + `GOOGLE_*`, already validated). QA seeds a few cell
edits on the live Sheet, runs `drift`, confirms classification, then the owner can restore cells (or a
later SHEET PUSH overwrites them). No app regression needed (no app code changed).

---

## EXIT GATE (Implementation must satisfy)
1. `index.yml` updated (this item) ✅ at impl time
2. (this CR is its own tracker)
3. File ownership documented above (WILL/WON'T change)
4. Code markers `# CR-2026-10-12-005:` on every new fn/command
5. Tool runs clean: `drift` on seeded edits
6. Self-test V1–V12
7. QA_HANDOVER written

## DEFERRED (future CR — not v1)
- `reverse` (append PENDING rows to Change Log for ACCEPTED edits)
- `apply` (owner-approved, targeted write of whitelisted fields to `index.yml`, enum-guarded)
- any whitelist expansion (Priority/Risk) / new-column adoption → contract v1.3 gate
