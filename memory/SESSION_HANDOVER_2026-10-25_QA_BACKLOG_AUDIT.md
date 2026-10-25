# SESSION HANDOVER — QA Backlog Audit & Execution Plan
## 2026-10-25 | Role 4 (QA) → Next QA Agent

---

## 1. Session summary

This session audited all 117 registry items to identify **every IMPLEMENTED item that has not been QA'd**. The registry has 26 items at IMPLEMENTED status. They are split into three groups below for the next agent to execute.

**Important:** the control prompt is at `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`. The next agent must read it and select **Role 4 — QA Agent**. QA must not fix code.

---

## 2. Three groups

### GROUP A — Already QA'd (have QA_REPORT on disk) → Status promotion only

These 6 items already have `QA_REPORT.md` on disk, meaning QA was executed in a prior session. Their registry status is stuck at IMPLEMENTED — it should be promoted to **SMOKE** (awaiting owner smoke). The next agent should:
1. Read each QA_REPORT to confirm it says PASS.
2. Check if a SMOKE_BRIEF exists (mandatory per §9 before SMOKE).
3. If QA PASS + SMOKE_BRIEF exists → update `index.yml` status to SMOKE.
4. If QA PASS but no SMOKE_BRIEF → write one (Role 8 task) or flag it.

| # | ID | Title | QA_REPORT | SMOKE_BRIEF |
|---|---|---|---|---|
| A-1 | BUG-2026-09-08-001 | `response` not defined → 422 crash | YES | check disk |
| A-2 | CR-2026-06-17-002 | Channel preview in admin | YES | check disk |
| A-3 | CR-2026-06-17-003 | Customer menu availability | YES | check disk |
| A-4 | CR-2026-07-03-002 | Remove dead restaurant-info fetch | YES | check disk |
| A-5 | CR-2026-07-03-004 | Frontend fetch timeouts + AbortController | YES | check disk |
| A-6 | CR-2026-08-06-001 | Time-controlled ordering | YES (no QA_HANDOVER — unusual) | check disk |

**Action:** Read QA_REPORT → confirm PASS → promote to SMOKE or flag missing SMOKE_BRIEF.

---

### GROUP B — QA_HANDOVER exists on disk → Execute QA now (Batch 1)

These 11 items have a `QA_HANDOVER.md` (or equivalent) on disk. The next QA agent can execute tests immediately by reading the handover and running verification.

**Priority order** (P1 first, then P2, then unrated):

| # | ID | Type | P | Risk | Title | QA_HANDOVER path |
|---|---|---|---|---|---|---|
| B-1 | **BUG-2026-10-14-001** | BUG | P1 | HIGH | Negative-stock inventory bypass | `BUG-2026-10-14-001-.../IMPLEMENTATION_PLAN.md` §2 (V-1..V-10 matrix) + `test_reports/iteration_25.json` |
| B-2 | **BUG-2026-10-12-002** | BUG | P1 | MED | Phone 91-prefix stripped by PhoneInput | `BUG-2026-10-12-002-.../QA_HANDOVER.md` |
| B-3 | **CR-2026-10-12-001** | CR | P1 | LOW | Remove Emergent branding (title/favicon/meta) | `CR-2026-10-12-001-.../QA_HANDOVER.md` |
| B-4 | **CR-2026-10-11-009** | CR | P2 | HIGH | Coupon discovery list | `CR-2026-10-11-009-.../QA_HANDOVER.md` (on disk; yml artefacts field missing it) |
| B-5 | **BUG-2026-10-22-001** | BUG | P2 | LOW | FSSAI veg/non-veg icon compliance | `BUG-2026-10-22-001-.../QA_HANDOVER.md` |
| B-6 | **CR-2026-10-12-004** | CR | P2 | MED | Sheet Push + Sheet Drift roles (control prompt) | `CR-2026-10-12-004-.../QA_HANDOVER.md` |
| B-7 | **CR-2026-10-12-005** | CR | P2 | MED | Reverse Sheet→registry drift read | `CR-2026-10-12-005-.../QA_HANDOVER.md` |
| B-8 | CR-2026-04-11-001 | CR | - | - | Order placement fixes | `CR-2026-04-11-001-.../QA_HANDOVER.md` |
| B-9 | CR-2026-07-03-001 | CR | - | - | Theme cache busting | `CR-2026-07-03-001-.../QA_HANDOVER.md` |
| B-10 | CR-2026-07-03-003 | CR | - | - | Backend Mongo timeouts + healthz | `CR-2026-07-03-003-.../QA_HANDOVER.md` |
| B-11 | CR-2026-07-03-010 | CR | - | - | Registry hygiene & ID canonicalization | `CR-2026-07-03-010-.../QA_HANDOVER.md` |

