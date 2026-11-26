# DESIGN & DEMO HANDOFF — Reverse Sheet→Registry read ("SHEET DRIFT reads the Sheet")

**Date:** 2026-10-12 · **Mode:** Investigation/demo (read-only; nothing built into prod)
**Owner:** Abhishek Jain · **Status:** READY FOR INTAKE — open ONE new CR covering BOTH streams below.
**Origin:** deferred reverse-read from CR-2026-10-12-004 (which only added the two roles + one-way push).

## Goal
Make the registry↔Sheet mirror **two-way (read side)**: let **SHEET DRIFT** read the live Google
Sheet, show every owner edit in chat, and — via a governed loop — let approved edits flow back into
`index.yml`. Today SHEET DRIFT v1 is **local-only** (`audit` = `index.yml` vs CR folders vs README)
and `sync` is **one-way write**; neither reads the Sheet.

## This is ONE CR with TWO edit streams
1. **Control prompt** (`memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`):
   - Upgrade **ROLE 14 — SHEET DRIFT**: add a step that reads the Sheet and reports Sheet-vs-registry
     drift (remove the "v1 = local drift only / does NOT read the Sheet" caveat once built).
   - Touch **ROLE 13 — SHEET PUSH** / addendum §10 as needed to describe the governed apply loop
     (PENDING → owner approval → apply) and the reverse-accepted whitelist.
2. **Tool** (`memory/tools/registry_sync.py`): implement the deferred **P7–P10 read-merge-write**:
   read Sheet → diff vs `index.yml` → append one PENDING row per edit to the **Change Log tab** →
   owner approves in chat → apply **only whitelisted columns** to `index.yml` → reconcile.

## What we PROVED today (read-only demo, Path B)
Two throwaway probes (keep as reference; fold their logic into the tool, then delete):
- `memory/tools/reverse_drift_probe.py` — reads **All Items**, diffs reverse-accepted columns
  (Status/Registered/Closed) + Assignee vs `index.yml`.
- `memory/tools/reverse_drift_snapshot.py` — diffs the **live Sheet vs the last-pushed snapshot**
  (`.registry_csv`) across all 10 tabs; classifies each change (ACCEPTED / INFO / IGNORED / OUT-OF-SCHEMA).

**Live findings (2026-10-12, sheet `1-dS9OsFt4FQ68ufgP924jgfP7L8RNEKlVYCe39scqx0`):** detected **14 edits**,
all on All Items — **13× Priority→P0** (IGNORED, registry-owned) and **1 new column "Release week"**
(OUT-OF-SCHEMA). **0 reverse-accepted** (no Status/Registered/Closed edits). Conclusion: read-back works,
AND the whitelist guardrail works (0 of 14 would flow back under current rules).

## Governance model (from contract v1.2 — to implement)
- Reverse-accepted columns (current): **Status, Registered, Closed** only. Assignee = dashboard-owned (info).
- Every detected edit → **Change Log tab** as a **PENDING** row; owner approves/rejects; only then applied.
- **Registry wins on conflict** unless owner overrides.
- Reads are authoritative from the **All Items** tab.

## Open design decisions for Intake/Planning
1. **Whitelist:** keep {Status, Registered, Closed}, or add **Priority / Risk** (today's edits were Priority)?
2. **New columns** (e.g., "Release week"): surface-and-ignore (current), adopt into schema, or reject/warn?
3. **Where drift surfaces:** chat only (demo), vs also written as **PENDING** Change Log rows (governed loop).
4. **Apply mechanism:** how the agent applies approved rows to `index.yml` without reformatting the file
   (targeted edits, like this session) vs a YAML round-trip (risks losing comments/ordering).
5. **Status enum vs legacy:** reads may encounter legacy values; reuse the same 8-enum validation.
6. **Trigger:** SHEET DRIFT remains owner-invoked (no cron/preamble — consistent with CR-004 decision).

## Data gap noticed (separate cleanup, not this CR)
13 older items have **empty Priority in `index.yml`** (BUG-2026-09-10-001, CR-2026-07-03-008/009/011/012,
CR-2026-07-04-003/004, CR-2026-09-08-001, CR-2026-09-12-001/006/007/008/010). Backfill in a registry cleanup.

## Pointers
- Roles + one-way push: CR-2026-10-12-004 (IMPLEMENTED).
- Contract: `control/registry-sheet-contract.md` v1.2 (reverse loop spec, marked deferrable).
- Auth: `/app/secrets/sheets_token.json` + `GOOGLE_OAUTH_*`/`GOOGLE_SHEET_ID` (validated, working).
- Tool helpers to reuse: `access_token()`, `api()`, `a1()`, `load_index()`, `HEADERS`, `.registry_csv` snapshot.

## Next
Call **Intake** (then **Planning**) for a new CR, e.g. `CR-2026-10-12-005 — reverse Sheet→registry read
(SHEET DRIFT reads the Sheet + governed apply loop)`, covering both the prompt and tool edits above.
