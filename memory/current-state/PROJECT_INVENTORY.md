# PROJECT_INVENTORY

## 1) Repository snapshot
- Repo: `customer-app5th-march`
- Checked out branch: `abhi-2-may` (`d3c9f63`) via local clone into `/app`.
- Stack discovered from code:
  - Frontend: React 19 + CRA/CRACO + React Router + React Query + Axios + Tailwind/Radix UI (`/app/frontend/package.json:5-120`)
  - Backend: FastAPI + Motor/MongoDB + JWT auth + file uploads (`/app/backend/server.py:1-1610`)
  - Database: MongoDB via `MONGO_URL` and `DB_NAME` env vars (`/app/backend/server.py:22-25`)
  - External systems:
    - POS / MyGenie API via `MYGENIE_API_URL` (`/app/backend/server.py:37-40`, `347-389`, `788-807`, `809-877`)
    - CRM API via frontend `REACT_APP_CRM_URL` + per-restaurant API keys (`/app/frontend/src/api/services/crmService.js:1-176`)
    - Google Maps / Places + Google Geocoding in delivery flow (`/app/frontend/src/pages/DeliveryAddress.jsx:1-845`)
    - Manage/MyGenie distance API for delivery charge / serviceability (`/app/frontend/src/pages/DeliveryAddress.jsx:13-16`, `209-241`)
    - Razorpay endpoints through POS API base config (`/app/frontend/src/api/config/endpoints.js:48-50`, `/app/frontend/src/pages/ReviewOrder.jsx:777-842`)

## 2) Top-level folder structure
- `backend/`
  - `server.py` main FastAPI app, routers, auth, config, feedback, upload, dietary tags, POS proxy routes (`/app/backend/server.py`)
  - `requirements.txt` Python dependency lock-ish list (`/app/backend/requirements.txt:1-124`)
  - `db_data/` JSON export of Mongo collections + README (`/app/backend/db_data/README.md:1-38`)
  - `db_export.py`, `db_import.py`, `seed_defaults.py`, `seed_demo_data.py` database utilities (`/app/backend/`)
  - `uploads/` uploaded media served statically under `/api/uploads/...` (`/app/backend/server.py:33-46`)
  - `tests/` backend API tests (`/app/backend/tests/*.py`)
- `frontend/`
  - `src/App.js` route map + providers (`/app/frontend/src/App.js:1-146`)
  - `src/pages/` customer-facing screens (`/app/frontend/src/pages/*`)
  - `src/pages/admin/` admin screens (`/app/frontend/src/pages/admin/*`)
  - `src/context/` auth, cart, restaurant config, admin config (`/app/frontend/src/context/*`)
  - `src/api/` axios config, endpoint map, service wrappers, transformers (`/app/frontend/src/api/*`)
  - `src/components/` domain and shared UI components (`/app/frontend/src/components/*`)
  - `src/hooks/` menu data, scanned-table, time, notifications (`/app/frontend/src/hooks/*`)
  - `src/utils/` auth token, order helpers, tax calculation, logging, restaurant id (`/app/frontend/src/utils/*`)
- `memory/`
  - prior project docs / audits / PRD artifacts (`/app/memory/`)
  - current-state docs target folder: `memory/current-state/`
- `test_reports/`, `tests/`, `backend_test.py`, `test_result.md` additional test artifacts (`/app/`)

## 3) Main dependencies

### Frontend runtime dependencies
- Routing / app shell
  - `react`, `react-dom`, `react-router-dom` (`/app/frontend/package.json:60-69`)
- Data fetching / API
  - `axios`, `@tanstack/react-query` (`/app/frontend/package.json:38,46`)
- UI / forms / visuals
  - Radix UI package set, `react-hot-toast`, `react-icons`, `react-hook-form`, `zod` (`/app/frontend/package.json:9-36`, `64-76`)
- Admin / editing / DnD
  - `@dnd-kit/*`, `@tiptap/*` (`/app/frontend/package.json:6-8`, `39-45`)
- Maps / QR / exports
  - `@react-google-maps/api`, `qrcode.react`, `jszip`, `file-saver` (`/app/frontend/package.json:37`, `54`, `56`, `59`)
- Customer input
  - `react-phone-number-input`, `react-select` (`/app/frontend/package.json:66`, `70`)