**For each item, the QA agent must:**
1. Read the QA_HANDOVER.md in the item's folder.
2. Execute each test case listed.
3. Record PASS/FAIL with evidence.
4. Write `QA_REPORT.md` in the same folder.
5. Update `index.yml`: add `QA_REPORT` to artefacts, update `status_note`.
6. If all PASS → write SMOKE_BRIEF.md + .pdf, promote status to SMOKE.
7. If any FAIL → classify severity (BLOCKER/MAJOR/MINOR/NOTE), route to Bug Fix (Role 5).

**Special notes per item:**
- **B-1 (BUG-2026-10-14-001):** Verification matrix is in IMPLEMENTATION_PLAN.md §2 (V-1 through V-10). Testing agent already ran iteration_25 (PASS). V-9 (one real preprod order with `stock_out='Y'` item) is the critical outstanding test — owner approved it (D-4). Test restaurants: 689 (`inventory_negative='Yes'`, bypass), 716 (`inventory_negative='No'`, control).
- **B-2 (BUG-2026-10-12-002):** Test with phone numbers starting with "91" (e.g. 9187654321). The fix is in ReviewOrder.jsx only.
- **B-3 (CR-2026-10-12-001):** Visual check — page title should say "MyGenie", favicon should be MyGenie logo, no Emergent branding visible.
- **B-5 (BUG-2026-10-22-001):** Visual check — non-veg icon must be brown triangle (not red circle), veg icon green circle. FSSAI standard colours: veg #00A651, non-veg #944A28.
- **B-6/B-7 (Sheet roles):** These are control prompt + `registry_sync.py` changes, not app UI. Test via CLI: `python memory/tools/registry_sync.py audit`, `python memory/tools/registry_sync.py drift`. Requires Google Sheet credentials (`/app/secrets/sheets_token.json`).

---

### GROUP C — QA_HANDOVER missing → Backfill first, then QA (Batch 2)

These items are IMPLEMENTED but have **no QA_HANDOVER on disk**. Before QA can run, a handover must be written (by re-reading the implementation artifacts: CR.md, IMPLEMENTATION_PLAN.md, code diffs, code markers).

| # | ID | Type | P | Title | Available docs on disk |
|---|---|---|---|---|---|
| C-1 | CR-2026-02-XX-002 | CR | - | Restaurant 699 takeaway charge | INTAKE, INVESTIGATION_REPORT, PLANNING_REPORT, SESSION_HANDOVER |
| C-2 | CR-2026-05-30-001 | CR | - | Config mandatory fields + scan misrouting | CR, QA_HANDOVER_ITEM1 (partial — Item 1 only) |
| C-3 | CR-2026-05-30-002 | CR | - | Restrict non-QR orders | CR, IMPLEMENTATION_PLAN |
| C-4 | CR-2026-06-17-004 | CR | - | Delivery GST backend key | CR, IMPACT_ANALYSIS |

**For each item, the backfill agent must:**
1. Read the existing docs (CR.md, IMPLEMENTATION_PLAN.md, code markers via `grep -rn "CR-YYYY-MM-DD-NNN" frontend/src backend/`).
2. Identify what was changed and what the expected behaviour is.
3. Write a `QA_HANDOVER.md` with test cases.
4. Then proceed with QA as in Group B.

