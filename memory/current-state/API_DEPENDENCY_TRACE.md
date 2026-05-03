# API_DEPENDENCY_TRACE

This document maps major runtime screens/modules to their API dependencies, final endpoints, storage dependencies, auth dependencies, and known runtime risks.

---

## 1. Customer-facing routes

### 1.1 `/:restaurantId` or `/` — LandingPage
- Route file: `frontend/src/pages/LandingPage.jsx`
- Helpers/hooks:
  - `useRestaurantId` → `frontend/src/utils/useRestaurantId.js`
  - `useRestaurantDetails`, `useStations` → `frontend/src/hooks/useMenuData.js`
  - `useRestaurantConfig` → `frontend/src/context/RestaurantConfigContext.jsx`
  - `useAuth.setRestaurantScope` → `frontend/src/context/AuthContext.jsx`
  - `useScannedTable` → `frontend/src/hooks/useScannedTable.js`
  - `checkTableStatus`, `getOrderDetails` → `frontend/src/api/services/orderService.ts`
  - `getAuthToken` → `frontend/src/utils/authToken.js`
- API dependency trace:
  1. `LandingPage` → `useRestaurantDetails` → `getRestaurantDetails(identifier)` → `POST ${REACT_APP_API_BASE_URL}/web/restaurant-info`
  2. `LandingPage` → `useStations(actualRestaurantId)` → `getMenuMaster(restaurantId)` → `POST ${REACT_APP_API_BASE_URL}/web/menu-master`
  3. `LandingPage` → `fetchConfig(restaurantId)` → `GET ${REACT_APP_BACKEND_URL}/api/config/{restaurantId}`
  4. `LandingPage` → `setRestaurantScope(restaurantId)` → `crmGetProfile(storedScopedToken)` → `GET {REACT_APP_CRM_URL}/customer/me` or `/scan/auth/me`
  5. customer capture lookup → `fetch` → `POST ${REACT_APP_BACKEND_URL}/api/auth/check-customer`
  6. table occupancy detection → `getAuthToken()` → `checkTableStatus()` → `GET ${REACT_APP_API_BASE_URL}/customer/check-table-status?table_id={id}&restaurant_id={id}`
  7. occupied order redirect/edit detection → `getOrderDetails(orderId)` → `GET ${REACT_APP_API_BASE_URL}/air-bnb/get-order-details/{orderId}`
- Request payloads:
  - `/web/restaurant-info`: `{ restaurant_web }`
  - `/api/auth/check-customer`: `{ phone, restaurant_id, pos_id:'0001' }`
- Response fields consumed:
  - restaurant: `id,name,phone,subdomain,multiple_menu,is_loyalty,is_coupon`
  - config: branding/visibility fields
  - customer lookup: `exists, customer.name, customer.has_password`
  - table status: `status.table_status, status.order_id`
  - order details: `f_order_status`, `billSummary`, `previousItems`
- Token/auth dependency:
  - CRM scoped token from `crm_token_<restaurantId>` if present
  - order auth token from `order_auth_token`
- Storage dependency:
  - `localStorage['guestCustomer']`
  - `sessionStorage['scanned_table_<restaurantId>']`
- Error handling:
  - customer lookup falls back to guest flow on error
  - table-status failure falls back to browse flow
- Runtime risk:
  - depends on mismatched `utils/authToken.js`
  - Call Waiter / Pay Bill buttons are stubs only

### 1.2 `/:restaurantId/password-setup` — PasswordSetup
- Route file: `frontend/src/pages/PasswordSetup.jsx`
- Services/helpers:
  - CRM adapter only: `frontend/src/api/services/crmService.js`
  - `useAuth.setCrmAuth`
- API dependency trace:
  - set password/register → `crmRegister()` → v1 `/customer/register` or v2 `/scan/auth/register`
  - login → `crmLogin()` → v1 `/customer/login` or v2 `/scan/auth/login`
  - send OTP → `crmSendOtp()` → v1 `/customer/send-otp` or v2 `/scan/auth/request-otp`
  - verify OTP → `crmVerifyOtp()` → v1 `/customer/verify-otp` or v2 `/scan/auth/verify-otp`
  - skip OTP → `crmSkipOtp()` → v2 `/scan/auth/skip-otp`
  - forgot/reset password → forced v1 `/customer/forgot-password`, `/customer/reset-password`
- Request payload fields:
  - derived from `phone`, `password`, `otp`, `restaurant_id`, built `user_id`
- Response fields consumed:
  - `token`, `customer.id`, `customer.phone`, `customer.name`, `is_new_customer`, `debug_otp`
- Token/auth dependency:
  - writes CRM token only
