# OWNER DECISIONS — CR-2026-10-12-005

**Date:** 2026-10-12 · **Ruled by:** Abhishek Jain (owner, in chat) · **Role recording:** PLANNING

## Headline ruling

> **v1 = READ-ONLY. No auto-update. Just show in chat what changed.**

The reverse direction is a **reporting** capability only. SHEET DRIFT reads the live Google Sheet,
compares it to `index.yml`, and **prints every edit in chat, classified**. **Nothing is ever written
back to `index.yml` automatically** — and in v1 there is **no write-back path at all** (the
`reverse`/`apply` governed-write loop is deferred to a later phase/CR).

## The 7 design decisions (from IMPACT_ANALYSIS §6)

| # | Decision | Ruling |
|---|---|---|
| 1 | Apply-back whitelist (Status/Registered/Closed vs add Priority/Risk) | **N/A for v1** — nothing is applied. Priority edits are **shown as IGNORED**. No contract change now. If write-back is wanted later, that is a separate contract v1.3 gate. |
| 2 | New columns ("Release week"): ignore / adopt / reject | **Surface-and-report as OUT-OF-SCHEMA.** No schema/contract change. |
| 3 | Where drift surfaces: chat only vs PENDING Change Log rows | **Chat only.** No Change Log writes in v1 (that was part of the deferred write loop). |
| 4 | Apply mechanism to index.yml | **N/A for v1** — no apply. (When built later: targeted edits, not YAML round-trip.) |
| 5 | Legacy status on read | Reuse the 8-value `STATUSES` enum when classifying; out-of-enum values are reported, never a problem because nothing is written. |
| 6 | Diff baseline | **Expected view rebuilt from `index.yml`** (always current), not the `.registry_csv` snapshot. |
| 7 | Trigger | **Owner-invoked only** (no cron / no session-start), consistent with CR-2026-10-12-004. |

## Scope consequence

- **Build in v1:** `drift` (read-only report) in `registry_sync.py` + ROLE 14 control-prompt upgrade.
- **Defer (own phase/CR):** `reverse` (PENDING Change Log append) + `apply` (owner-approved write to
  `index.yml`) + any whitelist/contract change. ROLE 13/§10 get a short "reverse read-only today;
  governed write-back deferred" note, not the full apply-loop wording.
- Writes nothing to the Sheet, nothing to `index.yml`, no Change Log rows. Pure read + chat report.
