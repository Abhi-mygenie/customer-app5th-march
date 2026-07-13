# API_USAGE_MAP

This document separates API usage into:
1. POS API usage
2. Own backend API usage
3. CRM API usage

Notes:
- “Response fields not used” only lists fields that are visible from current code paths. It is not a guarantee of full payload coverage unless the response shape is fully visible in code.
- Where payload/response contracts come from external APIs, uncertainty is called out.

---

# A) POS API USAGE MAP

## A1. POST `/web/restaurant-info`
### Method
- POST

### Used in file/function
- `getRestaurantDetails(identifier)` (`/app/frontend/src/api/services/restaurantService.js:14-24`)
- consumed by `useRestaurantDetails()` (`/app/frontend/src/hooks/useMenuData.js:273-319`)
- used in subdomain resolution (`/app/frontend/src/utils/useRestaurantId.js:98-105`)
- consumed by pages like `LandingPage`, `ReviewOrder`, `OrderSuccess` (`/app/frontend/src/pages/LandingPage.jsx:37-39`, `/app/frontend/src/pages/ReviewOrder.jsx:97-103`, `/app/frontend/src/pages/OrderSuccess.jsx:121-124`)

### Request payload
```json
{ "restaurant_web": "<restaurantId or subdomain>" }
```
Source: `/app/frontend/src/api/services/restaurantService.js:16-19`

### Response fields used in UI
- `id` → canonical numeric restaurant id (`/app/frontend/src/hooks/useMenuData.js:291-301`)
- `name` (`/app/frontend/src/pages/LandingPage.jsx:479`, `/app/frontend/src/pages/Login.jsx:98-107`)
- `subdomain` for cache normalization (`/app/frontend/src/hooks/useMenuData.js:293-301`)
- `multiple_menu` to detect multi-menu behavior (`/app/frontend/src/api/utils/restaurantIdConfig.js:12-14`)
- `is_loyalty`, `is_coupon` in review / admin config flags (`/app/frontend/src/pages/ReviewOrder.jsx:411-428`, `/app/frontend/src/context/AdminConfigContext.jsx:159-166` though admin route source differs)
- `gst_status`, `total_round`, `razorpay.razorpay_key`, `phone` (`/app/frontend/src/pages/ReviewOrder.jsx:444-454`, `524-571`, `591-594`; `/app/frontend/src/pages/OrderSuccess.jsx:491`; `/app/frontend/src/pages/LandingPage.jsx:484`)

### Response fields not clearly used
- Any additional restaurant metadata beyond the fields above is not evidenced in inspected code.

### Error handling
- Service rethrows errors (`/app/frontend/src/api/services/restaurantService.js:20-23`)
- `useRestaurantDetails` surfaces query error (`/app/frontend/src/hooks/useMenuData.js:276-317`)
- `LandingPage` renders generic failure message if restaurant load fails (`/app/frontend/src/pages/LandingPage.jsx:467-476`)

### Auth/header dependency
- Through shared axios client. No explicit auth header added in service function (`/app/frontend/src/api/services/restaurantService.js:14-24`).
- Global axios interceptors may attach token if present (`/app/frontend/src/api/interceptors/request.js:28-46`).

### Module using it
- Restaurant Resolution & Scan Context
- Restaurant Data & Branding
- Menu Browsing
- Review / Success

---

## A2. POST `/web/restaurant-product`
### Method
- POST

### Used in file/function
- `getRestaurantProducts(restaurantId, categoryId = "0", stationId)` (`/app/frontend/src/api/services/restaurantService.js:61-84`)
- `useMenuSections()` (`/app/frontend/src/hooks/useMenuData.js:42-145`)
- `MenuOrderTab` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:333-390`)
- `DietaryTagsAdmin` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:59-97`)

### Request payload
Single-menu:
```json
{ "restaurant_id": "<id>", "category_id": "0" }
```
Multi-menu/station filter:
```json
{ "restaurant_id": "<id>", "category_id": "0", "food_for": "<stationId/menu name>" }
```
Source: `/app/frontend/src/api/services/restaurantService.js:63-79`

### Response fields used in UI
From `products[]`:
- `category_id`, `category_name`, `category_image` (`/app/frontend/src/hooks/useMenuData.js:109-114`)
- `items[]` fields used:
  - `id`, `name`, `description`, `price`, `image`, `veg`, `variations`, `add_ons`, `kcal`, `portion_size`, `station_name`, `live_web`, `web_available_time_starts`, `web_available_time_ends`, `tax`, `tax_type` (`/app/frontend/src/hooks/useMenuData.js:63-106`)
- admin menu ordering additionally uses item timing fields (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:344-349`, `376-380`)
- dietary admin uses `id`, `name`, `veg`, `category_name`, `category_id` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:69-85`)

### Response fields not clearly used
- Any product/category fields besides the ones above.

### Error handling
- Service rethrows (`/app/frontend/src/api/services/restaurantService.js:80-83`)
- `useMenuSections` has dev-only fallback to local JSON if API fails (`/app/frontend/src/hooks/useMenuData.js:127-139`)
- admin consumers show toast/logging on failure (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:353-357`, `386-389`; `/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:88-93`)

### Auth/header dependency
- No explicit auth in service; shared axios interceptors may attach one if present.

### Module using it
- Menu Browsing
- Menu Visibility, Ordering & Timing Admin
- Dietary Tags Admin

---

## A3. POST `/web/menu-master`
### Method
- POST

### Used in file/function
- `getMenuMaster(restaurantId)` (`/app/frontend/src/api/services/restaurantService.js:86-91`)
- `useStations()` (`/app/frontend/src/hooks/useMenuData.js:179-231`)
- `MenuOrderTab` (`/app/frontend/src/components/AdminSettings/MenuOrderTab.jsx:316-330`)
- `DietaryTagsAdmin` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:28-41`)

### Request payload
```json
{ "restaurant_id": "<id>" }
```
Source: `/app/frontend/src/api/services/restaurantService.js:86-89`

### Response fields used in UI
From `menus[]`:
- `menu_name`
- `id`
- `image`
- `description`
- `opening_time`
- `closing_time` (`/app/frontend/src/hooks/useMenuData.js:190-216`)

