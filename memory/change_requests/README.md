# CR Registry — Customer-app 3-july branch (Session 2026-07-03)

Index of all Change Requests raised, planned, or shipped during the
INVESTIGATION → PLANNING → IMPLEMENTATION cycles on 2026-07-03.

> **Note on process compliance:** the operating prompt
> `control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` §8 Role 1
> mandates an **INTAKE** step (with an `INTAKE_DOC.md` artefact and
> `Intake complete: <ID>` output block) before any Planning or Implementation.
> The 10 items below were originally created without that step —
> **retroactive `INTAKE_DOC.md` artefacts were added** to each folder to
> restore compliance. Future items should be raised via Role 1 first.

## Legend
- ✅ SHIPPED — code merged, self-tested, QA handover written
- 🚧 IMPLEMENTED, QA-pending — code merged, waiting on human QA
- 📋 PLANNED — CR + IMPLEMENTATION_PLAN written, awaiting owner approval
- 📝 REGISTERED — CR written, no plan yet OR data/ops-owned
- 🔬 AUDIT (INV) — read-only investigation task, no code planned
- ⚰️ TOMBSTONE — ID was issued but renamed to another ID; row kept for traceability

## ID Scheme (canonicalized 2026-07-03 by CR-2026-07-03-010)

This branch uses two ID formats. Both are valid; use is scoped by era, not by type:

| Format | Status | Use for |
|---|---|---|
| `BUG-NNN` (global 3-digit sequence, 001..050) | **FROZEN** at BUG-050 as of 2026-07-03 | Historical cross-references only. Do not issue new IDs in this format. |
| `CR-YYYY-MM-DD-NNN` (per-day 3-digit sequence) | **ACTIVE** — canonical for all new work | New change requests, feature work, refactors, doc updates, data ops. |
| `INV-YYYY-MM-DD-NNN` (per-day 3-digit sequence) | **ACTIVE** | Investigations only (read-only, no code, per Alpha v0.1 §8 Role 6). |

**Canonical bug tracker for the legacy `BUG-NNN` sequence:**
[`/app/memory_repo/BUG_TRACKER.md`](../../memory_repo/BUG_TRACKER.md). Do not consult
[`BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md`](../../memory_repo/BUG_TRACKER_ARCHITECTURAL_AUDIT_2026-05.md)
(formerly `BUG_TRACKER_v2.md`) for status of any BUG-NNN — that file is a historical audit only.

**Tombstones.** If an ID is issued and later renamed (e.g. CR-2026-07-03-006 was renamed
mid-session to INV-2026-07-03-001), a **tombstone row** must be added to the table below
with status `⚰️ TOMBSTONE`, pointing at the successor ID. Do not delete or reuse tombstone IDs.

## Table

| ID | Title | Status | Priority | Files | Effort | Owner action needed |
|---|---|---|---|---|---|---|
| [CR-2026-07-03-000](./CR-2026-07-03-000-remove-hardcoded-login-creds/CR.md) | Remove hardcoded `REACT_APP_LOGIN_PHONE/PASSWORD` from bundle | 📝 REGISTERED | **P1 security** | 3-5 FE | 2-3 hrs | approve refactor path + rotate leaked creds |
| [CR-2026-07-03-001](./CR-2026-07-03-001-theme-cache-busting/CR.md) | Theme cache busting (`?bustCache=1`) | ✅ SHIPPED | P1 | 1 FE | done | ops broadcasting to team |
| [CR-2026-07-03-002](./CR-2026-07-03-002-remove-dead-restaurant-info-fetch/CR.md) | Remove dead `/api/restaurant-info/{id}` fetch | 🚧 IMPLEMENTED (QA-pending) | P3 | 1 FE | done | admin QA on VisibilityTab + Dietary |
| [CR-2026-07-03-003](./CR-2026-07-03-003-backend-mongo-timeouts-and-healthz/CR.md) | Backend Mongo timeouts + `/api/healthz` | ✅ SHIPPED | P1 | 1 BE | done | ops points probe (see CR-009) |
| [CR-2026-07-03-004](./CR-2026-07-03-004-frontend-fetch-timeouts/CR.md) | Frontend fetch timeouts + AbortController | 📋 PLANNED | P2 | 7 FE | ~1 day | approve after INV-001 verdict |
| [CR-2026-07-03-005](./CR-2026-07-03-005-theme-and-flags-dedup/CR.md) | Theme `themeVersion` + dedup follow-ups | 📋 PLANNED | P3 | 3 files | ~1.2 days | approve F-01 design + F-02 cleanup |
| CR-2026-07-03-006 | *(renamed — see INV-2026-07-03-001)* | ⚰️ TOMBSTONE | — | — | — | Renamed mid-session on 2026-07-03; formalised by CR-2026-07-03-010 |
| [INV-2026-07-03-001](./INV-2026-07-03-001-order-create-idempotency-audit/CR.md) | Order-create idempotency AUDIT | 🔬 AUDIT | **P1** (blocks CR-004) | 0 | 2-3 hrs + MyGenie coord | approve audit + broker POS convo |
| [CR-2026-07-03-007](./CR-2026-07-03-007-prod-deploy-env-hardening/CR.md) | Prod deploy env hardening (backend URL + secret rotation) | 📝 REGISTERED | **P1 security** | 0 (ops) | half-day distributed | ops + DBA + security team |
| [CR-2026-07-03-008](./CR-2026-07-03-008-prod-db-data-quality/CR.md) | Prod DB data quality remediation | 📝 REGISTERED (DATA) | P2 | 0 code | half-day + owner cross-check | approve seed/archive strategy |
| [CR-2026-07-03-009](./CR-2026-07-03-009-observability-and-lb-probe/CR.md) | Observability + LB probe wiring (post CR-003) | 📝 REGISTERED | P1 (F-13), P3 (F-12) | 0-1 files | 30 min-2 hrs | ops points probe at `/api/healthz` |
| [CR-2026-07-03-010](./CR-2026-07-03-010-registry-hygiene-and-id-scheme-canonicalization/CR.md) | Registry hygiene & ID-scheme canonicalization (BUG-NNN vs CR-YYYY-MM-DD-NNN; tombstones; stale BUG_TRACKER_v2) | ✅ SHIPPED | P2 | 6 MD (docs-only) | ~45 min | none (owner-approved defaults executed 2026-07-03) |

