# MODULE_MAP

This map groups modules by currently discoverable user-facing or admin-facing behavior. Module names below are descriptive labels for documentation, not official code namespaces.

---

## 1) Restaurant Resolution & Scan Context
### Purpose
Resolve which restaurant/app context is active and whether the user arrived from a QR scan containing table/room/order-type metadata.

### User flow
- User lands on a route like `/:restaurantId`, `/?id=...`, or subdomain.
- App resolves restaurant identifier and optionally resolves subdomain to numeric restaurant ID.
- If QR parameters exist (`tableId`, `tableName`, `type`, `orderType`, `foodFor`), they are persisted for later pages.

### Related routes/screens
- All customer routes rely on this layer, especially:
  - `/:restaurantId`
  - `/:restaurantId/menu`
  - `/:restaurantId/review-order`
  - `/:restaurantId/order-success` (`/app/frontend/src/App.js:84-121`)

### Related components / hooks / utils
- `useRestaurantId` (`/app/frontend/src/utils/useRestaurantId.js:1-132`)
- `useScannedTable` (`/app/frontend/src/hooks/useScannedTable.js:1-92`)
- `orderTypeHelpers` usage in landing/review/success pages (`/app/frontend/src/pages/LandingPage.jsx:12`, `/app/frontend/src/pages/ReviewOrder.jsx:29`, `/app/frontend/src/pages/OrderSuccess.jsx:14`)

### Related API calls
- `getRestaurantDetails(identifier)` via `restaurantService` for subdomain → numeric ID resolution (`/app/frontend/src/utils/useRestaurantId.js:98-105`, `/app/frontend/src/api/services/restaurantService.js:14-24`)

### Related state / storage
- `sessionStorage[scanned_table_<restaurantId>]` for QR context (`/app/frontend/src/hooks/useScannedTable.js:20-21`, `49-52`, `85-88`)
- module-level cache `subdomainIdCache` in `useRestaurantId` (`/app/frontend/src/utils/useRestaurantId.js:16-18`, `83-104`)

### Dependencies on other modules
- Restaurant Data & Branding
- Landing / Browse Entry
- Order Review
- Order Success

### Known unclear areas
- Fallback default restaurant ID is hardcoded to `"478"`, which is explicit current behavior but environment intent is unclear (`/app/frontend/src/utils/useRestaurantId.js:112-120`).
- Some flows depend on QR params like `foodFor`, but the exact downstream usage is not fully visible in inspected files (`/app/frontend/src/hooks/useScannedTable.js:27`, `41-47`).

---

## 2) Restaurant Data & Branding
### Purpose
Fetch restaurant master data and local customer-app configuration, then apply branding/theming to the customer UI.

### User flow
- Customer enters a restaurant page.
- App fetches POS restaurant details and local config.
- CSS variables and page flags are derived from the config.
- Multiple pages consume this config for visibility, branding, powered-by footer, social links, banners, payment flags, notification popups.

### Related routes/screens
- `LandingPage`, `DiningMenu`, `MenuItems`, `AboutUs`, `ContactPage`, `FeedbackPage`, `ReviewOrder`, `OrderSuccess` (`/app/frontend/src/App.js:88-121`)

### Related components
- `RestaurantConfigProvider` (`/app/frontend/src/context/RestaurantConfigContext.jsx:119-437`)
- `PromoBanner`, `HamburgerMenu`, `NotificationPopup`, footer-related sections (`/app/frontend/src/pages/LandingPage.jsx:16-21`, `605-620`, `824-835`)

### Related API calls
- POS restaurant info: `getRestaurantDetails()` → POST `/web/restaurant-info` (`/app/frontend/src/api/services/restaurantService.js:14-24`, `/app/frontend/src/api/config/endpoints.js:21-23`)
- Own backend config: GET `/api/config/{restaurantId}` (`/app/frontend/src/context/RestaurantConfigContext.jsx:152-174`, `177-203`, `/app/backend/server.py:967-1090`)

### Related state / context / hooks
- `RestaurantConfigContext` (`/app/frontend/src/context/RestaurantConfigContext.jsx:1-437`)
- `useRestaurantDetails` (`/app/frontend/src/hooks/useMenuData.js:268-319`)