### Frontend dev/build dependencies
- CRA + CRACO + TypeScript + Testing Library + ESLint (`/app/frontend/package.json:95-118`)

### Backend dependencies actually evidenced in main app
- API framework: `fastapi`, `starlette`, `uvicorn` (`/app/backend/requirements.txt:22,107,119`)
- DB: `motor`, `pymongo` (`/app/backend/requirements.txt:60,86`)
- Auth / crypto: `PyJWT`, `bcrypt`, `python-jose`, `cryptography`, `passlib` (`/app/backend/requirements.txt:8,16,69,85,91`)
- HTTP clients / env: `httpx`, `requests`, `python-dotenv` (`/app/backend/requirements.txt:42,97,90`)
- Misc used elsewhere in repo: `boto3`, `pandas`, `numpy`, `stripe`, `google-genai`, `openai`, `litellm`, etc. These are present in requirements, but not all are referenced from `backend/server.py` and should not be assumed active without deeper file-level proof (`/app/backend/requirements.txt:1-124`).

## 4) Scripts / build commands discovered
### Frontend
- `yarn start` → `craco start` (`/app/frontend/package.json:78-81`)
- `yarn build` → `craco build` (`/app/frontend/package.json:78-81`)
- `yarn test` → `craco test` (`/app/frontend/package.json:78-81`)

### Backend
- No script runner defined in package metadata; main app entry is `backend/server.py` with FastAPI app instance `app` (`/app/backend/server.py:42-55`, `1590-1610`).
- DB utilities are CLI-style Python scripts referenced in backend DB README:
  - `python db_export.py`
  - `python db_import.py`
  - `python db_import.py --drop` (`/app/backend/db_data/README.md:7-19`)

## 5) Environment variable usage

### Frontend env vars discovered
- `REACT_APP_BACKEND_URL`
  - Used for own FastAPI backend calls in contexts/pages/components/services (`/app/frontend/src/context/AuthContext.jsx:6`, `/app/frontend/src/context/AdminConfigContext.jsx:7`, `/app/frontend/src/context/RestaurantConfigContext.jsx:7`, `/app/frontend/src/pages/Login.jsx:10`, `/app/frontend/src/pages/LandingPage.jsx:72-81`, `/app/frontend/src/pages/ReviewOrder.jsx:117-118`, `/app/frontend/src/pages/admin/AdminQRPage.jsx:20`, `/app/frontend/src/api/services/dietaryTagsService.js:3-44`)
- `REACT_APP_API_BASE_URL`
  - Used by axios client / endpoint map for POS-facing APIs (`/app/frontend/src/api/config/axios.js:11-24`, `/app/frontend/src/api/config/endpoints.js:7-50`, `/app/frontend/src/api/services/orderService.ts:445`, `97-123` in auth token utility indirectly through axios)
- `REACT_APP_CRM_URL`
  - CRM base URL (`/app/frontend/src/api/services/crmService.js:9-13`)
- `REACT_APP_CRM_API_KEY`
  - JSON map of `restaurantId -> apiKey` (`/app/frontend/src/api/services/crmService.js:18-28`, `51-55`, `107-117`)
- `REACT_APP_CRM_API_VERSION`
  - Chooses CRM contract adapter `v1` vs `v2` (`/app/frontend/src/api/services/crmService.js:57-69`)
- `REACT_APP_GOOGLE_MAPS_API_KEY`
  - Google Maps + Geocoding (`/app/frontend/src/pages/DeliveryAddress.jsx:13`, `54-57`, `191-204`, `267-296`)
- `REACT_APP_IMAGE_BASE_URL`
  - Menu image base and distance API base in delivery page (`/app/frontend/src/hooks/useMenuData.js:79-84`, `/app/frontend/src/pages/DeliveryAddress.jsx:14`, `223-233`)
- `REACT_APP_RESTAURANT_ID`
  - Fallback restaurant id in hooks/utils (`/app/frontend/src/hooks/useMenuData.js:24`, `/app/frontend/src/utils/useRestaurantId.js:112-120`)
- `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`
  - Used by `utils/authToken.js` token bootstrap logic for POS order APIs (`/app/frontend/src/utils/authToken.js:15-21`, `93-162`)

