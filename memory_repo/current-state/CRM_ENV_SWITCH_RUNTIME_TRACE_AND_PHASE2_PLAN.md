# CRM_ENV_SWITCH_RUNTIME_TRACE_AND_PHASE2_PLAN

## 1. Executive summary
- Fresh code was pulled from `https://github.com/Abhi-mygenie/customer-app5th-march.git` on branch `abhi-2-may` and audited at commit `34b36762512a868fc7b2d14791b3f163ec22c04a`.
- CRM v2 is **the intended active contract**, but the current frontend code is **not a clean v2-only runtime**. Under `REACT_APP_CRM_API_VERSION=v2`, several CRM flows still remain on v1 endpoints by code.
- The CRM version switch is centralized in `frontend/src/api/services/crmService.js`, read **once at module load**, with default fallback to `v1` if the env is missing/invalid.
- Under `env=v2`, auth/profile-address core entry flows mostly move to v2, but forgot/reset and orders/points/wallet remain v1-path debt.
- Under `env=v1`, the service stays consistently on v1 except for `crmSkipOtp()`, which is coded as v2-only and is therefore an accidental incompatibility risk if reached in a v1 deployment.
- `/api/restaurant-info/{id}` is still referenced by active admin bootstrap code and is **not implemented** in current backend code. It should not be treated as intentional stale behavior.
- `utils/authToken.js` remains a **high-risk active dependency** for customer table/order flows and is still mismatched with current FastAPI `/api/auth/login`.
- Customer-visible custom pages are user-confirmed live, but this repo still does **not prove** the actual customer render route. Static code only proves admin CRUD + config storage + nav metadata, not final runtime rendering.

## 2. Setup confirmation
- Repo URL used: `https://github.com/Abhi-mygenie/customer-app5th-march.git`
- Branch used: `abhi-2-may`
- Commit reviewed: `34b36762512a868fc7b2d14791b3f163ec22c04a`
- Frontend env keys received:
  - `REACT_APP_BACKEND_URL=`
  - `WDS_SOCKET_PORT=443`
  - `ENABLE_HEALTH_CHECK=false`
  - `REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online`
  - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1`
  - `REACT_APP_LOGIN_PHONE=+919579504871`
  - `REACT_APP_LOGIN_PASSWORD=Qplazm@10`
  - `REACT_APP_CRM_URL=https://crm.mygenie.online/api`
  - `REACT_APP_GOOGLE_MAPS_API_KEY=[provided]`
  - `REACT_APP_CRM_API_VERSION=v2`
- Backend env keys received:
  - `MONGO_URL=mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie`
  - `DB_NAME=mygenie`
  - `CORS_ORIGINS=*`
  - `JWT_SECRET=[provided]`
  - `MYGENIE_API_URL=https://preprod.mygenie.online/api/v1`
- CRM env mode tested/traced:
  - Primary intended mode: `v2`
  - Comparative switch trace also completed for: `v1`
- What could not be runtime-validated:
  - No safe repo-visible proof of the actual customer-facing custom page render route/path.
  - No runtime proof from this repo alone that deployed CRM backend supports all mixed v1/v2 calls currently emitted under `v2` mode.
  - No repo proof that `REACT_APP_API_BASE_URL` in deployment is routed differently from the provided env.
  - No repo proof of a backend replacement for `/api/restaurant-info/{id}`.

## 3. Files reviewed
- Audit baselines:
  - `/app/memory/current-state/RUNTIME_API_FLOW_AUDIT.md`
  - `/app/memory/current-state/API_DEPENDENCY_TRACE.md`
  - `/app/memory/current-state/AUTH_TOKEN_FLOW_AUDIT.md`
  - `/app/memory/current-state/STALE_OR_MISSING_ROUTE_REPORT.md`
  - `/app/memory/current-state/NEXT_IMPLEMENTATION_RISK_REGISTER.md`
  - `/app/memory/current-state/USER_CONFIRMED_RUNTIME_CONTEXT_ADDENDUM.md`
