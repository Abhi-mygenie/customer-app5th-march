# MyGenie Customer App — PRD

## Original problem statement
- Pull `Abhi-mygenie/customer-app5th-march` branch `16-june`, configure env, install deps, run app. No initial testing requested.
- Owner subsequently asked to continue CR-2026-06-17-001 work, investigate issues, plan follow-up CRs.

## Architecture
- **Frontend:** React (CRA), `localhost:3000`, served externally via preview URL `https://genie-pull-run.preview.emergentagent.com`. Admin/backend calls via `REACT_APP_BACKEND_URL`; external POS via `REACT_APP_API_BASE_URL`.
- **Backend:** FastAPI, `localhost:8001`, exposed at `<preview>/api/`. Auth (JWT), per-restaurant `AppConfig` (menuOrder, categoryTimings, itemTimings, categoryVisibility, stationTimings, channelOverrides), POS proxy.
- **Database:** Remote MongoDB `52.66.232.149:27017/mygenie`.
- **External:** Preprod POS `preprod.mygenie.online/api/v1`, CRM `crm.mygenie.online/api`.

## User personas
- **Restaurant Admin** — manages menu order, timings, visibility, channel overrides via `/admin/menu`.
- **Customer** — orders via `/<restaurantId>/menu`, sees only items eligible for chosen order type and currently in window.

## Core requirements (static)
- Customer app respects admin overrides without regressing POS defaults.
- All env keys, ports, tokens, URLs from `.env` files only.
- Protected files (Alpha v0.1 §10) MUST not be regressed: `ReviewOrder.jsx` (apart from APP-12 surgical add), `AuthContext`, `CartContext` (apart from APP-11 surgical add), `App.js` providers, `server.py` route shapes.
- MongoDB: `_id` is `ObjectId` via `PyObjectId`; datetimes are tz-aware UTC.

## What's been implemented (with dates)

| Date | Item | Status |
|---|---|---|
| 2026-06-16 | Repo pulled, env configured, deps installed, supervisor running | DONE |
| 2026-06-17 | INVESTIGATION — Phase 1 verified in code, Phase 2 partially shipped (APP-3 admin UI render missing) | DONE |
| 2026-06-17 | IMPLEMENTATION — APP-3 admin UI render closed | DONE |
| 2026-06-17 | BUG FIX — `AdminMenuPage.jsx` setConfig wrapper widened to forward every changed top-level field | DONE |
| 2026-06-17 | QA iter_5 backend 5/5 PASS | DONE |
| 2026-06-17 | QA iter_6 found AdminMenuPage wrapper bug | DONE |
| 2026-06-17 | QA iter_7 PASS — APP-3 end-to-end | DONE |
| 2026-06-17 | Added `REACT_APP_BACKEND_URL` to frontend `.env` (owner-approved) | DONE |
| 2026-06-17 | CR-001 → QA_PASSED, docs updated | DONE |
| 2026-06-17 | INVESTIGATION — fivestar timing-save report. Root cause: 2-stage save UX trap (inline ✓ vs top-right Save Changes). No code change. | DONE |
| 2026-06-17 | INVESTIGATION — room check-in flow + endpoint mapping. Confirmed `/customer/check-table-status` carries `userinfo.{f_name,l_name,phone}`. No code change. | DONE |
| 2026-06-17 | INVESTIGATION — timing-blocked items render + place-order block + menu cache freshness. No code change. | DONE |
| 2026-06-17 | PLANNING — CR-002 IA expanded to include APP-10 alongside APP-7 + APP-9 | DONE |
| 2026-06-17 | PLANNING — CR-003 drafted with CR.md + IA + Implementation Handover (APP-11 + APP-12 + APP-13) | DONE |
| 2026-06-17 | Implementation handovers written for both CR-002 and CR-003 | DONE |

## Prioritized backlog

### P0 — CRs ready for implementation
- **CR-2026-06-17-002** — APP-9 (chip redesign) + APP-7 (channel preview) + APP-10 (Save discoverability). All planning artifacts in `/app/memory/change_requests/CR-2026-06-17-002-channel-preview-in-admin/`.
- **CR-2026-06-17-003** — APP-11 (hide timing-unavailable) + APP-12 (place-order block) + APP-13 (cache tightening). All planning artifacts in `/app/memory/change_requests/CR-2026-06-17-003-customer-menu-availability/`.

### P1 — deferred / blocked
- APP-2 multi-menu live UI verification — blocked by no Hyatt 716 admin user seeded in Mongo.
- APP-4 multi-menu station-timing live UI verification — same dependency.
- APP-3 customer cascade in-browser — admin↔backend proven; customer-side visual confirmation deferred.
- Room S1 (incomplete-guest → blocked) — owner taking POS-side fix; no app change.

### P2 — pre-existing / parking lot
- `MenuOrderTab.jsx` ESLint blockers at L105, L476, L1093×2.
- `POST /api/auth/login` response shape — surface `user.user_type` at user level.
- POS-side lightweight availability snapshot endpoint (`{id, live_web, is_disable, food_stock}`) for future cache strategy.
- APP-14 (default menu on landing for multi-menu restaurants), APP-15 (time-based default menu), APP-16 (channel override at station level).
- Strict empty-cleanup of `channelOverrides.category` / `.item` keys when all sub-ids are removed.

## Next tasks
1. Owner sign-off on CR-2026-06-17-002 + CR-2026-06-17-003 to move to IMPLEMENTATION.
2. Implementation Agent picks up CR-002 first (blueprint in its handover), self-test, hand to QA.
3. QA via `testing_agent_v3` (29 cases). On pass, close CR-002.
4. Implementation Agent picks up CR-003. Self-test, hand to QA (30 cases). On pass, close CR-003.
5. PRD updated, sessions closed.

## Key files (current session scope)

- `/app/memory/change_requests/CR-2026-06-17-001-menu-order-enhancements/` — CR-001 closed, QA_PASSED
- `/app/memory/change_requests/CR-2026-06-17-002-channel-preview-in-admin/` — CR.md, IMPACT_ANALYSIS.md, IMPLEMENTATION_HANDOVER.md (this session)
- `/app/memory/change_requests/CR-2026-06-17-003-customer-menu-availability/` — CR.md, IMPACT_ANALYSIS.md, IMPLEMENTATION_HANDOVER.md (this session)
- `/app/memory/test_credentials.md` — admin logins + restaurant ref
- `/app/test_reports/iteration_5.json`, `iteration_6.json`, `iteration_7.json` — CR-001 QA trail
- `/app/backend/tests/test_cr_menu_order.py` — backend pytest from iter_5

## Session sign-off

Both CR-002 and CR-003 are fully planned and handed over. No further session activity. Implementation pickup is owner-gated.
