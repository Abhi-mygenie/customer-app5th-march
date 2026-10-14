# IMPLEMENTATION PLAN (edit-by-edit) — CR-2026-10-12-004
## SHEET PUSH & SHEET DRIFT roles — all edits in the control prompt

**Date:** 2026-10-12 · **Risk:** MEDIUM · **Gate:** HOLD — awaiting owner approval to implement.
**Target file (only):** `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`
**No app code, no tool code, no `index.yml` structural change.** (Implementation Agent re-greps every
anchor before editing — line numbers below are indicative as of 2026-10-12.)

---

### EDIT 1 — §3 Role Decision Tree: add two rows (after the RELEASE row, ~L142)

OLD:
~~~
| Production release is approved | RELEASE |
~~~
NEW:
~~~
| Production release is approved | RELEASE |
| Registry must be mirrored (pushed) to the Google Sheet | SHEET PUSH |
| Registry drift / health must be shown for an owner decision | SHEET DRIFT |
~~~

---

### EDIT 2 — §8 Role Playbooks: append ROLE 13 + ROLE 14 (before `## 9. STANDARD ARTIFACTS`, ~L715–717)

OLD:
~~~
---

## 9. STANDARD ARTIFACTS
~~~
NEW:
~~~
---

### ROLE 13 — SHEET PUSH AGENT

Use when the owner asks to mirror the CR registry to the Google Sheet.

Read:

- project addendum §10 (Registry / Tracking Rules)
- control/registry-sheet-contract.md
- memory/change_requests/index.yml (machine source of truth)

Do:

1. Verify credentials present: `/app/secrets/sheets_token.json` plus `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_SHEET_ID` in `backend/.env`. If any missing, stop with OWNER APPROVAL REQUIRED (credentials).
2. Reconcile `index.yml` with the CR markdown / PRD so it reflects reality. This is the only role that writes `index.yml` for the purpose of a push.
3. Run `python memory/tools/registry_sync.py audit` and show drift.
4. Run `python memory/tools/registry_sync.py sync --dry-run`; show the diff / CSV summary.
5. Get explicit owner approval to push.
6. Run `python memory/tools/registry_sync.py sync` (one-way `index.yml` → Sheet; Change Log tab is append-only).
7. Report Sheet URL, Summary counts, and any pending Change-Log rows.

Rules:

- One-way only. Never read the Sheet back into the registry (reverse-sync is a separate gated capability, not built).
- Never push without owner approval and a clean dry-run.
- Do not edit application code.

Output:

```text
Sheet Push complete: <IDs synced / all>
Creds: PRESENT / MISSING
Reconcile: index.yml == docs (YES/NO)
Dry-run reviewed: YES
Owner approval: YES
Push: SUCCESS / FAIL
Sheet: <url>
Next: none / SHEET DRIFT
```

---

### ROLE 14 — SHEET DRIFT AGENT

Use when the owner wants to see registry drift / health before deciding what to do. Read-only.

Read:

- project addendum §10 (Registry / Tracking Rules)
- memory/change_requests/index.yml

Do:

1. Run `python memory/tools/registry_sync.py audit` (read-only).
2. Report drift in chat, grouped: folders↔index, README↔index, code-markers-vs-status tripwire, unadjudicated status, unroutable items.
3. Recommend a next action (e.g., reconcile item X, or run SHEET PUSH). Do not act — the owner decides in chat.

Scope / v1 limit:

- `audit` compares LOCAL artefacts only (`index.yml` vs CR folders vs README). It does NOT read the Google Sheet. Sheet-vs-registry (reverse) drift is unavailable until the reverse-read CR lands.

Rules:

- Read-only. Never write `index.yml`, never push, never edit code.

Output:

```text
Sheet Drift report
Indexed: <N> | Folders: <N>
Drift buckets: <label: count ...>
Recommendation: <text>
Next: owner decision
```

---

## 9. STANDARD ARTIFACTS
~~~

---

### EDIT 3 — Addendum §10 Registry / Tracking Rules: replace stale trackers with the real model (~L1344–L1369)

OLD (the `### Bug Tracker` table through the `### Change Request Tracker` table, i.e. everything from
`### Bug Tracker` up to and including the CR Tracker's `How to update | Edit relevant markdown files...`
row — keep the later `### Handover Process` subsection unchanged):
~~~
### Bug Tracker
... (BUG_TRACKER_v2.md table) ...
### Change Request Tracker
... (CR tracker table, ending `| How to update | Edit relevant markdown files. Update /app/memory/PRD.md with CR status. |`) ...
~~~
NEW:
~~~
### Machine registry (single source of truth)

| Field | Detail |
|-------|--------|
| **Source of truth** | `/app/memory/change_requests/index.yml` — one YAML block per item. CR markdown folders hold human detail; `PRD.md` holds narrative. On conflict, reconcile **into** `index.yml`. |
| **ID Format** | `<TYPE>-YYYY-MM-DD-NNN` where TYPE ∈ {CR, BUG, INV, PROD-INCIDENT}; NNN is per-type per-day. |
| **Status enum** | `INTAKE · PLANNING · IMPLEMENTED · QA · SMOKE · CLOSED · PARKED · DUPLICATE` (contract v1.2). Terminal: CLOSED/PARKED/DUPLICATE. |
| **Priority / Risk** | Priority `P0–P3`; Risk `LOW/MEDIUM/HIGH/CRITICAL`. |
| **How items update** | Each role updates the item's `index.yml` block + its markdown as part of its Exit Gate. No work without a registered ID. |
| **Google Sheet mirror** | `index.yml` is mirrored one-way to a Google Sheet (read by the Tech Dashboard) via `memory/tools/registry_sync.py`, governed by `control/registry-sheet-contract.md`. |
| **Who mirrors** | Only the **SHEET PUSH** role runs the push; only the **SHEET DRIFT** role shows drift. No other role touches the Sheet or runs the tool. |
| **Reverse (Sheet → registry)** | Not automated / not built. Sheet edits are overwritten by the next SHEET PUSH (except the append-only Change Log tab). Reverse read-back is a separate future CR. |
~~~

---

## Verification matrix (self-test for Implementation)
| # | Check | Expected |
|---|---|---|
| V1 | `grep '^### ROLE' <prompt>` | ROLE 1…14 contiguous; RELEASE still 12; SHEET PUSH=13, SHEET DRIFT=14 |
| V2 | `## 9. STANDARD ARTIFACTS` still present exactly once | yes |
| V3 | §3 table has the 2 new rows directly under the RELEASE row | yes |
| V4 | §10 no longer references `BUG_TRACKER_v2.md`; now names `index.yml`, the contract, and both roles | yes |
| V5 | `### Handover Process` subsection intact after §10 rewrite | yes |
| V6 | Markdown structure sane (no broken/dangling code fences); role count 14 | yes |
| V7 | No change to `registry_sync.py` or `index.yml` schema; no app files touched | `git diff --name-only` shows only the control prompt |

## Scope lock
WILL change: `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` (§3, §8, §10) only.
WILL NOT touch: `registry_sync.py`, `index.yml` schema, any `frontend/`/`backend/` code, the contract file,
and existing ROLE 1–12 text.
