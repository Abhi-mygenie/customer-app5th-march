# RUNTIME_API_FLOW_AUDIT

Repo audited at `/app` on branch `abhi-2-may` (`4eb6abe`).
This document validates runtime API flows from frontend screen/component → service/helper → final URL target, using code evidence only.

---

## 1. Audit scope and evidence standard
- No code was modified.
- Findings below are based on static code tracing only.
- If a behavior depends on environment values not visible in code, it is marked `NEEDS_USER_CONFIRMATION`.
- File references use repo paths and line ranges inspected during audit.

---

## 2. Runtime API base classification

### 2.1 Confirmed API base responsibilities
| Base / env var | Confirmed usage | Proof |
|---|---|---|
| `REACT_APP_BACKEND_URL` | Own FastAPI backend calls | `frontend/src/context/AuthContext.jsx:6,145-149`, `frontend/src/context/AdminConfigContext.jsx:7,145-147,199-209`, `frontend/src/context/RestaurantConfigContext.jsx`, `frontend/src/pages/Login.jsx:10,39-45`, `frontend/src/pages/ReviewOrder.jsx:117-118,348`, `frontend/src/pages/FeedbackPage.jsx:9,34-38`, `frontend/src/api/services/dietaryTagsService.js:3-44` |
| `REACT_APP_API_BASE_URL` | Axios client base for POS-style endpoints and order/payment flows | `frontend/src/api/config/axios.js:12-18`, `frontend/src/api/config/endpoints.js:9-50`, `frontend/src/api/services/restaurantService.js:14-20,61-90`, `frontend/src/api/services/orderService.ts:82-90,129-133,265-275,347-354,444-455`, `frontend/src/api/services/tableRoomService.js:18-20` |
| `REACT_APP_CRM_URL` | Direct CRM API base | `frontend/src/api/services/crmService.js:9-13,87-119` |
| `REACT_APP_CRM_API_KEY` | Restaurant-scoped CRM API key map | `frontend/src/api/services/crmService.js:18-28,51-55,107-117` |
| `REACT_APP_CRM_API_VERSION` | CRM v1/v2 switch | `frontend/src/api/services/crmService.js:63-69` |
| `MYGENIE_API_URL` | Backend-side POS proxy base | `backend/server.py:37-40,347-389,795-798,823-825` |
| `REACT_APP_IMAGE_BASE_URL` | Menu image URL base and delivery distance API base fallback | `frontend/src/hooks/useMenuData.js:79-84`, `frontend/src/pages/DeliveryAddress.jsx:14,223-233` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps/Geocoding/Places | `frontend/src/pages/DeliveryAddress.jsx:13,54-57,191-204,427-537` |
| `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD` | `utils/authToken.js` order-auth bootstrap credentials | `frontend/src/utils/authToken.js:15-21,93-123` |

### 2.2 POS direct vs backend proxy summary

#### Confirmed frontend-direct POS paths
These are built from `REACT_APP_API_BASE_URL` in code:
- `POST /web/restaurant-info` — restaurant identity/details (`frontend/src/api/config/endpoints.js:21-22`)
- `POST /web/restaurant-product` — menu/category/item payload (`frontend/src/api/config/endpoints.js:37`, `frontend/src/api/services/restaurantService.js:61-80`)
- `POST /web/menu-master` — menu/station list (`frontend/src/api/config/endpoints.js:39-40`)
- `POST /web/table-config` — customer review page table/room config (`frontend/src/api/config/endpoints.js:43`, `frontend/src/api/services/tableRoomService.js:15-20`)
- `GET /customer/check-table-status?...` — table occupancy (`frontend/src/api/config/endpoints.js:46`, `frontend/src/api/services/orderService.ts:76-90`)
- `POST /customer/order/place` (`frontend/src/api/config/endpoints.js:16`, `frontend/src/api/services/orderService.ts:347-354`)
- `POST /customer/order/autopaid-place-prepaid-order` for restaurant `716` multi-menu branch (`frontend/src/api/config/endpoints.js:17`, `frontend/src/api/services/orderService.ts:254-277`)
- `POST /customer/order/update-customer-order` (`frontend/src/api/services/orderService.ts:444-455`)
- `POST /razor-pay/create-razor-order` and `POST /razor-pay/verify-payment` (`frontend/src/api/config/endpoints.js:48-50`, `frontend/src/pages/ReviewOrder.jsx:777-781`, `frontend/src/pages/OrderSuccess.jsx:175-185`)