- Frontend CRM/auth/order/runtime files:
  - `frontend/src/api/services/crmService.js`
  - `frontend/src/context/AuthContext.jsx`
  - `frontend/src/pages/PasswordSetup.jsx`
  - `frontend/src/pages/Profile.jsx`
  - `frontend/src/pages/DeliveryAddress.jsx`
  - `frontend/src/pages/LandingPage.jsx`
  - `frontend/src/pages/ReviewOrder.jsx`
  - `frontend/src/pages/OrderSuccess.jsx`
  - `frontend/src/utils/authToken.js`
  - `frontend/src/api/interceptors/request.js`
  - `frontend/src/api/interceptors/response.js`
  - `frontend/src/api/services/orderService.ts`
  - `frontend/src/api/config/endpoints.js`
  - `frontend/src/api/config/axios.js`
  - `frontend/src/api/services/restaurantService.js`
  - `frontend/src/api/services/stationService.js`
  - `frontend/src/api/utils/restaurantIdConfig.js`
  - `frontend/src/utils/useRestaurantId.js`
  - `frontend/src/utils/orderTypeHelpers.js`
  - `frontend/src/App.js`
  - `frontend/src/context/AdminConfigContext.jsx`
  - `frontend/src/context/RestaurantConfigContext.jsx`
  - `frontend/src/components/AdminSettings/ContentTab.jsx`
  - `frontend/src/components/HamburgerMenu/HamburgerMenu.jsx`
  - `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx`
  - `frontend/src/pages/AdminSettings.jsx`
- Backend/config files:
  - `backend/server.py`
  - `backend/db_data/README.md`

## 4. CRM version switch source
### Env key
- `REACT_APP_CRM_API_VERSION`

### Default behavior
- In `frontend/src/api/services/crmService.js:63-69`, the value is read as:
  - `(process.env.REACT_APP_CRM_API_VERSION || 'v1').trim().toLowerCase()`
- If missing: defaults to `v1`
- If invalid: warning is logged, but behavior still effectively falls back to v1 because `isV2()` only returns true when the value equals `'v2'`.

### Files reading it
- Proven direct reader:
  - `frontend/src/api/services/crmService.js`
- No other direct reader of `REACT_APP_CRM_API_VERSION` was found in target runtime files.

### Read timing
- Read **once at module load/startup**, not dynamically per request.
- Because this is CRA-style env access via `process.env`, flipping the value requires a frontend rebuild/restart to affect runtime.

### Inconsistencies / blockers
- The switch itself is centralized, but implementation behind it is inconsistent:
  - `crmRegister`, `crmLogin`, `crmSendOtp`, `crmVerifyOtp`, `crmGetProfile`, address CRUD/default are version-switched.
  - `crmForgotPassword` and `crmResetPassword` are forced to v1 even in v2 mode.
  - `crmGetOrders`, `crmGetPoints`, `crmGetWallet` do not switch and remain v1-path always.
  - `crmSkipOtp` is always v2-only and does not guard against `env=v1`.
- Therefore the env switch is **present but not complete**.

## 5. CRM ENV-SWITCH ACTIVE/INACTIVE TRACE

### TABLE 1 — ENV = v2

