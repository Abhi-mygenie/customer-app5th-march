# INTAKE DOC — CR-2026-11-25-002

**ID:** CR-2026-11-25-002  
**Type:** CR  
**Title:** Backend menu proxy + stale-while-revalidate cache (5-min TTL) for `restaurant-product` and `restaurant-info`  
**Registered:** 2026-11-25  
**Status:** INTAKE → READY FOR PLANNING  
**Priority:** P1  
**Risk:** MEDIUM  
**Blast radius:** MEDIUM  

---

## 1. Owner Request

Investigation BUG-2026-11-25-003 (deep payload analysis, 2026-11-25) exposed that the
`/web/restaurant-product` POS endpoint returns 594–830 KB and takes 5–13s, causing the
customer menu to show blank or timeout.

**Owner decisions captured (2026-11-25):**
- Cache approach approved: **stale-while-revalidate**
- Staleness TTL: **5 minutes** (owner confirmed: "5 mins is fine")
- Scope: backend proxy endpoint in `server.py` — no POS changes needed for this CR
- POS payload optimisation brief written separately (POS_TEAM_BRIEF.md) — that is a
  separate long-term track; this CR is the immediate fix the app team can ship alone

---

## 2. What This CR Builds

A new FastAPI endpoint `/api/menu/products` that:

1. **Receives** `restaurant_id` and optional `food_for` (station) from the frontend
2. **Checks** an in-memory (or MongoDB) cache keyed by `restaurant_id`
3. **If cache is fresh** (< 5 min old): returns cached response instantly — no POS call
4. **If cache is stale or missing**: returns cached version immediately **AND** triggers a
   background POS refresh (stale-while-revalidate) — the customer never waits
5. **On first load** (no cache yet): calls POS, waits for response, caches it, returns it
   — same latency as today, but only happens once per restaurant per 5 minutes
6. **Optionally strips unused fields** (see POS_TEAM_BRIEF.md §4) before caching —
   reduces what is stored and returned (saves ~130 KB per restaurant per cache entry)

The frontend is updated to call `/api/menu/products` instead of calling the POS directly.

---

## 3. Stale-While-Revalidate Explained

```
Timeline for a busy restaurant (e.g. Palm House 541):

T=0:00  First customer loads menu → cache miss → POS called → waits 6s → menu shows
        Cache populated with timestamp.

T=0:30  Second customer → cache hit (30s old, fresh) → instant response (<50ms)

T=4:59  Nth customer → cache hit (4m59s old, still fresh) → instant

T=5:01  Next customer → cache hit returned immediately (stale but shown instantly)
        Background task fires: calls POS, refreshes cache

T=5:08  POS responds → cache updated with fresh data

T=5:09  Next customer → cache hit with fresh data → instant
```

A staff member adds a new item at T=3:00. Customers see it by T=5:01 at the latest (within 5 min). No manual action needed. No customer ever waits for POS while the cache exists.

---

## 4. Impact Scope

### Files WILL change

| File | Change |
|---|---|
| `backend/server.py` | New endpoint `/api/menu/products` with in-process cache dict + background refresh task |
| `frontend/src/api/services/restaurantService.js` | `getRestaurantProducts()` → call `/api/menu/products` instead of POS directly |
| `frontend/src/api/config/endpoints.js` | Add `MENU_PRODUCTS_PROXY` endpoint constant |

### Files WILL NOT change

`ReviewOrder.jsx`, `CartContext.js`, `AuthContext.jsx`, `orderService.ts`, any payment logic,
`restaurant-info` (separate call — lower priority, addressed in Phase 2 if needed)

---

## 5. Cache Implementation Options for Planning to Choose

| Option | Storage | Pros | Cons |
|---|---|---|---|
| **A — In-process dict** | Python dict in server.py memory | Zero extra deps, instant | Lost on backend restart; not shared across workers |
| **B — MongoDB collection** | `menu_cache` collection in existing DB | Survives restart, shared across workers | Slight write overhead |
| **C — Redis** | Redis instance | Fastest, TTL native | New infra dependency — not currently in stack |

**Recommendation: Option A for now** (in-process dict). The backend has 1 worker (see supervisord config). A restart clears the cache — worst case is one slow load for the next customer, then it repopulates. MongoDB (B) can be added later if multi-worker or persistence is needed. Redis (C) is overkill at this stage.

---

## 6. Field Stripping (Optional in This CR)

The proxy can strip the 50 unused fields before caching (see POS_TEAM_BRIEF.md §4), reducing:
- Cache storage: 830 KB → ~200 KB per restaurant
- Response size to browser: same reduction

**Owner decision needed at Planning:** include field stripping in this CR, or defer to a
separate CR once the POS team responds to the brief?

Recommendation: **include it** — it is a pure filter on the backend response, zero risk to
the frontend, and reduces both memory and browser transfer size immediately.

---

## 7. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO — menu display only; order placement calls POS directly |
| Auth | NO |
| Data change | NO — read-only proxy |
| Hotspot file | `server.py` — MEDIUM risk (entire backend in one file) |
| Cache correctness | MEDIUM — stale window is 5 min (owner approved) |
| Frontend API change | LOW — one line change in `restaurantService.js` |
| POS contract | NONE — POS endpoint unchanged |

**Risk: MEDIUM** (server.py is a hotspot; cache logic is new surface)

---

## 8. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| BUG-2026-11-25-003 | Menu timeout | PARENT — this CR resolves it |
| CR-2026-07-03-004 | Axios timeout split | RELATED — this CR makes the per-endpoint timeout less urgent |
| No existing cache/proxy CR found | — | DISTINCT |

---

## 9. Owner Decisions Captured

| Decision | Value | Date |
|---|---|---|
| Cache approach | Stale-while-revalidate | 2026-11-25 |
| TTL | 5 minutes | 2026-11-25 |
| Cache storage | In-process dict (Option A) — Planning to confirm | TBD at Planning |
| Field stripping in this CR | TBD — owner to confirm | Needs answer |
| `restaurant-info` in scope? | TBD — lower priority | Needs answer |

---

## 10. What Planning Must Do Next

1. Verify `server.py` background task pattern (FastAPI `BackgroundTasks` or `asyncio` task)
2. Confirm cache storage option (A, B, or C)
3. Confirm field stripping in scope
4. Write implementation plan with exact edits
5. Write verification matrix

---

```
Intake complete: CR-2026-11-25-002
Classification: CR (performance / architecture)
Severity: P1
Risk: MEDIUM
Duplicate check: DISTINCT (parent: BUG-2026-11-25-003)
Evidence: BUG-2026-11-25-003/INVESTIGATION_REPORT_PAYLOAD.md
Blast radius: MEDIUM (server.py + 2 frontend files)
Docs: change_requests/CR-2026-11-25-002-menu-proxy-cache/INTAKE_DOC.md
Next: Planning (needs owner answer on field stripping + restaurant-info scope)
```