#### Confirmed backend-proxied POS paths
These are implemented in FastAPI and call `MYGENIE_API_URL`:
- `POST /api/auth/login` for restaurant admin login side-effect `refresh_pos_token()` → `POST {MYGENIE_API_URL}/auth/vendoremployee/login` (`backend/server.py:347-389,550-563`)
- `GET /api/air-bnb/get-order-details/{order_id}` → `GET {MYGENIE_API_URL}/air-bnb/get-order-details/{order_id}` (`backend/server.py:788-807`)
- `GET /api/table-config` → `GET {MYGENIE_API_URL base}/api/v2/vendoremployee/restaurant-settings/table-config` using `X-POS-Token` (`backend/server.py:809-877`)

#### Important ambiguity: `GET_ORDER_DETAILS`
- Frontend builder points to `${REACT_APP_API_BASE_URL}/air-bnb/get-order-details/${orderId}` (`frontend/src/api/config/endpoints.js:18`).
- Backend exposes `/api/air-bnb/get-order-details/{order_id}` (`backend/server.py:788-807`).
- Therefore, whether runtime uses direct POS vs FastAPI proxy depends on what `REACT_APP_API_BASE_URL` is set to.
- **Classification:** `NEEDS_USER_CONFIRMATION` for deployed environment.

### 2.3 Answer: does `REACT_APP_API_BASE_URL` point directly to POS, or partially to backend proxy?
- **Confirmed from code:** `REACT_APP_API_BASE_URL` is the base used by axios for POS-style endpoints (`frontend/src/api/config/axios.js:17-18`).
- **Not provable from code alone:** whether this env points directly at POS, at an ingress that proxies to backend for some paths, or at a mixed gateway.
- **Runtime conclusion:**
  - Restaurant/menu/order/payment/table-status flows are coded as if `REACT_APP_API_BASE_URL` is an external POS-style base.
  - `GET /air-bnb/get-order-details` is the only clearly overlapping path where backend proxy also exists.
  - **Final classification:** `NEEDS_USER_CONFIRMATION` for actual deployment wiring.

---

## 3. CRM v1/v2 active path validation

### 3.1 CRM service files/helpers in runtime
| File | Role | Runtime status |
|---|---|---|
| `frontend/src/api/services/crmService.js` | Primary CRM adapter and fetch wrapper | `ACTIVE` |
| `frontend/src/context/AuthContext.jsx` | CRM token restore and profile validation | `ACTIVE` |
| `frontend/src/pages/PasswordSetup.jsx` | CRM register/login/OTP/skip/reset flows | `ACTIVE` |
| `frontend/src/pages/Profile.jsx` | CRM orders/points/wallet reads | `ACTIVE` |
| `frontend/src/pages/DeliveryAddress.jsx` | CRM address CRUD/default flows | `ACTIVE` |

### 3.2 CRM version gate
- CRM version is chosen once at module load from `REACT_APP_CRM_API_VERSION`, defaulting to `'v1'` (`frontend/src/api/services/crmService.js:63-69`).
- If the env is absent or invalid, runtime defaults to v1 behavior.
- **Which version is actually deployed right now cannot be proven from code without `.env` inspection.**
- **Classification:** `NEEDS_USER_CONFIRMATION`.

### 3.3 Which CRM endpoints switch between v1 and v2
| Functional area | v1 path | v2 path | Actual code behavior |
|---|---|---|---|
| Register | `/customer/register` | `/scan/auth/register` | switched by flag (`crmService.js:191-222`) |
| Login | `/customer/login` | `/scan/auth/login` | switched by flag (`232-256`) |
| Request OTP | `/customer/send-otp` | `/scan/auth/request-otp` | switched by flag (`282-309`) |
| Verify OTP | `/customer/verify-otp` | `/scan/auth/verify-otp` | switched by flag (`319-348`) |
| Skip OTP | none | `/scan/auth/skip-otp` | always v2-only helper (`360-376`) |
| Profile/me | `/customer/me` | `/scan/auth/me` | switched by flag (`425-430`) |
| Addresses list/create/update/delete/default | `/customer/me/addresses*` | `/scan/addresses*` | switched by flag (`467-580`) |
| Forgot password | `/customer/forgot-password` | none | **forced to v1 even when v2 flag is on** (`386-394`) |
| Reset password | `/customer/reset-password` | none | **forced to v1 even when v2 flag is on** (`404-412`) |
| Orders | `/customer/me/orders` | none in adapter | **stays v1 always** (`436-438`) |
| Points | `/customer/me/points` | none in adapter | **stays v1 always** (`444-446`) |
| Wallet | `/customer/me/wallet` | none in adapter | **stays v1 always** (`452-454`) |

