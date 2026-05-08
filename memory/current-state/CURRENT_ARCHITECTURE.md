# CURRENT_ARCHITECTURE

## 1) Current frontend architecture
### Entry and providers
- React app boots from `frontend/src/index.js` and renders `App` inside `React.StrictMode` (`/app/frontend/src/index.js:1-11`).
- `App` composes the top-level provider stack in this order:
  1. `QueryClientProvider`
  2. `AuthProvider`
  3. `RestaurantConfigProvider`
  4. `Router`
  5. `CartWrapper`
  6. route tree + persistent `CartBar` + global `Toaster` (`/app/frontend/src/App.js:55-143`)

### Architectural layers visible in code
- **Routing layer**: `App.js` route map (`/app/frontend/src/App.js:63-122`)
- **Context/state layer**: auth, restaurant config, admin config, cart (`/app/frontend/src/context/*`)
- **Hooks/data layer**: `useMenuData`, `useScannedTable`, `useRestaurantId`, notification/time hooks (`/app/frontend/src/hooks/*`, `/app/frontend/src/utils/useRestaurantId.js`)
- **API/service layer**:
  - POS-facing axios-based services (`restaurantService`, `orderService`, `tableRoomService`, etc.)
  - own-backend fetch-based services / context calls
  - CRM fetch wrapper with contract adapter (`/app/frontend/src/api/*`)
- **UI layer**:
  - route pages in `src/pages/`
  - admin route pages in `src/pages/admin/`
  - domain components in `src/components/`
  - shared primitives in `src/components/ui/`

### Frontend architecture characteristics
- Mixed API access strategy:
  - axios + interceptors for POS-style APIs (`/app/frontend/src/api/config/axios.js:17-30`)
  - direct `fetch()` for own backend and CRM (`/app/frontend/src/context/AuthContext.jsx`, `/app/frontend/src/context/AdminConfigContext.jsx`, `/app/frontend/src/api/services/crmService.js`)
- React Query is used selectively, mostly for menu/restaurant/table/dietary queries (`/app/frontend/src/hooks/useMenuData.js:22-410`)
- State is split across contexts and browser storage instead of a single global store.

## 2) Current backend architecture
### Shape
- Single-file FastAPI backend with multiple routers declared inside `backend/server.py` (`/app/backend/server.py:1-1610`).
- Routers:
  - `api_router` prefix `/api`
  - nested `auth_router`, `customer_router`, `config_router`, `upload_router`, `dietary_router`, `air_bnb_router` (`/app/backend/server.py:48-55`, `785-786`, `1507-1512`)

### Backend responsibilities combined in one file
- environment bootstrapping and Mongo connection (`/app/backend/server.py:19-25`)
- JWT auth / authorization helpers (`/app/backend/server.py:27-31`, `274-321`)
- in-memory OTP issuance/verification (`/app/backend/server.py:323-341`)
- POS token refresh helper (`/app/backend/server.py:347-389`)
- own DB-backed auth/config/feedback/upload/dietary APIs (`/app/backend/server.py:395-1501`)
- proxy endpoints for select POS APIs (`/app/backend/server.py:788-877`)
- static serving of uploaded assets under `/api/uploads` (`/app/backend/server.py:33-46`)
- documentation-file serving endpoints (`/app/backend/server.py:1518-1588`)

### Data layer
- MongoDB is accessed directly via `motor.AsyncIOMotorClient` and raw collection calls; there is no repository/service abstraction layer in the inspected code (`/app/backend/server.py:23-25`, multiple `db.<collection>` calls throughout).

## 3) Routing flow
### Customer route flow
- Route resolution begins in `App.js` (`/app/frontend/src/App.js:63-122`).
- Most customer screens derive `restaurantId` through `useRestaurantId`, which prioritizes path params, query params, subdomain resolution, env fallback, then hardcoded default `478` (`/app/frontend/src/utils/useRestaurantId.js:68-128`).
- QR/scan state is orthogonal to routing and read from query params + session storage through `useScannedTable` (`/app/frontend/src/hooks/useScannedTable.js:17-91`).

### Important route patterns
- restaurant-scoped paths dominate the app:
  - `/:restaurantId`
  - `/:restaurantId/stations`
  - `/:restaurantId/menu/:stationId?`
  - `/:restaurantId/review-order`
  - `/:restaurantId/order-success`
  - `/:restaurantId/password-setup`
  - `/:restaurantId/delivery-address` (`/app/frontend/src/App.js:84-115`)
- fallback non-restaurant paths support subdomain mode or default mode (`/app/frontend/src/App.js:116-121`)

