# QA HANDOVER — CR-2026-10-12-005 (v1, read-only)

**What shipped:** read-only `drift` command in `memory/tools/registry_sync.py` + ROLE 14 SHEET DRIFT
upgrade (and ROLE 13/§10 notes) in the control prompt. **v1 writes nothing** — reads the live Sheet,
classifies every edit vs `index.yml`, prints in chat. No auto-update.

## Changed files
- `memory/tools/registry_sync.py` — docstring; `REVERSE_ACCEPTED/INFO/NEVER` constants;
  `read_sheet_all_items`, `expected_all_items`, `classify_column`, `diff_all_items`, `drift`; `__main__` dispatch.
- `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` — ROLE 14 (drift step,
  caveat replaced, output block), ROLE 13 rule, §10 reverse row.
- `memory/change_requests/index.yml` — this item → IMPLEMENTED.

## How to verify (needs live Sheet OAuth — already configured)
`python memory/tools/registry_sync.py drift`

## Self-test results (IMPLEMENTATION role)
| # | Check | Result |
|---|---|---|
| V1 | `drift` reads live Sheet, prints 4 buckets + membership, exit 0 | PASS |
| V2 | Status edit → ACCEPTED | PASS (classify unit test) |
| V3 | Priority edits → IGNORED | PASS (13 live Priority→P0 all IGNORED) |
| V4 | New column "Release week" surfaced | PASS (New-columns line) |
| V5 | Assignee → INFORMATIONAL | PASS (classify unit test) |
| V6 | `Last updated` never ACCEPTED | PASS (classify → IGNORED) |
| V7 | baseline rebuilt from index.yml (no stale snapshot) | PASS (uses `build_views`) |
| V8 | writes NOTHING | PASS (git: only code edits; Sheet untouched) |
| V9 | membership SHEET-ONLY / INDEX-ONLY | PASS (new CR shown INDEX-ONLY) |
| V10 | `index.yml` valid | PASS (114 items) |
| V11 | control prompt integrity | PASS (14 roles, fences balanced=66, caveat removed, drift step present) |
| V12 | no app code touched | PASS (`git diff --stat`: only registry_sync.py + control prompt) |
| REG | existing `audit` / usage still work | PASS |

## Notes for QA
- This is a CLI governance tool with live Google-Sheets OAuth — not an app flow. The testing_agent
  (browser/app) cannot exercise it (no OAuth creds). Verification is the CLI self-test above.
- OUT-OF-SCHEMA cells only flag when a new-column cell has a **value**; an empty new column is still
  surfaced via the "New columns on sheet" line (as with "Release week" today).
- After QA sign-off: delete throwaway probes `reverse_drift_probe.py`, `reverse_drift_snapshot.py` (R2).

## Deferred (NOT in v1)
- `reverse` (PENDING Change Log append) + `apply` (owner-approved write to `index.yml`) + any
  whitelist/contract change → future CR.