### 3.4 CRM v1/v2 runtime conclusion
- The codebase does **not** represent a full v2-only implementation.
- Even when `REACT_APP_CRM_API_VERSION='v2'`:
  - forgot-password/reset-password intentionally remain on v1 (`crmService.js:382-403`)
  - orders/points/wallet still call v1-style endpoints (`436-454`)
- Therefore:
  - **Confirmed:** both v1 and v2 code paths exist.
  - **Confirmed:** runtime can be mixed-mode if flag is v2.
  - **Confirmed dead/legacy?** No complete CRM branch is fully dead; v1 remains active for several flows.
- **Deployed active version:** `NEEDS_USER_CONFIRMATION`.

### 3.5 CRM flow coverage by feature
| Feature | File(s) | Current path status |
|---|---|---|
| Customer lookup before auth | own backend, not CRM | `frontend/src/pages/LandingPage.jsx:73-81,304-312`; `backend/server.py:426-458` |
| CRM token issue/restore | `PasswordSetup.jsx`, `AuthContext.jsx`, `crmService.js` | `ACTIVE` |
| Loyalty/points/wallet | `Profile.jsx`, `crmService.js` | `ACTIVE`, v1 endpoints for orders/points/wallet |
| Membership tier/profile | `AuthContext.jsx`, `Profile.jsx`, `crmGetProfile` | `ACTIVE` |
| Restaurant-scoped CRM auth | `crmService.buildUserId`, per-restaurant key map, per-restaurant token storage | `ACTIVE` |
| Delivery addresses | `DeliveryAddress.jsx`, `crmService.js` | `ACTIVE` |

---

## 4. Auth/token flow validation summary

### 4.1 Token systems confirmed in runtime
| Token system | Source | Storage | Primary readers | Notes |
|---|---|---|---|---|
| Admin backend JWT | FastAPI `/api/auth/login` | `localStorage['auth_token']` | `AuthContext`, admin backend requests | `frontend/src/context/AuthContext.jsx:37,167,176-182`; `backend/server.py:460-575` |
| Restaurant-scoped CRM token | CRM auth responses | `localStorage['crm_token_<restaurantId>']` | `AuthContext`, `DeliveryAddress`, `Profile` | `frontend/src/context/AuthContext.jsx:9,95,185-195`; `crmService.js:167-176` |
| POS admin token | Backend returns `pos_token` during admin login | `localStorage['pos_token']` | `AdminQRPage` only in active code | `frontend/src/pages/Login.jsx:60-62`; `frontend/src/pages/admin/AdminQRPage.jsx:106-112` |
| Order/POS auth helper token | `utils/authToken.js` login helper | `localStorage['order_auth_token']` and `order_token_expiry` | axios interceptor, `ReviewOrder`, `LandingPage` indirectly, `OrderSuccess` token getter | `frontend/src/utils/authToken.js:7-8,131-162`; `frontend/src/api/interceptors/request.js:6-33`; `frontend/src/pages/ReviewOrder.jsx:605-623`; `frontend/src/pages/LandingPage.jsx:187-191`; `frontend/src/pages/OrderSuccess.jsx:231` |

### 4.2 `utils/authToken.js` contract alignment result
**Confirmed not aligned with current FastAPI `/api/auth/login` contract.**

Proof:
- Current FastAPI login expects `POST /api/auth/login` with body keys `phone_or_email`, `password|otp`, optional `restaurant_id`, `pos_id` (`backend/server.py:60-66,460-575`).
- `authToken.js` calls `apiClient.post('/auth/login', { phone, password })` (`frontend/src/utils/authToken.js:97-100`).
- `apiClient` base is `REACT_APP_API_BASE_URL`, not `REACT_APP_BACKEND_URL` (`frontend/src/api/config/axios.js:17-18`).
- `authToken.js` expects response fields `token`, `is_phone_verified`, `user_id` (`frontend/src/utils/authToken.js:102-110`) which are **not** part of FastAPI `LoginResponse` (`backend/server.py:67-73,508-572`).