### Backend env vars discovered
- `MONGO_URL` required (`/app/backend/server.py:23-24`)
- `DB_NAME` required (`/app/backend/server.py:25`)
- `JWT_SECRET` required (`/app/backend/server.py:27-31`)
- `MYGENIE_API_URL` required (`/app/backend/server.py:37-40`)
- `CORS_ORIGINS` optional, defaults to `*` split by comma (`/app/backend/server.py:1592-1599`)
- `DB_NAME` / `MONGO_URL` also used in import/export utilities (`/app/backend/db_export.py`, `/app/backend/db_import.py`, `/app/backend/db_export_new/db_export/import_data.py` via search results)

### Important env inconsistency observed from code
- The codebase uses both `REACT_APP_BACKEND_URL` and `REACT_APP_API_BASE_URL` for different classes of calls, and `REACT_APP_CRM_URL` separately. This is current-state behavior, not an inference (`/app/frontend/src/context/AuthContext.jsx:6`, `/app/frontend/src/api/config/axios.js:12-18`, `/app/frontend/src/api/services/crmService.js:9-13`).

## 6) Routing entry points
### Frontend route entry
- `frontend/src/index.js` renders `App` (`/app/frontend/src/index.js:1-11`)
- `frontend/src/App.js` defines all routes (`/app/frontend/src/App.js:1-146`)

### Customer-facing routes discovered
- `/login` → `Login` (`/app/frontend/src/App.js:65`)
- `/profile` → `Profile` (`/app/frontend/src/App.js:66`)
- `/:restaurantId/password-setup` → `PasswordSetup` (`/app/frontend/src/App.js:84`)
- `/:restaurantId/delivery-address` → `DeliveryAddress` (`/app/frontend/src/App.js:85`)
- `/:restaurantId/menu` and `/:restaurantId/menu/:stationId` → `MenuItems` (`/app/frontend/src/App.js:88-89`)
- `/:restaurantId/stations` → `DiningMenu` (`/app/frontend/src/App.js:93`)
- `/:restaurantId/about` → `AboutUs` (`/app/frontend/src/App.js:96`)
- `/:restaurantId/contact` → `ContactPage` (`/app/frontend/src/App.js:99`)
- `/:restaurantId/feedback` → `FeedbackPage` (`/app/frontend/src/App.js:102`)
- `/:restaurantId/review-order` and `/:restaurantId/:stationId/review-order` → `ReviewOrder` (`/app/frontend/src/App.js:105-108`)
- `/:restaurantId/order-success` → `OrderSuccess` (`/app/frontend/src/App.js:111`)
- `/:restaurantId` → `LandingPage` (`/app/frontend/src/App.js:114`)
- Fallback/subdomain-mode routes: `/stations`, `/menu/:stationId`, `/menu`, `/` (`/app/frontend/src/App.js:117-121`)

### Admin routes discovered
- `/admin` uses `AdminLayout` with nested pages (`/app/frontend/src/App.js:69-79`)
  - `/admin/settings` → `AdminSettingsPage`
  - `/admin/branding` → `AdminBrandingPage`
  - `/admin/visibility` → `AdminVisibilityPage`
  - `/admin/banners` → `AdminBannersPage`
  - `/admin/content` → `AdminContentPage`
  - `/admin/menu` → `AdminMenuPage`
  - `/admin/dietary` → `AdminDietaryPage`
  - `/admin/qr-scanners` → `AdminQRPage`

### Backend route entry
- Main FastAPI app includes router prefix `/api` (`/app/backend/server.py:43-55`, `1507-1512`, `1590`)
- Subrouters:
  - `/api/auth/*`
  - `/api/customer/*`
  - `/api/config/*`
  - `/api/upload/*`
  - `/api/air-bnb/*`
  - `/api/dietary-tags/*` (`/app/backend/server.py:49-55`, `1507-1512`)

## 7) API / service layer files
### Frontend API config layer
- `src/api/config/axios.js` central axios instance (`/app/frontend/src/api/config/axios.js:1-32`)
- `src/api/config/endpoints.js` POS endpoint builders (`/app/frontend/src/api/config/endpoints.js:14-50`)
- `src/api/interceptors/request.js` auth + logging headers (`/app/frontend/src/api/interceptors/request.js:13-47`)
- `src/api/interceptors/response.js` nested data unwrapping + 401 retry (`/app/frontend/src/api/interceptors/response.js:14-100`)

