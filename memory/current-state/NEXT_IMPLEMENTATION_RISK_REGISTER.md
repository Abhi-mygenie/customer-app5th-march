# NEXT_IMPLEMENTATION_RISK_REGISTER

Prioritized list of risks that should be resolved or explicitly accepted before implementation changes build on this codebase.

---

## 1. High severity risks

### R1. Order auth helper contract mismatch
- Severity: HIGH
- Affected module: customer order flow / table-status / order success / axios interceptor
- Proof from code:
  - `frontend/src/utils/authToken.js:97-100` posts to `/auth/login` on `REACT_APP_API_BASE_URL`
  - `backend/server.py:460-575` expects `/api/auth/login` on backend with `phone_or_email`
- Why risky:
  - order placement, edit-order, and table-status checks depend on this helper token
  - if env target does not expose legacy auth contract, core order flow breaks
- Recommended next action:
  - confirm actual deployed auth endpoint behind `REACT_APP_API_BASE_URL`
  - decide whether to keep external auth contract or migrate order flow to current backend contract

### R2. Missing backend route `/api/restaurant-info/{id}`
- Severity: HIGH
- Affected module: admin config bootstrap / restaurant flags
- Proof from code:
  - `frontend/src/context/AdminConfigContext.jsx:145-148` fetches this route
  - no implementation in `backend/server.py`
- Why risky:
  - admin UI silently loses `restaurantFlags` such as loyalty/coupon/multiple_menu metadata
- Recommended next action:
  - confirm whether route should exist in backend or whether AdminConfigContext should use POS `getRestaurantDetails()` like legacy `AdminSettings.jsx`

### R3. `GET_ORDER_DETAILS` environment ambiguity
- Severity: HIGH
- Affected module: LandingPage, ReviewOrder, OrderSuccess
- Proof from code:
  - frontend uses `${REACT_APP_API_BASE_URL}/air-bnb/get-order-details/{id}` (`frontend/src/api/config/endpoints.js:18`)
  - backend proxy exists at `/api/air-bnb/get-order-details/{id}` (`backend/server.py:788-807`)
- Why risky:
  - edit-order, success polling, and occupied-table redirect depend on this path
  - wrong env wiring could bypass intended proxy/auth behavior
- Recommended next action:
  - verify deployed value of `REACT_APP_API_BASE_URL` and decide canonical path

### R4. CRM mixed-version runtime
- Severity: HIGH
- Affected module: customer auth/profile/addresses/loyalty history
- Proof from code:
  - CRM version flag in `crmService.js:63-69`
  - orders/points/wallet remain v1 routes (`436-454`)
  - forgot/reset forced to v1 (`386-412`)
- Why risky:
  - switching env to v2 does not produce a clean v2 runtime; several flows still rely on v1
- Recommended next action:
  - confirm deployed CRM version and supported endpoint matrix with stakeholders

---

## 2. Medium severity risks

### R5. Restaurant `716` hardcoded behavior
- Severity: MEDIUM
- Affected module: ReviewOrder, TableRoomSelector, orderService
- Proof from code:
  - `frontend/src/api/services/orderService.ts:254-277`
  - `frontend/src/pages/ReviewOrder.jsx:491-512,700-723,949-957,1049-1053`
- Why risky:
  - special-case logic affects endpoint selection, room-only behavior, and table-check skipping
  - difficult to generalize or extend safely
- Recommended next action:
  - confirm whether this is permanent business logic or temporary branch logic

### R6. Custom pages not rendered customer-side
- Severity: MEDIUM
- Affected module: admin content management / public navigation
- Proof from code:
  - admin CRUD exists in `ContentTab.jsx:142-199`
  - backend persists `customPages` in `server.py:1233-1284`
  - no public route in `frontend/src/App.js`
- Why risky:
  - implementation may assume CMS pages already have a public runtime path when they do not
- Recommended next action:
  - confirm desired public route model before building on CMS functionality

### R7. Call Waiter / Pay Bill incomplete
- Severity: MEDIUM
- Affected module: LandingPage, OrderSuccess, visibility config
- Proof from code:
  - `frontend/src/pages/LandingPage.jsx:387-395`
  - `frontend/src/pages/OrderSuccess.jsx:462-470`
- Why risky:
  - UI implies real feature availability while integration does not exist
- Recommended next action:
  - confirm whether to hide, stub-label, or fully integrate these actions

### R8. `pos_token` refresh only on admin login
- Severity: MEDIUM
- Affected module: Admin QR page
- Proof from code:
  - stored in `Login.jsx:60-62`
  - read in `AdminQRPage.jsx:105-112`
- Why risky:
  - QR feature breaks when POS token expires; no silent refresh path exists
- Recommended next action:
  - define expected POS token lifecycle and whether backend should refresh on-demand

### R9. Dietary tag audit metadata mismatch
- Severity: MEDIUM
- Affected module: dietary tags backend write path
- Proof from code:
  - token payload has `user_id`, `user_type`, `exp` (`backend/server.py:274-280`)
  - dietary update writes `updated_by: payload.get('sub')` (`1491-1496`)
- Why risky:
  - audit trail data is incomplete or wrong
- Recommended next action:
  - align metadata field with actual JWT payload schema when implementation work begins

---

## 3. Low severity / structural risks

### R10. `stationService.js` and old RESTful station routes appear unused
- Severity: LOW
- Affected module: legacy frontend service layer
- Proof from code:
  - no active imports found; `useMenuData.js` uses `menu-master` instead
- Why risky:
  - future work may mistakenly build on dead endpoints
- Recommended next action:
  - treat as legacy unless explicitly reactivated

### R11. `frontend/src/pages/AdminSettings.jsx` legacy overlap
- Severity: LOW
- Affected module: admin frontend architecture
- Proof from code:
  - imported in `App.js` but current route tree uses `AdminLayout` + `pages/admin/*`
- Why risky:
  - duplicate admin logic can mislead future implementation agents
- Recommended next action:
  - treat current routed admin tree as source of truth unless user confirms otherwise

### R12. `dietary_tags_mapping` missing from export README
- Severity: LOW
- Affected module: local DB restore / portability
- Proof from code:
  - used in backend `server.py:1453,1488`
  - not listed in `backend/db_data/README.md:21-34`
- Why risky:
  - environment parity may be incomplete after restore
- Recommended next action:
  - confirm whether export docs are incomplete or collection is intentionally excluded

### R13. Hardcoded default restaurant `478`
- Severity: LOW
- Affected module: restaurant resolution
- Proof from code:
  - `frontend/src/utils/useRestaurantId.js:112-120`
- Why risky:
  - can mask route/env issues during preview/testing
- Recommended next action:
  - confirm whether this fallback is intentional for preview only

---

## 4. Immediate recommended sequence for next agent
1. Verify environment values and deployed routing intent for `REACT_APP_API_BASE_URL`, `REACT_APP_CRM_API_VERSION`, and auth endpoint ownership.
2. Resolve the canonical source for restaurant flags (`/api/restaurant-info/{id}` missing vs POS `restaurant-info`).
3. Decide the future of `utils/authToken.js` before any order-flow implementation.
4. Confirm business intent for restaurant `716`, custom pages, Call Waiter, and Pay Bill.
5. Only then proceed with implementation or bug-fix work touching order/auth/admin flows.