| File | Function / Component | Endpoint / Logic | Active in v2? | Inactive in v2? | Fallback? | Risk | Evidence from code | Recommended action |
|---|---|---|---|---|---|---|---|---|
| `frontend/src/api/services/crmService.js` | module constant | `REACT_APP_CRM_API_VERSION === 'v2'` gate | Yes | No | No | Medium | `63-69` | Keep as single switch source; document startup-only behavior |
| `frontend/src/api/services/crmService.js` | `crmRegister` | `POST /scan/auth/register` | Yes | v1 path inactive | No | Medium | `191-211` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmRegister` | `POST /customer/register` | No | Yes | No | Low | v1 branch only when `!isV2()` at `213-221` | Migration debt; removable only after proving no v1 deployment needed |
| `frontend/src/api/services/crmService.js` | `crmLogin` | `POST /scan/auth/login` | Yes | v1 path inactive | No | Medium | `232-249` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmLogin` | `POST /customer/login` | No | Yes | No | Low | `251-255` | Migration debt |
| `frontend/src/api/services/crmService.js` | `crmSendOtp` | `POST /scan/auth/request-otp` | Yes | v1 path inactive | No | Medium | `282-302` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmSendOtp` | `POST /customer/send-otp` | No | Yes | No | Low | `304-308` | Migration debt |
| `frontend/src/api/services/crmService.js` | `crmVerifyOtp` | `POST /scan/auth/verify-otp` | Yes | v1 path inactive | No | Medium | `319-341` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmVerifyOtp` | `POST /customer/verify-otp` | No | Yes | No | Low | `343-347` | Migration debt |
| `frontend/src/api/services/crmService.js` | `crmSkipOtp` | `POST /scan/auth/skip-otp` | Yes | No | No | Medium | `360-376` | Keep, but mark as v2-only contract |
| `frontend/src/api/services/crmService.js` | `crmForgotPassword` | `POST /customer/forgot-password` | Yes | No | Yes | High | `386-394` with explicit warning about v2 missing contract | Treat as v1 fallback debt / possibly broken under v2 intent |
| `frontend/src/api/services/crmService.js` | `crmResetPassword` | `POST /customer/reset-password` | Yes | No | Yes | High | `404-412` with explicit warning | Treat as v1 fallback debt / possibly broken under v2 intent |
| `frontend/src/api/services/crmService.js` | `crmGetProfile` | `GET /scan/auth/me` | Yes | v1 profile path inactive | No | Medium | `425-430` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmGetOrders` | `GET /customer/me/orders` | Yes | No | Implicit | High | `436-438` no version gate | Broken under clean-v2 intent unless CRM guarantees v1 compatibility |
| `frontend/src/api/services/crmService.js` | `crmGetPoints` | `GET /customer/me/points` | Yes | No | Implicit | High | `444-446` no version gate | Broken under clean-v2 intent unless CRM guarantees v1 compatibility |
| `frontend/src/api/services/crmService.js` | `crmGetWallet` | `GET /customer/me/wallet` | Yes | No | Implicit | High | `452-454` no version gate | Broken under clean-v2 intent unless CRM guarantees v1 compatibility |
| `frontend/src/api/services/crmService.js` | `crmGetAddresses` | `GET /scan/addresses` | Yes | v1 address path inactive | No | Medium | `467-476` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmAddAddress` | `POST /scan/addresses` | Yes | v1 path inactive | No | Medium | `486-507` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmUpdateAddress` | `PUT /scan/addresses/{id}` | Yes | v1 path inactive | No | Medium | `516-532` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmDeleteAddress` | `DELETE /scan/addresses/{id}` | Yes | v1 path inactive | No | Medium | `541-555` | Keep active v2 path |
| `frontend/src/api/services/crmService.js` | `crmSetDefaultAddress` | `PUT /scan/addresses/{id}/default` | Yes | v1 path inactive | No | Medium | `565-580` | Keep active v2 path |
| `frontend/src/context/AuthContext.jsx` | `setRestaurantScope` | `crmGetProfile(storedToken)` → v2 `/scan/auth/me` | Yes | No | No | Medium | imports `crmGetProfile` and calls it at `85-128` | Keep, but document that customer session validation switches with crmService |
| `frontend/src/pages/PasswordSetup.jsx` | `handleSetPassword` | `crmRegister` → v2 path | Yes | No | No | Medium | `186-214` | Keep |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLogin` | `crmLogin` → v2 path | Yes | No | No | Medium | `216-241` | Keep |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLoginSendOtp` | `crmSendOtp` → v2 path | Yes | No | No | Medium | `121-145` | Keep |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLoginVerifyOtp` | `crmVerifyOtp` → v2 path | Yes | No | No | Medium | `148-174` | Keep |
| `frontend/src/pages/PasswordSetup.jsx` | `handleSkip` | `crmSkipOtp` → v2 path | Yes | No | No | Medium | `65-82` | Keep |
| `frontend/src/pages/PasswordSetup.jsx` | forgot-password UI route | button in password-login state only shows toast “coming soon” | No proven runtime path | Yes in current visible login UI | N/A | Medium | `685-693` | Do not assume CRM fallback is reachable from current visible password-login branch |
| `frontend/src/pages/PasswordSetup.jsx` | `forgotMode` flow | `crmForgotPassword` / `crmResetPassword` | Unclear / conditionally reachable | Unclear | Yes | High | handlers exist `243-292`, but visible trigger replaced by toast-only button `685-693` | Keep untouched until UX path is confirmed |
| `frontend/src/pages/Profile.jsx` | `fetchOrders` | `crmGetOrders` → v1 orders path still active | Yes | No | Implicit | High | `53-64` + crmService `436-438` | Mark as stale migration debt / broken under v2 intent |
| `frontend/src/pages/Profile.jsx` | `fetchPoints` | `crmGetPoints` → v1 points path still active | Yes | No | Implicit | High | `66-82` + crmService `444-446` | Same |
| `frontend/src/pages/Profile.jsx` | `fetchWallet` | `crmGetWallet` → v1 wallet path still active | Yes | No | Implicit | High | `84-103` + crmService `452-454` | Same |
| `frontend/src/pages/DeliveryAddress.jsx` | page load / `fetchAddresses` | `crmGetAddresses` → v2 `/scan/addresses` | Yes | No | No | Medium | `116-151` | Keep |
| `frontend/src/pages/DeliveryAddress.jsx` | `handleAddAddress` | `crmAddAddress` → v2 `/scan/addresses` | Yes | No | No | Medium | `317-352` | Keep |
| `frontend/src/pages/DeliveryAddress.jsx` | `handleDelete` | `crmDeleteAddress` → v2 delete path | Yes | No | No | Medium | `354-371` | Keep |
| `frontend/src/pages/DeliveryAddress.jsx` | `handleSetDefault` | `crmSetDefaultAddress` → v2 default path | Yes | No | No | Medium | `373-380` | Keep |

### TABLE 2 — ENV = v1

| File | Function / Component | Endpoint / Logic | Active in v1? | Inactive in v1? | Fallback? | Risk | Evidence from code | Recommended action |
|---|---|---|---|---|---|---|---|---|
| `frontend/src/api/services/crmService.js` | module constant | `REACT_APP_CRM_API_VERSION='v1'` or default invalid/missing → v1 behavior | Yes | No | Default | Medium | `63-69` | Keep until migration removal is approved |
| `frontend/src/api/services/crmService.js` | `crmRegister` | `POST /customer/register` | Yes | v2 path inactive | No | Low | `213-221` | Legacy active under v1 |
| `frontend/src/api/services/crmService.js` | `crmLogin` | `POST /customer/login` | Yes | v2 path inactive | No | Low | `251-255` | Legacy active under v1 |
| `frontend/src/api/services/crmService.js` | `crmSendOtp` | `POST /customer/send-otp` | Yes | v2 path inactive | No | Low | `304-308` | Legacy active under v1 |
| `frontend/src/api/services/crmService.js` | `crmVerifyOtp` | `POST /customer/verify-otp` | Yes | v2 path inactive | No | Low | `343-347` | Legacy active under v1 |
| `frontend/src/api/services/crmService.js` | `crmSkipOtp` | `POST /scan/auth/skip-otp` | Yes if invoked | No | No | High | function has no `isV2()` guard at `360-376` | Accidental v2-only call still reachable in v1 mode; blocker before v1 cleanup claims |
| `frontend/src/api/services/crmService.js` | `crmForgotPassword` | `POST /customer/forgot-password` | Yes | No | No | Medium | `386-394` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmResetPassword` | `POST /customer/reset-password` | Yes | No | No | Medium | `404-412` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmGetProfile` | `GET /customer/me` | Yes | v2 profile path inactive | No | Medium | `425-430` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmGetOrders` | `GET /customer/me/orders` | Yes | No | No | Medium | `436-438` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmGetPoints` | `GET /customer/me/points` | Yes | No | No | Medium | `444-446` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmGetWallet` | `GET /customer/me/wallet` | Yes | No | No | Medium | `452-454` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmGetAddresses` | `GET /customer/me/addresses` | Yes | v2 address path inactive | No | Medium | `467-476` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmAddAddress` | `POST /customer/me/addresses` | Yes | v2 path inactive | No | Medium | `486-507` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmUpdateAddress` | `PUT /customer/me/addresses/{id}` | Yes | v2 path inactive | No | Medium | `516-532` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmDeleteAddress` | `DELETE /customer/me/addresses/{id}` | Yes | v2 path inactive | No | Medium | `541-555` | Legacy active |
| `frontend/src/api/services/crmService.js` | `crmSetDefaultAddress` | `POST /customer/me/addresses/{id}/set-default` | Yes | v2 path inactive | No | Medium | `565-580` | Legacy active |
| `frontend/src/context/AuthContext.jsx` | `setRestaurantScope` | `crmGetProfile(storedToken)` → v1 `/customer/me` | Yes | No | No | Medium | `85-128` + crmService `425-430` | Legacy active |
| `frontend/src/pages/PasswordSetup.jsx` | `handleSetPassword` | `crmRegister` → v1 | Yes | No | No | Medium | `186-214` | Legacy active |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLogin` | `crmLogin` → v1 | Yes | No | No | Medium | `216-241` | Legacy active |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLoginSendOtp` | `crmSendOtp` → v1 | Yes | No | No | Medium | `121-145` | Legacy active |
| `frontend/src/pages/PasswordSetup.jsx` | `handleLoginVerifyOtp` | `crmVerifyOtp` → v1 | Yes | No | No | Medium | `148-174` | Legacy active |
| `frontend/src/pages/PasswordSetup.jsx` | `handleSkip` | `crmSkipOtp` → still v2 path | Yes if clicked | No | No | High | `65-82` + crmService `360-376` | Accidental still-active-in-v1 bug risk |
| `frontend/src/pages/Profile.jsx` | orders/points/wallet tabs | v1 endpoints | Yes | No | No | Medium | `53-103` | Legacy active |
| `frontend/src/pages/DeliveryAddress.jsx` | addresses CRUD/default | v1 address endpoints | Yes | No | No | Medium | `128-380` + crmService address functions | Legacy active |