### Response fields not clearly used
- Any other `menus[]` fields not listed above.

### Error handling
- Service does not catch errors; calling hooks/components handle or inherit query errors.

### Auth/header dependency
- No explicit auth in service.

### Module using it
- Menu Browsing
- Menu Visibility, Ordering & Timing Admin
- Dietary Tags Admin

---

## A4. POST `/web/table-config`
### Method
- POST

### Used in file/function
- `getTableConfig(restaurantId)` (`/app/frontend/src/api/services/tableRoomService.js:15-53`)
- consumed by `useTableConfig()` (`/app/frontend/src/hooks/useMenuData.js:327-356`)
- used by `ReviewOrder` table selector (`/app/frontend/src/pages/ReviewOrder.jsx:129-131`)

### Request payload
```json
{ "restaurant_id": "<restaurantId>" }
```
Source: `/app/frontend/src/api/services/tableRoomService.js:17-20`

### Response fields used in UI
- `tables[]` array expected by this frontend service (`/app/frontend/src/api/services/tableRoomService.js:25-48`)
- each item fields used: `id`, `table_no`, `rtype`

### Response fields not clearly used
- Any non-table metadata returned by the endpoint.

### Error handling
- Service logs and rethrows (`/app/frontend/src/api/services/tableRoomService.js:49-52`)
- hook returns error/errorMessage (`/app/frontend/src/hooks/useMenuData.js:348-354`)

### Auth/header dependency
- No explicit auth in this service call.

### Module using it
- Cart, Edit Order & Review

### Unclear area
- This direct POS endpoint exists alongside own backend `/api/table-config`, which is used by Admin QR. They are separate flows (`/app/frontend/src/api/services/tableRoomService.js:15-53` vs `/app/frontend/src/pages/admin/AdminQRPage.jsx:108-118`).

---

## A5. GET `/customer/check-table-status?table_id={tableId}&restaurant_id={restaurantId}`
### Method
- GET

### Used in file/function
- `checkTableStatus(tableId, restaurantId, authToken)` (`/app/frontend/src/api/services/orderService.ts:76-115`)
- called from `LandingPage`, `ReviewOrder`, `OrderSuccess` (`/app/frontend/src/pages/LandingPage.jsx:195-196`, `/app/frontend/src/pages/ReviewOrder.jsx:872-873`, `959`, `/app/frontend/src/pages/OrderSuccess.jsx:228-232`, `412-414`)

### Request payload
- Query params only: `table_id`, `restaurant_id`

### Headers/auth
- `Authorization: Bearer <authToken>`
- `zoneId: 3`
- `Content-Type: application/json; charset=UTF-8` (`/app/frontend/src/api/services/orderService.ts:82-90`)

### Response fields used in UI
- `status.table_status`
- `status.order_id` (`/app/frontend/src/api/services/orderService.ts:93-103`)

### Response fields not used
- Any other `status` object fields.

### Error handling
- Function swallows errors and returns a safe fallback object with `error` message (`/app/frontend/src/api/services/orderService.ts:104-114`)
- callers use that fallback to allow safe browsing or redirect logic.

### Module using it
- Landing / Browse Entry
- Cart, Edit Order & Review
- Order Success

---

## A6. GET `/air-bnb/get-order-details/{orderId}`
### Method
- GET

### Used in file/function
- `getOrderDetails(orderId)` (`/app/frontend/src/api/services/orderService.ts:120-235`)
- called from `LandingPage`, `ReviewOrder`, `OrderSuccess` (`/app/frontend/src/pages/LandingPage.jsx:214`, `404`, `/app/frontend/src/pages/ReviewOrder.jsx:892`, `/app/frontend/src/pages/OrderSuccess.jsx:215`, `425`)

### Request payload
- Path param only.

### Response fields used in UI
Top-level:
- `details[]`
- `table_no`
- `table_id`
- `order_status`
- `order_type`
- `restaurant`
- `delivery_charge` (`/app/frontend/src/api/services/orderService.ts:135-139`, `204-229`)

From `details[0]` and individual detail rows:
- `order_discount`
- `f_order_status`
- `restaurant_order_id`
- `order_amount`
- `order_sub_total_amount`
- `order_sub_total_without_tax`
- per-item item/order fields consumed by `transformPreviousOrderItem` and legacy aliases (`/app/frontend/src/api/services/orderService.ts:137-202`)

### Response fields not clearly used
- Any additional item/order fields not passed through transformer or listed above.

### Error handling
- Service logs then throws (`/app/frontend/src/api/services/orderService.ts:231-234`)
- backend proxy returns 404 / upstream status / 503 on request failure (`/app/backend/server.py:788-807`)

### Auth/header dependency
- Frontend direct call uses shared axios client and only explicit `Content-Type` (`/app/frontend/src/api/services/orderService.ts:128-133`)
- Backend proxy to POS adds `Content-Type: application/json` only (`/app/backend/server.py:795-798`)

### Module using it
- Landing / Browse Entry
- Cart, Edit Order & Review
- Order Success

---

## A7. POST `/customer/order/place`
### Method
- POST multipart/form-data

### Used in file/function
- `placeOrder(orderData)` for standard and most multi-menu orders (`/app/frontend/src/api/services/orderService.ts:248-361`)
- called from `ReviewOrder.handlePlaceOrder()` (`/app/frontend/src/pages/ReviewOrder.jsx:1000-1024`, `1134-1153` retry)

### Request payload
Multipart form with one field:
- `data`: JSON string payload containing fields such as:
  - `address_id`, `dial_code`, `payment_id`, `payment_type`, `delivery_charge`, `pincode`, `table_id`, `cart`, `cust_name`, `cust_phone`, `order_amount`, `order_note`, `order_type`, `coupon_code`, `restaurant_id`, `address`, `latitude`, `longitude`, `discount_amount`, `tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `points_redeemed`, `points_discount`, etc. (`/app/frontend/src/api/services/orderService.ts:285-345`)
- Multi-menu payload is built by `buildMultiMenuPayload(orderData, gstEnabled)` and also sent as `data` JSON (`/app/frontend/src/api/services/orderService.ts:256-277`)

### Headers/auth
- `Accept: application/json`
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <orderData.authToken>`
- `zoneId: '3'` for normal flow, `'[1]'` for multi-menu flow
- some multi-menu requests add `X-localization`, `latitude`, `longitude` (`/app/frontend/src/api/services/orderService.ts:265-275`, `347-354`)