### Dependencies on other modules
- Restaurant Resolution & Scan Context
- Landing / Browse Entry
- Menu Browsing
- Review / Success
- Admin Configuration

### Known unclear areas
- Config defaults in frontend and backend are similar but not identical in every field/value; runtime precedence is backend response merged over frontend defaults (`/app/frontend/src/context/RestaurantConfigContext.jsx:9-117`, `/app/backend/server.py:975-1087`).
- Admin code also calls `/api/restaurant-info/{configId}`, but no matching backend route was found in `backend/server.py`; source may be another service or stale code path (`/app/frontend/src/context/AdminConfigContext.jsx:145-147`).

---

## 3) Authentication & Session Module
### Purpose
Support two parallel auth models:
- restaurant admin auth against own FastAPI backend
- customer auth against CRM API with restaurant-scoped tokens

### User flow
- Admin logs in from `/login` using email/password.
- Customer identity can be established from landing capture → password setup / OTP / skip OTP.
- Tokens are stored in browser storage and restored per restaurant context.

### Related routes/screens
- `/login` → `Login`
- `/:restaurantId/password-setup` → `PasswordSetup`
- `/profile` → `Profile` (`/app/frontend/src/App.js:65-66`, `84`)

### Related components / pages
- `Login.jsx` (`/app/frontend/src/pages/Login.jsx:1-160`)
- `PasswordSetup.jsx` (`/app/frontend/src/pages/PasswordSetup.jsx:1-712`)
- `Profile.jsx` (`/app/frontend/src/pages/Profile.jsx:1-340`)
- `AuthContext.jsx` (`/app/frontend/src/context/AuthContext.jsx:1-273`)

### Related API calls
#### Own backend auth
- `POST /api/auth/login` (`/app/frontend/src/context/AuthContext.jsx:145-149`, `/app/frontend/src/pages/Login.jsx:39-46`, `/app/backend/server.py:460-575`)
- `POST /api/auth/send-otp` (`/app/frontend/src/context/AuthContext.jsx:220-224`, `/app/backend/server.py:395-425`)
- `GET /api/auth/me` (`/app/frontend/src/context/AuthContext.jsx:40-42`, `/app/backend/server.py:577-583`)
- `POST /api/auth/check-customer` (`/app/frontend/src/pages/LandingPage.jsx:73-81`, `304-312`, `/app/backend/server.py:426-458`)

#### CRM auth
- `crmRegister`, `crmLogin`, `crmSendOtp`, `crmVerifyOtp`, `crmSkipOtp`, `crmForgotPassword`, `crmResetPassword`, `crmGetProfile` (`/app/frontend/src/api/services/crmService.js:191-580`)

### Related state / context / storage
- `AuthContext` state: `user`, `userType`, `token`, `crmToken`, `currentRestaurantId` (`/app/frontend/src/context/AuthContext.jsx:25-32`)
- localStorage keys:
  - `auth_token`
  - `crm_token_<restaurantId>`
  - `crm_token` legacy cleanup/migration
  - `pos_token`
  - `restaurant_context` (`/app/frontend/src/context/AuthContext.jsx:34-77`, `164-182`, `185-210`)

### Dependencies on other modules
- Landing / Browse Entry
- Delivery Address
- Profile & Loyalty
- Admin Layout / Admin Pages

### Known unclear areas
- `utils/authToken.js` is a separate token helper for order APIs and does not share storage with `AuthContext`; this is a parallel auth/session mechanism rather than a unified one (`/app/frontend/src/utils/authToken.js:7-8`, `131-162`).
- `crmForgotPassword` / `crmResetPassword` explicitly state v2 CRM has no equivalent and fallback to v1 path, expected to remain broken under v2 migration (`/app/frontend/src/api/services/crmService.js:378-412`).

---

## 4) Landing / Browse Entry Module
### Purpose
Act as the main restaurant landing screen, customer capture gate, order mode chooser, and edit-order detector for scanned dine-in tables.