**Audit conclusion:**
- `utils/authToken.js` is **not aligned** with current FastAPI `/api/auth/login`.
- It may still work only if `REACT_APP_API_BASE_URL/auth/login` is served by some other external auth endpoint with the old contract.
- **Classification:** current helper is `ACTIVE_BUT_EXTERNAL_CONTRACT_DEPENDENT`; against current FastAPI contract it is a mismatch risk.

---

## 5. Stale/missing route validation

### 5.1 `/api/restaurant-info/{id}` special audit
#### Frontend references found
- `frontend/src/context/AdminConfigContext.jsx:145-166` fetches `${REACT_APP_BACKEND_URL}/api/restaurant-info/${configId}`.

#### Backend references found
- No implementation in `backend/server.py`.
- No matching route found in inspected backend repo files.

#### External/POS overlap check
- POS has `POST /web/restaurant-info`, not `GET /api/restaurant-info/{id}` (`frontend/src/api/config/endpoints.js:21-22`, `frontend/src/api/services/restaurantService.js:14-20`).
- CRM has no such route in runtime code.

#### Conclusion
- This route does **not** exist in the current FastAPI backend code.
- Current admin context swallows failure via `.catch(() => null)` and treats it as optional (`frontend/src/context/AdminConfigContext.jsx:145-148,159-166`).
- **Classification:** `MISSING_BACKEND_ROUTE` for current repo runtime.

### 5.2 Other questionable route references
| Route / path | Evidence | Conclusion | Classification |
|---|---|---|---|
| `/auth/login` via axios | `frontend/src/utils/authToken.js:97-100` | Not in FastAPI repo; could be external legacy POS auth path depending on `REACT_APP_API_BASE_URL` | `EXTERNAL` + `NEEDS_USER_CONFIRMATION` |
| `/auth/refresh` via axios | `frontend/src/api/services/orderService.ts:61-66` | No matching backend route in repo; helper not used by active order path | `LEGACY_DEAD_CODE` |
| `/restaurants/:id/menu`, `/restaurants/:id/stations`, `/restaurants/:id/stations/:id/categories` | `frontend/src/api/config/endpoints.js:26-34`, `stationService.js:14-47`, `restaurantService.js:31-48` | No active consumers found for these GET routes in runtime screens | `LEGACY_DEAD_CODE` |
| `/api/customer/profile`, `/api/customer/orders`, `/api/customer/points`, `/api/customer/wallet` | Backend has these, but current customer UI uses CRM instead | backend exists but current frontend runtime path is not wired | `LEGACY_DEAD_CODE` from current frontend perspective |
| Custom page public route like `/:restaurantId/<slug>` | `customPages` stored/admin-managed but no route in `App.js` | no customer renderer found | `STALE` / `NEEDS_USER_CONFIRMATION` |

---

## 6. Screen-by-screen runtime API flow validation

### 6.1 `/login` → `frontend/src/pages/Login.jsx`
- API path: `POST ${REACT_APP_BACKEND_URL}/api/auth/login` (`Login.jsx:39-45`)
- Backend route: `/api/auth/login` (`backend/server.py:460-575`)
- Payload: `phone_or_email`, `password`
- Response consumed: `token`, `user`, `user_type`, `pos_token`
- Storage: `auth_token`, `pos_token`
- Final target: own backend, plus backend side-call to POS `vendoremployee/login` for `pos_token`
- Risk: none for route existence; `pos_token` may be null if POS login refresh fails (`backend/server.py:553-555`)

