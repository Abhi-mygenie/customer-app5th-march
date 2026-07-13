# AUTH_TOKEN_FLOW_AUDIT

This document traces all token systems in the repo and validates source, storage, readers, dependent APIs, and mismatch risks.

---

## 1. Token systems inventory

| Token | Logical purpose | Source | Storage | Primary readers |
|---|---|---|---|---|
| Admin backend JWT | restaurant admin auth to own backend | `POST /api/auth/login` | `localStorage['auth_token']` | `AuthContext`, admin backend fetch calls |
| CRM restaurant-scoped token | customer auth/session per restaurant | CRM auth endpoints | `localStorage['crm_token_<restaurantId>']` | `AuthContext`, `Profile`, `DeliveryAddress`, CRM adapter |
| POS admin token | admin QR/backend POS proxy access | backend login response `pos_token` | `localStorage['pos_token']` | `AdminQRPage` |
| Order auth helper token | POS order/table-status auth | `utils/authToken.js` login helper | `localStorage['order_auth_token']`, `order_token_expiry` | axios interceptor, `ReviewOrder`, `LandingPage`, `OrderSuccess` |

---

## 2. Admin backend JWT flow

### 2.1 Where it comes from
- Frontend admin login page posts to `POST ${REACT_APP_BACKEND_URL}/api/auth/login` with `{ phone_or_email, password }` (`frontend/src/pages/Login.jsx:39-45`).
- Backend validates against `db.users` for restaurant users and returns `token`, `user_type`, `user`, and optionally `pos_token` (`backend/server.py:530-572`).
- Token payload fields are `user_id`, `user_type`, `exp` (`backend/server.py:274-280`).

### 2.2 Where it is stored
- `localStorage['auth_token']` via `setAuth()` and `AuthContext.login()` (`frontend/src/context/AuthContext.jsx:167,181`).

### 2.3 Which files read it
- `AuthContext` on app mount calls `/api/auth/me` with Bearer token (`AuthContext.jsx:35-62`).
- `AdminConfigContext` sends `Authorization: Bearer ${token}` on save/banner/upload actions (`frontend/src/context/AdminConfigContext.jsx:199-204,236-240,271-274,303-304,332-335`).
- `AdminQRPage` uses `useAuth().token` as backend Bearer token (`frontend/src/pages/admin/AdminQRPage.jsx:86,108-112`).

### 2.4 Which APIs depend on it
- `GET /api/auth/me`
- `PUT /api/config/`
- `POST /api/config/banners`
- `PUT /api/config/banners/{id}`
- `DELETE /api/config/banners/{id}`
- `POST /api/upload/image`
- `POST/PUT/DELETE /api/config/pages*`
- `PUT /api/dietary-tags/{restaurantId}`
- `GET /api/table-config`

### 2.5 How it is passed
- Always in `Authorization: Bearer <token>` header.

### 2.6 Mismatch/failure risk
- `logout()` removes `auth_token` and `pos_token` together (`AuthContext.jsx:197-209`), which is good for admin session cleanup.
- JWT payload does not include `sub`, but dietary tags backend writes `updated_by = payload.get('sub')`, so audit metadata is wrong/empty (`backend/server.py:1491-1496`).

---

## 3. CRM restaurant-scoped token flow

### 3.1 Where it comes from
- `PasswordSetup.jsx` gets CRM token from:
  - `crmRegister()`
  - `crmLogin()`
  - `crmVerifyOtp()`
  - `crmSkipOtp()`
- Then writes via `setCrmAuth(newCrmToken, customerProfile, restaurantId)` (`frontend/src/context/AuthContext.jsx:185-195`).

### 3.2 Where it is stored
- `localStorage['crm_token_<restaurantId>']` (`AuthContext.jsx:9,192`).
- Legacy `crm_token` is migrated on mount then removed (`AuthContext.jsx:67-75`).