### Admin route flow
- `/admin` uses `AdminLayout`, which itself mounts `AdminConfigProvider` and then nested admin pages (`/app/frontend/src/App.js:69-79`, `/app/frontend/src/layouts/AdminLayout.jsx:161-167`).
- `AdminLayout` redirects unauthenticated users to `/login` and non-restaurant users to `/profile` (`/app/frontend/src/layouts/AdminLayout.jsx:40-49`).

## 4) Data flow
### Restaurant/customer-facing pages
1. `useRestaurantId` resolves identifier (`/app/frontend/src/utils/useRestaurantId.js:68-128`)
2. `useRestaurantDetails` fetches POS restaurant info (`/app/frontend/src/hooks/useMenuData.js:273-319`)
3. `RestaurantConfigContext.fetchConfig(restaurantId)` fetches own config and applies CSS variables (`/app/frontend/src/context/RestaurantConfigContext.jsx:152-174`, `205-302`)
4. pages consume merged config booleans + branding values from context (`/app/frontend/src/context/RestaurantConfigContext.jsx:307-419`)

### Menu data flow
1. UI calls `useMenuSections(stationId, restaurantId)` (`/app/frontend/src/hooks/useMenuData.js:22-154`)
2. hook calls `getRestaurantProducts()` (`/app/frontend/src/hooks/useMenuData.js:43-45`)
3. response is transformed into app-level `section -> items` shape (`/app/frontend/src/hooks/useMenuData.js:56-123`)
4. menu-related components consume transformed section/item objects

### Cart/order data flow
1. `CartContext` manages canonical cart items, edit-order state, and delivery state (`/app/frontend/src/context/CartContext.js:113-543`)
2. `ReviewOrder` reads cart + previous order state and calculates bill/tax/discount (`/app/frontend/src/pages/ReviewOrder.jsx:80-95`, `521-594`)
3. `placeOrder()` / `updateCustomerOrder()` transform cart to API payload (`/app/frontend/src/api/services/orderService.ts:240-361`, `366-462`)
4. route navigates to OrderSuccess with `location.state.orderData` (`/app/frontend/src/pages/ReviewOrder.jsx:1055-1067`)
5. `OrderSuccess` rehydrates live order status from API polling (`/app/frontend/src/pages/OrderSuccess.jsx:209-364`)

### Admin config data flow
1. `AdminConfigProvider` fetches config and stores both `config` and `originalConfig` (`/app/frontend/src/context/AdminConfigContext.jsx:125-176`)
2. admin pages mutate local config state through `updateField/updateFields/toggleField` (`/app/frontend/src/context/AdminConfigContext.jsx:178-191`)
3. `saveConfig()` pushes full config to backend PUT `/api/config/` (`/app/frontend/src/context/AdminConfigContext.jsx:194-223`)
4. customer pages later consume the saved config through `RestaurantConfigContext`

## 5) API integration flow

### 5.1 POS API integration flow
There are **two styles** of POS integration in the current codebase.

#### A. Frontend-direct POS calls
- Frontend axios client uses `REACT_APP_API_BASE_URL` (`/app/frontend/src/api/config/axios.js:11-24`)
- endpoint builders generate POS-facing paths such as:
  - `/web/restaurant-info`
  - `/web/restaurant-product`
  - `/web/menu-master`
  - `/web/table-config`
  - `/customer/check-table-status`
  - `/customer/order/place`
  - `/customer/order/update-customer-order`
  - `/razor-pay/*` (`/app/frontend/src/api/config/endpoints.js:14-50`)
- request interceptor may attach a token from `utils/authToken.js` (`/app/frontend/src/api/interceptors/request.js:28-46`)

#### B. Backend-proxied POS calls
- FastAPI backend calls `MYGENIE_API_URL` for:
  - admin POS token refresh during login (`/app/backend/server.py:347-389`)
  - `GET /api/air-bnb/get-order-details/{order_id}` proxy (`/app/backend/server.py:788-807`)
  - `GET /api/table-config` proxy using admin JWT + `X-POS-Token` (`/app/backend/server.py:809-877`)

### 5.2 Own backend API integration flow
- Frontend uses `REACT_APP_BACKEND_URL` for app-owned APIs (`/app/frontend/src/context/AuthContext.jsx:6`, `/app/frontend/src/context/AdminConfigContext.jsx:7`, `/app/frontend/src/context/RestaurantConfigContext.jsx:7`)
- Primary functions served by own backend:
  - admin authentication / user verification
  - public restaurant config
  - admin config save / banners / pages / uploads
  - feedback
  - loyalty settings
  - customer lookup by restaurant+phone
  - dietary tag mapping

