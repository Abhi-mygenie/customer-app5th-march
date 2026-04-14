# PLAN v2: Migrate Customer Auth to CRM + Delivery Phase 3

**Date:** April 13, 2026  
**Status:** REVIEW — awaiting approval before implementation  
**Supersedes:** PLAN-CRM-AUTH-MIGRATION.md (v1)

---

## Executive Summary

CRM v1.4 now has **full customer password auth** (register, login, forgot-password, reset-password) alongside OTP. This eliminates the token incompatibility gap from v1. All customer auth moves to CRM. Admin auth stays on our FastAPI backend. No proxying, no dual tokens, no hacks.

---

## 1. Architecture — Before vs After

### BEFORE (Current)

```
Frontend
  ├── Our FastAPI Backend (auth_token - Our JWT)
  │     ├─ Customer auth (login, set-password, verify-password, send-otp, reset-password)
  │     ├─ Customer data (profile, orders, points, wallet)
  │     ├─ App config, banners, content, dietary tags
  │     ├─ Loyalty settings, customer-lookup
  │     └─ Admin auth, upload, table-config proxy
  │
  ├── POS API (order_auth_token - POS token)
  │     └─ Menus, order placement, Razorpay, table status
  │
  └── CRM ← NOT CONNECTED
```

### AFTER (Target)

```
Frontend
  ├── CRM (crm_token - CRM JWT)
  │     ├─ Customer auth (register, login, send-otp, verify-otp, forgot-password, reset-password)
  │     ├─ Customer data (profile, orders, points, wallet)
  │     └─ Address CRUD (list, add, edit, delete, set-default) ← NEW
  │
  ├── Our FastAPI Backend (auth_token - Our JWT, admin only)
  │     ├─ check-customer (public, reads same DB)
  │     ├─ App config, banners, content, dietary tags
  │     ├─ Loyalty settings, customer-lookup
  │     ├─ Admin auth, upload, table-config proxy
  │     └─ Feedback, docs endpoints
  │
  └── POS API (order_auth_token - POS token, unchanged)
        └─ Menus, order placement, Razorpay, table status
```

---

## 2. CRM Customer Endpoints — Complete Reference (v1.4)

### Auth (No token required)

| # | Endpoint | Method | Request Fields | Returns |
|---|----------|--------|----------------|---------|
| 1 | `/customer/register` | POST | `{phone, password, user_id, name?, email?}` | CRM token + profile |
| 2 | `/customer/login` | POST | `{phone, password, user_id}` | CRM token + profile + addresses |
| 3 | `/customer/send-otp` | POST | `{phone, user_id, country_code?}` | OTP sent confirmation |
| 4 | `/customer/verify-otp` | POST | `{phone, otp, user_id, country_code?}` | CRM token + profile + addresses |
| 5 | `/customer/forgot-password` | POST | `{phone, user_id, country_code?}` | OTP sent for reset |
| 6 | `/customer/reset-password` | POST | `{phone, otp, user_id, new_password}` | Success message |

### Profile & Data (CRM token required)

| # | Endpoint | Method | Returns |
|---|----------|--------|---------|
| 7 | `/customer/me` | GET | Full profile + addresses |
| 8 | `/customer/me/addresses` | GET | Address list with total count |
| 9 | `/customer/me/addresses` | POST | Created address object |
| 10 | `/customer/me/addresses/{id}` | PUT | Updated address object |
| 11 | `/customer/me/addresses/{id}` | DELETE | Remaining count |
| 12 | `/customer/me/addresses/{id}/set-default` | POST | Updated address (is_default: true) |
| 13 | `/customer/me/points` | GET | Points balance + transactions |
| 14 | `/customer/me/wallet` | GET | Wallet balance + transactions |
| 15 | `/customer/me/orders` | GET | Paginated order history |

### Key Behaviors (Tested & Confirmed)