### Frontend service files
- `crmService.js` CRM auth/profile/address/order/points/wallet APIs with v1/v2 adapter (`/app/frontend/src/api/services/crmService.js:1-580`)
- `orderService.ts` POS order / table status / order details / update order flows (`/app/frontend/src/api/services/orderService.ts:1-469`)
- `orderService.js` JS re-export wrapper (`/app/frontend/src/api/services/orderService.js:1-15`)
- `restaurantService.js` restaurant-info, restaurant-product, menu-master (`/app/frontend/src/api/services/restaurantService.js:1-103`)
- `stationService.js` station/category endpoints, though endpoint definitions appear generic and separate from main menu-master usage (`/app/frontend/src/api/services/stationService.js:1-60`)
- `tableRoomService.js` POST `/web/table-config` against `REACT_APP_API_BASE_URL` (`/app/frontend/src/api/services/tableRoomService.js:1-53`)
- `dietaryTagsService.js` FastAPI dietary tag endpoints (`/app/frontend/src/api/services/dietaryTagsService.js:1-51`)

### Backend service/proxy layer in single file
- `backend/server.py` contains all backend route handlers, auth helpers, OTP store, POS proxy helpers, MongoDB reads/writes, and static upload serving (`/app/backend/server.py:1-1610`)

## 8) State management files / patterns
### React context providers
- `AuthContext.jsx` admin auth + restaurant-scoped CRM customer auth (`/app/frontend/src/context/AuthContext.jsx:1-273`)
- `CartContext.js` restaurant-scoped cart, edit-order state, delivery-address state (`/app/frontend/src/context/CartContext.js:1-553`)
- `RestaurantConfigContext.jsx` public restaurant config cache + CSS variable branding (`/app/frontend/src/context/RestaurantConfigContext.jsx:1-437`)
- `AdminConfigContext.jsx` admin editing state, dirty-check, save, banner ops, upload (`/app/frontend/src/context/AdminConfigContext.jsx:1-376`)

### Query caching
- `QueryClientProvider` configured in `App.js` with retry, stale/gc times (`/app/frontend/src/App.js:35-53`, `57-58`)
- `useMenuData.js` uses React Query for restaurant details, stations, menu sections, table config, dietary tags (`/app/frontend/src/hooks/useMenuData.js:22-410`)

### Browser storage usage
- `localStorage`
  - auth tokens (`auth_token`, `crm_token_<restaurantId>`, `pos_token`, `restaurant_context`) (`/app/frontend/src/context/AuthContext.jsx:34-77`, `164-182`, `185-210`)
  - restaurant-scoped carts / edit orders / delivery address (`/app/frontend/src/context/CartContext.js:13-101`, `482-506`)
  - order auth token helper keys (`order_auth_token`, `order_token_expiry`) (`/app/frontend/src/utils/authToken.js:7-8`)
  - config cache (`restaurant_config_<restaurantId>`) (`/app/frontend/src/context/RestaurantConfigContext.jsx:124-150`)
- `sessionStorage`
  - scanned QR/table state (`/app/frontend/src/hooks/useScannedTable.js:17-91`)
  - temporary customer details in review flow (`/app/frontend/src/pages/ReviewOrder.jsx:160-172`, `210-264`)

## 9) Key shared components / hooks / utils
### Shared hooks
- `useRestaurantId` resolves restaurant from path/query/subdomain with fallback chain (`/app/frontend/src/utils/useRestaurantId.js:1-132`)
- `useScannedTable` parses QR params and persists scan context (`/app/frontend/src/hooks/useScannedTable.js:1-92`)
- `useMenuData` bundle of menu/restaurant/table/dietary hooks (`/app/frontend/src/hooks/useMenuData.js:1-410`)
- `useNotificationPopup`, `useCurrentTime`, `use-toast` also exist, but not all were inspected deeply during this pass (`/app/frontend/src/hooks/`)