### 6.2 `/:restaurantId` → `frontend/src/pages/LandingPage.jsx`
#### API calls
1. `useRestaurantDetails(restaurantId)` → `restaurantService.getRestaurantDetails()` → `POST ${REACT_APP_API_BASE_URL}/web/restaurant-info` (`useMenuData.js:276-283`, `restaurantService.js:14-20`)
2. `fetchConfig(restaurantId)` → own backend `/api/config/{restaurantId}` through `RestaurantConfigContext` (`LandingPage.jsx:143-156`, context file)
3. `setRestaurantScope(restaurantId)` → CRM profile validation if a scoped token exists (`LandingPage.jsx:147-148`, `AuthContext.jsx:85-128`)
4. `POST ${REACT_APP_BACKEND_URL}/api/auth/check-customer` for customer capture (`LandingPage.jsx:72-81,303-312`)
5. `getAuthToken()` → `utils/authToken.js` external auth helper (`LandingPage.jsx:187-191`)
6. `checkTableStatus()` → `${REACT_APP_API_BASE_URL}/customer/check-table-status?...` (`LandingPage.jsx:194-196`, `orderService.ts:76-90`)
7. `getOrderDetails()` → `${REACT_APP_API_BASE_URL}/air-bnb/get-order-details/{id}` (`LandingPage.jsx:214`, `orderService.ts:129-133`)

#### Classification
- POS direct: restaurant-info, check-table-status, get-order-details (unless API base proxies)
- Backend: config, check-customer
- CRM: token restore only
- Stubbed actions: `handleCallWaiter`, `handlePayBill` only log TODO (`LandingPage.jsx:387-395`)

### 6.3 `/:restaurantId/password-setup` → `frontend/src/pages/PasswordSetup.jsx`
- CRM register/login/OTP/skip/reset only (`PasswordSetup.jsx:65-292`)
- Backend not used for actual password setup/login here
- Stores CRM token via `setCrmAuth`, plus guest prefill in `localStorage['guestCustomer']`
- Delivery mode branch routes to `/:restaurantId/delivery-address` after auth (`PasswordSetup.jsx:52-63`)
- Risk: mixed v1/v2 CRM behavior; forgot/reset remain v1-only even under v2 flag

### 6.4 `/:restaurantId/delivery-address` → `frontend/src/pages/DeliveryAddress.jsx`
- `setRestaurantScope(restaurantId)` (`110-114`)
- `crmGetAddresses`, `crmAddAddress`, `crmDeleteAddress`, `crmSetDefaultAddress` (`128-151`, `317-380`)
- Direct Google APIs for geocode/places (`191-204`, `427-537`)
- Direct distance service `POST ${REACT_APP_IMAGE_BASE_URL || https://manage.mygenie.online}/api/v1/config/distance-api-new` (`14`, `223-233`)
- Final targets: CRM + Google + external Manage API
- Risk: `MANAGE_BASE_URL` fallback is hardcoded external default (`DeliveryAddress.jsx:14`)

### 6.5 `/:restaurantId/stations` → `frontend/src/pages/DiningMenu.jsx`
- `useRestaurantDetails` → POS `POST /web/restaurant-info`
- `useStations` → POS `POST /web/menu-master`
- No backend/CRM calls directly in page
- `stationService.js` GET routes are not used here

### 6.6 `/:restaurantId/menu` and `/:restaurantId/menu/:stationId` → `frontend/src/pages/MenuItems.jsx`
- `useRestaurantDetails` → POS `/web/restaurant-info`
- `useMenuSections` → POS `/web/restaurant-product`
- `useStations` → POS `/web/menu-master`
- `useDietaryTags` → backend `/api/dietary-tags/available` and `/api/dietary-tags/{restaurantId}`
- `fetchConfig` from backend for branding/config
- Final targets: POS + own backend
- Risk: image rendering depends on `REACT_APP_IMAGE_BASE_URL` (`useMenuData.js:79-84`)

### 6.7 `/:restaurantId/about` → `frontend/src/pages/AboutUs.jsx`
- `useRestaurantDetails` → POS `/web/restaurant-info`
- `fetchConfig` → backend `/api/config/{restaurantId}`
- No CRM

### 6.8 `/:restaurantId/contact` → `frontend/src/pages/ContactPage.jsx`
- `useRestaurantDetails` → POS `/web/restaurant-info`
- `fetchConfig` → backend `/api/config/{restaurantId}`
- No CRM

### 6.9 `/:restaurantId/feedback` → `frontend/src/pages/FeedbackPage.jsx`
- `fetchConfig` → backend `/api/config/{restaurantId}`
- submit feedback → `POST ${REACT_APP_BACKEND_URL}/api/config/feedback` (`FeedbackPage.jsx:34-38`)
- Final target: own backend only