## 6. CRM endpoint matrix

| File | Function/component | Endpoint | v1/v2 status | Classification | Evidence | Recommended action |
|---|---|---|---|---|---|---|
| `crmService.js` | `crmRegister` | `/customer/register` | v1 active, v2 inactive | stale migration debt | `213-221` | Keep until v1 sunset is approved |
| `crmService.js` | `crmRegister` | `/scan/auth/register` | v2 active, v1 inactive | active in v2 | `191-211` | Keep |
| `crmService.js` | `crmLogin` | `/customer/login` | v1 active, v2 inactive | stale migration debt | `251-255` | Keep until v1 sunset |
| `crmService.js` | `crmLogin` | `/scan/auth/login` | v2 active, v1 inactive | active in v2 | `232-249` | Keep |
| `crmService.js` | `crmSendOtp` | `/customer/send-otp` | v1 active, v2 inactive | stale migration debt | `304-308` | Keep until v1 sunset |
| `crmService.js` | `crmSendOtp` | `/scan/auth/request-otp` | v2 active, v1 inactive | active in v2 | `282-302` | Keep |
| `crmService.js` | `crmVerifyOtp` | `/customer/verify-otp` | v1 active, v2 inactive | stale migration debt | `343-347` | Keep until v1 sunset |
| `crmService.js` | `crmVerifyOtp` | `/scan/auth/verify-otp` | v2 active, v1 inactive | active in v2 | `319-341` | Keep |
| `crmService.js` | `crmSkipOtp` | `/scan/auth/skip-otp` | active in both env settings by code | accidentally still active in v1 / active in v2 | `360-376` | Add explicit env guard before any cleanup |
| `crmService.js` | `crmForgotPassword` | `/customer/forgot-password` | active in both env settings | fallback only in v2; active in v1 | `386-394` | Needs product/backend confirmation before deletion/replacement |
| `crmService.js` | `crmResetPassword` | `/customer/reset-password` | active in both env settings | fallback only in v2; active in v1 | `404-412` | Same |
| `crmService.js` | `crmGetProfile` | `/customer/me` | v1 active, v2 inactive | stale migration debt | `425-430` | Keep until v1 sunset |
| `crmService.js` | `crmGetProfile` | `/scan/auth/me` | v2 active, v1 inactive | active in v2 | `425-430` | Keep |
| `crmService.js` | `crmGetOrders` | `/customer/me/orders` | active in both env settings | broken under v2 intent / active in v1 | `436-438` | Needs CRM v2 equivalent or explicit compatibility confirmation |
| `crmService.js` | `crmGetPoints` | `/customer/me/points` | active in both env settings | broken under v2 intent / active in v1 | `444-446` | Same |
| `crmService.js` | `crmGetWallet` | `/customer/me/wallet` | active in both env settings | broken under v2 intent / active in v1 | `452-454` | Same |
| `crmService.js` | `crmGetAddresses` | `/customer/me/addresses` | v1 active, v2 inactive | stale migration debt | `467-476` | Keep until v1 sunset |
| `crmService.js` | `crmGetAddresses` | `/scan/addresses` | v2 active, v1 inactive | active in v2 | `467-476` | Keep |
| `crmService.js` | `crmAddAddress` | `/customer/me/addresses` | v1 active, v2 inactive | stale migration debt | `486-507` | Keep |
| `crmService.js` | `crmAddAddress` | `/scan/addresses` | v2 active, v1 inactive | active in v2 | `486-507` | Keep |
| `crmService.js` | `crmUpdateAddress` | `/customer/me/addresses/{id}` | v1 active, v2 inactive | stale migration debt | `516-532` | Keep |
| `crmService.js` | `crmUpdateAddress` | `/scan/addresses/{id}` | v2 active, v1 inactive | active in v2 | `516-532` | Keep |
| `crmService.js` | `crmDeleteAddress` | `/customer/me/addresses/{id}` | v1 active, v2 inactive | stale migration debt | `541-555` | Keep |
| `crmService.js` | `crmDeleteAddress` | `/scan/addresses/{id}` | v2 active, v1 inactive | active in v2 | `541-555` | Keep |
| `crmService.js` | `crmSetDefaultAddress` | `/customer/me/addresses/{id}/set-default` | v1 active, v2 inactive | stale migration debt | `565-580` | Keep |
| `crmService.js` | `crmSetDefaultAddress` | `/scan/addresses/{id}/default` | v2 active, v1 inactive | active in v2 | `565-580` | Keep |