### GROUP C — Investigations & Incidents (status review only, not traditional QA)

These 5 items are INV/PROD-INCIDENT type at IMPLEMENTED status, which is semantically wrong — investigations are read-only (no code) and should typically be CLOSED after the report is written. The next agent should review each and either:
- Promote to CLOSED if the investigation report is complete and findings are registered.
- Route to INTAKE if findings spawned a new CR/BUG that isn't registered.

| # | ID | Type | Title | Recommendation |
|---|---|---|---|---|
| C-5 | INV-2026-06-17-001 | INV | Table-less order bypass | Review → likely CLOSED |
| C-6 | INV-2026-06-17-003 | INV | Room QR scan flow | Review → likely CLOSED |
| C-7 | INV-2026-08-06-001 | INV | Admin QR POS token expiry | Review → likely CLOSED or PARKED |
| C-8 | INV-2026-09-12-001 | INV | Legacy customer routes trace | Review → likely CLOSED (report exists) |
| C-9 | PROD-INCIDENT-2026-07-02-001 | PROD-INCIDENT | Atlas slowness | Review → likely CLOSED |

---

## 3. Execution order for the next agent

```
Phase 1: GROUP A — Promote already-QA'd items (6 items, ~30 min)
  → Read QA_REPORT → confirm PASS → check SMOKE_BRIEF → promote to SMOKE

Phase 2: GROUP B — Execute QA for items with handover (11 items, ~3-4 hours)
  → Priority: B-1 through B-7 first (have P ratings)
  → Then B-8 through B-11
  → Write QA_REPORT + SMOKE_BRIEF per item

Phase 3: GROUP C items 1-4 — Backfill QA_HANDOVER then QA (4 items, ~2 hours)
  → Read existing docs → write QA_HANDOVER → execute QA → write QA_REPORT

Phase 4: GROUP C items 5-9 — Status review for INV/PROD-INCIDENT (5 items, ~30 min)
  → Read investigation report → promote to CLOSED or route findings
```

---

## 4. Environment

| Item | Value |
|------|-------|
| Preview URL | `https://be25b412-1666-431b-b47a-473b646ba086.preview.emergentagent.com` |
| Backend | FastAPI on port 8001 (supervisor-managed) |
| Frontend | CRA+CRACO on port 3000 (supervisor-managed) |
| POS preprod | `https://preprod.mygenie.online/api/v1` |
| CRM | `https://crm.mygenie.online/api` |
| MongoDB | Remote at 52.66.232.149:27017 (mygenie DB) |
| Login | Phone: +919579504871, Password: Qplazm@10 |
| Test restaurants | 689 (inventory bypass), 716 (control), 478 (general) |
| Control prompt | `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` |
| Registry | `memory/change_requests/index.yml` (117 items, YAML valid) |
| Test reports | `test_reports/iteration_25.json` (latest, BUG-2026-10-14-001) |

---

## 5. What NOT to do

1. **Do not write code** — QA role is read-only (§8 Role 4: "QA must never fix code").
2. **Do not skip the SMOKE_BRIEF** — per §9, it is mandatory after every BUG/CR QA PASS before the item can move to SMOKE.
3. **Do not change test data** — use existing preprod data.
4. **Do not mark items CLOSED** — only owner smoke can close; QA moves items to SMOKE at most.
5. **Do not re-QA Group A items** — they already have QA_REPORT; just promote.

---

```text
Session handover complete
Role: QA (Role 4) — Registry audit
Items audited: 117 total, 26 IMPLEMENTED
Group A (promote): 6 items (already QA'd, stuck at IMPLEMENTED)
Group B (execute QA): 11 items (have QA_HANDOVER, ready now)
Group C (backfill + QA): 4 items (missing QA_HANDOVER)
Group C (status review): 5 items (INV/PROD-INCIDENT, not traditional QA)
Docs written: this handover
Next agent: Role 4 QA — start with Phase 1 (Group A promotions)
```