### User flow
- Landing page fetches restaurant + config + stations.
- If landing customer capture is enabled or mode is takeaway/delivery, user enters name/phone.
- App checks whether customer exists and routes to password setup.
- If scanned table has active order, landing can auto-redirect to order success or show `EDIT ORDER`.
- Otherwise user continues to menu or stations.

### Related routes/screens
- `/:restaurantId` and `/` → `LandingPage` (`/app/frontend/src/App.js:113-121`)

### Related components
- `PromoBanner`, `HamburgerMenu`, `LandingCustomerCapture`, `OrderModeSelector`, `NotificationPopup` (`/app/frontend/src/pages/LandingPage.jsx:15-21`, `605-620`, `645-676`, `835`)

### Related API calls
- Customer lookup: POST `/api/auth/check-customer` (`/app/frontend/src/pages/LandingPage.jsx:73-81`, `304-312`)
- Table status: `checkTableStatus()` → POS API endpoint (`/app/frontend/src/pages/LandingPage.jsx:170-262`, `/app/frontend/src/api/services/orderService.ts:76-115`)
- Order details: `getOrderDetails()` (`/app/frontend/src/pages/LandingPage.jsx:211-238`, `398-460`, `/app/frontend/src/api/services/orderService.ts:120-235`)
- Restaurant + config fetches through hooks/contexts (`/app/frontend/src/pages/LandingPage.jsx:37-39`, `143-156`)

### Related state / hooks
- `useRestaurantId`, `useRestaurantDetails`, `useStations`, `useScannedTable`, `useAuth`, `useCart`, `useRestaurantConfig` (`/app/frontend/src/pages/LandingPage.jsx:29-39`)

### Dependencies on other modules
- Restaurant Resolution & Scan Context
- Restaurant Data & Branding
- Authentication & Session
- Order Review
- Order Success

### Known unclear areas
- `Call Waiter` and `Pay Bill` buttons only log TODO actions; no real API call exists in inspected code (`/app/frontend/src/pages/LandingPage.jsx:387-395`).
- Some order-mode conditions combine scan context and customer capture rules; exact intended behavior for every QR type would need runtime validation.

---

## 5) Menu Browsing Module
### Purpose
Load restaurant menus/categories/items and support both single-menu and multiple-menu (station/menu-master) restaurants.

### User flow
- For single-menu restaurants user goes directly to `/:restaurantId/menu`.
- For multiple-menu restaurants user may first see station list and then a station-specific menu.
- Menu data is transformed into app-specific section/item shapes.

### Related routes/screens
- `/:restaurantId/stations` → `DiningMenu`
- `/:restaurantId/menu`
- `/:restaurantId/menu/:stationId`
- fallback `/stations`, `/menu`, `/menu/:stationId` (`/app/frontend/src/App.js:88-93`, `117-119`)

### Related hooks / services / components
- `useMenuSections`, `useStations`, `useRestaurantDetails`, `useDietaryTags` (`/app/frontend/src/hooks/useMenuData.js:22-410`)
- `restaurantService.js` (`/app/frontend/src/api/services/restaurantService.js:1-103`)
- `stationService.js` exists but appears secondary to current hook usage (`/app/frontend/src/api/services/stationService.js:1-60`)
- menu-related UI components such as `MenuPanel`, `MenuItem`, `CategoryBox`, `FilterPanel`, `SearchAndFilterBar`, `StationCard`

### Related API calls
- POS restaurant info → POST `/web/restaurant-info` (`/app/frontend/src/api/services/restaurantService.js:14-24`)
- POS restaurant products → POST `/web/restaurant-product` (`/app/frontend/src/api/services/restaurantService.js:61-84`)
- POS menu master → POST `/web/menu-master` (`/app/frontend/src/api/services/restaurantService.js:86-91`)
- FastAPI dietary tags → GET `/api/dietary-tags/available`, GET `/api/dietary-tags/{restaurantId}` (`/app/frontend/src/hooks/useMenuData.js:363-399`, `/app/backend/server.py:1445-1469`)

### Related state / context
- React Query caches by restaurant/station keys (`/app/frontend/src/hooks/useMenuData.js:31-145`, `187-231`, `276-319`)
- Restaurant config controls visibility and branding (`/app/frontend/src/context/RestaurantConfigContext.jsx:307-419`)