### 6.10 `/:restaurantId/review-order` → `frontend/src/pages/ReviewOrder.jsx`
#### API stack
- `useRestaurantDetails` → POS `/web/restaurant-info`
- `useStations` → POS `/web/menu-master`
- `fetchConfig` → backend `/api/config/{restaurantId}`
- `setRestaurantScope` → CRM token validation
- loyalty settings → backend `/api/loyalty-settings/{restaurantId}` (`117-118`)
- customer lookup → backend `/api/customer-lookup/{restaurantId}?phone=...` (`347-349`)
- table config → POS `/web/table-config` (`useTableConfig` → `tableRoomService.js:18-20`)
- order-auth token bootstrap → `utils/authToken.js`
- table status → POS `/customer/check-table-status`
- order details for edit verification → `/air-bnb/get-order-details/{id}` via `REACT_APP_API_BASE_URL`
- place order/update order → POS `/customer/order/*`
- Razorpay create order → POS `/razor-pay/create-razor-order`

#### Special hardcoded branch
- Restaurant `716` gets forced room-only behavior and a special endpoint switch to `/customer/order/autopaid-place-prepaid-order` for multi-menu orders (`orderService.ts:254-277`, `ReviewOrder.jsx:491-512,700-723,949-957,1049-1053`)

#### Incomplete areas
- Coupon input renders but no apply API/handler exists (`ReviewOrder.jsx:1382-1397`)

### 6.11 `/:restaurantId/order-success` → `frontend/src/pages/OrderSuccess.jsx`
- `useRestaurantDetails` → POS `/web/restaurant-info`
- `useStations` → POS `/web/menu-master`
- `fetchConfig` → backend `/api/config/{restaurantId}`
- payment verify → POS `/razor-pay/verify-payment` (`175-185`)
- order polling → `getOrderDetails()` via `REACT_APP_API_BASE_URL` (`214-215`, `355-360`)
- table status check for merge/free table → POS `/customer/check-table-status` with `getStoredToken()` from order auth helper (`228-232`)
- `handleCallWaiter` and `handlePayBill` are TODO stubs (`462-470`)

### 6.12 `/profile` → `frontend/src/pages/Profile.jsx`
- Uses CRM token from `AuthContext`
- `crmGetOrders`, `crmGetPoints`, `crmGetWallet` (`53-103`)
- If restaurant admin, redirects to `/admin/settings` (`29-31`)
- Current runtime does not use backend customer routes for profile tabs

### 6.13 `/admin/*` via `frontend/src/layouts/AdminLayout.jsx` and admin pages
#### Common calls
- `AdminConfigContext` load config: backend `GET /api/config/{configId}` (`AdminConfigContext.jsx:145-156`)
- `AdminConfigContext` optional flags fetch: `GET /api/restaurant-info/{configId}` (`145-148`) → missing route
- save config: backend `PUT /api/config/` (`199-209`)
- banners CRUD: backend `/api/config/banners*`
- upload image: backend `/api/upload/image`
- content custom page CRUD: backend `/api/config/pages*` through `ContentTab.jsx:142-199`
- menu admin data: POS `/web/restaurant-info`, `/web/menu-master`, `/web/restaurant-product`
- dietary admin data: backend `/api/dietary-tags/*` + POS menu endpoints
- QR admin: backend `GET /api/table-config` with `Authorization` + `X-POS-Token` (`AdminQRPage.jsx:108-112`)

### 6.14 Legacy `frontend/src/pages/AdminSettings.jsx`
- Imported in `App.js` (`line 19`) but no active route element uses it except a self-redirecting legacy route (`App.js:81-82`).
- Contains working admin logic and fetches POS restaurant details directly (`AdminSettings.jsx:223-239`) rather than missing `/api/restaurant-info/{id}`.
- Runtime route tree uses `pages/admin/*` plus `AdminLayout` instead.
- **Classification:** `LEGACY_DEAD_CODE` unless user confirms indirect usage elsewhere.

---

## 7. Specific required question resolutions

### Q1. Does `REACT_APP_API_BASE_URL` point directly to POS, or partially to backend proxy in some environments?
- Code proves it is the axios base for POS-style calls.
- Code does not reveal deployed value.
- `GET_ORDER_DETAILS` overlaps with a FastAPI proxy route, so mixed routing is possible.
- **Answer:** `NEEDS_USER_CONFIRMATION` for environment; code alone cannot prove actual network target.