### 5.3 CRM API integration flow
- Frontend `crmService.js` talks directly to `REACT_APP_CRM_URL` (`/app/frontend/src/api/services/crmService.js:9-13`)
- `crmFetch()` auto-injects `x-api-key` per restaurant and unwraps v2 envelopes (`/app/frontend/src/api/services/crmService.js:87-161`)
- `crmAuthFetch()` adds Bearer token for authenticated CRM routes (`/app/frontend/src/api/services/crmService.js:167-176`)
- This service is consumed by:
  - `PasswordSetup` customer auth journey
  - `AuthContext` token validation/restoration
  - `Profile` tabs
  - `DeliveryAddress`

## 6) Auth / session / token flow
### 6.1 Admin auth flow (own backend)
1. Admin submits email/password in `Login.jsx` (`/app/frontend/src/pages/Login.jsx:30-46`)
2. FastAPI `/api/auth/login` verifies against `users` collection (`/app/backend/server.py:530-572`)
3. Backend creates JWT with `user_id`, `user_type`, `exp` (`/app/backend/server.py:274-280`)
4. Backend also tries to fetch a fresh POS token through `refresh_pos_token()` and returns it as `pos_token` (`/app/backend/server.py:550-563`)
5. Frontend stores:
   - `auth_token`
   - `pos_token` (`/app/frontend/src/pages/Login.jsx:58-62`, `/app/frontend/src/context/AuthContext.jsx:176-182`)
6. `AuthContext` restores admin session on app load via `/api/auth/me` (`/app/frontend/src/context/AuthContext.jsx:35-78`)

### 6.2 Customer auth flow (CRM)
1. Landing page checks customer existence through own backend `/api/auth/check-customer` (`/app/frontend/src/pages/LandingPage.jsx:73-85`, `304-330`)
2. PasswordSetup then uses CRM service for:
   - password registration/login
   - OTP login
   - skip OTP (`/app/frontend/src/pages/PasswordSetup.jsx:65-82`, `122-174`, `185-241`)
3. `AuthContext.setCrmAuth()` stores CRM token under `crm_token_<restaurantId>` (`/app/frontend/src/context/AuthContext.jsx:185-195`)
4. `setRestaurantScope(restaurantId)` later restores and validates the token using `crmGetProfile()` (`/app/frontend/src/context/AuthContext.jsx:85-128`)

### 6.3 POS order-auth token flow (separate from admin/customer auth)
- `utils/authToken.js` maintains a distinct token in:
  - `order_auth_token`
  - `order_token_expiry` (`/app/frontend/src/utils/authToken.js:7-8`)
- request interceptor uses this helper (`/app/frontend/src/api/interceptors/request.js:6`, `13-22`, `28-33`)
- `ReviewOrder` also explicitly calls `getAuthToken()` from this utility before order/table-status actions (`/app/frontend/src/pages/ReviewOrder.jsx:11`, `605-623`, `747-765`)

### 6.4 Session persistence model
- `localStorage`: long-lived-ish auth/config/cart/guest data
- `sessionStorage`: scanned QR/table session and session customer data (`/app/frontend/src/hooks/useScannedTable.js:20-21`, `/app/frontend/src/pages/ReviewOrder.jsx:160-172`)

## 7) State management approach
### Context-based global state
- `AuthContext` for user/session state
- `CartContext` for cart/edit-order/delivery state
- `RestaurantConfigContext` for public config/theme
- `AdminConfigContext` for admin editing state (`/app/frontend/src/context/*`)

### React Query state
- Used for menu/restaurant/table/dietary network state and cache lifetimes (`/app/frontend/src/App.js:35-53`, `/app/frontend/src/hooks/useMenuData.js:22-410`)

### Local component state
- Used heavily in pages for form state, loading flags, timers, current filters, modals, etc.

### Browser storage as quasi-state layer
- Current architecture relies significantly on `localStorage`/`sessionStorage` as continuity across route changes/reloads.

## 8) Component structure
### Customer side
- Pages orchestrate business logic and pass data to domain components.
- Examples:
  - `LandingPage` controls capture, table-status logic, CTA routing (`/app/frontend/src/pages/LandingPage.jsx:28-840`)
  - `ReviewOrder` orchestrates most order logic and renders multiple domain sections (`/app/frontend/src/pages/ReviewOrder.jsx:68-1567`)
  - `OrderSuccess` mixes status polling, payment verification, and UI rendering (`/app/frontend/src/pages/OrderSuccess.jsx:117-792`)

### Admin side
- `AdminLayout` provides shell + global save button (`/app/frontend/src/layouts/AdminLayout.jsx:67-156`)
- feature tabs/pages own local editing UIs while writing into `AdminConfigContext`
- some admin modules are self-contained large components (`ContentTab`, `MenuOrderTab`, `DietaryTagsAdmin`, `AdminQRPage`)

### Shared UI primitives
- `components/ui/*` contains generic reusable primitives consistent with Radix/Tailwind component architecture.

## 9) External PaaS / external dependency summary
### MongoDB
- Primary persistent app-owned data store (`/app/backend/server.py:23-25`)

