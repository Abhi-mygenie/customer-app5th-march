# Document Audit Status
- Source File: API_MAPPING.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: backend/server.py, frontend/src/api/config/endpoints.js, frontend/src/api/services/orderService.ts, frontend/src/api/services/restaurantService.js, frontend/src/api/services/tableRoomService.js, frontend/src/utils/authToken.js, frontend/src/hooks/useMenuData.js, frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/OrderSuccess.jsx
- Notes: Updated to reflect the current hybrid API model: frontend talks directly to POS APIs, our backend proxies only selected flows, and several endpoints documented in the prior version are legacy, admin-only, or not found in active call paths.

# API Mapping

## Audit Scope
This document maps the APIs actually visible in the current codebase and classifies each mapping by implementation status.

## High-Level Architecture
The current app uses three API surfaces:

1. **POS API** via `REACT_APP_API_BASE_URL`
   - Used directly by the frontend for menu, restaurant info, order placement, Razorpay, and table status.
2. **Customer app backend** via `REACT_APP_BACKEND_URL`
   - Used for admin auth/config, customer profile endpoints, loyalty settings, customer lookup, uploads, dietary tags, and selected proxy endpoints.
3. **CRM API** via `REACT_APP_CRM_URL`
   - Used directly by the frontend for customer auth/profile/address management.

## Token Model
| Token | Stored In | Purpose | Verified In Code | Status |
|---|---|---|---|---|
| `auth_token` | localStorage | Our backend auth, mainly admin and some backend customer endpoints | `AuthContext.jsx`, `server.py` | Verified |
| `pos_token` | localStorage | POS admin token returned from vendoremployee login during admin login | `AuthContext.jsx`, `Login.jsx`, `server.py` | Verified |
| `order_auth_token` | localStorage | POS customer-order token used for direct POS calls | `utils/authToken.js` | Verified |
| `crm_token_{restaurantId}` | localStorage | Restaurant-scoped CRM customer token | `AuthContext.jsx` | Verified |

## Source of Truth Files
- `frontend/src/api/config/endpoints.js`
- `frontend/src/api/config/axios.js`
- `frontend/src/api/services/orderService.ts`
- `frontend/src/api/services/restaurantService.js`
- `frontend/src/api/services/tableRoomService.js`
- `frontend/src/api/services/crmService.js`
- `backend/server.py`

---

## Active POS API Endpoints Used by Frontend

### 1. Restaurant Info
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/web/restaurant-info`
- **Called from:** `restaurantService.js` → `getRestaurantDetails()`
- **Used by:** `useRestaurantDetails`, landing/menu/review/success pages
- **Status:** Verified in code

**Observed request payload**
```json
{
  "restaurant_web": "<restaurantId-or-identifier>"
}
```

**Observed frontend usage**
- `id`
- `name`
- `logo`
- `multiple_menu`
- `success_config`
- `is_coupon`
- `is_loyalty`
- `razorpay` or related payment config fields if present in response

**Notes**
- Earlier documentation listed many response fields. Only a subset is clearly consumed in current call paths.
- Restaurant object shape is not normalized centrally beyond direct component usage.

### 2. Restaurant Product / Menu Items
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/web/restaurant-product`
- **Called from:** `restaurantService.js` → `getRestaurantProducts()`
- **Used by:** `useMenuSections`
- **Status:** Verified in code

**Observed request payload**
```json
{
  "restaurant_id": "<id>",
  "category_id": "0",
  "food_for": "<stationId or menu filter>"
}
```

**Notes**
- The code sends `food_for`, not `station_id`.
- Response is expected to contain `products[]`, each with category metadata and `items[]`.
- Image URLs are transformed using `REACT_APP_IMAGE_BASE_URL` when the API returns relative image paths.

### 3. Menu Master
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/web/menu-master`
- **Called from:** `restaurantService.js` → `getMenuMaster()`
- **Used by:** `useStations`
- **Status:** Verified in code

**Observed purpose**
- Used to derive menu/station entries.
- Frontend filters out standard menus: `Normal`, `Party`, `Premium`, `Aggregator`.

### 4. Customer Place Order
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/customer/order/place`
- **Called from:** `orderService.ts` → `placeOrder()`
- **Status:** Verified in code

**Observed behavior**
- Used for all normal orders.
- Also used for multi-menu orders except restaurant `716`.
- Payload is sent as `FormData` with a `data` JSON field.

**Verified request characteristics**
- `payment_method` is hardcoded to `cash_on_delivery`
- `payment_type` is UI-driven: `prepaid` or `postpaid`
- Includes delivery-related fields when present
- Includes points redemption fields when used