### Q2. Is `utils/authToken.js` still fully valid against current `/api/auth/login` contract?
- **No. Confirmed mismatch.**
- Wrong base (`REACT_APP_API_BASE_URL` vs backend URL), wrong path (`/auth/login` vs `/api/auth/login`), wrong body shape (`phone` vs `phone_or_email`), wrong response expectations.

### Q3. Is `/api/restaurant-info/{id}` intentionally external/stale, or is a backend route missing?
- In this repo, the backend route is missing.
- AdminContext still references it optionally.
- **Answer:** `MISSING_BACKEND_ROUTE` in current repo; intent beyond repo is `NEEDS_USER_CONFIRMATION`.

### Q4. Are `stationService.js` GET station/category endpoints still used anywhere in runtime?
- No active runtime consumer found.
- `useMenuData.js` comments out `getStations` import and uses `menu-master` instead (`useMenuData.js:9-12,179-231`).
- **Answer:** appears fully legacy in current runtime.
- **Classification:** `LEGACY_DEAD_CODE`.

### Q5. How are customPages rendered customer-side?
- Admin can create/store/manage them in config (`ContentTab.jsx:142-199,370-440`; backend `server.py:1233-1284`).
- `RestaurantConfigContext` exposes `customPages` (`useRestaurantConfig` state), but `App.js` has no dynamic route for them.
- No customer-side renderer was found.
- **Answer:** not rendered in proven current runtime.
- **Classification:** `STALE` / `NEEDS_USER_CONFIRMATION`.

### Q6. Is restaurant `716` special handling meant to remain hardcoded, or temporary branch-specific logic?
- Hardcoding is confirmed in active runtime order/review/table selector logic and tests.
- Intent is not provable from code.
- **Answer:** hardcoding is active; whether intentional long-term is `NEEDS_USER_CONFIRMATION`.

### Q7. Are Call Waiter and Pay Bill intentionally stubbed, or incomplete integrations?
- Landing and OrderSuccess only log TODO actions, no API integration exists.
- **Answer:** currently incomplete/stubbed.

### Q8. Which CRM version is actually deployed right now: v1 or v2?
- Not provable without env inspection.
- **Answer:** `NEEDS_USER_CONFIRMATION`.

### Q9. Is `dietary_tags_mapping` intentionally outside exported db_data set, or is export incomplete?
- Backend uses the collection (`backend/server.py:1453,1488`), but `backend/db_data/README.md` does not list it.
- **Answer:** export completeness cannot be proven.
- **Classification:** `NEEDS_USER_CONFIRMATION`.

### Q10. Is legacy `frontend/src/pages/AdminSettings.jsx` still used indirectly, or leftover code?
- Imported in `App.js` but not mounted on a unique route; current admin route tree uses `AdminLayout` and `pages/admin/*`.
- No active navigation path to this component was found.
- **Answer:** leftover/legacy by current routing evidence.
- **Classification:** `LEGACY_DEAD_CODE` unless user confirms another entrypoint.

---

## 8. Confirmed runtime findings summary
1. **Three parallel API domains are active in code:** own backend (`REACT_APP_BACKEND_URL`), POS-style axios base (`REACT_APP_API_BASE_URL`), and CRM (`REACT_APP_CRM_URL`).
2. **Most customer restaurant/menu/order calls are coded as frontend-direct POS calls**, not backend proxy calls.
3. **Backend proxy usage is selective**: admin login POS token refresh, `/api/table-config`, and `/api/air-bnb/get-order-details/{id}`.
4. **`utils/authToken.js` is not aligned with the current FastAPI `/api/auth/login` contract.**
5. **`/api/restaurant-info/{id}` is referenced but not implemented in the backend repo.**
6. **CRM runtime is mixed-capability**; even v2 mode still leaves some flows on v1 endpoints.
7. **StationService GET endpoints are not part of proven current runtime.**
8. **Custom pages are admin-manageable but not customer-rendered in proven routing.**
9. **Restaurant `716` contains active hardcoded runtime behavior in order flow.**
10. **Call Waiter / Pay Bill are UI-visible but integration-stubbed.**