- Storage dependency:
  - `localStorage['crm_token_<restaurantId>']`
  - `localStorage['guestCustomer']`
- Runtime risk:
  - mixed v1/v2 CRM behavior; reset/forgot remain non-v2

### 1.3 `/:restaurantId/delivery-address` — DeliveryAddress
- Route file: `frontend/src/pages/DeliveryAddress.jsx`
- Services/helpers:
  - `crmGetAddresses`, `crmAddAddress`, `crmDeleteAddress`, `crmSetDefaultAddress`
  - Google Maps SDK/geocode APIs
  - Manage distance API direct fetch
- API dependency trace:
  1. page mount → `setRestaurantScope(restaurantId)` → CRM profile validation
  2. load addresses → `crmGetAddresses(token)` → CRM address endpoint
  3. add/delete/default → CRM address mutation endpoints
  4. reverse geocode → `https://maps.googleapis.com/maps/api/geocode/json?...`
  5. search places → Google Places JS SDK
  6. distance check → `POST ${REACT_APP_IMAGE_BASE_URL || https://manage.mygenie.online}/api/v1/config/distance-api-new`
- Response fields consumed:
  - CRM: `addresses[].id,is_default,latitude,longitude,...`
  - distance API: `shipping_status, shipping_charge, shipping_time, distance`
- Token/auth dependency:
  - CRM Bearer token
- Storage dependency:
  - writes selected delivery address into `CartContext` / per-restaurant localStorage
- Runtime risk:
  - external fallback URL hardcoded for distance service

### 1.4 `/:restaurantId/stations` — DiningMenu
- Route file: `frontend/src/pages/DiningMenu.jsx`
- Services/hooks:
  - `useRestaurantDetails` → POS `/web/restaurant-info`
  - `useStations` → POS `/web/menu-master`
- Response fields consumed:
  - station/menu fields `menu_name,id,image,description,opening_time,closing_time`
- Auth dependency:
  - none explicit
- Storage dependency:
  - none direct
- Runtime risk:
  - relies on POS menu-master shape; no backend fallback

### 1.5 `/:restaurantId/menu` and `/:restaurantId/menu/:stationId` — MenuItems
- Route file: `frontend/src/pages/MenuItems.jsx`
- Services/hooks:
  - `useRestaurantDetails` → POS `/web/restaurant-info`
  - `useMenuSections` → POS `/web/restaurant-product`
  - `useStations` → POS `/web/menu-master`
  - `useDietaryTags` → backend `/api/dietary-tags/available` and `/api/dietary-tags/{restaurantId}`
  - `fetchConfig` → backend `/api/config/{restaurantId}`
- Request payload fields:
  - `/web/restaurant-product`: `{ restaurant_id, category_id:'0', food_for? }`
- Response fields consumed:
  - category/item payload fields for display and cart operations
  - dietary mappings and available tags
- Token/auth dependency:
  - no required token for reads
- Storage dependency:
  - cart state in `CartContext` localStorage
- Runtime risk:
  - image URL construction depends on `REACT_APP_IMAGE_BASE_URL`

### 1.6 `/:restaurantId/about` — AboutUs
- Route file: `frontend/src/pages/AboutUs.jsx`
- API dependency trace:
  - POS restaurant-info via `useRestaurantDetails`
  - backend config via `config.fetchConfig(restaurantId)`
- Response fields consumed:
  - config `aboutUsImage, aboutUsContent, openingHours, logoUrl, tagline`
- Runtime risk:
  - no custom page routing beyond this fixed page

### 1.7 `/:restaurantId/contact` — ContactPage
- Route file: `frontend/src/pages/ContactPage.jsx`
- API dependency trace:
  - POS restaurant-info
  - backend config
- Response fields consumed:
  - `phone,address,contactEmail,mapEmbedUrl,openingHours,social URLs`
- Runtime risk:
  - none beyond config availability

### 1.8 `/:restaurantId/feedback` — FeedbackPage
- Route file: `frontend/src/pages/FeedbackPage.jsx`
- API dependency trace:
  - config fetch → backend `/api/config/{restaurantId}`
  - submit → `POST ${REACT_APP_BACKEND_URL}/api/config/feedback`
- Request payload:
  - `{ restaurant_id, name, email, rating, message }`
- Response fields consumed:
  - success only
- Runtime risk:
  - backend-only, low risk

### 1.9 `/:restaurantId/review-order` and `/:restaurantId/:stationId/review-order` — ReviewOrder
- Route file: `frontend/src/pages/ReviewOrder.jsx`
- Services/helpers:
  - `useRestaurantDetails`, `useStations`, `useTableConfig`
  - `useRestaurantConfig.fetchConfig`
  - `useAuth.setRestaurantScope`
  - `getAuthToken`, `isTokenExpired`
  - `placeOrder`, `updateCustomerOrder`, `checkTableStatus`, `getOrderDetails`