### Response fields used in UI
- `order_id`
- `total_amount`
- `razorpay_id` (to branch into payment flow) (`/app/frontend/src/pages/ReviewOrder.jsx:775`, `810`, `1031-1036`, `1059-1060`)

### Response fields not clearly used
- Any other order response fields beyond those listed.

### Error handling
- `placeOrder()` logs and throws (`/app/frontend/src/api/services/orderService.ts:357-360`)
- `ReviewOrder` has extensive error handling including duplicate-order warning on network loss and 401 retry (`/app/frontend/src/pages/ReviewOrder.jsx:1069-1208`)

### Module using it
- Cart, Edit Order & Review

---

## A8. POST `/customer/order/autopaid-place-prepaid-order`
### Method
- POST multipart/form-data

### Used in file/function
- `placeOrder(orderData)` only when `isMultiMenu === true` and `restaurantId === '716'` (`/app/frontend/src/api/services/orderService.ts:254-277`)

### Request payload
- Same pattern as multi-menu `placeOrder`: multipart form field `data` with JSON from `buildMultiMenuPayload(...)`.

### Response fields used in UI
- same as order placement: `order_id`, `total_amount`, possibly `razorpay_id`

### Response fields not clearly used
- other fields not evidenced.

### Error handling
- same as above because handled by same caller path.

### Auth/header dependency
- same headers as multi-menu flow (`/app/frontend/src/api/services/orderService.ts:265-275`)

### Module using it
- Cart, Edit Order & Review

### Unclear area
- This endpoint is hard-switched for restaurant `716`; no generalized config-driven rule was found.

---

## A9. POST `/customer/order/update-customer-order`
### Method
- POST multipart/form-data

### Used in file/function
- `updateCustomerOrder({...})` (`/app/frontend/src/api/services/orderService.ts:366-462`)
- called by `ReviewOrder` during edit mode (`/app/frontend/src/pages/ReviewOrder.jsx:900-916`, `926-942`, `1108-1124`)

### Request payload
Multipart form with `data` JSON containing:
- `order_id`, `table_id`, `cart`, `cust_name`, `cust_phone`, `order_amount`, `order_note`, `order_type`, `restaurant_id`, `discount_amount`, `tax_amount`, `order_sub_total_amount`, `points_redeemed`, `points_discount`, etc. (`/app/frontend/src/api/services/orderService.ts:390-442`)