| Scenario | CRM Response |
|----------|-------------|
| `/customer/login` — correct password | `200` — token + profile + addresses |
| `/customer/login` — wrong password | `401` — "Invalid password" |
| `/customer/login` — customer not found | `404` — "Customer not found. Please register first." |
| `/customer/login` — no password set | `400` — "No password set. Please use OTP login or register with a password." |
| `/customer/register` — new phone | `200` — creates customer + token (`is_new_customer: true`) |
| `/customer/register` — existing, no password | `200` — links password (`is_new_customer: false`) |
| `/customer/register` — existing, has password | `400` — "Account already exists. Please login." |
| `/customer/send-otp` — unregistered phone | `404` — "Customer not found" |
| Both login methods return **identical** token format + profile structure | ✅ Confirmed |

---

## 3. Endpoint Migration Map

### Customer Auth — Our Backend → CRM

| Current (Our Backend) | New (CRM) | Notes |
|----------------------|-----------|-------|
| `POST /api/auth/check-customer` | **KEEP on our backend** | CRM has no equivalent. Needed for UI flow decision (exists? has_password?). Public, reads same DB. |
| `POST /api/auth/set-password` | `POST /customer/register` | CRM handles both create-new and link-password-to-existing |
| `POST /api/auth/verify-password` | `POST /customer/login` | Direct replacement |
| `POST /api/auth/send-otp` | `POST /customer/send-otp` | Same behavior. Note: CRM returns 404 for unregistered (our backend didn't) |
| `POST /api/auth/login` (customer OTP) | `POST /customer/verify-otp` | Field mapping: `phone_or_email` → `phone`, `otp` → `otp`, `restaurant_id` → `user_id` |
| `POST /api/auth/login` (admin password) | **KEEP on our backend** | Admin auth unchanged |
| `POST /api/auth/reset-password` | `POST /customer/reset-password` | Field mapping: `phone` same, `otp` same, `new_password` same. CRM doesn't need `confirm_password`. |
| `GET /api/auth/me` | `GET /customer/me` | CRM returns richer data (addresses, allergies, favorites) |

### Customer Data — Our Backend → CRM

| Current (Our Backend) | New (CRM) | Response Differences |
|----------------------|-----------|---------------------|
| `GET /api/customer/profile` | `GET /customer/me` | CRM adds: addresses, dob, anniversary, gender, favorites, allergies, points_value |
| `GET /api/customer/orders` | `GET /customer/me/orders` | CRM wraps in `{total_orders, orders: [...]}` vs our flat array |
| `GET /api/customer/points` | `GET /customer/me/points` | CRM returns `{total_points, points_value, tier, expiring_soon, transactions}` vs our flat array |
| `GET /api/customer/wallet` | `GET /customer/me/wallet` | CRM returns `{wallet_balance, total_received, total_used, transactions}` vs our `{balance, transactions}` |
| `GET /api/customer/coupons` | TBD — CRM `/coupons/validate` exists but customer coupon listing unclear | May keep on our backend |
| ❌ None | `GET/POST/PUT/DELETE /customer/me/addresses` | **NEW** for delivery |
| ❌ None | `POST /customer/forgot-password` | **NEW** — dedicated forgot flow |

### Endpoints That Stay Unchanged (Our Backend)

| Endpoint | Reason |
|----------|--------|
| `POST /api/auth/check-customer` | Public, no CRM equivalent, needed for UI flow |
| `POST /api/auth/login` (admin path) | Admin auth stays here |
| `GET /api/config/{restaurant_id}` | Public, app config |
| `PUT /api/config/` | Admin only |
| `POST/PUT/DELETE /api/config/banners/*` | Admin only |
| `POST/PUT/DELETE /api/config/pages/*` | Admin only |
| `POST /api/config/feedback` | Public |
| `GET /api/loyalty-settings/{id}` | Public |
| `GET /api/customer-lookup/{id}` | Public |
| `GET/PUT /api/dietary-tags/*` | Public/Admin |
| `POST /api/upload/image` | Admin only |
| `GET /api/table-config` | Admin only |
| `GET /api/air-bnb/get-order-details/{id}` | POS proxy |

---

## 4. localStorage Token Strategy

### BEFORE

| Key | Source | Used For |
|-----|--------|----------|
| `auth_token` | Our Backend JWT | Our backend auth (customer + admin) |
| `order_auth_token` | POS /auth/login | POS API (menus, orders) |
| `pos_token` | POS vendoremployee/login | Admin POS operations |
| `guestCustomer` | Frontend JSON | Guest name+phone |

### AFTER

| Key | Source | Used For |
|-----|--------|----------|
| `crm_token` | CRM /customer/login or /customer/verify-otp | CRM endpoints (profile, addresses, points, wallet, orders) |
| `auth_token` | Our Backend JWT (**admin only now**) | Our backend admin endpoints |
| `order_auth_token` | POS /auth/login (unchanged) | POS API (menus, orders) |
| `pos_token` | POS vendoremployee/login (unchanged) | Admin POS operations |
| `guestCustomer` | Frontend JSON (unchanged) | Guest name+phone |

---

## 5. Flow Diagrams — All Scenarios

### 5A. Landing Page → Customer Auth (Main Change)

```
LandingPage: Customer enters phone + name, clicks "Browse Menu"
  │
  ├─ POST /api/auth/check-customer (Our Backend — unchanged, reads same DB)
  │    Returns: { exists: bool, customer: { name, has_password } }
  │
  ├─ CASE 1: exists=true, has_password=true
  │    └─ PasswordSetup page (verify mode)
  │         Customer enters password
  │         POST CRM /customer/login {phone, password, user_id}
  │         ├─ 200 → store crm_token → navigate to Menu
  │         ├─ 401 → "Invalid password" → retry
  │         └─ Forgot password → CRM /customer/forgot-password → OTP → /customer/reset-password
  │
  ├─ CASE 2: exists=true, has_password=false
  │    └─ PasswordSetup page (set password mode)
  │         Customer enters new password + confirm
  │         POST CRM /customer/register {phone, password, user_id, name}
  │         ├─ 200 (is_new_customer=false) → store crm_token → navigate to Menu
  │         └─ Error → show message
  │
  ├─ CASE 3: exists=false (new customer)
  │    └─ PasswordSetup page (create account mode)
  │         Customer enters new password + confirm
  │         POST CRM /customer/register {phone, password, user_id, name, email?}
  │         ├─ 200 (is_new_customer=true) → store crm_token → navigate to Menu
  │         └─ Error → show message
  │
  └─ SKIP → guest mode (localStorage guestCustomer, no crm_token)
```

### 5B. Login Page → Admin Only (Simplified)

```
/login page
  │
  └─ Admin enters email + password
       POST /api/auth/login (Our Backend — only checks users collection)
       ├─ 200 user_type="restaurant" → store auth_token + pos_token → /admin/settings
       └─ Error → show message
       
  NOTE: Remove customer login paths from Login.jsx (OTP, set-password, etc.)
        Customers login from Landing Page / PasswordSetup
        Add note: "Customers: scan QR or visit restaurant page"
```

### 5C. Profile Page (CRM Data)

```
/profile page
  │
  ├─ Check crm_token in localStorage
  │    ├─ No token → redirect to landing page
  │    └─ Has token → proceed
  │
  ├─ Profile tab: GET CRM /customer/me
  ├─ Orders tab: GET CRM /customer/me/orders
  ├─ Points tab: GET CRM /customer/me/points
  └─ Wallet tab: GET CRM /customer/me/wallet
```

### 5D. Delivery Flow (NEW)

```
LandingPage (orderType=delivery, walk-in QR)
  │
  ├─ Customer must be logged in (crm_token required for addresses)
  │    ├─ Already logged in → proceed
  │    └─ Not logged in → prompt login (same check-customer → PasswordSetup flow)
  │
  ├─ Navigate to DeliveryAddressPage (NEW — before menu)
  │    ├─ GET CRM /customer/me/addresses → list saved addresses
  │    ├─ Default address pre-selected
  │    ├─ "Add New Address" → form → POST CRM /customer/me/addresses
  │    ├─ Edit/Delete existing addresses
  │    └─ Select address → store in CartContext → navigate to Menu
  │
  ├─ Menu → Cart → ReviewOrder
  │    ├─ delivery_address populated from CartContext
  │    ├─ delivery_charge: 0 for now (distance API deferred)
  │    ├─ order_type: "delivery"
  │    └─ table_id: "0"
  │
  └─ Place Order (POS API — unchanged)
       order payload includes: address, latitude, longitude, delivery_charge, order_type
```

### 5E. Guest → Delivery Prompt

```
Guest user (no crm_token) selects delivery mode
  │
  └─ Show message: "Please login to use delivery"
       └─ Trigger check-customer → PasswordSetup flow
            └─ After login → redirect to DeliveryAddressPage
```

---

## 6. Files to Modify

### Frontend — Auth Flow

| File | Change | Effort |
|------|--------|--------|
| **`.env`** | Add `REACT_APP_CRM_URL=https://mygenie-crm-build-1.preview.emergentagent.com/api` | 1 min |
| **`api/services/crmService.js`** | **NEW** — CRM API helper (login, register, send-otp, verify-otp, forgot-password, reset-password, me, addresses, points, wallet, orders) | 1 hr |
| **`AuthContext.jsx`** | Replace Our Backend auth with CRM. Add `crmToken` state. Replace `/api/auth/me` → CRM `/customer/me`. Update `login()`, `setAuth()`, `logout()`. | 2 hrs |
| **`PasswordSetup.jsx`** | Replace API calls: `set-password` → CRM `/customer/register`, `verify-password` → CRM `/customer/login`, `send-otp` → CRM `/customer/forgot-password`, `reset-password` → CRM `/customer/reset-password` | 2 hrs |
| **`LandingPage.jsx`** | `check-customer` stays (our backend). Update navigation state to include `user_id` for CRM calls. | 30 min |
| **`Login.jsx`** | Strip customer flows. Keep admin-only password login. Add "Customers: login from restaurant page" note. | 1 hr |
| **`Profile.jsx`** | Switch all API calls from Our Backend → CRM. Use `crm_token`. Handle different response shapes. | 1.5 hrs |
| **`App.js`** | Add DeliveryAddress route. Keep PasswordSetup route. | 15 min |

### Frontend — Delivery Flow

| File | Change | Effort |
|------|--------|--------|
| **`pages/DeliveryAddress.jsx`** | **NEW** — Address list, add/edit/delete, select for order | 3-4 hrs |
| **`context/CartContext.js`** | Add `deliveryAddress`, `deliveryCharge`, `orderType` state | 30 min |
| **`pages/ReviewOrder.jsx`** | Show delivery address + charge in bill. Populate order payload with address fields. | 1.5 hrs |
| **`components/OrderModeSelector/`** | Already exists (Phase 2). Wire up delivery → DeliveryAddressPage navigation. | 30 min |

### Backend — Minimal Changes

| File | Change | Effort |
|------|--------|--------|
| **`backend/.env`** | No change needed | — |
| **`backend/server.py`** | Optional: simplify `/api/auth/login` to admin-only. Keep `check-customer`. Retire unused customer auth endpoints (or leave them). | 30 min |

**Total estimated: 14-18 hours**

---

## 7. Field Mapping — Request/Response Differences

### check-customer (stays on our backend — no change)
```
Request:  { phone, restaurant_id, pos_id }
Response: { exists, customer: { name, has_password } }
```

### set-password → CRM /customer/register
```
BEFORE: { phone, password, confirm_password, restaurant_id, pos_id, name }
AFTER:  { phone, password, user_id: "pos_{pos_id}_restaurant_{restaurant_id}", name, email? }

Note: CRM doesn't need confirm_password (validate on frontend)
Note: user_id format is "pos_0001_restaurant_478" (construct from restaurant_id + pos_id)
```

### verify-password → CRM /customer/login
```
BEFORE: { phone, password, restaurant_id, pos_id }
AFTER:  { phone, password, user_id: "pos_{pos_id}_restaurant_{restaurant_id}" }
```

### send-otp → CRM /customer/forgot-password (for reset flow)
```
BEFORE: { phone, restaurant_id, pos_id }
AFTER:  { phone, user_id: "pos_{pos_id}_restaurant_{restaurant_id}", country_code? }
```

### reset-password → CRM /customer/reset-password
```
BEFORE: { phone, new_password, confirm_password, otp, restaurant_id, pos_id }
AFTER:  { phone, new_password, otp, user_id: "pos_{pos_id}_restaurant_{restaurant_id}" }

Note: CRM doesn't need confirm_password
```

### auth/me → CRM /customer/me
```
BEFORE response: { user_type, user: { id, name, phone, ... } }
AFTER response:  { id, name, phone, email, tier, total_points, points_value, wallet_balance, addresses, allergies, favorites, ... }

Note: CRM returns flat object (no user_type wrapper). Frontend needs to handle different shape.
```

### Profile orders/points/wallet — Response shape changes

| Endpoint | Our Backend Response | CRM Response |
|----------|---------------------|-------------|
| orders | `[{id, order_amount, ...}]` (flat array) | `{total_orders, orders: [{id, order_amount, delivery_address, ...}]}` (wrapped) |
| points | `[{id, points, ...}]` (flat array) | `{total_points, points_value, tier, expiring_soon, transactions: [...]}` (richer) |
| wallet | `{balance, transactions: [...]}` | `{wallet_balance, total_received, total_used, transactions: [...]}` (richer) |

---

## 8. Edge Cases

| # | Edge Case | Handling |
|---|-----------|----------|
| 1 | **New customer + CRM /customer/register** | CRM creates customer + first-visit bonus + returns token. Works for both new and existing-without-password. |
| 2 | **Existing customer, already has password, tries /customer/register** | CRM returns `400: "Account already exists. Please login."` → Frontend redirects to login form. |
| 3 | **check-customer says exists but CRM /customer/login returns 404** | Shouldn't happen (same DB). If it does, show error + offer OTP login as fallback. |
| 4 | **CRM is down** | Show error "Service temporarily unavailable". Offer guest mode (Skip). Guest can browse menu + order but no delivery addresses. |
| 5 | **CRM token expires (24 hours)** | CRM returns 401 on any authenticated call → clear crm_token → show "Session expired" → redirect to landing for re-login. |
| 6 | **Guest user wants delivery** | Prompt login. After auth, redirect to DeliveryAddressPage. |
| 7 | **Customer switches restaurants** | CRM token is scoped by `user_id` (restaurant). Need fresh login for different restaurant. AuthContext should check restaurant mismatch. |
| 8 | **Old `auth_token` in localStorage (from before migration)** | On app load, AuthContext checks for `crm_token`. If only `auth_token` exists (stale), ignore it for customer flows. Clear on next login. |
| 9 | **Admin navigates to customer pages** | Profile page checks `crm_token`. Admin doesn't have one → redirect. Admin uses `/admin/settings` instead. |
| 10 | **Password with special characters (bcrypt)** | CRM handles bcrypt. Frontend sends raw password. No encoding issues. |
| 11 | **Phone normalization (+91 prefix)** | CRM handles it internally (strips prefix). Frontend sends as-is. |
| 12 | **Concurrent OTP + password login** | Both return same token format. No conflict. Last login wins. |
| 13 | **Customer has no addresses → delivery flow** | DeliveryAddressPage shows "Add New Address" form. Must add before proceeding to menu. |
| 14 | **Address without lat/lng** | Save without lat/lng for now. Google Maps geocoding deferred. Distance API deferred. |
| 15 | **user_id construction** | Always `pos_{pos_id}_restaurant_{restaurant_id}`. Default pos_id = "0001". Frontend must construct this consistently. |

---

## 9. Risks & Mitigations

| # | Risk | Severity | Probability | Mitigation |
|---|------|----------|-------------|------------|
| 1 | **CRM goes down (preview env instability)** | HIGH | MEDIUM | Keep our backend auth endpoints alive (just unused). Can switch back by changing URLs. Frontend CRM service has try/catch with user-friendly errors. |
| 2 | **CRM API changes without notice** | MEDIUM | LOW | CRM service layer abstracts all calls. One file to update if API changes. Pin to v1.4 behavior. |
| 3 | **Response shape differences break UI** | MEDIUM | MEDIUM | Profile.jsx handles CRM response shapes explicitly. Test each tab (orders, points, wallet) with real data. |
| 4 | **check-customer and CRM out of sync** | LOW | LOW | Same DB — can't happen unless replication lag. check-customer is a simple read. |
| 5 | **Existing users confused by flow change** | LOW | MEDIUM | Landing page flow is nearly identical (phone → password). Only difference: CRM backend. Users don't see this. |
| 6 | **Admin accidentally uses customer flow** | LOW | LOW | Login page is admin-only. Customer flow is on landing page. Different entry points. |
| 7 | **crm_token stored but user deletes account on CRM** | LOW | LOW | CRM returns 404 on /customer/me → clear token → redirect to landing. |
| 8 | **Multiple browser tabs with different restaurants** | LOW | LOW | crm_token is restaurant-scoped. Switching restaurant requires re-login. Detect mismatch in AuthContext. |

---

## 10. Test Plan

### A. Customer Password Auth (CRM)

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| TC-01 | Returning customer — password login | Enter phone → check-customer → has_password=true → enter password | CRM /customer/login → 200 → crm_token stored → menu | P0 |
| TC-02 | Returning customer — wrong password | Enter correct phone → wrong password | CRM returns 401 → "Invalid password" shown | P0 |
| TC-03 | Existing customer — no password → register | Enter phone → check-customer → has_password=false → set password | CRM /customer/register → 200 (is_new_customer=false) → crm_token → menu | P0 |
| TC-04 | New customer — create account | Enter new phone + name → check-customer → exists=false → set password | CRM /customer/register → 200 (is_new_customer=true) → crm_token → menu | P0 |
| TC-05 | Forgot password — full flow | Login page → forgot → CRM /customer/forgot-password → OTP → /customer/reset-password → login with new password | Password reset, new login works | P0 |
| TC-06 | OTP login (alternative) | If implemented: send-otp → verify-otp → crm_token | Same token format, profile loaded | P1 |
| TC-07 | Guest skip | Enter phone + name → Skip | guestCustomer in localStorage, no crm_token, menu loads | P0 |
| TC-08 | Token persistence | Login → close tab → reopen | AuthContext reads crm_token → CRM /customer/me → profile loaded | P0 |
| TC-09 | Token expiry | Login → simulate 401 from CRM | Clear crm_token → "Session expired" → redirect to landing | P1 |
| TC-10 | Logout | Click logout | crm_token cleared, redirect to landing | P0 |

### B. Admin Auth (Regression — No Change)

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| TC-11 | Admin password login | Go to /login → email + password | auth_token + pos_token → /admin/settings | P0 |
| TC-12 | Admin wrong password | /login → wrong password | "Invalid password" | P1 |
| TC-13 | Admin pages accessible | Login as admin → navigate admin pages | All admin pages load, config saves work | P0 |

### C. Profile Page (CRM Data)

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| TC-14 | View profile | Login → /profile → Profile tab | CRM /customer/me data displayed (name, phone, tier, points) | P0 |
| TC-15 | View orders | Profile → Orders tab | CRM /customer/me/orders → order list with items | P1 |
| TC-16 | View points | Profile → Points tab | CRM /customer/me/points → balance + transactions | P1 |
| TC-17 | View wallet | Profile → Wallet tab | CRM /customer/me/wallet → balance + transactions | P1 |
| TC-18 | No token → profile redirect | Navigate to /profile without login | Redirect to landing page | P0 |

### D. Delivery Addresses (NEW)

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| TC-19 | List saved addresses | Login → delivery mode → address page | CRM /customer/me/addresses → address list displayed | P0 |
| TC-20 | Add new address | Address page → fill form → save | CRM POST /customer/me/addresses → new address in list | P0 |
| TC-21 | Edit address | Click edit → modify fields → save | CRM PUT → updated address shown | P1 |
| TC-22 | Delete address | Click delete → confirm | CRM DELETE → address removed from list | P1 |
| TC-23 | Set default | Click "Set as default" | CRM POST .../set-default → default badge moves | P1 |
| TC-24 | No addresses → must add | New customer → delivery mode → empty address list | Show "Add Address" form. Cannot proceed without address. | P0 |
| TC-25 | Guest → delivery prompt | Guest mode → select delivery | "Please login to use delivery" → login flow → address page | P0 |

### E. End-to-End Flows

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| TC-26 | Full delivery order | Login → delivery → address → menu → cart → review (address shown) → place order | Order placed with delivery fields in POS payload | P0 |
| TC-27 | Full takeaway order | Login → takeaway → menu → cart → review → place order | order_type=takeaway, table_id=0, no address | P0 |
| TC-28 | Full dine-in order (regression) | Scan table QR → menu → cart → review → place order | Unchanged behavior, table auto-filled | P0 |
| TC-29 | Loyalty points display | Login → cart → review order | customer-lookup (public) + loyalty-settings (public) still work | P1 |
| TC-30 | Razorpay payment (regression) | Place order with online payment | Razorpay flow unchanged | P2 |

---

## 11. Implementation Phases

### Phase A: Foundation (2-3 hours)
1. Add `REACT_APP_CRM_URL` to frontend `.env`
2. Create `api/services/crmService.js` — all CRM API calls
3. Restart frontend (env change)

### Phase B: Customer Auth Migration (4-5 hours)
4. Update `AuthContext.jsx` — CRM token management, /customer/me
5. Update `PasswordSetup.jsx` — CRM register/login/forgot/reset
6. Update `LandingPage.jsx` — pass user_id for CRM calls
7. Simplify `Login.jsx` — admin only
8. Test TC-01 through TC-13

### Phase C: Profile Page Migration (1.5-2 hours)
9. Update `Profile.jsx` — CRM endpoints, handle response shapes
10. Test TC-14 through TC-18

### Phase D: Delivery Address + Flow (4-5 hours)
11. Create `DeliveryAddress.jsx` — address CRUD UI
12. Add route in `App.js`
13. Update `CartContext.js` — delivery state
14. Update `ReviewOrder.jsx` — delivery address in bill + order payload
15. Wire up LandingPage delivery mode → DeliveryAddressPage
16. Test TC-19 through TC-30

### Phase E: Polish & Regression (2-3 hours)
17. Edge case handling (CRM down, token expiry, guest→delivery)
18. Full regression: dine-in, takeaway, admin, Razorpay
19. Update memory docs

**Total: 14-18 hours**

---

## 12. Open Items / Deferred

| # | Item | Status | Blocking? |
|---|------|--------|-----------|
| 1 | Distance API (delivery charge calculation) | Deferred | No — hardcode 0 for now |
| 2 | Zone API | Deferred | No |
| 3 | Google Maps geocoding | Deferred — addresses have lat/lng | No |
| 4 | CRM coupon listing for customer | Check if endpoint exists | No — keep on our backend |
| 5 | Our backend customer auth endpoints cleanup | Optional — can retire later | No |
| 6 | `REACT_APP_CRM_URL` for production | Need production CRM URL from you | Yes (for deploy) |

---

*Created: April 13, 2026 | v2 — Updated with CRM v1.4 password auth endpoints*