- API dependency trace:
  1. POS restaurant-info
  2. POS menu-master
  3. backend config
  4. CRM profile validation via scope set
  5. backend loyalty settings `GET /api/loyalty-settings/{restaurantId}`
  6. backend customer lookup `GET /api/customer-lookup/{restaurantId}?phone=...`
  7. POS table-config `POST /web/table-config`
  8. order auth bootstrap via `utils/authToken.js`
  9. POS table status `GET /customer/check-table-status`
  10. POS order details `GET /air-bnb/get-order-details/{id}`
  11. POS place order `POST /customer/order/place`
  12. POS special 716 autopaid endpoint `POST /customer/order/autopaid-place-prepaid-order`
  13. POS update order `POST /customer/order/update-customer-order`
  14. POS payment order create `POST /razor-pay/create-razor-order`
- Request payload fields:
  - order placement/update use multipart form with `data` JSON including `restaurant_id, table_id, cart, cust_name, cust_phone, order_amount, order_type, payment_type, points_redeemed, points_discount, ...`
- Response fields consumed:
  - place/update: `order_id,total_amount,razorpay_id`
  - order details: previous items, totals, status
  - loyalty settings: `redemption_value`
  - customer lookup: `found,name,total_points,tier,wallet_balance`
- Token/auth dependency:
  - order auth helper token in `Authorization` for POS table/order routes
  - CRM token only for scope/profile context, not order submission
- Storage dependency:
  - `sessionStorage['sessionCustomerInfo']`
  - `localStorage['guestCustomer']`
  - cart/edit-order/delivery state in `CartContext`
- Runtime risk:
  - `utils/authToken.js` mismatch
  - coupon UI has no apply integration
  - hardcoded restaurant `716` branches

### 1.10 `/:restaurantId/order-success` — OrderSuccess
- Route file: `frontend/src/pages/OrderSuccess.jsx`
- Services/helpers:
  - `useRestaurantDetails`, `useStations`, `fetchConfig`
  - `getOrderDetails`, `checkTableStatus`
  - `getStoredToken` from `utils/authToken.js`
- API dependency trace:
  - POS restaurant-info
  - POS menu-master
  - backend config
  - POS payment verify `/razor-pay/verify-payment`
  - POS order details polling `/air-bnb/get-order-details/{orderId}`
  - POS table status `/customer/check-table-status`
- Response fields consumed:
  - payment verify: `status,message`
  - order details: `previousItems,billSummary,fOrderStatus,restaurant_order_id,order_amount`
- Token/auth dependency:
  - order auth helper token for table-status check
- Storage dependency:
  - `location.state.orderData`
  - scanned-table session / cart / edit-order state
- Runtime risk:
  - deep-link without route state not supported well
  - Call Waiter / Pay Bill remain stubbed

### 1.11 `/profile` — Profile
- Route file: `frontend/src/pages/Profile.jsx`
- Services/helpers:
  - `crmGetOrders`, `crmGetPoints`, `crmGetWallet`
- API dependency trace:
  - CRM orders history
  - CRM points history
  - CRM wallet history
- Response fields consumed:
  - orders: `orders[]`
  - points: `transactions[]`
  - wallet: `wallet_balance,transactions[]`
- Token/auth dependency:
  - CRM token from `AuthContext.token`
- Storage dependency:
  - none direct beyond AuthContext token source
- Runtime risk:
  - even in v2 mode, these adapter methods remain v1 endpoints

---

## 2. Admin-facing routes

### 2.1 `/admin/settings`, `/admin/branding`, `/admin/visibility`, `/admin/banners`, `/admin/content`, `/admin/menu`, `/admin/dietary`
- Route shell: `frontend/src/layouts/AdminLayout.jsx`
- Core state layer: `frontend/src/context/AdminConfigContext.jsx`
- Common API dependency trace:
  1. initial load → `GET ${REACT_APP_BACKEND_URL}/api/config/{configId}`
  2. optional flags load → `GET ${REACT_APP_BACKEND_URL}/api/restaurant-info/{configId}`
  3. save config → `PUT ${REACT_APP_BACKEND_URL}/api/config/`
  4. upload image → `POST ${REACT_APP_BACKEND_URL}/api/upload/image`
  5. banners CRUD → `/api/config/banners*`
- Token/auth dependency:
  - backend admin JWT `auth_token`
- Storage dependency:
  - `auth_token`
- Runtime risk:
  - `/api/restaurant-info/{id}` missing in backend