## 7. Custom page runtime trace

### Fetch path
- Public/customer config fetch path is proven:
  - `RestaurantConfigContext.fetchConfig(restaurantId)` → `GET ${REACT_APP_BACKEND_URL}/api/config/{restaurantId}`
  - `frontend/src/context/RestaurantConfigContext.jsx:152-174`
- Backend public config route returns `customPages` and `navMenuOrder`:
  - `backend/server.py:967-1089`

### State path
- `customPages` are stored in backend under `customer_app_config.customPages` via admin CRUD:
  - `POST /api/config/pages` → `server.py:1233-1253`
  - `PUT /api/config/pages/{id}` → `1254-1270`
  - `DELETE /api/config/pages/{id}` → `1272-1284`
- Frontend admin updates `config.customPages` and `config.navMenuOrder` in `ContentTab.jsx:142-199`.
- Customer-facing config context exposes:
  - `customPages: config.customPages || []`
  - `navMenuOrder: config.navMenuOrder || []`
  - `RestaurantConfigContext.jsx:382-383`

### Render path
- Static proof of final customer page body render is **not found**.
- What is proven:
  - `HamburgerMenu.jsx` renders navigation entries from `navMenuOrder`.
  - For unknown nav IDs, it builds a path fallback: `${menuBasePath}/page/${item.id}` at `HamburgerMenu.jsx:183-185`.
