# SESSION HANDOVER — 2026-11-25 (Payload Investigation + Intake Session)

**Date:** 2026-11-25 (second session this day)
**Agent:** E1 (roles used: Deployment, Investigation, Intake per Alpha prompt)
**Next agent:** Planning for CR-2026-11-25-002, then Implementation
**Git:** branch `20261125-120814` on `Abhi-mygenie/customer-app5th-march`
**Previous handover:** `SESSION_HANDOVER_2026-11-25.md` (search UX session)

> Process rule (owner): follow the Alpha prompt role gates strictly. No code at an Intake, Planning, Design or Investigation gate. Stop at each gate for owner approval.

---

## 1. What happened this session

### Deployment (done)
- Synced `/app` to `origin/main` (commit f444068). Memory dir: **608 files** fully synced.
- Backend running: `/api/healthz` → `{"ok":true,"mongo":"up"}`
- Frontend compiled: webpack clean, app rendering
- Secrets registered via panel: `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`, `REACT_APP_GOOGLE_MAPS_API_KEY`, `GITHUB_PAT`
- `typescript@5.8.3` installed (react-scripts 5.x incompatible with 7.x — no source code changed)
- Branch `20261125-120814` pushed to GitHub

### Investigation — BUG-2026-11-25-003 (two phases)

**Phase 1 (latency):** Confirmed the bug is real. POS `restaurant-product` takes 5–13s (variable under load), `apiReadClient` timeout is 8s → blank menu when POS is slow.

**Phase 2 (payload deep-dive, restaurant 541 Palm House):**

| Root cause | Waste | % |
|---|---|---|
| `add_ons` embedded inline — 32 unique sent 1,652 times | 142 KB | 17% |
| 50 unused fields (`recipe`, `slug`, `category_ids`, `created_at`, timestamps, charges…) | 154 KB | 19% |
| `variations` repeated per item — 41 unique groups | 35 KB | 4% |
| **Total removable** | **331 KB** | **40%** |

Payload today: **830 KB** for 408 items. Optimised target: **~200 KB** (1–2s instead of 5–13s).

**POS team brief written:** `BUG-2026-11-25-003-menu-read-timeout-preprod/POS_TEAM_BRIEF.md`
Ready to send to the POS/backend team as-is.

### Owner decisions captured (2026-11-25)
- Stale-while-revalidate cache approach: **APPROVED**
- Cache TTL: **5 minutes** ("5 mins is fine")
- Per-endpoint timeout fix: **deferred** (owner staying at gate)
- Remaining open (needs answer before Planning): field stripping in CR-2026-11-25-002? restaurant-info in proxy scope?

### Intake — CR-2026-11-25-002 (new, registered)
Backend menu proxy + stale-while-revalidate cache.
- Status: INTAKE, ready for Planning once two open questions answered
- Folder: `memory/change_requests/CR-2026-11-25-002-menu-proxy-cache/INTAKE_DOC.md`

---

## 2. Registry state after this session

| ID | Status | What |
|---|---|---|
| BUG-2026-11-25-003 | INTAKE | Root cause confirmed; decisions logged; waiting on Planning approval |
| CR-2026-11-25-002 | INTAKE | New — backend proxy+cache; needs owner to answer 2 questions then approve Planning |
| Registry | VALID YAML | 133 items |

---

## 3. For the next agent — Planning role for CR-2026-11-25-002

**Before Planning starts, get owner answers to:**

1. **Field stripping in this CR?** The proxy can strip 50 unused fields before caching (saves ~130 KB storage + transfer). No app changes needed. Recommend: YES, include it.
2. **restaurant-info in proxy scope?** Currently 1.7–3.9s — safe today, but can peak at 8–13s. Recommend: YES, proxy both calls together.

**Once answers received, Planning must:**
1. Read `INTAKE_DOC.md` for CR-2026-11-25-002
2. Read `backend/server.py` — understand current structure, existing endpoints, BackgroundTasks usage pattern
3. Read `frontend/src/api/services/restaurantService.js` — `getRestaurantProducts()` and `getRestaurantDetails()`
4. Read `frontend/src/api/config/endpoints.js`
5. Confirm cache storage option (A=in-process dict recommended, B=MongoDB, C=Redis)
6. Write Impact Analysis + Implementation Plan with exact edit steps
7. Write verification matrix

**Key constraint:** `server.py` is a hotspot (entire backend in one file). Planning must scope edits tightly — new endpoint only, no touching existing routes.

---

## 4. POS team brief

`BUG-2026-11-25-003-menu-read-timeout-preprod/POS_TEAM_BRIEF.md` — ready to send.

Three asks for POS team (prioritised):
1. Remove 50 unused fields from `restaurant-product` response (~130 KB, no app change needed) — **easiest, highest ROI**
2. Deduplicate `add_ons` into top-level catalogue + IDs per item (~142 KB saving, needs coordinated app update)
3. Deduplicate `variations` same way (~35 KB saving)

---

## 5. Test restaurant for quick checks
- **716** (`/716/menu`) — public, no login
- **541** (`/541/menu`) — Palm House, the restaurant investigated this session

---

## 6. What was NOT changed
- No source code was changed this session
- All work was Investigation + Intake only (following Alpha prompt role gates)