### 2.2 `/admin/content` — AdminContentPage / ContentTab
- Files:
  - `frontend/src/pages/admin/AdminContentPage.jsx`
  - `frontend/src/components/AdminSettings/ContentTab.jsx`
- API dependency trace:
  - create page → `POST ${REACT_APP_BACKEND_URL}/api/config/pages`
  - update page → `PUT ${REACT_APP_BACKEND_URL}/api/config/pages/{page_id}`
  - delete page → `DELETE ${REACT_APP_BACKEND_URL}/api/config/pages/{page_id}`
  - image upload through shared admin helper
- Response fields consumed:
  - create returns `data.page`
- Runtime risk:
  - no proven customer-side rendering route for created pages

### 2.3 `/admin/menu` — AdminMenuPage / MenuOrderTab
- Files:
  - `frontend/src/components/AdminSettings/MenuOrderTab.jsx`
- API dependency trace:
  - POS restaurant-info
  - POS menu-master
  - POS restaurant-product
  - save via backend generic config PUT
- Token/auth dependency:
  - no explicit POS token for these direct POS reads; uses axios base and order auth interceptor if token exists
  - backend save requires admin JWT
- Runtime risk:
  - depends on POS response shape; stored ordering schema is frontend-defined

### 2.4 `/admin/dietary` — AdminDietaryPage / DietaryTagsAdmin
- API dependency trace:
  - backend `GET /api/dietary-tags/available`
  - backend `GET /api/dietary-tags/{restaurantId}`
  - backend `PUT /api/dietary-tags/{restaurantId}`
  - POS `POST /web/menu-master`
  - POS `POST /web/restaurant-product`
- Token/auth dependency:
  - backend JWT required for PUT
- Runtime risk:
  - backend writes `updated_by` from nonexistent JWT `sub` claim

### 2.5 `/admin/qr-scanners` — AdminQRPage
- Route file: `frontend/src/pages/admin/AdminQRPage.jsx`
- API dependency trace:
  - `GET ${REACT_APP_BACKEND_URL}/api/table-config`
  - backend then calls POS v2 table-config with `X-POS-Token`
- Headers:
  - `Authorization: Bearer <auth_token>`
  - `X-POS-Token: <localStorage['pos_token']>`
- Response fields consumed:
  - `tables,rooms,subdomain,restaurant_id`
- Storage dependency:
  - `auth_token`, `pos_token`
- Runtime risk:
  - fails if `pos_token` absent or expired

---

## 3. Non-routed but runtime-critical infrastructure

### 3.1 `frontend/src/context/AuthContext.jsx`
- Backend calls:
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/send-otp`
- CRM call:
  - `crmGetProfile()` during restaurant scope restore
- Storage:
  - `auth_token`, `crm_token_<restaurantId>`, legacy `crm_token`, `restaurant_context`, `pos_token`
- Risk:
  - single `token` state is reused for both admin JWT and CRM token depending on session type

### 3.2 `frontend/src/utils/useRestaurantId.js`
- API dependency trace:
  - subdomain-only resolution → `getRestaurantDetails(subdomain)` → POS `/web/restaurant-info`
- Storage dependency:
  - none; in-memory cache only
- Risk:
  - fallback hardcoded default restaurant `478`

### 3.3 `frontend/src/utils/authToken.js`
- API dependency trace:
  - `apiClient.post('/auth/login', { phone, password })`
  - final URL = `${REACT_APP_API_BASE_URL}/auth/login`
- Storage:
  - `order_auth_token`, `order_token_expiry`
- Risk:
  - contract mismatch against current FastAPI backend
  - likely external/legacy auth endpoint dependency

### 3.4 `frontend/src/api/services/stationService.js`
- Defined endpoints:
  - `${REACT_APP_API_BASE_URL}/restaurants/{restaurantId}/stations`
  - `${REACT_APP_API_BASE_URL}/restaurants/{restaurantId}/stations/{stationId}`
  - `${REACT_APP_API_BASE_URL}/restaurants/{restaurantId}/stations/{stationId}/categories`
- Current runtime usage:
  - no proven active import path
- Status:
  - legacy dead code in current runtime trace

---

## 4. High-risk dependency hotspots
1. `ReviewOrder` depends on **all three systems**: backend, POS, CRM scope, plus order-auth helper.
2. `LandingPage` depends on backend + POS + order-auth helper and silently degrades on some failures.
3. `AdminConfigContext` depends on a backend route that is missing: `/api/restaurant-info/{id}`.
4. `OrderSuccess` relies on `location.state.orderData` and order-auth helper token continuity.
5. `PasswordSetup` / `Profile` / `DeliveryAddress` are tightly coupled to CRM version behavior.