### Dependencies on other modules
- Restaurant Resolution & Scan Context
- Restaurant Data & Branding
- Cart & Edit Order
- Dietary Tags Admin / Menu Admin (indirectly through shared data contracts)

### Known unclear areas
- Item image URL construction assumes `REACT_APP_IMAGE_BASE_URL/storage/<filename>` when image path is not absolute (`/app/frontend/src/hooks/useMenuData.js:69-84`).
- Direct station/category GET endpoints in `stationService.js` may be legacy or reserved; current page flow mainly uses `getMenuMaster` and `getRestaurantProducts`.

---

## 6) Cart, Edit Order & Review Module
### Purpose
Manage restaurant-scoped cart state, allow add/update/remove, support “edit existing order” mode, compute taxes/totals/loyalty discount, and submit or update orders.

### User flow
- User adds items into cart.
- Review page shows cart items, previous order items (if editing), customer details, optional loyalty/coupon sections, table/room context, payment selector.
- On place order, code either updates an existing order or places a new one.

### Related routes/screens
- `/:restaurantId/review-order`
- `/:restaurantId/:stationId/review-order` (`/app/frontend/src/App.js:105-108`)

### Related components / hooks
- `CartContext` (`/app/frontend/src/context/CartContext.js:1-553`)
- `ReviewOrder.jsx` (`/app/frontend/src/pages/ReviewOrder.jsx:1-1567`)
- `OrderItemCard`, `PreviousOrderItems`, `CustomerDetails`, `PaymentMethodSelector`, `TableRoomSelector`, `LoyaltyRewardsSection`, `ReviewOrderPriceBreakdown` (`/app/frontend/src/pages/ReviewOrder.jsx:15-31`)

### Related API calls
- `checkTableStatus()` (`/app/frontend/src/api/services/orderService.ts:76-115`)
- `getOrderDetails()` (`/app/frontend/src/api/services/orderService.ts:120-235`)
- `placeOrder()` (`/app/frontend/src/api/services/orderService.ts:248-361`)
- `updateCustomerOrder()` (`/app/frontend/src/api/services/orderService.ts:366-462`)
- GET `/api/loyalty-settings/{restaurant_id}` (`/app/frontend/src/pages/ReviewOrder.jsx:112-127`, `/app/backend/server.py:1354-1387`)
- GET `/api/customer-lookup/{restaurant_id}?phone=...` (`/app/frontend/src/pages/ReviewOrder.jsx:330-368`, `/app/backend/server.py:1389-1424`)
- Razorpay create order via `ENDPOINTS.RAZORPAY_CREATE_ORDER()` (`/app/frontend/src/pages/ReviewOrder.jsx:777-842`)

### Related state / storage
- cart, edit order, delivery address in `CartContext`
- customer details also mirrored to `sessionStorage['sessionCustomerInfo']` and `localStorage['guestCustomer']` (`/app/frontend/src/pages/ReviewOrder.jsx:160-172`, `210-264`)

### Dependencies on other modules
- Landing / Browse Entry
- Delivery Address
- POS API Integration
- Profile & Loyalty
- Order Success

### Known unclear areas
- Coupon input is rendered, but no coupon apply API or calculation logic was found in `ReviewOrder.jsx`; button currently appears UI-only in inspected code (`/app/frontend/src/pages/ReviewOrder.jsx:1382-1397`).
- Some table-selection validation is restaurant-specific (notably restaurant `716`) and partly hardcoded (`/app/frontend/src/pages/ReviewOrder.jsx:700-723`, `949-957`, `1049-1053`).

---

## 7) Order Success & Live Status Module
### Purpose
Display placed order summary, bill summary, per-item status, optional order-level tracker, and enable edit-order re-entry when applicable.

### User flow
- After placement/update, app navigates to order success with route state.
- Page polls order details every 60 seconds.
- If order becomes cancelled or paid, scanned/cart/edit state is cleared and user is redirected to landing.
- If scanned table still has active order, `EDIT ORDER` is offered unless status is “yet to be confirmed”.

### Related routes/screens
- `/:restaurantId/order-success` (`/app/frontend/src/App.js:111`)