### Headers/auth
- `Accept: application/json`
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <authToken>`
- `zoneId: '3'` (`/app/frontend/src/api/services/orderService.ts:444-454`)

### Response fields used in UI
- `order_id`
- `total_amount` (`/app/frontend/src/pages/ReviewOrder.jsx:1184-1185`)

### Response fields not clearly used
- other fields not evidenced.

### Error handling
- service logs and throws (`/app/frontend/src/api/services/orderService.ts:458-460`)
- page handles order-status verification before update and retry logic after 401 (`/app/frontend/src/pages/ReviewOrder.jsx:863-945`, `1083-1197`)

### Module using it
- Cart, Edit Order & Review

---

## A10. POST `/razor-pay/create-razor-order`
### Method
- POST

### Used in file/function
- `ReviewOrder.openRazorpayCheckout()` (`/app/frontend/src/pages/ReviewOrder.jsx:777-788`)

### Request payload
```json
{ "order_id": "<placedOrderId>" }
```

### Response fields used in UI
- `key`
- `amount_in_paise`
- `order_id`
- maybe `error`, `message` (`/app/frontend/src/pages/ReviewOrder.jsx:783-798`)

### Response fields not clearly used
- any other fields not listed.

### Error handling
- if response JSON has `error`, caller throws (`/app/frontend/src/pages/ReviewOrder.jsx:786-788`)
- outer Razorpay branch catches and shows toast (`/app/frontend/src/pages/ReviewOrder.jsx:1033-1043`, `1159-1169`)

### Auth/header dependency
- No explicit auth header; only `Accept` and `Content-Type` (`/app/frontend/src/pages/ReviewOrder.jsx:777-781`)

### Module using it
- Cart, Edit Order & Review

---

## A11. POST `/razor-pay/verify-payment`
### Method
- POST

### Used in file/function
- `OrderSuccess` payment verification effect (`/app/frontend/src/pages/OrderSuccess.jsx:156-207`)

### Request payload
```json
{
  "razorpay_order_id": "...",
  "razorpay_payment_id": "...",
  "razorpay_signature": "..."
}
```

### Response fields used in UI
- `status`
- `message` (`/app/frontend/src/pages/OrderSuccess.jsx:191-197`)

### Response fields not clearly used
- any extra verification metadata.

### Error handling
- fetch `catch` shows generic payment verification failure toast (`/app/frontend/src/pages/OrderSuccess.jsx:198-203`)

### Auth/header dependency
- No auth shown; only `Accept` + `Content-Type`.

### Module using it
- Order Success & Live Status

---

# B) OWN BACKEND API USAGE MAP

## B1. POST `/api/auth/login`
### Method
- POST

### Used in file/function
- `AuthContext.login()` (`/app/frontend/src/context/AuthContext.jsx:131-174`)
- admin login page `handleAdminLogin()` (`/app/frontend/src/pages/Login.jsx:30-75`)

### Request payload
- Admin/customer unified payload shape:
```json
{
  "phone_or_email": "...",
  "password": "..." | null,
  "otp": "..." | null,
  "restaurant_id": "..." | null,
  "pos_id": "0001" | optional
}
```
Source: frontend (`/app/frontend/src/context/AuthContext.jsx:132-149`, `/app/frontend/src/pages/Login.jsx:42-45`) and backend model (`/app/backend/server.py:60-66`)

### Response fields used in UI
- `success`
- `user_type`
- `token`
- `pos_token` (admin QR/POS ops)
- `user`
- `restaurant_context` (`/app/frontend/src/context/AuthContext.jsx:164-173`, `/app/frontend/src/pages/Login.jsx:58-66`)

### Response fields not used
- none beyond the model fields are evident.

### Error handling
- frontend validates JSON content-type in `AuthContext.login()` and throws friendly message for non-JSON (`/app/frontend/src/context/AuthContext.jsx:151-162`)
- `Login.jsx` parses raw text then throws `data.detail` (`/app/frontend/src/pages/Login.jsx:48-56`)
- backend raises 400/401/404 depending on path (`/app/backend/server.py:497-505`, `540-548`, `575`)

### Auth/header dependency
- No auth required
- backend may refresh POS token for restaurant user using `MYGENIE_API_URL` (`/app/backend/server.py:550-563`)

### Module using it
- Authentication & Session
- Admin Layout & Config Management

---

## B2. GET `/api/auth/me`
### Method
- GET

### Used in file/function
- admin auth restoration effect in `AuthContext` (`/app/frontend/src/context/AuthContext.jsx:35-62`)

### Request payload
- none

### Headers/auth
- `Authorization: Bearer <auth_token>` (`/app/frontend/src/context/AuthContext.jsx:40-42`)

### Response fields used in UI
- `user_type`
- `user` (`/app/frontend/src/context/AuthContext.jsx:48-53`, `/app/backend/server.py:577-583`)

### Response fields not used
- none

### Error handling
- content-type checked in frontend, silent failure clears local token (`/app/frontend/src/context/AuthContext.jsx:43-59`)
- backend 401 if token invalid / user missing (`/app/backend/server.py:282-317`)

### Module using it
- Authentication & Session

---

## B3. POST `/api/auth/send-otp`
### Method
- POST

### Used in file/function
- `AuthContext.sendOTP()` (`/app/frontend/src/context/AuthContext.jsx:213-238`)

### Request payload
```json
{ "phone": "...", "restaurant_id": "..."?, "pos_id": "0001"? }
```

### Response fields used in UI
- `success`
- `message`
- `otp_for_testing` may be returned but not consumed in main UI (`/app/backend/server.py:420-424`)

### Response fields not used
- `otp_for_testing` in current main frontend path appears unused.

### Error handling
- same non-JSON guard as `AuthContext.login()` (`/app/frontend/src/context/AuthContext.jsx:226-236`)
- backend 404 if phone unregistered for restaurant (`/app/backend/server.py:414-419`)

### Module using it
- Authentication & Session

---

## B4. POST `/api/auth/check-customer`
### Method
- POST

### Used in file/function
- Landing page auto-lookup and browse action (`/app/frontend/src/pages/LandingPage.jsx:73-81`, `304-312`)

### Request payload
```json
{ "phone": "...", "restaurant_id": "...", "pos_id": "0001" }
```

### Response fields used in UI
- `exists`
- `customer.name`
- `customer.phone`
- `customer.has_password` (`/app/frontend/src/pages/LandingPage.jsx:84-98`, `330-359`; `/app/backend/server.py:449-458`)

### Response fields not used
- `customer` object field `id` returned by backend is not used in inspected landing flow (`/app/backend/server.py:446`, `449-456`)

### Error handling
- frontend catches lookup failures and falls back to guest menu navigation (`/app/frontend/src/pages/LandingPage.jsx:314-325`)

### Module using it
- Landing / Browse Entry
- Authentication & Session

---

## B5. POST `/api/auth/set-password`
### Method
- POST

### Used in file/function
- Not used by current customer password setup page; current page uses CRM instead (`/app/frontend/src/pages/PasswordSetup.jsx:5`, `185-214`)

### Request payload
Backend expects:
```json
{
  "phone": "...",
  "password": "...",
  "confirm_password": "...",
  "restaurant_id": "...",
  "pos_id": "0001"?,
  "name": "..."?
}
```
(`/app/backend/server.py:232-238`, `585-655`)

### Response fields used in UI
- No current inspected frontend consumer.

### Response fields not used
- `token`, `customer`, `message` currently appear unused by inspected frontend.

### Error handling
- backend validates password length and matching confirmation (`/app/backend/server.py:590-593`)

### Module using it
- Backend auth capability exists, but current frontend customer auth path is CRM-based.

---

## B6. POST `/api/auth/verify-password`
### Method
- POST

### Used in file/function
- No current inspected frontend consumer.

### Request payload
```json
{ "phone": "...", "password": "...", "restaurant_id": "...", "pos_id": "0001"? }
```
(`/app/backend/server.py:240-244`, `656-699`)

### Response fields used / not used
- No inspected frontend usage.

### Module using it
- Backend auth capability only in current inspected code.

---

## B7. POST `/api/auth/reset-password`
### Method
- POST

### Used in file/function
- No inspected frontend usage; password reset UI currently uses CRM service and marks password reset as “coming soon” in password login branch (`/app/frontend/src/pages/PasswordSetup.jsx:684-700`)

### Backend payload
```json
{
  "phone": "...",
  "new_password": "...",
  "confirm_password": "...",
  "otp": "...",
  "restaurant_id": "...",
  "pos_id": "0001"?
}
```
(`/app/backend/server.py:246-252`, `701-735`)

### Module using it
- Backend auth capability only in current inspected code.

---

## B8. GET `/api/config/{restaurant_id}`
### Method
- GET

### Used in file/function
- `RestaurantConfigContext.fetchConfig()` and `refreshConfig()` (`/app/frontend/src/context/RestaurantConfigContext.jsx:152-174`, `177-203`)
- `AdminConfigContext` initial load (`/app/frontend/src/context/AdminConfigContext.jsx:145-156`)

### Request payload
- path param only

### Response fields used in UI
Many config fields; the main consumers use:
- visibility toggles (`showLogo`, `showWelcomeText`, `showDescription`, `showSocialIcons`, `showTableNumber`, `showPoweredBy`, `showCallWaiter`, `showPayBill`, `showLandingCallWaiter`, `showLandingPayBill`, `showFooter`, `showLandingCustomerCapture`, `showHamburgerMenu`, `showLoginButton`, `showEstimatedTimes`, `showFoodStatus`, `showOrderStatusTracker`, `showPromotionsOnMenu`, `showCategories`, `showMenuFab`, `showCustomerDetails`, `showCustomerName`, `showCustomerPhone`, `showCookingInstructions`, `showSpecialInstructions`, `showPriceBreakdown`, `showTableInfo`, `showLoyaltyPoints`, `showCouponCode`, `showWallet`) (`/app/frontend/src/context/RestaurantConfigContext.jsx:307-419`)
- branding (`logoUrl`, `backgroundImageUrl`, `mobileBackgroundImageUrl`, `primaryColor`, `secondaryColor`, `buttonTextColor`, `backgroundColor`, `textColor`, `textSecondaryColor`, `fontHeading`, `fontBody`, `borderRadius`, `welcomeMessage`, `tagline`, `poweredByText`, `poweredByLogoUrl`) (`/app/frontend/src/context/RestaurantConfigContext.jsx:205-302`, `348-418`)
- content (`aboutUsContent`, `aboutUsImage`, `openingHours`, `footerText`, `footerLinks`, `address`, `contactEmail`, `mapEmbedUrl`, `feedbackEnabled`, `feedbackIntroText`, `customPages`, `navMenuOrder`, `extraInfoItems`, `notificationPopups`) (`same file`)
- admin config loads almost the whole object into edit state (`/app/frontend/src/context/AdminConfigContext.jsx:151-157`)

### Response fields not used
- `updated_at` may be returned but not used in current inspected UI.

### Error handling
- public config fetch failures are logged; UI often falls back to defaults from context (`/app/frontend/src/context/RestaurantConfigContext.jsx:169-173`)
- admin shows toast on failure (`/app/frontend/src/context/AdminConfigContext.jsx:167-170`)

### Auth/header dependency
- public GET, no auth required (`/app/backend/server.py:967-1090`)

### Module using it
- Restaurant Data & Branding
- Admin Layout & Config Management
- Content Management
- Menu Visibility/Ordering

---

## B9. PUT `/api/config/`
### Method
- PUT

### Used in file/function
- `AdminConfigContext.saveConfig()` (`/app/frontend/src/context/AdminConfigContext.jsx:194-223`)

### Request payload
- Entire config object, filtered on backend to non-null fields. Frontend sends broad object including:
  - branding, visibility, content, payment flags, timings, nav menu, notification popups, etc. (`/app/frontend/src/context/AdminConfigContext.jsx:199-209`)
- backend model `AppConfigUpdate` accepts many optional fields (`/app/backend/server.py:117-230`)

### Response fields used in UI
- frontend only checks `response.ok`; does not consume returned `config` (`/app/frontend/src/context/AdminConfigContext.jsx:211-216`)

### Response fields not used
- `success`, `config`

### Error handling
- frontend shows generic toast on failure (`/app/frontend/src/context/AdminConfigContext.jsx:217-220`)
- backend 400 if no fields to update (`/app/backend/server.py:1103-1105`)

### Auth/header dependency
- `Authorization: Bearer <admin token>` (`/app/frontend/src/context/AdminConfigContext.jsx:200-204`)
- backend requires restaurant admin (`/app/backend/server.py:1091-1095`, `312-316`)

### Module using it
- Admin Layout & Config Management
- Menu Visibility/Ordering
- Content Management

---

## B10. Banner CRUD `/api/config/banners` and `/api/config/banners/{banner_id}`
### Method
- POST / PUT / DELETE

### Used in file/function
- `addBanner`, `updateBanner`, `deleteBanner` in `AdminConfigContext` (`/app/frontend/src/context/AdminConfigContext.jsx:231-323`)

### Request payloads
Create:
```json
{ "bannerImage": "...", "bannerTitle": "...", "bannerLink": "..."?, "bannerOrder": 0, "bannerEnabled": true, "displayOn": "both|landing|menu" }
```
Update: partial banner fields (`/app/backend/server.py:254-268`)

### Response fields used in UI
- create uses `data.banner` (`/app/frontend/src/context/AdminConfigContext.jsx:245-255`)
- update/delete only check `response.ok`

### Response fields not used
- update/delete success messages

### Error handling
- context shows generic toast on failure (`/app/frontend/src/context/AdminConfigContext.jsx:257-261`, `291-293`, `320-321`)

### Auth/header dependency
- admin Bearer token required (`/app/frontend/src/context/AdminConfigContext.jsx:236-240`, `271-274`, `302-304`)

### Module using it
- Admin Layout & Config Management
- Restaurant Data & Branding (banner display consumer)

---

## B11. POST `/api/config/feedback`
### Method
- POST

### Used in file/function
- `FeedbackPage.jsx` (grep hit at line 34)
- backend handler `submit_feedback()` (`/app/backend/server.py:1195-1207`)

### Request payload
```json
{ "restaurant_id": "...", "name": "...", "email": "..."?, "rating": 1-5, "message": "..." }
```

### Response fields used in UI
- likely `success`, `message`; exact UI consumption not deeply inspected in this pass.

### Response fields not used
- none visible from inspected backend.

### Error handling
- backend validates rating range via Pydantic (`/app/backend/server.py:1188-1194`)
- frontend implementation exists but page was not fully inspected.

### Module using it
- Feedback / content module

---

## B12. Custom pages CRUD `/api/config/pages*`
### Method
- POST / PUT / DELETE

### Used in file/function
- `ContentTab.savePage()`, `deletePage()` (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:142-199`)