### 3.3 Which files read it
- `AuthContext.setRestaurantScope()` reads `crm_token_<restaurantId>` and validates with `crmGetProfile()` (`AuthContext.jsx:85-128`).
- `DeliveryAddress.jsx` consumes `useAuth().crmToken` (`DeliveryAddress.jsx:49,117-123`).
- `Profile.jsx` consumes `useAuth().token` while in customer mode (`Profile.jsx:13,56,69,87`).
- `crmService.js` derives restaurant ID from token for `x-api-key` resolution (`crmService.js:37-49,92-107,167-176`).

### 3.4 Which APIs depend on it
- `GET /customer/me` or `/scan/auth/me`
- `GET /customer/me/orders`
- `GET /customer/me/points`
- `GET /customer/me/wallet`
- CRM address CRUD/default endpoints

### 3.5 How it is passed
- `Authorization: Bearer <crm token>` header via `crmAuthFetch()` (`crmService.js:167-175`).
- Also indirectly used to derive `x-api-key` by restaurant.

### 3.6 Session scoping behavior
- Token is restaurant-scoped in storage, not global.
- `setRestaurantScope(restaurantId)` clears customer session if no valid token exists for the current restaurant (`AuthContext.jsx:118-127`).
- This design allows separate customer sessions per restaurant.

### 3.7 Mismatch/failure risk
- `AuthContext` stores CRM token into generic `token` state too (`AuthContext.jsx:189`).
- `Profile.jsx` uses `token` generically, so correctness depends on customer mode being active.
- CRM token parsing expects JWT `user_id` claim with format `pos_{posId}_restaurant_{restaurantId}` (`crmService.js:30-49`, `AuthContext.jsx:11-23`). If CRM contract changes, restaurant scoping breaks.
- Orders/points/wallet methods remain v1 endpoints even when v2 flag is on.

---

## 4. POS admin token (`pos_token`) flow

### 4.1 Where it comes from
- Backend `POST /api/auth/login` for restaurant admins calls `refresh_pos_token(email, password)` (`backend/server.py:550-563`).
- That helper calls `POST {MYGENIE_API_URL}/auth/vendoremployee/login` and returns `token` from POS response (`backend/server.py:347-389`).

### 4.2 Where it is stored
- `localStorage['pos_token']` in `Login.jsx` (`frontend/src/pages/Login.jsx:60-62`).

### 4.3 Which files read it
- `AdminQRPage.jsx` reads `localStorage.getItem('pos_token')` and forwards it as `X-POS-Token` (`frontend/src/pages/admin/AdminQRPage.jsx:105-112`).
- No other active runtime reader found in inspected code.

### 4.4 Which APIs depend on it
- `GET ${REACT_APP_BACKEND_URL}/api/table-config` requires this header for backend→POS call.

### 4.5 How it is passed
- Custom header: `X-POS-Token: <pos_token>`.

### 4.6 Mismatch/failure risk
- Token is not persisted/refreshed by backend after login; QR flow depends on localStorage continuity.
- If missing or expired, QR page fails with session-expired UX (`AdminQRPage.jsx:200-231`).
- Backend has legacy fallback `user.get('mygenie_token')` but current login response does not store that in DB (`backend/server.py:818-821`).

---

## 5. Order auth helper token flow (`utils/authToken.js`)

### 5.1 Where it comes from
- `loginForToken()` calls `apiClient.post('/auth/login', { phone: REACT_APP_LOGIN_PHONE, password: REACT_APP_LOGIN_PASSWORD })` (`frontend/src/utils/authToken.js:93-100`).
- Since `apiClient` base is `REACT_APP_API_BASE_URL`, final URL is `${REACT_APP_API_BASE_URL}/auth/login` (`frontend/src/api/config/axios.js:17-18`).

### 5.2 Where it is stored
- `localStorage['order_auth_token']`
- `localStorage['order_token_expiry']` (`frontend/src/utils/authToken.js:7-8,68-78`)