### Related components
- `Header`, `NotificationPopup`, internal `ItemStatusBadge` in page (`/app/frontend/src/pages/OrderSuccess.jsx:17-24`, `48-94`)

### Related API calls
- `getOrderDetails()` polling (`/app/frontend/src/pages/OrderSuccess.jsx:209-348`)
- `checkTableStatus()` for merge/transfer detection (`/app/frontend/src/pages/OrderSuccess.jsx:226-243`, `409-423`)
- Razorpay verify payment endpoint (`/app/frontend/src/pages/OrderSuccess.jsx:156-207`)

### Related state / storage
- reads `orderData` from `location.state` (`/app/frontend/src/pages/OrderSuccess.jsx:139-147`)
- consumes scanned-table session, cart, edit-order state

### Dependencies on other modules
- Cart, Edit Order & Review
- Restaurant Resolution & Scan Context
- Restaurant Data & Branding

### Known unclear areas
- `Call Waiter` / `Pay Bill` still TODO here as on landing (`/app/frontend/src/pages/OrderSuccess.jsx:462-470`).
- Page assumes `location.state.orderData` is present and redirects otherwise; deep-linking behavior without route state is limited (`/app/frontend/src/pages/OrderSuccess.jsx:373-388`).

---

## 8) Delivery Address Module
### Purpose
Allow logged-in CRM customer to manage/select delivery addresses on a map, calculate deliverability/charge, and pass the selected address into cart state before menu browsing.

### User flow
- Customer in delivery mode is routed to delivery address page.
- Existing addresses are loaded from CRM.
- User can search Google Places, drag map pin, reverse geocode, check distance API, save/delete/default addresses, then continue to menu.

### Related routes/screens
- `/:restaurantId/delivery-address` (`/app/frontend/src/App.js:85`)

### Related components / hooks
- `DeliveryAddress.jsx` is largely self-contained (`/app/frontend/src/pages/DeliveryAddress.jsx:1-845`)
- uses `useAuth`, `useCart`, `useRestaurantConfig`

### Related API calls
- CRM addresses:
  - `crmGetAddresses`
  - `crmAddAddress`
  - `crmDeleteAddress`
  - `crmSetDefaultAddress` (`/app/frontend/src/pages/DeliveryAddress.jsx:7`, `128-151`, `317-352`, `354-380`)
- Google Geocoding APIs (`/app/frontend/src/pages/DeliveryAddress.jsx:191-204`, `267-296`)
- Google Places Autocomplete / Place details (`/app/frontend/src/pages/DeliveryAddress.jsx:427-537`)
- Manage distance API `/api/v1/config/distance-api-new` (`/app/frontend/src/pages/DeliveryAddress.jsx:209-241`)

### Related state / storage
- selected delivery address saved into `CartContext` and localStorage per restaurant (`/app/frontend/src/context/CartContext.js:482-506`, `/app/frontend/src/pages/DeliveryAddress.jsx:385-410`)

### Dependencies on other modules
- Authentication & Session
- Restaurant Resolution & Scan Context
- Cart, Edit Order & Review

### Known unclear areas
- `MANAGE_BASE_URL` falls back to `https://manage.mygenie.online`, unlike some other modules that fail visibly when env is absent (`/app/frontend/src/pages/DeliveryAddress.jsx:13-16`).
- Delivery charge logic is entirely dependent on the external distance API response fields (`shipping_status`, `shipping_charge`, `shipping_time`, `distance`) and not mirrored in backend.

---

## 9) Profile, Orders, Points & Wallet Module
### Purpose
Show CRM-authenticated customer profile details, orders, points ledger, and wallet ledger.

### User flow
- Authenticated customer opens `/profile`.
- Tabs load orders, points, and wallet lazily.
- Restaurant admins are redirected away from this page to `/admin/settings`.

### Related routes/screens
- `/profile` (`/app/frontend/src/App.js:66`)

### Related components / hooks
- `Profile.jsx` (`/app/frontend/src/pages/Profile.jsx:1-340`)
- `useAuth` provides current user and token (`/app/frontend/src/context/AuthContext.jsx:240-256`)