### Request payload
Create:
```json
{ "title": "...", "slug": "...", "content": "<html>", "published": true|false }
```
Update: partial version of same (`/app/backend/server.py:1221-1231`)

### Response fields used in UI
- create uses `data.page` (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:168-173`)
- update/delete only check `res.ok`

### Response fields not used
- update/delete response body `success`

### Error handling
- frontend shows generic save/delete failure toasts (`/app/frontend/src/components/AdminSettings/ContentTab.jsx:178-179`, `196-197`)
- backend 400 for empty update, 404 if page missing (`/app/backend/server.py:1262-1269`, `1282-1283`)

### Auth/header dependency
- admin Bearer token required.

### Module using it
- Content Management

---

## B13. POST `/api/upload/image`
### Method
- POST multipart/form-data

### Used in file/function
- `AdminConfigContext.uploadImage()` (`/app/frontend/src/context/AdminConfigContext.jsx:326-350`)
- image upload features in `AdminSettingsPage`, `ContentTab` via passed helper (`/app/frontend/src/pages/admin/AdminSettingsPage.jsx:11-19`, `50-67`; `/app/frontend/src/components/AdminSettings/ContentTab.jsx:257-276`)

### Request payload
- form-data with `file`

### Response fields used in UI
- `url`
- `filename` not used in inspected frontend (`/app/backend/server.py:1313-1314`)
- admin helper converts returned relative URL to absolute `${API_URL}${data.url}` (`/app/frontend/src/context/AdminConfigContext.jsx:343-345`)

### Response fields not used
- `success`, `filename`

### Error handling
- backend validates extension and max 5MB size (`/app/backend/server.py:1290-1305`)
- frontend surfaces `err.detail` if present (`/app/frontend/src/context/AdminConfigContext.jsx:338-347`)

### Auth/header dependency
- admin Bearer token required (`/app/frontend/src/context/AdminConfigContext.jsx:332-335`)

### Module using it
- Admin Layout & Config Management
- Content Management

---

## B14. GET `/api/loyalty-settings/{restaurant_id}`
### Method
- GET

### Used in file/function
- `ReviewOrder` loyalty settings fetch (`/app/frontend/src/pages/ReviewOrder.jsx:112-127`)

### Request payload
- path param only

### Response fields used in UI
- `redemption_value`
- tier earn percentages / other loyalty settings stored in local state as whole object (`/app/frontend/src/pages/ReviewOrder.jsx:118-121`, `675-688`)

### Response fields not used
- some returned defaults may remain unused depending on page branch.

### Error handling
- frontend logs error only (`/app/frontend/src/pages/ReviewOrder.jsx:122-124`)
- backend returns default settings if none found (`/app/backend/server.py:1363-1387`)

### Module using it
- Cart, Edit Order & Review
- Profile & Loyalty display support indirectly

---

## B15. GET `/api/customer-lookup/{restaurant_id}?phone=...`
### Method
- GET

### Used in file/function
- phone-based customer lookup in `ReviewOrder` (`/app/frontend/src/pages/ReviewOrder.jsx:330-368`)

### Request payload
- path param `restaurant_id`
- query param `phone`

### Response fields used in UI
- `found`
- `name`
- `total_points`
- `tier`
- `wallet_balance` (looked up but not visibly rendered in inspected section) (`/app/backend/server.py:1407-1424`)

### Response fields not used
- `country_code`, `phone` are returned; not central in current UI logic.

### Error handling
- frontend silently logs lookup failure (`/app/frontend/src/pages/ReviewOrder.jsx:360-363`)
- backend returns `found: false` object rather than 404 when customer missing (`/app/backend/server.py:1417-1424`)

### Module using it
- Cart, Edit Order & Review

---

## B16. GET/PUT `/api/dietary-tags/*`
### Methods
- GET `/api/dietary-tags/available`
- GET `/api/dietary-tags/{restaurant_id}`
- PUT `/api/dietary-tags/{restaurant_id}`

### Used in file/function
- `dietaryTagsService.js` (`/app/frontend/src/api/services/dietaryTagsService.js:1-51`)
- `useDietaryTags()` (`/app/frontend/src/hooks/useMenuData.js:358-399`)
- `DietaryTagsAdmin` (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:59-67`, `100-133`)

### Request payload
PUT:
```json
{ "mappings": { "<itemId>": ["tag-id-1", "tag-id-2"] } }
```

### Response fields used in UI
- available tags: `tags`
- mapping fetch: `mappings`, `updated_at`
- update: only success/failure, response body not heavily consumed (`/app/backend/server.py:1445-1501`)

### Response fields not used
- `restaurant_id` and `updated_at` often not rendered in UI.

### Error handling
- service throws generic errors on non-OK responses (`/app/frontend/src/api/services/dietaryTagsService.js:9-45`)
- admin autosave shows failure toast (`/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx:125-129`)

### Auth/header dependency
- GET endpoints public
- PUT requires Bearer token (`/app/frontend/src/api/services/dietaryTagsService.js:31-37`, `/app/backend/server.py:1471-1486`)

### Module using it
- Menu Browsing
- Dietary Tags Admin

---

## B17. GET `/api/table-config`
### Method
- GET

### Used in file/function
- Admin QR page (`/app/frontend/src/pages/admin/AdminQRPage.jsx:100-144`)

### Request payload
- none

### Headers/auth
- `Authorization: Bearer <admin token>`
- `X-POS-Token: <pos_token from localStorage>` (`/app/frontend/src/pages/admin/AdminQRPage.jsx:104-112`)

### Response fields used in UI
- `tables`
- `rooms`
- `subdomain`
- `restaurant_id` (`/app/frontend/src/pages/admin/AdminQRPage.jsx:118-144`)
- nested `qr_code_urls` per table/room item (`/app/frontend/src/pages/admin/AdminQRPage.jsx:127-133`, `151-153`)

### Response fields not used
- `restaurant_name` returned by backend is not visibly used in current page logic (`/app/backend/server.py:872-874`)

### Error handling
- frontend surfaces backend `detail` and detects session-expired language for special UX (`/app/frontend/src/pages/admin/AdminQRPage.jsx:113-117`, `200-231`)
- backend maps 401 and upstream POS errors to explicit HTTPExceptions (`/app/backend/server.py:837-847`, `876-877`)

### Module using it
- QR Admin

---

## B18. GET `/api/air-bnb/get-order-details/{order_id}`
### Method
- GET

### Used in file/function
- indirectly through frontend `ENDPOINTS.GET_ORDER_DETAILS()` + axios base URL if configured to backend proxy path
- backend route proxies to POS (`/app/backend/server.py:788-807`)

### Important current-state note
- Frontend endpoint builder points to `${REACT_APP_API_BASE_URL}/air-bnb/get-order-details/${orderId}` (`/app/frontend/src/api/config/endpoints.js:17-18`) rather than `${REACT_APP_BACKEND_URL}/api/...`.
- Whether this hits the FastAPI proxy or a direct POS API depends on environment configuration, not on code alone.

---

# C) CRM API USAGE MAP

CRM base URL and contract adapter live in `crmService.js` (`/app/frontend/src/api/services/crmService.js:1-176`). The service supports `v1` and `v2` with normalized return shapes.

## C1. POST `/customer/register` (v1) / `/scan/auth/register` (v2)
### Used in file/function
- `crmRegister(phone, password, userId, name, email)` (`/app/frontend/src/api/services/crmService.js:191-222`)
- called by `PasswordSetup.handleSetPassword()` (`/app/frontend/src/pages/PasswordSetup.jsx:185-214`)

### Request payload
v1:
```json
{ "phone": "...", "password": "...", "user_id": "pos_0001_restaurant_<id>", "name": "..."?, "email": "..."? }
```
v2:
```json
{ "phone": "...", "password": "...", "name": "...", "restaurant_id": "<id>", "email": "..."? }
```

### Response fields used in UI
Normalized return used by page:
- `token`
- `customer.id`
- `customer.phone`
- `customer.name` (`/app/frontend/src/pages/PasswordSetup.jsx:199-208`)

### Response fields not used
- `is_new_customer` or any extra CRM metadata is not visibly consumed here.

### Error handling
- `crmFetch` throws enriched error for non-OK or v2 `success:false` (`/app/frontend/src/api/services/crmService.js:121-161`)
- page shows `err.message` (`/app/frontend/src/pages/PasswordSetup.jsx:209-212`)

### Auth/header dependency
- No Bearer token
- may attach `x-api-key` resolved from restaurant (`/app/frontend/src/api/services/crmService.js:87-117`)

### Module using it
- Authentication & Session

---

## C2. POST `/customer/login` (v1) / `/scan/auth/login` (v2)
### Used in file/function
- `crmLogin()` (`/app/frontend/src/api/services/crmService.js:232-256`)
- `PasswordSetup.handleLogin()` (`/app/frontend/src/pages/PasswordSetup.jsx:216-241`)

### Request payload
v1:
```json
{ "phone": "...", "password": "...", "user_id": "..." }
```
v2:
```json
{ "phone": "...", "password": "...", "restaurant_id": "..." }
```

### Response fields used in UI
Normalized:
- `token`
- `customer.id`
- `customer.phone`
- `customer.name` (`/app/frontend/src/pages/PasswordSetup.jsx:226-235`)

### Response fields not used
- any addresses or extra profile fields returned by CRM login are not directly used in this page.

### Error handling
- page shows `err.message` (`/app/frontend/src/pages/PasswordSetup.jsx:236-238`)

### Auth/header dependency
- x-api-key as above

### Module using it
- Authentication & Session

---

## C3. POST `/customer/send-otp` (v1) / `/scan/auth/request-otp` (v2)
### Used in file/function
- `crmSendOtp()` (`/app/frontend/src/api/services/crmService.js:274-309`)
- `PasswordSetup.handleLoginSendOtp()` (`/app/frontend/src/pages/PasswordSetup.jsx:122-145`)

### Request payload
v1:
```json
{ "phone": "...", "user_id": "...", "country_code": "91" }
```
v2:
```json
{ "phone": "...", "restaurant_id": "..." }
```

### Response fields used in UI
Normalized:
- `message`
- `expires_in_minutes`
- `debug_otp`
- `phone` (optional) (`/app/frontend/src/pages/PasswordSetup.jsx:128-133`)

### Response fields not used
- any extra CRM metadata not listed.

### Error handling
- page catches 404 specially to fall back to password (`/app/frontend/src/pages/PasswordSetup.jsx:135-142`)

### Auth/header dependency
- x-api-key resolved from restaurant

### Module using it
- Authentication & Session

---

## C4. POST `/customer/verify-otp` (v1) / `/scan/auth/verify-otp` (v2)
### Used in file/function
- `crmVerifyOtp()` (`/app/frontend/src/api/services/crmService.js:311-348`)
- `PasswordSetup.handleLoginVerifyOtp()` (`/app/frontend/src/pages/PasswordSetup.jsx:148-174`)

### Request payload
v1:
```json
{ "phone": "...", "otp": "...", "user_id": "...", "country_code": "91" }
```
v2:
```json
{ "phone": "...", "otp": "...", "restaurant_id": "..." }
```

### Response fields used in UI
Normalized:
- `token`
- `customer.id`
- `customer.phone`
- `customer.name`
- `is_new_customer` (`/app/frontend/src/pages/PasswordSetup.jsx:156-164`)

### Response fields not used
- none beyond normalized contract visible here.

### Error handling
- page maps expired-vs-invalid OTP messages (`/app/frontend/src/pages/PasswordSetup.jsx:166-170`)

### Module using it
- Authentication & Session

---

## C5. POST `/scan/auth/skip-otp` (v2 only)
### Used in file/function
- `crmSkipOtp()` (`/app/frontend/src/api/services/crmService.js:350-376`)
- `PasswordSetup.handleSkip()` (`/app/frontend/src/pages/PasswordSetup.jsx:65-82`)

### Request payload
```json
{ "phone": "...", "restaurant_id": "..." }
```

### Response fields used in UI
Normalized:
- `token`
- `customer.id`
- `customer.phone`
- `is_new_customer` (`/app/frontend/src/pages/PasswordSetup.jsx:69-75`)

### Response fields not used
- extra CRM metadata if any.

### Error handling
- page shows generic “Could not continue” toast on failure (`/app/frontend/src/pages/PasswordSetup.jsx:75-79`)

### Module using it
- Authentication & Session

---

## C6. POST `/customer/forgot-password` (held on v1)
### Used in file/function
- `crmForgotPassword()` (`/app/frontend/src/api/services/crmService.js:378-394`)
- `PasswordSetup.handleSendOtp()` in forgot-password mode (`/app/frontend/src/pages/PasswordSetup.jsx:243-259`)

### Request payload
```json
{ "phone": "...", "user_id": "...", "country_code": "91" }
```

### Response fields used in UI
- `debug_otp`
- `message` (`/app/frontend/src/pages/PasswordSetup.jsx:247-254`)

### Response fields not used
- any other fields.

### Error handling
- page toast on error (`/app/frontend/src/pages/PasswordSetup.jsx:255-257`)
- code comments explicitly mark this as unsupported in v2 and expected fallback (`/app/frontend/src/api/services/crmService.js:382-389`)

### Module using it
- Authentication & Session

---

## C7. POST `/customer/reset-password` (held on v1)
### Used in file/function
- `crmResetPassword()` (`/app/frontend/src/api/services/crmService.js:396-412`)
- `PasswordSetup.handleResetPassword()` (`/app/frontend/src/pages/PasswordSetup.jsx:261-292`)

### Request payload
```json
{ "phone": "...", "otp": "...", "user_id": "...", "new_password": "..." }
```

### Response fields used in UI
- success only; page does not inspect payload deeply.

### Error handling
- page shows `err.message` (`/app/frontend/src/pages/PasswordSetup.jsx:287-289`)

### Module using it
- Authentication & Session

---

## C8. GET `/customer/me` (v1) / `/scan/auth/me` (v2)
### Used in file/function
- `crmGetProfile(token)` (`/app/frontend/src/api/services/crmService.js:418-430`)
- used by `AuthContext.setRestaurantScope()` to validate stored CRM token (`/app/frontend/src/context/AuthContext.jsx:97-115`)

### Headers/auth
- `Authorization: Bearer <crm token>`
- derived `x-api-key` from token/user/restaurant (`/app/frontend/src/api/services/crmService.js:167-175`)

### Response fields used in UI
- full profile object; current code uses enough fields to restore `user`, `tier`, `total_points`, etc. (`/app/frontend/src/context/AuthContext.jsx:100-108`)

### Response fields not used
- exact unused fields depend on CRM response version and environment.

### Error handling
- failure invalidates stored restaurant-scoped CRM token (`/app/frontend/src/context/AuthContext.jsx:110-115`)

### Module using it
- Authentication & Session

---

## C9. GET `/customer/me/orders`
### Used in file/function
- `crmGetOrders(token, limit, skip)` (`/app/frontend/src/api/services/crmService.js:432-438`)
- `Profile.fetchOrders()` (`/app/frontend/src/pages/Profile.jsx:53-64`)

### Request payload
- query params `limit`, `skip`

### Response fields used in UI
- `orders[]`
- per order: `id`, `created_at`, `order_amount`, `order_type`, `points_earned`, `items[]` (`/app/frontend/src/pages/Profile.jsx:238-259`)

### Response fields not used
- `total_orders` is returned/commented as expected but not displayed (`/app/frontend/src/api/services/crmService.js:432-438`, `/app/frontend/src/pages/Profile.jsx:56-59`)

### Error handling
- toast on failure (`/app/frontend/src/pages/Profile.jsx:59-63`)

### Module using it
- Profile, Orders, Points & Wallet

---

## C10. GET `/customer/me/points`
### Used in file/function
- `crmGetPoints(token, limit)` (`/app/frontend/src/api/services/crmService.js:440-446`)
- `Profile.fetchPoints()` (`/app/frontend/src/pages/Profile.jsx:66-82`)

### Response fields used in UI
- `transactions[]`
- transaction fields normalized from `type` to `transaction_type`
- each tx uses `id`, `description`, `created_at`, `points`, `type`/`transaction_type` (`/app/frontend/src/pages/Profile.jsx:71-76`, `277-291`)

### Response fields not used
- `total_points`, `points_value`, `tier`, `expiring_soon` are not rendered in this tab after fetch, though comments mention them.

### Error handling
- toast on failure.

### Module using it
- Profile, Orders, Points & Wallet

---

## C11. GET `/customer/me/wallet`
### Used in file/function
- `crmGetWallet(token, limit)` (`/app/frontend/src/api/services/crmService.js:448-454`)
- `Profile.fetchWallet()` (`/app/frontend/src/pages/Profile.jsx:84-103`)

### Response fields used in UI
- `wallet_balance`
- `transactions[]`
- each tx uses `id`, `description`, `created_at`, `amount`, `type`/`transaction_type` (`/app/frontend/src/pages/Profile.jsx:89-97`, `315-329`)

### Response fields not used
- `total_received`, `total_used`

### Error handling
- toast on failure.

### Module using it
- Profile, Orders, Points & Wallet

---

## C12. Address APIs
### Endpoints
- GET `/customer/me/addresses` (v1) / `/scan/addresses` (v2)
- POST `/customer/me/addresses` (v1) / `/scan/addresses` (v2)
- PUT `/customer/me/addresses/{id}` (v1) / `/scan/addresses/{id}` (v2)
- DELETE `/customer/me/addresses/{id}` (v1) / `/scan/addresses/{id}` (v2)
- POST `/customer/me/addresses/{id}/set-default` (v1) / PUT `/scan/addresses/{id}/default` (v2)

### Used in file/function
- service methods `crmGetAddresses`, `crmAddAddress`, `crmUpdateAddress`, `crmDeleteAddress`, `crmSetDefaultAddress` (`/app/frontend/src/api/services/crmService.js:460-580`)
- `DeliveryAddress.jsx` currently uses get/add/delete/set-default; update exists in service but was not seen used (`/app/frontend/src/pages/DeliveryAddress.jsx:128-151`, `317-352`, `354-380`)

### Request payloads
Add/update send address object fields such as:
- `address_type`, `address`, `house`, `floor`, `road`, `city`, `state`, `pincode`, `latitude`, `longitude`, `contact_person_name`, `contact_person_number`, `delivery_instructions` (`/app/frontend/src/pages/DeliveryAddress.jsx:82-96`, `327-334`)

### Response fields used in UI
- fetch: `addresses[]` and `is_default`, `id`, `latitude`, `longitude`, address display fields (`/app/frontend/src/pages/DeliveryAddress.jsx:131-145`, `660-709`)
- add: normalized flat address or dedup-synthesized address (`/app/frontend/src/api/services/crmService.js:486-507`)
- delete/default: success + `address_id` enough for local state updates (`/app/frontend/src/api/services/crmService.js:541-580`)

### Response fields not used
- `count`, `customer_id`, `remaining_addresses` etc. are not central in current UI.

### Error handling
- Delivery page shows toasts for load/add/delete/default failures (`/app/frontend/src/pages/DeliveryAddress.jsx:146-149`, `347-349`, `368-379`)

### Auth/header dependency
- CRM Bearer token required
- per-restaurant `x-api-key` derived from token (`/app/frontend/src/api/services/crmService.js:167-175`)

### Module using it
- Delivery Address
- Authentication & Session indirectly