### 5.3 Which files read it
- Request interceptor reads `getStoredToken()` and injects Authorization for axios requests (`frontend/src/api/interceptors/request.js:6-33`).
- `ReviewOrder.jsx` calls `getAuthToken()` explicitly on mount and before order actions (`ReviewOrder.jsx:605-623,747-765`).
- `LandingPage.jsx` calls `getAuthToken()` before table-status check (`LandingPage.jsx:187-191`).
- `OrderSuccess.jsx` uses `getStoredToken()` directly for table-status polling (`OrderSuccess.jsx:11,228-232`).

### 5.4 Which APIs depend on it
- POS `GET /customer/check-table-status`
- POS `POST /customer/order/place`
- POS `POST /customer/order/autopaid-place-prepaid-order`
- POS `POST /customer/order/update-customer-order`
- Possibly all axios requests through interceptor if endpoint requires Authorization

### 5.5 How it is passed
- `Authorization: Bearer <order_auth_token>` header.
- Some order calls also manually pass the token from ReviewOrder state into request headers (`orderService.ts:269,351,451`).

### 5.6 Confirmed contract mismatch with current FastAPI login
| Aspect | `utils/authToken.js` expects | Current FastAPI backend does |
|---|---|---|
| Base URL | `REACT_APP_API_BASE_URL` | backend auth is on `REACT_APP_BACKEND_URL` |
| Path | `/auth/login` | `/api/auth/login` |
| Body | `{ phone, password }` | `{ phone_or_email, password }` |
| Response fields used | `token, is_phone_verified, user_id` | `token, user_type, user, pos_token, restaurant_context` |

### 5.7 Failure risk
- If `REACT_APP_API_BASE_URL` does not expose a compatible old `/auth/login`, order auth bootstrap fails.
- Response interceptor tries `/auth/refresh` on 401 (`frontend/src/api/interceptors/response.js:47-67`), but no such backend route exists in this repo and active order flow generally uses `getAuthToken(true)` instead.
- Comment says “30 minutes” but constant is `10 * 60 * 1000` and logs also say 10 minutes (`frontend/src/utils/authToken.js:10-11,69,76`). Documentation mismatch exists inside code.

---

## 6. Cross-token interactions and collision risks

### 6.1 Shared `token` state in AuthContext
- `AuthContext.token` is used for both:
  - admin backend JWT (`setAuth`) (`AuthContext.jsx:176-182`)
  - CRM token (`setCrmAuth`) (`185-195`)
- `userType` is the discriminator.
- Risk: generic consumers must know whether current session is `restaurant` or `customer`.

### 6.2 Tokens in browser storage
| Storage key | Meaning | Owner |
|---|---|---|
| `auth_token` | backend admin JWT | admin auth |
| `crm_token_<restaurantId>` | restaurant-scoped CRM token | customer auth |
| `pos_token` | POS admin token for QR proxy | admin auth |
| `order_auth_token` | order/table-status POS auth token | POS helper |
| `order_token_expiry` | helper expiry | POS helper |
| `restaurant_context` | backend login restaurant_context object | backend auth helper |

### 6.3 Most important mismatch risks
1. `utils/authToken.js` is not aligned with FastAPI `/api/auth/login`.
2. `response.js` refresh logic points to `/auth/refresh`, which is not implemented in current backend.
3. `Profile.jsx` uses generic `token` state and assumes it is CRM token when `isCustomer` is true.
4. `pos_token` is not auto-refreshed except by re-login.
5. JWT payload field mismatch (`sub` missing) affects dietary update audit metadata.

---

## 7. Final validation answers

### Is `utils/authToken.js` still aligned with current `/api/auth/login` contract?
- **No. Confirmed not aligned.**
- It appears to target a different/older external auth contract on `REACT_APP_API_BASE_URL`.

### Which token system is highest risk for runtime failures?
- **Highest risk:** order auth helper token flow.
- Reason: it gates table-status/order APIs, uses separate credentials/envs, relies on different path/body/response assumptions than current FastAPI backend, and has a nonexistent refresh route in interceptor logic.
