# STALE_OR_MISSING_ROUTE_REPORT

This report classifies questionable, stale, external, or missing routes found during runtime audit.

Classification labels used:
- `ACTIVE`
- `EXTERNAL`
- `STALE`
- `MISSING_BACKEND_ROUTE`
- `LEGACY_DEAD_CODE`
- `NEEDS_USER_CONFIRMATION`

---

## 1. Special focus: `/api/restaurant-info/{id}`

### Findings
- Frontend reference:
  - `frontend/src/context/AdminConfigContext.jsx:145-148`
- Backend implementation:
  - not found in `backend/server.py`
  - not found in other inspected backend files
- Related existing route:
  - POS `POST /web/restaurant-info` exists and is used elsewhere (`frontend/src/api/services/restaurantService.js:14-20`)

### Runtime classification
- `/api/restaurant-info/{id}` → `MISSING_BACKEND_ROUTE`

### Why
- Current repo frontend references it as a backend URL under `REACT_APP_BACKEND_URL`.
- Current FastAPI backend does not implement it.
- Failure is softened because the fetch is wrapped in `.catch(() => null)`.

---

## 2. Route classification table

| Route / pattern | Referenced from | Implementation status | Classification | Notes |
|---|---|---|---|---|
| `/api/auth/login` | `Login.jsx`, `AuthContext.jsx` | implemented in backend | `ACTIVE` | primary backend auth route |
| `/api/auth/me` | `AuthContext.jsx` | implemented | `ACTIVE` | admin session restore |
| `/api/auth/send-otp` | `AuthContext.jsx` | implemented | `ACTIVE` | backward-compatible helper |
| `/api/auth/check-customer` | `LandingPage.jsx` | implemented | `ACTIVE` | landing capture lookup |
| `/api/auth/set-password` | backend only | implemented but not used by current customer UI | `LEGACY_DEAD_CODE` | frontend uses CRM instead |
| `/api/auth/verify-password` | backend only | implemented but not used by current customer UI | `LEGACY_DEAD_CODE` | |
| `/api/auth/reset-password` | backend only | implemented but not used by current customer UI | `LEGACY_DEAD_CODE` | |
| `/api/config/{restaurant_id}` | customer/admin contexts | implemented | `ACTIVE` | core config API |
| `/api/config/` | admin save | implemented | `ACTIVE` | |
| `/api/config/banners*` | admin context | implemented | `ACTIVE` | |
| `/api/config/feedback` | `FeedbackPage.jsx` | implemented | `ACTIVE` | |
| `/api/config/pages*` | `ContentTab.jsx` | implemented | `ACTIVE` | admin CRUD only |
| `/api/upload/image` | admin upload helpers | implemented | `ACTIVE` | |
| `/api/dietary-tags/available` | menu/admin dietary | implemented | `ACTIVE` | |
| `/api/dietary-tags/{restaurantId}` | menu/admin dietary | implemented | `ACTIVE` | GET + PUT |
| `/api/loyalty-settings/{restaurant_id}` | `ReviewOrder.jsx` | implemented | `ACTIVE` | |
| `/api/customer-lookup/{restaurant_id}` | `ReviewOrder.jsx` | implemented | `ACTIVE` | |
| `/api/table-config` | `AdminQRPage.jsx` | implemented | `ACTIVE` | backend proxy to POS |
| `/api/air-bnb/get-order-details/{id}` | backend only / overlapping external path | implemented | `ACTIVE` but environment-dependent consumer | frontend builder does not point here directly by code |
| `/api/restaurant-info/{id}` | `AdminConfigContext.jsx` | missing in backend | `MISSING_BACKEND_ROUTE` | optional fetch |
| `/auth/login` | `utils/authToken.js` | not in backend repo | `EXTERNAL` | may exist behind `REACT_APP_API_BASE_URL` |
| `/auth/refresh` | `orderService.ts`, response interceptor | not in backend repo | `LEGACY_DEAD_CODE` | no proven active runtime use |
| `/web/restaurant-info` | restaurantService | external POS-style | `EXTERNAL` | active runtime |
| `/web/restaurant-product` | restaurantService | external POS-style | `EXTERNAL` | active runtime |
| `/web/menu-master` | restaurantService | external POS-style | `EXTERNAL` | active runtime |
| `/web/table-config` | tableRoomService | external POS-style | `EXTERNAL` | active runtime for customer review |
| `/customer/check-table-status` | orderService | external POS-style | `EXTERNAL` | active runtime |
| `/air-bnb/get-order-details/{id}` via `REACT_APP_API_BASE_URL` | orderService | external or proxied depending env | `NEEDS_USER_CONFIRMATION` | code does not prove target |
| `/customer/order/place` | orderService | external POS-style | `EXTERNAL` | active runtime |
| `/customer/order/autopaid-place-prepaid-order` | orderService restaurant `716` only | external POS-style | `EXTERNAL` | active hardcoded branch |
| `/customer/order/update-customer-order` | orderService | external POS-style | `EXTERNAL` | active runtime |
| `/razor-pay/create-razor-order` | `ReviewOrder.jsx` | external POS-style | `EXTERNAL` | active runtime |
| `/razor-pay/verify-payment` | `OrderSuccess.jsx` | external POS-style | `EXTERNAL` | active runtime |
| `/customer/register` | crmService | external CRM v1 | `EXTERNAL` | active depending CRM version/flow |
| `/scan/auth/register` | crmService | external CRM v2 | `EXTERNAL` | active depending CRM version |
| `/customer/login` | crmService | external CRM v1 | `EXTERNAL` | |
| `/scan/auth/login` | crmService | external CRM v2 | `EXTERNAL` | |
| `/customer/send-otp` | crmService | external CRM v1 | `EXTERNAL` | |
| `/scan/auth/request-otp` | crmService | external CRM v2 | `EXTERNAL` | |
| `/customer/verify-otp` | crmService | external CRM v1 | `EXTERNAL` | |
| `/scan/auth/verify-otp` | crmService | external CRM v2 | `EXTERNAL` | |
| `/scan/auth/skip-otp` | crmService | external CRM v2 | `EXTERNAL` | |
| `/customer/forgot-password` | crmService | external CRM v1 | `EXTERNAL` | forced v1 fallback |
| `/customer/reset-password` | crmService | external CRM v1 | `EXTERNAL` | forced v1 fallback |
| `/customer/me` | crmService | external CRM v1 | `EXTERNAL` | |
| `/scan/auth/me` | crmService | external CRM v2 | `EXTERNAL` | |
| `/customer/me/orders` | crmService | external CRM v1 path in code | `EXTERNAL` | still active even if v2 flag on |
| `/customer/me/points` | crmService | external CRM v1 path in code | `EXTERNAL` | |
| `/customer/me/wallet` | crmService | external CRM v1 path in code | `EXTERNAL` | |
| `/customer/me/addresses*` | crmService | external CRM v1 | `EXTERNAL` | |
| `/scan/addresses*` | crmService | external CRM v2 | `EXTERNAL` | |
| `/restaurants/{restaurantId}/stations` | `stationService.js` | no active consumer found | `LEGACY_DEAD_CODE` | |
| `/restaurants/{restaurantId}/stations/{stationId}` | `stationService.js` | no active consumer found | `LEGACY_DEAD_CODE` | |
| `/restaurants/{restaurantId}/stations/{stationId}/categories` | `stationService.js` | no active consumer found | `LEGACY_DEAD_CODE` | |
| `/restaurants/{restaurantId}/menu` | `restaurantService.js` | no active consumer found | `LEGACY_DEAD_CODE` | |
| `/restaurants/{restaurantId}/menu/sections` | `restaurantService.js` | no active consumer found | `LEGACY_DEAD_CODE` | |

---

## 3. Non-route stale runtime features

| Feature | Evidence | Classification |
|---|---|---|
| Customer-side custom pages rendering | customPages stored but no route in `App.js` | `STALE` |
| Legacy `frontend/src/pages/AdminSettings.jsx` | imported but not actively routed in current admin tree | `LEGACY_DEAD_CODE` |
| Call Waiter integration | only logs TODO in `LandingPage.jsx` and `OrderSuccess.jsx` | `STALE` / incomplete feature |
| Pay Bill integration | only logs TODO in `LandingPage.jsx` and `OrderSuccess.jsx` | `STALE` / incomplete feature |

---

## 4. Final conclusions
1. `/api/restaurant-info/{id}` is the clearest confirmed missing route in the current repo.
2. `stationService.js` route family is not part of proven current runtime.
3. `utils/authToken.js` points at external/legacy auth-style routes not implemented in FastAPI.
4. Custom page admin CRUD exists, but customer routing/rendering for those pages is not proven.
5. Some external routes may still work in production, but if their base URLs differ from current assumptions, user confirmation is required.
