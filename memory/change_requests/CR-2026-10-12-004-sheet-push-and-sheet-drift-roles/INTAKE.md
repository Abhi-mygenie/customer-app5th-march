# INTAKE — CR-2026-10-12-004
## Registry↔Google Sheet: two owner-invoked roles — SHEET PUSH & SHEET DRIFT

**Registered:** 2026-10-12 · **Role:** INTAKE (no code written) · **Status:** INTAKE — awaiting Planning gate

## Owner report
Formalise how the CR registry is mirrored to / reconciled with the Google Sheet (read by the Tech
Dashboard). Owner wants **explicit, manually-invoked roles** — no real-time or session-start
syncing (that would load the Sheet and add latency to every session). Two roles, names fixed by
owner:
- **SHEET PUSH** — push the registry (`index.yml`) → Google Sheet.
- **SHEET DRIFT** — show drift (read-only); owner decides in chat what to do next.

Full design captured in `/app/memory/inbox/DECISION_registry-sheet-roles_2026-10-12.md`.

## Classification
- Type: **CR** (process / agent-operating-prompt + tooling governance). No app runtime code.

## Severity / Risk
- **Severity: P2** — important governance, but a workaround exists today (run `registry_sync.py`
  manually).
- **Risk: MEDIUM** — SHEET PUSH performs a **one-way overwrite of a cross-team shared artefact**
  (the Sheet the CTO/Tech Dashboard reads); a wrong push could mislead that dashboard. SHEET DRIFT
  alone is LOW (read-only). Overall MEDIUM; do not downgrade without owner approval.

## Duplicate / history check
- **RELATED (not duplicate)** to **CR-2026-10-04-006** (`google-sheet-registry-mirror`, status
  SMOKE) which built `registry_sync.py` + the contract. This CR does **not** rebuild that; it
  (a) adds two named owner-invoked roles to the control prompt, (b) fixes the stale addendum §10,
  (c) declares `index.yml` the single source of truth, and (d) explicitly **defers** Sheet→registry
  reverse-read to its own future CR.

## Code already exists?
- Partially. Tool capabilities already present: `registry_sync.py sync` (push, one-way) and
  `audit` (**local** drift only — `index.yml` vs CR folders vs README). **Not present:** any
  command that reads the Sheet back (reverse drift). The two roles are **not** in the control
  prompt yet.

## Evidence (captured)
- `registry_sync.py` read this session: `push()` = batchClear+overwrite (all tabs except
  append-only Change Log); `audit()` = local-only comparison; auth needs
  `/app/secrets/sheets_token.json` + `GOOGLE_OAUTH_CLIENT_ID/SECRET` + `GOOGLE_SHEET_ID`.
- Contract `control/registry-sheet-contract.md` v1.2 (one-way push; reverse = owner-gated Change
  Log loop, marked deferrable P7–P10).
- Current pod: creds **absent** (only `GOOGLE_MAPS_API_KEY` in `backend/.env`); `index.yml`
  **behind** the markdown (BUG-005/006 and recent IMPLEMENTED/QA_PASS transitions not yet in it).
- Addendum §10 is stale (references `BUG_TRACKER_v2.md` / `BUG-NNN`; no mention of `index.yml`
  or the Sheet).

## Blast radius
- **SMALL–MEDIUM.** Edits are to the control prompt (governs all roles → handle carefully) and
  process docs; reuse of existing read-only/one-way tool. **No app runtime code, no customer data,
  no payment path.**

## Proposed scope for Planning (not approved yet)
In scope:
- Add **SHEET PUSH** and **SHEET DRIFT** to control prompt §3 (Role Decision Tree) + §8 (Role
  Playbooks) with Entry/Exit gates per the decision doc.
- Declare `index.yml` the single machine source of truth; fix addendum §10 accordingly.
- Define SHEET DRIFT v1 = **local** drift via `audit`; SHEET PUSH = `sync` (with `--dry-run`
  preview) gated on creds + owner approval.

Out of scope (own future CRs):
- Reverse read-back (Sheet → registry → Change Log → owner approve). Tool work not built.
- Any cron / scheduled audit / session-start preamble (owner declined for v1).
- Adding the actual OAuth creds/env (owner will provide; environment task, not this CR's code).

## Open decisions for Planning/owner
1. Exact role names/wording in §3 and whether SHEET DRIFT's name carries a "v1 = local drift" note.
2. Whether Planning may also reconcile `index.yml` with current markdown (data task) or leave to
   first SHEET PUSH run.
3. Confirm MEDIUM risk (external shared-artefact overwrite).

## Decisions locked (2026-10-12)
1. Role names: **Sheet Push** and **Sheet Drift** (confirmed).
2. `index.yml` reconcile: handled **per gate rules** — a Sheet-Push-time task, not a Planning side-effect.
3. Risk: **MEDIUM** confirmed.

## Next
Intake CLOSED → Planning complete (IMPACT_ANALYSIS.md + IMPLEMENTATION_PLAN.md written). Awaiting owner
approval to implement. **No code written during Intake.**
