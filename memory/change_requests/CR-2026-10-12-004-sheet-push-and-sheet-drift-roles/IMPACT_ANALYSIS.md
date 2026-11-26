# IMPACT ANALYSIS — CR-2026-10-12-004
## Add owner-invoked roles: SHEET PUSH & SHEET DRIFT

**Date:** 2026-10-12 · **Role:** PLANNING (no code) · **Risk:** MEDIUM (confirmed by owner)

## Item registered?
Yes — `index.yml` id CR-2026-10-12-004; INTAKE.md present; owner decisions locked.

## Code reality: PARTIAL
- `registry_sync.py` already provides `sync` (one-way push, overwrites all tabs except append-only
  Change Log) and `audit` (**local** drift only: `index.yml` ↔ CR folders ↔ README). Verified by
  reading the tool this session.
- The two roles do **not** exist in the control prompt (§8 currently has ROLE 1–12, ending at
  RELEASE before `## 9. STANDARD ARTIFACTS` at L717).
- No command reads the Sheet back (reverse drift not built — contract P7–P10 deferrable).

## Data flow
- Human CR docs + PRD → (reconcile) → `index.yml` → (`sync`) → Google Sheet → Tech Dashboard reads.
- Dashboard writes only the Assignee column (per contract §; never read back by the tool today).

## Conflicts
- None with active app CRs (different domain: agent-operating docs + tooling).
- Must be **append-only** to §8 (insert ROLE 13/14; do NOT renumber ROLE 1–12 or change any
  existing role text).
- Existing enum drift (legacy `index.yml` statuses `IMPACT_ANALYSIS`/`REGISTERED` vs the tool's
  8-value enum `INTAKE/PLANNING/IMPLEMENTED/QA/SMOKE/CLOSED/PARKED/DUPLICATE`) is **pre-existing
  and out of scope**; the §10 rewrite will point readers to the enum but this CR does not migrate
  statuses.

## Affected files + downstream consumers
| File | Change | Downstream |
|---|---|---|
| `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` | §3 +2 rows; §8 +ROLE 13/14; §10 addendum rewrite | Every future agent session reads this → new roles become available; existing roles unaffected (additive) |
| `memory/tools/registry_sync.py` | **No change** (reuse `sync`/`audit`) | — |
| `memory/change_requests/index.yml` | **No structural change** by this CR; reconcile is a Sheet-Push-time task (owner ruling, per gate rules) | Sheet (only when Sheet Push runs) |

## Risk = MEDIUM — rationale + mitigation
- SHEET PUSH overwrites a **cross-team shared artefact** (the Sheet the Tech/CTO Dashboard reads);
  a bad push could mislead that dashboard. SHEET DRIFT alone is LOW (read-only).
- Mitigation: append-only prompt edits; surgical §10 rewrite; SHEET PUSH gated on creds-present +
  clean `--dry-run` + explicit owner approval; one-way only; markdown structural check post-edit
  (role headers 1–14 contiguous, `## 9` intact).

## Owner decisions (all resolved 2026-10-12)
1. Names → **Sheet Push**, **Sheet Drift**. ✓
2. `index.yml` reconcile → per gate rules = **Sheet-Push-time task**, not Planning. ✓
3. Risk → **MEDIUM** confirmed. ✓
No open blocking decisions.

## Out of scope (separate future CRs)
- Reverse read-back (Sheet → registry → Change Log → owner approve); tool P7–P10 build.
- Cron/scheduled audit / session-start preamble (owner declined for v1).
- Providing OAuth creds/env (owner environment task).
- Legacy status-enum migration of `index.yml`.