### Shared utilities
- `authToken.js` token bootstrap / refresh helper for POS order APIs (`/app/frontend/src/utils/authToken.js:1-162`)
- `taxCalculation.js` centralized tax breakdown used in review/order details (`/app/frontend/src/api/services/orderService.ts:32`, `/app/frontend/src/pages/ReviewOrder.jsx:28-29`, `521-571`)
- `orderTypeHelpers.js` dine-in / table-related route logic helpers (`/app/frontend/src/pages/LandingPage.jsx:12`, `/app/frontend/src/pages/ReviewOrder.jsx:29`, `/app/frontend/src/pages/OrderSuccess.jsx:14`)
- `logger.js` domain-specific logging helper used across app (`multiple files via imports`)
- `restaurantIdConfig.js` current multiple-menu check from POS restaurant payload (`/app/frontend/src/api/utils/restaurantIdConfig.js:1-14`)

### Shared UI and layout
- `AdminLayout.jsx` admin shell + nav (`/app/frontend/src/layouts/AdminLayout.jsx:1-169`)
- `Header`, `CartBar`, `CartWrapper`, `PromoBanner`, `NotificationPopup`, `PaymentMethodSelector`, `TableRoomSelector`, `CustomerDetails`, `OrderItemCard`, `PreviousOrderItems` appear as reusable domain components referenced by pages (`/app/frontend/src/pages/*.jsx`)
- `components/ui/*` provides Radix-style shared primitives (`/app/frontend/src/components/ui/*`)

## 10) Database collections directly evidenced
From backend route logic and exported data:
- `users` (`/app/backend/server.py:304`, `/app/backend/db_data/users.json`)
- `customers` (`/app/backend/server.py:302`, `406-446`, `607-647`)
- `orders` (`/app/backend/server.py:771-783`, `/app/backend/db_data/orders.json`)
- `points_transactions` (`/app/backend/server.py:889-901`, `/app/backend/db_data/points_transactions.json`)
- `wallet_transactions` (`/app/backend/server.py:913-921`, `/app/backend/db_data/wallet_transactions.json`)
- `coupons` (`/app/backend/server.py:932-939`, `/app/backend/db_data/coupons.json`)
- `customer_app_config` (`/app/backend/server.py:970-1115`, `/app/backend/db_data/customer_app_config.json`)
- `feedback` (`/app/backend/server.py:1195-1215`, `/app/backend/db_data/feedback.json`)
- `loyalty_settings` (`/app/backend/server.py:1354-1387`, `/app/backend/db_data/loyalty_settings.json`)
- `dietary_tags_mapping` (`/app/backend/server.py:1450-1501`) — not listed in exported `db_data` README, so presence in current DB export is unclear from inspected files.
- `status_checks` (`/app/backend/server.py:1333-1348`) for basic health/status demo data.

## 11) Existing tests discovered
### Backend tests
- Generic API/status tests (`/app/backend/tests/test_api.py`)
- Config API tests (`/app/backend/tests/test_config_api.py`)
- Login/auth tests (`/app/backend/tests/test_login_auth.py`)
- Upload, QR, content, timing, banner, default pages, social field tests in `/app/backend/tests/`

### Frontend tests
- Component, page, context, service, util tests under `/app/frontend/src/__tests__/...` (see file inventory from glob output), including:
  - `pages/DeliveryAddress.test.js`
  - `pages/LandingPage.test.js`
  - `pages/OrderSuccess.test.js`
  - `pages/PasswordSetupOtp.test.js`
  - `services/orderService.test.js`
  - `utils/authToken.test.js`

## 12) Known inventory-level unclear areas
- `frontend/src/pages/AdminSettings.jsx` still exists alongside newer `/pages/admin/*` route set. It looks legacy/overlapping and is not wired from current `App.js` routes, but it is still in repo and uses backend config APIs (`/app/frontend/src/App.js:24-33`, `68-82`; fetch hits also found in grep).
- `stationService.js` defines station/category GET endpoints, but the customer UI mainly uses `menu-master` + `restaurant-product` flow via `useMenuData.js`; direct station endpoints may be unused in current flow (`/app/frontend/src/api/services/stationService.js:1-60`, `/app/frontend/src/hooks/useMenuData.js:179-231`).
- `utils/authToken.js` appears aimed at a different auth contract than current FastAPI `/api/auth/login` request schema, but documenting exact runtime impact requires execution tracing, which was out of scope for this discovery pass (`/app/frontend/src/utils/authToken.js:93-123` vs `/app/backend/server.py:60-66`, `460-575`).