### MyGenie / POS APIs
- Restaurant data
- menu master / products
- table status
- order place/update/details
- QR/table config
- Razorpay order creation/verification endpoints appear POS-side (`/app/frontend/src/api/config/endpoints.js:14-50`)

### CRM API
- customer account lifecycle
- customer profile
- orders, points, wallet
- delivery addresses (`/app/frontend/src/api/services/crmService.js:1-580`)

### Google Maps Platform
- JS Maps loader
- Places Autocomplete
- Geocoding / reverse geocoding (`/app/frontend/src/pages/DeliveryAddress.jsx:54-57`, `191-204`, `427-537`)

### Manage/MyGenie distance API
- delivery availability/charge/time check (`/app/frontend/src/pages/DeliveryAddress.jsx:209-241`)

## 10) Known architectural limitations observed from code
These are observations of current structure/constraints from code, not proposed fixes.

1. **Backend is monolithic in one file**
- `backend/server.py` combines models, auth, route handlers, Mongo access, proxy logic, and file serving (`/app/backend/server.py:1-1610`).

2. **Frontend has multiple API base concepts simultaneously**
- `REACT_APP_BACKEND_URL` for own backend,
- `REACT_APP_API_BASE_URL` for POS APIs,
- `REACT_APP_CRM_URL` for CRM (`/app/frontend/src/context/AuthContext.jsx:6`, `/app/frontend/src/api/config/axios.js:12-18`, `/app/frontend/src/api/services/crmService.js:9-13`).

3. **Three distinct token systems coexist**
- admin backend JWT (`auth_token`)
- restaurant-scoped CRM token (`crm_token_<restaurantId>`)
- separate order/POS auth token helper (`order_auth_token`) (`/app/frontend/src/context/AuthContext.jsx:164-210`, `/app/frontend/src/utils/authToken.js:7-8`).

4. **State continuity depends heavily on browser storage**
- cart, edit order, scan state, guest identity, config cache, tokens all rely on storage keys (`multiple references across contexts/hooks/pages`).

5. **Frontend pages contain substantial business logic**
- `LandingPage`, `ReviewOrder`, and `OrderSuccess` are not thin views; they encode routing, auth branching, payment branching, table logic, and retry/error behavior (`/app/frontend/src/pages/LandingPage.jsx:170-385`, `/app/frontend/src/pages/ReviewOrder.jsx:699-1208`, `/app/frontend/src/pages/OrderSuccess.jsx:156-470`).

6. **Mixed direct external calls and backend-proxied calls**
- Some POS calls are direct from frontend; some go through backend proxy. Same for delivery flow using direct Google and distance-service calls from frontend.

7. **Environment expectations are partially inconsistent with code comments/instructions**
- Current code visibly uses `REACT_APP_API_BASE_URL` in axios-based services even though other app areas use `REACT_APP_BACKEND_URL` (`/app/frontend/src/api/config/axios.js:12-18`, `/app/frontend/src/context/AuthContext.jsx:6`).

8. **Some routes/features are present in one layer but not visibly wired in another**
- custom pages are stored and nav-managed, but a customer-facing route for rendering arbitrary custom page slugs was not found in inspected route map (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:370-499`, `/app/frontend/src/App.js:63-122`).
- admin context fetches `/api/restaurant-info/{id}` but backend route was not found in inspected `server.py`.

9. **Hardcoded restaurant-specific behavior exists in business flow**
- e.g. restaurant `716` special payment/table behavior in review flow (`/app/frontend/src/api/services/orderService.ts:254-264`; `/app/frontend/src/pages/ReviewOrder.jsx:491-512`, `700-723`, `949-957`).

10. **Some UI actions remain stubs/TODOs**
- `Call Waiter` and `Pay Bill` currently only log actions on landing and success pages (`/app/frontend/src/pages/LandingPage.jsx:387-395`, `/app/frontend/src/pages/OrderSuccess.jsx:462-470`).

## 11) Current architecture uncertainties
- Whether `ENDPOINTS.GET_ORDER_DETAILS()` hits the FastAPI proxy or directly hits a POS API depends on `REACT_APP_API_BASE_URL`, which was not inspected from `.env` here (`/app/frontend/src/api/config/endpoints.js:17-18`).
- `utils/authToken.js` appears to expect an auth contract that may differ from current FastAPI `/api/auth/login`; architectural impact depends on runtime environment and was not execution-tested in this discovery-only task (`/app/frontend/src/utils/authToken.js:93-123`, `/app/backend/server.py:460-575`).
- Some legacy admin files still exist alongside the new admin route structure, so “active path” vs “stale file” distinctions are partly inferential unless verified through imports/routes (`/app/frontend/src/App.js:24-33`, `/app/frontend/src/pages/AdminSettings.jsx`).
