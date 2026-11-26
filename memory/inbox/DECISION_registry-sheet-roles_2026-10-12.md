# DECISION — Registry↔Google Sheet: two owner-invoked roles (pre-intake)

**Date:** 2026-10-12 · **Mode:** Investigation (read-only; nothing executed, `index.yml` untouched)
**Owner:** Abhishek Jain · **Status:** DECIDED — ready to attach to a future INTAKE

## Context / goal
The CR registry is mirrored to a Google Sheet (read by the Tech Dashboard) via
`/app/memory/tools/registry_sync.py`, governed by `control/registry-sheet-contract.md` (v1.2).
Source of truth is `/app/memory/change_requests/index.yml`. The owner wants explicit,
owner-invoked roles for this — **no real-time / session-start syncing** (that would load the
Sheet and add latency for every session).

## Decision
Two separate, explicitly owner-invoked **roles** (names fixed by owner):

### Role: **SHEET PUSH**
- Purpose: push the registry → Google Sheet (one-way mirror).
- Command: `python registry_sync.py sync` (and `sync --dry-run` to preview first).
- Direction: `index.yml` → Sheet (overwrites all tabs except append-only Change Log).
- Entry gate: creds present (`/app/secrets/sheets_token.json` + `GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_SHEET_ID` in `backend/.env`); `index.yml` reconciled
  with the CR docs first; owner approved the push.
- Exit gate: dry-run reviewed → push succeeded → report Sheet URL + Summary counts + pending
  Change-Log rows.
- STATUS TODAY: tool capability **exists**; blocked only by missing creds in this pod.

### Role: **SHEET DRIFT**
- Purpose: show drift, read-only; owner decides in chat what to do next.
- Command: `python registry_sync.py audit`.
- **v1 scope caveat:** `audit` today compares **local artefacts only** — `index.yml` vs the CR
  folders vs README. It does **NOT read the Google Sheet back.** So v1 "drift" = internal
  (registry vs docs) drift, which is the drift that actually exists today (e.g. BUG-005/006 and
  recent status transitions not yet in `index.yml`).
- Entry gate: none (read-only). Exit gate: drift report printed in chat; owner decides.

## Explicitly NOT in v1
- No session-start preamble / Gate 0, no cron, no scheduled audit — **on-demand only.**
- No automatic reverse-sync. Sheet edits are **overwritten** on the next SHEET PUSH (except the
  Change Log tab).

## Known gap → separate future CR
**Reverse read (Sheet → registry) is not built.** The contract specifies it (diff Sheet against
registry → append per-edit rows to the Change Log as PENDING → owner approves → apply; only
`Status`, `Registered`, `Closed` accepted back; registry wins on conflict), but the tool's
`sync` only writes and `audit` only reads locally (the "P7–P10 read-merge-write" work is marked
deferrable in `registry_sync.py`). Until that CR lands:
- SHEET DRIFT cannot report Sheet-vs-registry differences (only local drift).
- Owner should treat the Sheet as a **mirror/display**, not an input surface.

## Prerequisites before SHEET PUSH can run in this pod
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_SHEET_ID` in `/app/backend/.env`
  (owner will add).
- `/app/secrets/sheets_token.json` (OAuth refresh token) present.

## Open items to settle at INTAKE
1. Add both roles to control prompt §3 (Role Decision Tree) + §8 (Role Playbooks) with the
   gates above.
2. Declare `index.yml` the single machine source of truth (markdown = detail, Sheet = mirror),
   and fix the stale addendum §10 (which still references `BUG_TRACKER_v2.md` / `BUG-NNN` and
   "status in PRD.md/CR.md" with no mention of `index.yml` or the Sheet).
3. Decide whether SHEET DRIFT's name should carry a v1 note, given it reports local drift until
   the reverse-read CR lands.
4. Reconcile `index.yml` with the latest CR docs (BUG-005, BUG-006, CR-002/003 status) — a
   data task for the first SHEET PUSH run.
5. Schedule the reverse-read (Sheet → registry) as its own CR if/when dashboard edits must flow
   back.

## Investigation outcome
CLOSED. Recommendation delivered; decision recorded. No code, no `index.yml` edit, no sync run.