- Problems with that path:
  - It uses `item.id`, not page `slug`.
  - `App.js` has **no** `/:restaurantId/page/:...` route.
  - No customer component was found that reads `customPages` and renders HTML content.

### Route path
- **Repo-proven route path: not proven**.
- `App.js` only defines fixed built-in customer routes:
  - `/:restaurantId`, `/menu`, `/about`, `/contact`, `/feedback`, `/password-setup`, `/delivery-address`, `/review-order`, `/order-success`
- No dynamic custom page route exists in `frontend/src/App.js:63-122`.

### Proof level
- Fetch path: **High confidence**
- State persistence path: **High confidence**
- Render path: **Low / unproven**
- Customer route path: **Unproven**

### Gaps
- No customer route in router for custom page slug.
- No customer renderer component located for `customPages[].content`.
- Hamburger fallback path appears inconsistent with admin page model (`slug`) and likely not sufficient proof of runtime rendering.

### Specific next validation step
- Validate deployed runtime by identifying the exact customer URL a restaurant user uses to open one custom page and trace whether that page is:
  1. rendered by a route outside current `App.js`,
  2. injected inside another page, or
  3. coming from deployed code not present in this branch.

## 8. `/api/restaurant-info/{id}` dependency resolution

### Who calls it
- `frontend/src/context/AdminConfigContext.jsx:145-148`
  - `fetch(`${API_URL}/api/restaurant-info/${configId}`).catch(() => null)`

### Why it is needed
- It is used to populate `restaurantFlags`:
  - `is_loyalty`
  - `is_coupon`
  - `multiple_menu`
- Evidence: `AdminConfigContext.jsx:159-166`

### Whether backend route exists
- Not found in `backend/server.py`
- No backend implementation was found in current repo.

### Should frontend instead consume POS restaurant-info API?
- There is strong code evidence that legacy `frontend/src/pages/AdminSettings.jsx` already does exactly that:
  - `getRestaurantDetails(configId)` via POS `POST /web/restaurant-info` at `AdminSettings.jsx:223-238`
- Therefore the likely direction is either:
  1. add backend `/api/restaurant-info/{id}` to normalize flags, or
  2. align `AdminConfigContext` to use the already-proven POS `getRestaurantDetails()` pattern.