### Related API calls
- `crmGetOrders` (`/app/frontend/src/pages/Profile.jsx:53-64`, `/app/frontend/src/api/services/crmService.js:432-438`)
- `crmGetPoints` (`/app/frontend/src/pages/Profile.jsx:66-82`, `/app/frontend/src/api/services/crmService.js:440-446`)
- `crmGetWallet` (`/app/frontend/src/pages/Profile.jsx:84-103`, `/app/frontend/src/api/services/crmService.js:448-454`)

### Related state / context
- `AuthContext` user and token
- local component state for fetched tab data (`/app/frontend/src/pages/Profile.jsx:17-21`)

### Dependencies on other modules
- Authentication & Session
- CRM API Integration

### Known unclear areas
- Profile update functionality exists in backend (`PUT /api/customer/profile`) but was not found wired into the current `Profile.jsx` UI (`/app/backend/server.py:941-961`).

---

## 10) Admin Layout & Config Management Module
### Purpose
Provide the web admin shell for restaurant operators to configure public app settings, branding, visibility, banners, content, menu order, dietary tags, and QR codes.

### User flow
- Admin logs in.
- `AdminLayout` checks token and role.
- `AdminConfigProvider` loads current config and tracks unsaved changes.
- Nested admin pages edit slices of that config and rely on a global Save button.

### Related routes/screens
- `/admin/settings`
- `/admin/branding`
- `/admin/visibility`
- `/admin/banners`
- `/admin/content`
- `/admin/menu`
- `/admin/dietary`
- `/admin/qr-scanners` (`/app/frontend/src/App.js:69-79`)

### Related components / pages
- `AdminLayout.jsx` (`/app/frontend/src/layouts/AdminLayout.jsx:1-169`)
- `AdminConfigContext.jsx` (`/app/frontend/src/context/AdminConfigContext.jsx:1-376`)
- `AdminSettingsPage.jsx` (`/app/frontend/src/pages/admin/AdminSettingsPage.jsx:1-612`)
- other `/pages/admin/*` pages and `components/AdminSettings/*`

### Related API calls
- GET `/api/config/{configId}` (`/app/frontend/src/context/AdminConfigContext.jsx:145-156`)
- PUT `/api/config/` (`/app/frontend/src/context/AdminConfigContext.jsx:194-223`)
- banner CRUD (`/app/frontend/src/context/AdminConfigContext.jsx:231-323`, `/app/backend/server.py:1117-1182`)
- image upload (`/app/frontend/src/context/AdminConfigContext.jsx:326-350`, `/app/backend/server.py:1293-1314`)
- attempted GET `/api/restaurant-info/{configId}` (`/app/frontend/src/context/AdminConfigContext.jsx:145-166`)

### Related state / context
- `config`, `originalConfig`, `isDirty`, `saving`, `restaurantFlags` in `AdminConfigContext` (`/app/frontend/src/context/AdminConfigContext.jsx:125-223`)

### Dependencies on other modules
- Authentication & Session
- Backend Config/Upload module
- Content Management
- Menu Visibility & Ordering
- Dietary Tags Admin
- QR Admin

### Known unclear areas
- `restaurantFlags` are sourced from `/api/restaurant-info/{configId}`, but no matching route was found in the inspected FastAPI backend.
- There is still a legacy `pages/AdminSettings.jsx` file that overlaps with new admin architecture but is not currently routed from `App.js`.

---

## 11) Content Management Module
### Purpose
Allow admins to edit About Us, Contact, Footer, Feedback settings, Extra Info footer bullets, custom pages, and navigation ordering.

### User flow
- Admin opens `Content` area in admin.
- Rich text editors manage HTML content.
- Custom pages can be created/edited/deleted.
- Navigation items can be reordered and visibility toggled.

### Related routes/screens
- `/admin/content` → `AdminContentPage` (page wrapper not fully inspected)