### 5. Auto-paid / Prepaid Order Endpoint
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/customer/order/autopaid-place-prepaid-order`
- **Called from:** `orderService.ts` → `placeOrder()`
- **Status:** Verified in code, special case only

**Notes**
- Current code uses this endpoint only when:
  - the restaurant is treated as multi-menu, and
  - `restaurantId === '716'`
- Previous documentation that implied all multi-menu restaurants use this endpoint is contradicted by current implementation.

### 6. Update Customer Order
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/customer/order/update-customer-order`
- **Called from:** `orderService.ts` → `updateCustomerOrder()`
- **Status:** Verified in code

**Purpose**
- Used for edit-order flows.

### 7. Check Table Status
- **Endpoint:** `GET {REACT_APP_API_BASE_URL}/customer/check-table-status?table_id={id}&restaurant_id={id}`
- **Called from:** `orderService.ts` → `checkTableStatus()`
- **Used by:** `LandingPage.jsx`, `ReviewOrder.jsx`, `OrderSuccess.jsx`
- **Status:** Verified in code

**Important implementation note**
The frontend expects a response shape like:
```json
{
  "status": {
    "table_status": "Available|Not Available|Invalid Table ID or QR code",
    "order_id": "12345"
  }
}
```
This differs from some older docs that described `{ is_available, order_id }`.

### 8. Order Details
- **Endpoint:** `GET {REACT_APP_API_BASE_URL}/air-bnb/get-order-details/{orderId}`
- **Frontend access path:** via our backend proxy endpoint `/api/air-bnb/get-order-details/{orderId}` if `REACT_APP_API_BASE_URL` points to backend, or directly to POS if configured that way
- **Current code reality:** `ENDPOINTS.GET_ORDER_DETAILS()` uses `REACT_APP_API_BASE_URL`, while backend also exposes a proxy at `/api/air-bnb/get-order-details/{order_id}`.
- **Status:** Needs clarification

**Reason for clarification**
- The frontend endpoint builder points at `REACT_APP_API_BASE_URL`.
- The backend separately defines `/api/air-bnb/get-order-details/{order_id}` as a proxy to `MYGENIE_API_URL`.
- Which path is live depends on actual environment configuration, not code alone.