### Whether backend route must be added
- Not automatically.
- From current code, two plausible safe directions exist:
  - **Direction A:** add backend route if admin pages must stay backend-only.
  - **Direction B:** stop calling missing backend route and reuse proven POS `restaurant-info` path.
- This requires confirmation because active admin code currently references the backend route, while legacy admin code already uses POS directly.

### Risk of changing this route
- High.
- It affects admin bootstrap flags controlling loyalty/coupon/multi-menu UI behavior.
- Because user explicitly said it should not be assumed stale, it should be treated as an **active dependency gap**, not dead code.

### Current classification
- `MISSING_BACKEND_ROUTE_OR_CONSOLIDATION_GAP`

## 9. `utils/authToken.js` risk analysis

### Where it is imported
- `frontend/src/pages/LandingPage.jsx:13`
- `frontend/src/pages/ReviewOrder.jsx:11`
- `frontend/src/pages/OrderSuccess.jsx:11`
- `frontend/src/api/interceptors/request.js:6`
- `frontend/src/api/interceptors/response.js:7`

### What token it expects
- It expects a token from `POST ${REACT_APP_API_BASE_URL}/auth/login` with body:
  - `{ phone, password }`
- It expects response fields including:
  - `token`
  - `is_phone_verified`
  - `user_id`
- Evidence: `frontend/src/utils/authToken.js:93-123`

### Comparison with current `/api/auth/login` response
- Current FastAPI route is `POST ${REACT_APP_BACKEND_URL}/api/auth/login`
- Request body expected by backend:
  - `phone_or_email`
  - `password` or `otp`
  - optional `restaurant_id`, `pos_id`
- Response model:
  - `success`, `user_type`, `token`, `pos_token`, `user`, `restaurant_context`
- Evidence: `backend/server.py:60-73,460-575`

### Mismatch summary
- Wrong base URL
- Wrong path
- Wrong request field name
- Wrong expected response shape

### Does it impact customer order flow?
- Yes, directly.
- It is active in:
  - landing page table-status check before redirect/edit handling
  - review order token bootstrap before place/update/check-table-status
  - order success table-status polling
  - axios interceptor Authorization injection for POS-style calls
- This makes it one of the highest-risk active dependencies in customer runtime.

### Could changing it break active order/session behavior?
- Yes. High risk.
- Because this helper underpins direct POS table/order flows, changing it without first proving the real deployed auth contract can break:
  - occupied-table detection
  - order placement
  - edit-order flow
  - order-success polling continuity

### Final risk rating
- **HIGH-RISK ACTIVE DEPENDENCY — unresolved**

## 10. Restaurant 716 hardcoding inventory

| File | Logic | Evidence | Current classification |
|---|---|---|---|
| `frontend/src/api/services/orderService.ts` | multi-menu orders use autopaid endpoint only for restaurant `716` | `254-277` | temporary active business logic |
| `frontend/src/pages/ReviewOrder.jsx` | auto-force room mode for 716 | `491-498`, `504-512` | temporary active business logic |
| `frontend/src/pages/ReviewOrder.jsx` | room selection mandatory for every new 716 order | `701-723`, `852-857`, `1096-1101` | temporary active business logic |
| `frontend/src/pages/ReviewOrder.jsx` | skip table status duplicate-order check for 716 | `950-967` | temporary active business logic |
| `frontend/src/pages/ReviewOrder.jsx` | reset room selection after success/retry for 716 | `802-806`, `1049-1053`, `1175-1179` | temporary active business logic |
| `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx` | always show manual room selector for 716, hide room/table radio, room-only UI | `59-61`, `107-145` | temporary active business logic |
| tests | various 716 assertions | grep hits in tests | confirms intended current branch behavior, not removal safety |

## 11. Call Waiter / Pay Bill unfinished integration status

### Landing page
- `handleCallWaiter()` only logs TODO:
  - `frontend/src/pages/LandingPage.jsx:387-390`
- `handlePayBill()` only logs TODO:
  - `391-395`
- Buttons are conditionally customer-visible via config and dine-in context:
  - `501-503`, `743-767`

### Order success page
- `handleCallWaiter()` only logs TODO:
  - `frontend/src/pages/OrderSuccess.jsx:462-465`
- `handlePayBill()` only logs TODO:
  - `467-470`
- Buttons are conditionally customer-visible via config and dine-in context:
  - `474-477`, `761-783`