### Related components
- `ContentTab.jsx` (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:1-505`)
- tiptap editor toolbar and DnD navigation management inside same file

### Related API calls
- `POST /api/config/pages`
- `PUT /api/config/pages/{page_id}`
- `DELETE /api/config/pages/{page_id}` (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:142-199`, `/app/backend/server.py:1233-1284`)
- image upload via shared `uploadImage` passed from admin context (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:257-276`)

### Related state / context
- receives `config`, `setConfig`, `token`, `uploadImage` props from admin page/context

### Dependencies on other modules
- Admin Layout & Config Management
- Backend Config/Upload module

### Known unclear areas
- Public rendering for `customPages` routes was not found in `App.js`; config stores them and nav menu references them, but customer-side page route resolution was not visible in inspected files.

---

## 12) Menu Visibility, Ordering & Timing Admin Module
### Purpose
Allow admins to reorder categories/items (and station/category/item hierarchies for multiple-menu restaurants), toggle visibility, and override category/item timing windows.

### User flow
- Admin opens `/admin/menu`.
- App detects whether restaurant is multi-menu.
- Categories/items (or station → categories → items) are loaded from POS APIs.
- Admin drags/reorders, toggles visibility, and edits timings; data is stored into config state for save.

### Related routes/screens
- `/admin/menu` → `AdminMenuPage` (wrapper) using `MenuOrderTab`

### Related components
- `MenuOrderTab.jsx` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:1-924`)

### Related API calls
- `getRestaurantDetails` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:310-313`)
- `getMenuMaster` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:316-330`)
- `getRestaurantProducts` for category/item trees (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:333-390`)
- persistence occurs indirectly when global config save calls PUT `/api/config/`

### Related state / context
- Writes into `config.menuOrder`, `config.categoryTimings`, `config.itemTimings` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:430-562`)

### Dependencies on other modules
- Admin Layout & Config Management
- POS API Integration
- Restaurant Data & Branding

### Known unclear areas
- Saved menu-order data format is frontend-defined and stored in generic config; no dedicated backend validation schema beyond `menuOrder`, `categoryTimings`, `itemTimings` accepting dict/list fields (`/app/backend/server.py:193`, `217-218`).

---

## 13) Dietary Tags Admin Module
### Purpose
Provide admin-side mapping of restaurant menu items to a predefined global dietary-tag list.

### User flow
- Admin loads available dietary tags and current restaurant mappings.
- Menu items are fetched from POS products API.
- Admin toggles tags per item; changes auto-save to backend after debounce.

### Related routes/screens
- `/admin/dietary` → `AdminDietaryPage`

### Related components
- `DietaryTagsAdmin.jsx` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:1-420`)

### Related API calls
- FastAPI dietary endpoints:
  - GET `/api/dietary-tags/available`
  - GET `/api/dietary-tags/{restaurant_id}`
  - PUT `/api/dietary-tags/{restaurant_id}` (`/app/frontend/src/api/services/dietaryTagsService.js:1-51`, `/app/backend/server.py:1445-1501`)
- POS menu data via `getRestaurantProducts` / `getMenuMaster` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:44-97`, `28-41`)