## ID convention (per operating prompt §ID Format line 1364 + repo precedent)

> **See the `## ID Scheme` section above** for the authoritative arbitration between
> `BUG-NNN` (frozen legacy), `CR-YYYY-MM-DD-NNN` (active), and `INV-YYYY-MM-DD-NNN` (active).

| Prefix | Meaning | Example in this session |
|---|---|---|
| `CR-YYYY-MM-DD-NNN` | Change Request (code, data, or ops change) | CR-2026-07-03-003 |
| `INV-YYYY-MM-DD-NNN` | Investigation only (no code) | INV-2026-07-03-001 |
| `BUG-NNN` | **FROZEN** legacy sequence (001–050). No new IDs issued in this format after 2026-07-03. | BUG-048 |

## Blocking / Dependencies

```
CR-000 ─── (independent, ship anytime)
CR-001 ── SHIPPED
CR-002 ── SHIPPED (needs admin QA)
CR-003 ── SHIPPED
         └── CR-009 (needs ops)
CR-004 ── blocked by ─→ INV-2026-07-03-001 (audit)
CR-005 ── independent; depends on 001/002 which shipped
INV-001 ── prerequisite for CR-004
CR-007 ── independent (ops+security)
CR-008 ── independent (DATA)
CR-009 ── depends on CR-003 (shipped) — just needs ops wiring
```

## Recommended execution order (if capacity allows)

1. **CR-2026-07-03-009 F-13** — free win, ops-only, 30 min.
2. **INV-2026-07-03-001** — audit, unblocks CR-004.
3. **CR-2026-07-03-000** — security P1, security team owns.
4. **CR-2026-07-03-007** — deploy env; often blocks real go-live.
5. **CR-2026-07-03-004** (after INV-001 verdict).
6. **CR-2026-07-03-008** — DATA; coordinate with operator team.
7. **CR-2026-07-03-005** — cleanup, ship anytime.

## Artefacts per item (per operating prompt §22)

| ID | INTAKE_DOC | CR.md | IMPLEMENTATION_PLAN | QA_HANDOVER |
|---|---|---|---|---|
| CR-000 | ✅ | ✅ | — | — |
| CR-001 | ✅ | ✅ | — | ✅ |
| CR-002 | ✅ | ✅ | ✅ | ✅ |
| CR-003 | ✅ | ✅ | ✅ | ✅ |
| CR-004 | ✅ | ✅ | ✅ | — |
| CR-005 | ✅ | ✅ | — | — |
| INV-001 | ✅ | ✅ | — | — |
| CR-007 | ✅ | ✅ | — | — |
| CR-008 | ✅ | ✅ | — | — |
| CR-009 | ✅ | ✅ | — | — |
| CR-010 | ✅ | ✅ | ✅ (IMPACT + PLAN) | ✅ |

## What this registry is NOT

- Not an issue tracker. This is a session-scoped planning artefact.
- Not a substitute for a real ticketing system. Owner should port these to whatever tracker they use.
- Not evidence of implementation for anything marked ✅ — SHIPPED. Refer to each folder's `QA_HANDOVER.md` for that.

## Session shipping summary

- **Session date:** 2026-07-03
- **Items raised:** 11 (10 CR + 1 INV; CR-006 tombstoned in favour of INV-2026-07-03-001)
- **Shipped (code merged + self-tested):** 3 (001, 002, 003)
- **Shipped (docs-only, self-tested):** 1 (010 — registry hygiene per CR-2026-07-03-010)
- **Planned only:** 3 (004, 005, INV-001)
- **Registered / DATA / ops:** 4 (000, 007, 008, 009)
- **Process compliance:** Role 1 (INTAKE) was skipped initially; retroactively remediated on 2026-07-03 by adding INTAKE_DOC.md to each folder and renaming CR-006 → INV-2026-07-03-001 to match repo convention. Full ID-scheme canonicalization performed by CR-2026-07-03-010 (see `CR-2026-07-03-010-registry-hygiene-and-id-scheme-canonicalization/`).
