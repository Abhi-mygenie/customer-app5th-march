# INTAKE DOC — BUG-2026-11-25-003

**ID:** BUG-2026-11-25-003
**Type:** BUG (environment / performance)
**Title:** Menu and restaurant info often fail to load in preview: POS read calls take 8–13s but the read client times out at 8s
**Registered:** 2026-11-25
**Status:** INTAKE → needs owner decision, then Planning
**Priority:** P1 (proposed: in preview the customer sees an empty menu; production impact not yet measured)
**Risk:** MEDIUM (changing the shared read-client timeout affects every read call)
**Blast radius:** MEDIUM

---

## 1. Source

Found by the testing agent during CR-2026-11-25-001 verification (`/app/test_reports/iteration_31.json`, `integration_issues`). It was also seen during this session's screenshots: the search for "chicken" showed "No matching dishes" because the menu never loaded, and menu skeletons stayed visible.

## 2. Evidence

- `POST {REACT_APP_API_BASE_URL}/web/restaurant-product` (restaurant 716, 353 items, ~594KB) measured at **10–13s**.
- `POST .../web/restaurant-info` measured at **8–13s**.
- `frontend/src/api/config/axios.js` L25–29: `apiReadClient` `timeout: 8000` (CR-2026-07-03-004 D-01). `apiWriteClient` is 15000.
- Endpoints: `frontend/src/api/config/endpoints.js` L22 (`RESTAURANT_DETAILS`), L37 (`RESTAURANT_PRODUCTS`).
- Effect: the menu page shows "No menu items available at the moment." and the header skeleton shows for a long time.

## 3. Classification

Preprod/POS slowness (environment) combined with a client timeout that is too tight for large menus. It was there before CR-2026-11-25-001; this session did not cause it.

## 4. Open questions for the owner / Planning

1. Is production POS (`restaurant-product`) also above 8s for large menus? Measure it first.
2. Option A: raise the timeout only for `restaurant-product` / `restaurant-info` (e.g. 20s per request).
3. Option B: add one automatic retry for read timeouts.
4. Option C: backend or POS side: paginate or compress the menu payload (POS team).
5. Do not change the global `apiReadClient` timeout without checking CR-2026-07-03-004 D-01, which set it deliberately.

## 5. Duplicate check

Related to CR-2026-07-03-004 (timeouts set). There is no existing open item for menu-load timeout. DISTINCT.

## 6. Next

Owner decision on measurement and option, then Planning (Role 2).