### Related state / context
- local component state `menuItems`, `availableTags`, `mappings`, debounce refs (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:10-26`, `99-142`)

### Dependencies on other modules
- Admin Layout & Config Management
- Menu Browsing / POS product contracts
- Backend Dietary Tags module

### Known unclear areas
- Backend writes `updated_by` from `payload.get("sub")`, but issued JWT payload appears to use `user_id` / `user_type`, not `sub`; this may affect audit metadata only (`/app/backend/server.py:274-280`, `1491-1496`).

---

## 14) QR Admin Module
### Purpose
Allow restaurant admins to fetch POS table/room QR metadata, render QR codes, filter by table/room and menu, and bulk-download PNG ZIPs.

### User flow
- Admin opens `/admin/qr-scanners`.
- Frontend requests FastAPI `/api/table-config` with own JWT + `X-POS-Token` from localStorage.
- Backend proxies to POS v2 table-config endpoint and returns normalized tables/rooms/subdomain metadata.
- Admin can download individual or bulk QR codes.

### Related routes/screens
- `/admin/qr-scanners` (`/app/frontend/src/App.js:78`)

### Related components
- `AdminQRPage.jsx` (`/app/frontend/src/pages/admin/AdminQRPage.jsx:1-379`)
- `OrderTypeCard`, `TableQRCard` inside same file

### Related API calls
- GET `/api/table-config` (`/app/frontend/src/pages/admin/AdminQRPage.jsx:100-144`, `/app/backend/server.py:809-877`)

### Related state / storage
- depends on `localStorage['pos_token']` set during admin login (`/app/frontend/src/pages/Login.jsx:60-62`, `/app/frontend/src/pages/admin/AdminQRPage.jsx:104-112`)

### Dependencies on other modules
- Authentication & Session
- POS API Integration

### Known unclear areas
- QR URLs are taken from POS response `qr_code_urls`, and selected menu names are dynamic. There is no local generation rule beyond using the returned URL strings.

---

## 15) Backend Config / Feedback / Upload / Dietary Module
### Purpose
Provide the app-owned backend data layer for restaurant app config, banners, feedback, custom pages, image uploads, loyalty settings, customer lookup, and dietary mappings.

### User flow
- Public customer pages read config and feedback submission endpoints.
- Admin pages authenticate via restaurant token and mutate config, pages, banners, dietary mappings, uploads.

### Related routes
- `/api/config/{restaurant_id}` public GET
- `/api/config/` protected PUT
- `/api/config/banners*`
- `/api/config/feedback`
- `/api/config/pages*`
- `/api/upload/image`
- `/api/dietary-tags/*`
- `/api/loyalty-settings/{restaurant_id}`
- `/api/customer-lookup/{restaurant_id}` (`/app/backend/server.py:967-1501`, `1354-1424`)

### Related collections
- `customer_app_config`, `feedback`, `loyalty_settings`, `customers`, `dietary_tags_mapping` (`/app/backend/server.py:970-971`, `1206`, `1358`, `1401`, `1453`, `1488`)

### Dependencies on other modules
- Admin Layout & Config Management
- Content Management
- Dietary Tags Admin
- Cart / Review
- Landing / Feedback

### Known unclear areas
- There is no dedicated backend route in `server.py` for `/api/restaurant-info/{id}` although admin context expects one.

---

## 16) POS Integration Module
### Purpose
Bridge frontend and backend to MyGenie/POS APIs for restaurant info, menu master, restaurant products, table status, order details, order placement/update, QR/table config, and Razorpay handoff.

### User flow
- Frontend talks directly to POS-facing base URL for most restaurant/menu/order operations.
- FastAPI backend proxies only selected POS operations (`table-config`, `air-bnb/get-order-details`, admin POS token refresh during login).

### Related files
- Frontend endpoint map and services:
  - `/app/frontend/src/api/config/endpoints.js`
  - `/app/frontend/src/api/services/orderService.ts`
  - `/app/frontend/src/api/services/restaurantService.js`
- Backend POS bridge:
  - `refresh_pos_token()` (`/app/backend/server.py:347-389`)
  - `get_order_details()` proxy (`/app/backend/server.py:788-807`)
  - `get_table_config()` proxy (`/app/backend/server.py:809-877`)

### Related modules depending on it
- Restaurant Data & Branding
- Menu Browsing
- Cart, Edit Order & Review
- Order Success
- QR Admin
- Menu Admin / Dietary Admin

### Known unclear areas
- POS contract details such as `zoneId`, exact order payload schema, and payment endpoints are discoverable from code but not validated against live API in this documentation pass.

---

## 17) CRM Integration Module
### Purpose
Support customer auth, profile, orders, points, wallet, and delivery addresses via an external CRM service, with a version-adapter layer for CRM v1/v2 contracts.

### User flow
- Landing/Password Setup/Profile/Delivery Address modules call CRM through `crmService.js`.
- `crmFetch` derives per-restaurant API keys and unwraps v2 envelopes.

### Related files
- `crmService.js` (`/app/frontend/src/api/services/crmService.js:1-580`)
- `AuthContext.jsx`, `PasswordSetup.jsx`, `Profile.jsx`, `DeliveryAddress.jsx`

### Related modules depending on it
- Authentication & Session
- Delivery Address
- Profile, Orders, Points & Wallet

### Known unclear areas
- The exact current deployed CRM version depends on `REACT_APP_CRM_API_VERSION`; code supports both, but environment value was not inspected from `.env` in this pass.
`