### Status
- Confirmed unfinished integrations.
- UI-visible, runtime-incomplete.
- Should not be deleted blindly because they are part of active visibility/config behavior.

## 12. Safe phase-2 implementation buckets

### Bucket A — CRM v2 reconciliation before deletion
Scope:
- Build authoritative CRM feature matrix per supported backend contract.
- Resolve v2 gaps for orders/points/wallet and forgot/reset.
- Add explicit guard/behavior for `crmSkipOtp` under v1.
Why first:
- Current env-switch is incomplete; deleting v1 now would be unsafe.
Output target:
- “safe removable” list only after endpoint-by-endpoint confirmation.

### Bucket B — `/api/restaurant-info/{id}` final direction
Scope:
- Decide canonical source for `is_loyalty`, `is_coupon`, `multiple_menu` in admin bootstrap.
- Either implement backend route or switch active admin context to proven POS `getRestaurantDetails` path.
Why early:
- Active admin runtime already depends on this missing/displaced behavior.

### Bucket C — `utils/authToken.js` contract decision
Scope:
- Prove the real auth endpoint behind `REACT_APP_API_BASE_URL/auth/login`.
- Decide whether order flow keeps external POS auth helper or migrates to another canonical contract.
Why critical:
- High-risk active dependency across order flows.
What must not happen yet:
- Do not rewrite it just to match FastAPI without proving deployed order-auth ownership.

### Bucket D — restaurant 716 de-hardcoding/refactor
Scope:
- Convert 716 special cases into restaurant capability/config flags.
- Consolidate room-only / autopaid / duplicate-order exception logic.
Why later:
- Current logic is active and user-confirmed temporary, but safe refactor requires clear capability model first.

### Bucket E — Call Waiter / Pay Bill implementation/hide policy
Scope:
- Decide per restaurant/config whether these should be hidden until real API exists, or fully implemented.
Why later:
- User-confirmed unfinished integrations, but not core blocker for CRM cleanup.

### Bucket F — custom page runtime documentation / proof
Scope:
- Prove final customer route/component/render chain.
- If missing in code, decide canonical route model using slug-based paths.
Why important:
- User confirms feature is live, but repo trace is incomplete.

### Bucket G — documentation/data hygiene
Scope:
- Add `dietary_tags_mapping` to `backend/db_data/README.md`
- Document CRM mixed-mode state and 716 temporary branching
Why safe:
- Low-risk documentation cleanup after runtime decisions are confirmed.

## 13. Questions/blockers requiring user or backend confirmation
1. In deployed runtime, what is the exact public URL path of one known custom page for a restaurant?
2. For CRM v2 intent, does CRM actually provide supported v2 replacements for:
   - orders
   - points
   - wallet
   - forgot-password
   - reset-password
3. Is `/api/restaurant-info/{id}` supposed to be implemented in backend, or should active admin bootstrap use POS `POST /web/restaurant-info` instead?
4. What is the real auth owner for `REACT_APP_API_BASE_URL/auth/login` used by `utils/authToken.js`?
5. Should unfinished Call Waiter / Pay Bill remain visible when enabled by config, or be suppressed until integration is completed?

## 14. What must NOT be changed yet
- Do **not** delete CRM v1 code yet.
- Do **not** assume v2 mode means all v1 CRM calls are dead.
- Do **not** replace `utils/authToken.js` contract until the real deployed order-auth source is confirmed.
- Do **not** delete `stationService.js` solely on appearance; while it looks legacy, this audit is not an implementation/delete pass.
- Do **not** remove restaurant `716` branches before a capability-based replacement is designed.
- Do **not** mark custom pages stale; user-confirmed runtime says they are live even though repo route proof is missing.
- Do **not** treat `/api/restaurant-info/{id}` as intentionally stale.

## 15. Final recommendation

### Safe to implement now
- Prepare a non-destructive phase-2 spec for:
  - CRM endpoint reconciliation matrix
  - `/api/restaurant-info/{id}` direction decision
  - 716 capability-model replacement plan
  - custom page route/render proof task
  - documentation gap fixes

### Needs confirmation first
- Any removal of CRM v1 branches
- Any rewrite of `utils/authToken.js`
- Any decision to add vs replace `/api/restaurant-info/{id}`
- Any assumptions about custom page customer route/path

### Should remain untouched
- Active 716 runtime behavior until replacement flags/capabilities are defined
- Call Waiter / Pay Bill code paths unless product decides hide vs implement
- Mixed CRM flow code until endpoint support is confirmed per feature