### 9. Razorpay Create Order
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/razor-pay/create-razor-order`
- **Used by:** `ReviewOrder.jsx`
- **Status:** Verified in code

### 10. Razorpay Verify Payment
- **Endpoint:** `POST {REACT_APP_API_BASE_URL}/razor-pay/verify-payment`
- **Used by:** `OrderSuccess.jsx`
- **Status:** Verified in code

---

## Backend API Endpoints Exposed by Customer App Backend

### Authentication (`/api/auth/*`)
Verified in `backend/server.py`:
- `POST /api/auth/send-otp`
- `POST /api/auth/check-customer`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/set-password`
- `POST /api/auth/verify-password`
- `POST /api/auth/reset-password`

**Status:** Verified in code

**Notes**
- These remain implemented even though parts of customer auth have shifted to CRM in the frontend.
- Admin login definitely uses `/api/auth/login`.
- Landing-page customer existence checks still use `/api/auth/check-customer`.

### Customer profile/data (`/api/customer/*`)
Verified in `backend/server.py`:
- `GET /api/customer/profile`
- `PUT /api/customer/profile`
- `GET /api/customer/orders`
- `GET /api/customer/points`
- `GET /api/customer/wallet`
- `GET /api/customer/coupons`

**Status:** Verified in code

**Notes**
- Current frontend CRM-based profile flows do not appear to rely primarily on these endpoints.
- These endpoints are still implemented and usable.

### Public utility endpoints
Verified in `backend/server.py`:
- `GET /api/loyalty-settings/{restaurant_id}`
- `GET /api/customer-lookup/{restaurant_id}`
- `GET /api/`
- `POST /api/status`
- `GET /api/status`

**Status:** Verified in code

### Admin config endpoints
Verified in `backend/server.py`:
- `GET /api/config/{restaurant_id}`
- `PUT /api/config/`
- `POST /api/config/banners`
- `PUT /api/config/banners/{banner_id}`
- `DELETE /api/config/banners/{banner_id}`
- `POST /api/config/feedback`
- `GET /api/config/feedback/{restaurant_id}`
- `POST /api/config/pages`
- `PUT /api/config/pages/{page_id}`
- `DELETE /api/config/pages/{page_id}`

**Status:** Verified in code

### Upload endpoint
- `POST /api/upload/image`
- **Status:** Verified in code

### Dietary tags endpoints
- `GET /api/dietary-tags/available`
- `GET /api/dietary-tags/{restaurant_id}`
- `PUT /api/dietary-tags/{restaurant_id}`
- **Status:** Verified in code

### Admin POS table-config proxy
- `GET /api/table-config`
- Requires backend auth plus `X-POS-Token`
- Proxies to POS v2 table-config endpoint
- **Status:** Verified in code

---

## CRM API Endpoints Used by Frontend
Verified in `frontend/src/api/services/crmService.js`:
- `POST /customer/register`
- `POST /customer/login`
- `POST /customer/send-otp`
- `POST /customer/verify-otp`
- `POST /customer/forgot-password`
- `POST /customer/reset-password`
- `GET /customer/me`
- `GET /customer/me/orders`
- `GET /customer/me/points`
- `GET /customer/me/wallet`
- `GET /customer/me/addresses`
- `POST /customer/me/addresses`
- `PUT /customer/me/addresses/{id}`
- `DELETE /customer/me/addresses/{id}`
- `POST /customer/me/addresses/{id}/set-default`

**Status:** Verified in code

**Important note**
These CRM endpoints are not implemented in `backend/server.py`; they are external-service integrations consumed directly by the frontend.

---

## Dead / Legacy / Misleading Endpoint Definitions

### Defined in `endpoints.js` but not part of current active flow
- `MENU_ITEMS(restaurantId) => /restaurants/{id}/menu`
- `MENU_SECTIONS(restaurantId) => /restaurants/{id}/menu/sections`
- `STATIONS(restaurantId) => /restaurants/{id}/stations`
- `STATION_DETAILS(restaurantId, stationId) => /restaurants/{id}/stations/{stationId}`
- `CATEGORIES(restaurantId, stationId) => /restaurants/{id}/stations/{stationId}/categories`

**Status:** Legacy/outdated in current frontend flow

**Reason**
Current menu and station loading uses:
- `/web/restaurant-info`
- `/web/restaurant-product`
- `/web/menu-master`
not these REST-style routes.

---

## Backend Contract Assumptions Observed in Frontend

### Table status response shape
- Frontend expects `response.data.status.table_status` and `response.data.status.order_id`.
- Older docs describing `is_available` are not aligned with current client logic.

### Order details response shape
Frontend expects:
- `details[]`
- top-level `table_id`, `table_no`, `restaurant`, `delivery_charge`
- detail-level `order_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `f_order_status`, `restaurant_order_id`
- `variation` array and `add_ons` array

### Variation format asymmetry
- **Receive format:** `variation[].values` as array of objects
- **Send format:** transformed by helper utilities for outgoing payload
- **Status:** Partially verified in code

The older doc captured the asymmetry conceptually, but exact output formatting should be treated as helper-driven implementation detail rather than a guaranteed external contract unless confirmed by live API samples.

---

## Key Conflicts Found During Audit

| Topic | Earlier Doc Claim | Current Code Reality | Classification |
|---|---|---|---|
| Source docs folder | `docs/source` is source of truth | No `docs/source` folder found; repo uses `memory/` docs | Contradicted by repository |
| Order details path | Sometimes described as backend-only proxy | Frontend endpoint builder depends on env; backend proxy also exists | Needs clarification |
| Table status response | `{ is_available, order_id }` | Client code expects nested `status.table_status` | Contradicted by code |
| Multi-menu autopaid routing | All multi-menu orders use autopaid endpoint | Only restaurant 716 uses autopaid endpoint in current code | Contradicted by code |
| Customer auth ownership | Our backend-only in older docs | Current frontend uses both CRM and our backend | Legacy/outdated |

---

## Open Questions
1. What is the deployed value of `REACT_APP_API_BASE_URL` in the active environment: direct POS base URL or our backend proxy base?
2. Is `/air-bnb/get-order-details/{id}` intended to be called directly from frontend to POS, or always through backend in production?
3. Is the POS table-status API response still the nested `status.table_status` shape expected by frontend, and is that contract stable?
4. Are Razorpay endpoints guaranteed on the same base as other POS endpoints for all restaurants?

## Needs Backend Clarification
- Whether the backend customer endpoints are still strategic or now mostly legacy after CRM migration.
- Whether documentation endpoints under `/api/docs/*` are expected to remain operational, since one references a file not found during this audit (`CHANGELOG_TRANSFORM_V1.md`).

## Assumptions Made
- `memory/*.md` was treated as the documentation source set because the requested `docs/source` directory does not exist in the cloned repository.
- Endpoint usage status was determined from static code references only, not from live API traffic inspection.

---

## What changed from previous version
- Reframed the app as a hybrid POS + backend + CRM integration instead of a single-backend API model.
- Removed confidence around endpoints not used in the current code path.
- Marked REST-style menu/station routes as legacy definitions rather than active integrations.
- Added explicit conflicts around order-details routing and table-status response shape.

## Unverified items
- Live response payloads for POS APIs in the current environment.
- Whether the backend proxy for order details is active in production routing.
- Exact Razorpay response fields beyond what the frontend consumes.

## Follow-ups recommended
1. Confirm runtime env values for `REACT_APP_API_BASE_URL`, `REACT_APP_BACKEND_URL`, and `REACT_APP_CRM_URL`.
2. Capture live samples for table-status and order-details APIs and update this doc again.
3. Remove or clearly mark dead endpoint definitions in `endpoints.js`.
4. Decide whether backend proxying or direct POS access is the intended long-term pattern.
