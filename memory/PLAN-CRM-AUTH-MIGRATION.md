# PLAN: Migrate Customer Auth to CRM + Delivery Phase 3

**Date:** April 13, 2026  
**Status:** REVIEW — awaiting approval before implementation  

---

## 1. Current State — How Customer Auth Works Today

### Flow: Landing Page → PasswordSetup

```
LandingPage (customer enters phone + name)
  │
  ├─ POST /api/auth/check-customer (Our Backend)
  │    ├─ exists + has_password=true  → PasswordSetup (verify password mode)
  │    ├─ exists + has_password=false → PasswordSetup (set password mode)
  │    └─ not exists                 → PasswordSetup (create account + set password)
  │
  ├─ PasswordSetup:
  │    ├─ verify-password → Our Backend /api/auth/verify-password → Our JWT
  │    ├─ set-password    → Our Backend /api/auth/set-password → Our JWT (creates customer if new)
  │    └─ forgot password → send-otp → reset-password → Our Backend
  │
  └─ Skip → guest mode (localStorage only)
```

### Flow: Login Page (shared for Admin + Customer)

```
Login Page (/login)
  │
  ├─ Password login → Our Backend /api/auth/login
  │    ├─ Checks `customers` collection → user_type="customer" → Landing Page
  │    └─ Checks `users` collection    → user_type="restaurant" → /admin/settings
  │
  ├─ OTP login → Our Backend /api/auth/send-otp → /api/auth/login (with OTP)
  └─ Forgot password → send-otp → reset-password
```

### Tokens in localStorage today

| Key | Source | Used For |
|-----|--------|----------|
| `auth_token` | Our Backend JWT | Our Backend authenticated endpoints (profile, orders, points, wallet) |
| `order_auth_token` | POS API /auth/login (env creds) | POS API (menus, place order, table status) |
| `pos_token` | POS vendoremployee/login (admin only) | Admin operations (QR codes, table config) |
| `guestCustomer` | Frontend (JSON) | Guest name+phone for order placement |

---

## 2. Target State — Customer Auth via CRM

### New Flow: Landing Page → OTP Verification

```
LandingPage (customer enters phone + name)
  │
  ├─ CRM: POST /customer/send-otp
  │    ├─ Customer exists → OTP sent → show OTP input
  │    └─ Customer NOT exists → 404 → Create customer first (Our Backend), then retry
  │
  ├─ Customer enters OTP
  │    └─ CRM: POST /customer/verify-otp → CRM token + full profile + addresses
  │
  ├─ Store CRM token → proceed to Menu
  │
  └─ Skip → guest mode (unchanged)
```

### New Flow: Login Page (Admin ONLY)

```
Login Page (/login) — Admin only now
  │
  └─ Password login → Our Backend /api/auth/login
       └─ Only checks `users` collection → user_type="restaurant" → /admin/settings
```

Customer login is no longer on `/login` page — it happens on the Landing Page via OTP.

### New Tokens in localStorage

| Key | Source | Used For |
|-----|--------|----------|
| `crm_token` | CRM /customer/verify-otp | CRM endpoints (profile, addresses, points, wallet, orders) |
| `order_auth_token` | POS API (unchanged) | POS API (menus, place order) |
| `pos_token` | POS vendoremployee/login (admin only) | Admin operations (unchanged) |
| `auth_token` | Our Backend JWT (admin only) | Our Backend admin endpoints |
| `guestCustomer` | Frontend (JSON) | Guest name+phone (unchanged) |

---

## 3. Critical Discovery: CRM Rejects Unregistered Phones

**Test result:**
```
CRM /customer/send-otp with unregistered phone → 404 (not found)
CRM has NO /customer/register or /customer/create endpoint
```

**Impact:** New customers (first-time visitors) cannot authenticate via CRM directly.

**Solution:** Our Backend keeps the customer creation responsibility:
1. LandingPage → check if customer exists (Our Backend `/api/auth/check-customer` — reads same DB)
2. If NOT exists → Our Backend creates the customer record (modified `set-password` or new lightweight endpoint)
3. Then → CRM `send-otp` works because customer now exists in DB
4. → CRM `verify-otp` → CRM token

---

## 4. Detailed Endpoint Migration Map

### Customer Auth Endpoints

| Current (Our Backend) | New | Change |
|----------------------|-----|--------|
| `POST /api/auth/check-customer` | **KEEP** (public, reads same DB) | No change |
| `POST /api/auth/login` (customer) | **REMOVE** customer path | Admin-only |
| `POST /api/auth/login` (admin) | **KEEP** | No change |
| `POST /api/auth/send-otp` | **REPLACE** → CRM `/customer/send-otp` | Frontend calls CRM directly |
| `POST /api/auth/set-password` | **MODIFY** → create customer only (no auth token) | Just creates record in DB, no JWT |
| `POST /api/auth/verify-password` | **REMOVE** | Replaced by CRM OTP |
| `POST /api/auth/reset-password` | **REMOVE** | Password no longer used for customers |
| `GET /api/auth/me` | **REPLACE** → CRM `/customer/me` | Frontend calls CRM with CRM token |

### Customer Data Endpoints

| Current (Our Backend) | New (CRM) | Notes |
|----------------------|-----------|-------|
| `GET /api/customer/profile` | CRM `GET /customer/me` | Richer data (includes addresses) |
| `GET /api/customer/orders` | CRM `GET /customer/me/orders` | Same DB, more fields |
| `GET /api/customer/points` | CRM `GET /customer/me/points` | Same DB |
| `GET /api/customer/wallet` | CRM `GET /customer/me/wallet` | Same DB |
| `GET /api/customer/coupons` | Keep or move (TBD) | Check if CRM has equivalent |
| ❌ None | CRM `GET /customer/me/addresses` | **NEW** — for delivery |
| ❌ None | CRM `POST /customer/me/addresses` | **NEW** — add address |
| ❌ None | CRM `PUT /customer/me/addresses/{id}` | **NEW** — edit address |
| ❌ None | CRM `DELETE /customer/me/addresses/{id}` | **NEW** — delete address |

### Endpoints That Stay Unchanged

| Endpoint | Why |
|----------|-----|
| `GET /api/config/{restaurant_id}` | Public — no auth |
| `PUT /api/config/` | Admin auth — no change |
| `POST/PUT/DELETE /api/config/banners/*` | Admin auth — no change |
| `POST/PUT/DELETE /api/config/pages/*` | Admin auth — no change |
| `GET /api/loyalty-settings/{id}` | Public — no auth |
| `GET /api/customer-lookup/{id}` | Public — no auth |
| `GET/PUT /api/dietary-tags/*` | Public/Admin — no change |
| `POST /api/upload/image` | Admin auth — no change |
| `GET /api/table-config` | Admin auth — no change |
| `GET /api/air-bnb/get-order-details/{id}` | No auth — POS proxy |
| `POST /api/config/feedback` | Public — no change |

---

## 5. New Customer Auth Flow — Step by Step

### 5A. Returning Customer (Exists in DB, any restaurant)

```
1. LandingPage: Customer enters phone + name, clicks "Browse Menu"
2. Frontend → Our Backend: POST /api/auth/check-customer {phone, restaurant_id}
3. Response: { exists: true, customer: { name, has_password } }
4. Frontend → CRM: POST /customer/send-otp {phone, user_id, country_code}
5. Response: { success: true, message: "OTP sent" }
6. LandingPage shows OTP input field
7. Customer enters OTP
8. Frontend → CRM: POST /customer/verify-otp {phone, otp, user_id, country_code}
9. Response: { token, customer: { id, name, phone, addresses, tier, points, wallet... } }
10. Store CRM token in localStorage('crm_token')
11. Store customer profile in AuthContext
12. Navigate to Menu
```

### 5B. New Customer (NOT in DB)

```
1. LandingPage: Customer enters phone + name, clicks "Browse Menu"
2. Frontend → Our Backend: POST /api/auth/check-customer {phone, restaurant_id}
3. Response: { exists: false }
4. Frontend → Our Backend: POST /api/auth/create-customer {phone, name, restaurant_id}
   (New lightweight endpoint — just creates record, no password, no token)
5. Response: { success: true, customer_id: "cust-478-xxxxx" }
6. Frontend → CRM: POST /customer/send-otp {phone, user_id, country_code}
7. OTP sent → Customer enters OTP
8. Frontend → CRM: POST /customer/verify-otp {phone, otp, user_id, country_code}
9. CRM token + profile returned
10. Store and navigate to Menu
```

### 5C. Guest Mode (Skip)

```
1. Customer clicks "Skip" (or config doesn't require capture)
2. Store name+phone in localStorage('guestCustomer') — unchanged
3. Navigate to Menu
4. No CRM token — no address access — delivery requires login
```

### 5D. Admin Login (Unchanged)

```
1. Admin navigates to /login
2. Enters email + password
3. Frontend → Our Backend: POST /api/auth/login
4. Backend checks `users` collection only → user_type="restaurant"
5. Returns { token, pos_token, user }
6. Store auth_token + pos_token
7. Navigate to /admin/settings
```

---

## 6. Frontend Files to Modify

| File | Changes | Effort |
|------|---------|--------|
| **LandingPage.jsx** | Replace `check-customer` → `check-customer` + CRM `send-otp` + `verify-otp`. Add OTP input UI. Remove PasswordSetup navigation. | HIGH |
| **AuthContext.jsx** | Add `crmToken` state. Replace `login()` with `crmLogin()`. Replace `/api/auth/me` check with CRM `/customer/me`. Add `setCrmAuth()`. | HIGH |
| **Login.jsx** | Remove customer login flows (OTP, forgot password, set password). Keep only admin password login. | MEDIUM |
| **PasswordSetup.jsx** | **DELETE or repurpose** — no longer needed (password flow removed for customers) | MEDIUM |
| **Profile.jsx** | Change API calls from Our Backend → CRM. Use `crm_token` instead of `auth_token`. | MEDIUM |
| **ReviewOrder.jsx** | `customer-lookup` stays (public). Loyalty-settings stays (public). No auth change needed. | LOW |
| **App.js** | Remove `/:restaurantId/password-setup` route (or repurpose). Add delivery address route. | LOW |
| **.env (frontend)** | Add `REACT_APP_CRM_URL=https://customer-app-march-2.preview.emergentagent.com/api` | LOW |

### New Files

| File | Purpose |
|------|---------|
| `api/services/crmService.js` | CRM API calls (send-otp, verify-otp, addresses, profile) |
| `pages/DeliveryAddress.jsx` | Address selection/entry for delivery flow |

---

## 7. Backend Changes (Our FastAPI)

| Change | Details |
|--------|---------|
| **New endpoint**: `POST /api/auth/create-customer` | Lightweight — creates customer in `customers` collection with name+phone+restaurant. No password. Returns success + customer_id. |
| **Modify**: `POST /api/auth/login` | Remove customer path (only check `users` collection). Return 404 for phone-based login attempts. |
| **Keep**: `POST /api/auth/check-customer` | Still useful as a quick pre-check before CRM OTP flow. |
| **Retire** (can keep but unused): | `verify-password`, `set-password`, `reset-password`, `send-otp` — customer-facing auth endpoints |

---

## 8. Edge Cases

| # | Edge Case | Handling |
|---|-----------|----------|
| 1 | **New customer + CRM send-otp returns 404** | Frontend detects 404, calls our backend `create-customer`, then retries CRM `send-otp` |
| 2 | **OTP expires (10 min)** | Show "OTP expired" message + "Resend OTP" button → call CRM send-otp again |
| 3 | **Wrong OTP entered 3+ times** | CRM handles rate limiting (if any). Show error message from CRM response |
| 4 | **Customer on PasswordSetup page (old flow) after update** | Remove route or redirect to landing page |
| 5 | **Existing `auth_token` in localStorage (old JWT)** | On app load, AuthContext tries CRM `/customer/me` with `crm_token`. If no `crm_token` but `auth_token` exists, clear it (stale). |
| 6 | **Admin tries to use customer flow** | `check-customer` returns `exists: false` for admin phone (admin is in `users`, not `customers`). Admin goes to `/login` instead. |
| 7 | **Customer has saved password but new flow is OTP-only** | Password still in DB but unused. OTP flow works regardless. No data migration needed. |
| 8 | **Guest user wants delivery** | Delivery requires address → address requires CRM token → prompt login (OTP) before delivery address page |
| 9 | **CRM is down** | Show error "Service temporarily unavailable". Fallback to guest mode. |
| 10 | **Token expiry (CRM token = 24 hours)** | On 401 from CRM, clear `crm_token`, show "Session expired, please login again" |
| 11 | **Customer switches restaurants** | CRM token is scoped to `user_id` (restaurant). If restaurant changes, need fresh OTP login. |
| 12 | **Profile page with old auth_token** | Redirect to landing page if no valid `crm_token` |
| 13 | **Multiple tabs open** | localStorage is shared — token changes propagate. Standard behavior. |

---

## 9. Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **CRM API changes or goes down** | HIGH | Keep our backend auth endpoints as fallback (don't delete, just unused). Can switch back. |
| 2 | **OTP delivery failure (SMS not sent)** | MEDIUM | CRM returns `debug_otp` in dev. In prod, depends on SMS provider. Show "Didn't receive OTP?" with resend. |
| 3 | **Customer confusion (was password, now OTP)** | LOW | OTP is simpler. No "forgot password" needed. Better UX overall. |
| 4 | **Breaking existing admin login** | MEDIUM | Admin flow is untouched — only customer paths change. Test admin login separately. |
| 5 | **`crm_token` vs `auth_token` confusion in code** | MEDIUM | Clear naming. AuthContext exposes `crmToken` for customer, `token` for admin. |
| 6 | **CRM token not accepted by our backend** | LOW | Our backend's customer endpoints won't be called with CRM token. They either stay unused or we add CRM token verification. |
| 7 | **Race condition: create-customer + send-otp** | LOW | Sequential calls. create-customer must complete before send-otp. |

---

## 10. Test Cases

### Customer Auth (New CRM Flow)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| TC-01 | **Returning customer — happy path** | Enter existing phone → OTP sent → enter OTP → verified | CRM token stored, profile loaded, navigate to menu |
| TC-02 | **New customer — happy path** | Enter new phone + name → check-customer returns false → create-customer → OTP sent → verify | Customer created, CRM token, navigate to menu |
| TC-03 | **Wrong OTP** | Enter phone → OTP sent → enter wrong OTP | Error message "Invalid OTP", stay on OTP input |
| TC-04 | **Expired OTP** | Enter phone → OTP sent → wait 10+ min → enter OTP | Error message "OTP expired", resend option |
| TC-05 | **Resend OTP** | Enter phone → OTP sent → click "Resend" | New OTP sent, old OTP invalidated |
| TC-06 | **Guest skip** | Enter phone + name → click "Skip" | Guest data in localStorage, no CRM token, navigate to menu |
| TC-07 | **CRM down** | Enter phone → CRM returns error | Error message, fallback to guest |
| TC-08 | **Token persistence** | Login → close tab → reopen | AuthContext reads `crm_token`, calls CRM `/customer/me`, profile loaded |
| TC-09 | **Token expired** | Login → wait 24h → interact | 401 from CRM → clear token → prompt re-login |
| TC-10 | **Logout** | Click logout | `crm_token` cleared, navigate to landing |

### Admin Auth (Unchanged — Regression)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| TC-11 | **Admin password login** | Go to /login → email + password | auth_token + pos_token stored, navigate to /admin/settings |
| TC-12 | **Admin wrong password** | Go to /login → wrong password | Error "Invalid password" |
| TC-13 | **Customer tries /login page** | Customer phone + password on /login | Should fail (customer path removed from /api/auth/login) OR show message "Customers: login from restaurant page" |

### Profile Page (CRM Data)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| TC-14 | **View profile** | Login → go to /profile | CRM `/customer/me` data displayed |
| TC-15 | **View orders** | Profile → Orders tab | CRM `/customer/me/orders` data |
| TC-16 | **View points** | Profile → Points tab | CRM `/customer/me/points` data |
| TC-17 | **View wallet** | Profile → Wallet tab | CRM `/customer/me/wallet` data |
| TC-18 | **No token → profile** | Direct navigate to /profile without login | Redirect to landing page |

### Delivery Addresses (NEW — CRM)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| TC-19 | **List addresses** | Login → delivery mode → address page | CRM `/customer/me/addresses` list displayed |
| TC-20 | **Add address** | Address page → fill form → save | CRM `POST /customer/me/addresses` → new address in list |
| TC-21 | **Edit address** | Address page → click edit → modify → save | CRM `PUT /customer/me/addresses/{id}` |
| TC-22 | **Delete address** | Address page → click delete | CRM `DELETE /customer/me/addresses/{id}` |
| TC-23 | **Set default address** | Address page → click "Set as default" | CRM `POST /customer/me/addresses/{id}/set-default` |
| TC-24 | **Guest tries delivery** | Guest mode → select delivery → address page | Prompt to login (OTP flow) before showing addresses |

### Integration (End-to-End)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| TC-25 | **Full delivery flow** | Login (OTP) → delivery mode → select address → menu → cart → review order (with delivery charge) → place order | Order placed with delivery address fields populated |
| TC-26 | **Takeaway flow (no address)** | Login (OTP) → takeaway mode → menu → cart → review order → place | Order placed with order_type=takeaway, no address |
| TC-27 | **Dine-in flow (unchanged)** | Scan table QR → menu → cart → review → place | Unchanged behavior, no regression |
| TC-28 | **Loyalty points with CRM token** | Login → cart → review order → loyalty section | customer-lookup (public) + loyalty-settings (public) still work |

---

## 11. Implementation Order

### Phase A: Foundation (Estimated: 2-3 hours)
1. Add `REACT_APP_CRM_URL` to frontend `.env`
2. Create `api/services/crmService.js` — CRM API helper (send-otp, verify-otp, get profile, address CRUD)
3. Create `POST /api/auth/create-customer` on our backend (lightweight — no password, no token)
4. Modify `POST /api/auth/login` on our backend — remove customer path (admin-only)

### Phase B: Landing Page OTP Flow (Estimated: 3-4 hours)
5. Modify `LandingPage.jsx` — replace PasswordSetup navigation with inline OTP flow
6. Update `AuthContext.jsx` — add CRM token management, replace `/api/auth/me` with CRM `/customer/me`
7. Remove or redirect `PasswordSetup.jsx` route
8. Update `Login.jsx` — admin-only (remove customer flows)

### Phase C: Profile Page Migration (Estimated: 1-2 hours)
9. Modify `Profile.jsx` — switch API calls from Our Backend to CRM
10. Test all tabs (profile, orders, points, wallet)

### Phase D: Delivery Address Page (Estimated: 3-4 hours)
11. Create `DeliveryAddress.jsx` — list saved addresses, add new, select for order
12. Add route in `App.js`
13. Wire up to landing page delivery flow
14. Update `CartContext.js` — store selected delivery address
15. Update `ReviewOrder.jsx` — show delivery address + populate order payload

### Phase E: Testing & Polish (Estimated: 2-3 hours)
16. Run all test cases TC-01 through TC-28
17. Edge case handling (CRM down, token expiry, guest → delivery prompt)
18. Regression test: dine-in, takeaway, admin login, Razorpay

**Total estimated: 11-16 hours**

---

## 12. Open Question

**Password flow for customers — fully remove or keep as alternative?**

Current plan removes password entirely for customers (OTP-only). Benefits:
- Simpler UX (no password to remember)
- No "forgot password" flow needed
- CRM handles everything

Risk:
- Customers who set passwords before can't use them (minor — OTP is easier)
- No offline/SMS-failure fallback

**Recommendation:** Remove password for customers. OTP is the standard for food ordering apps (Swiggy, Zomato model).

---

*Created: April 13, 2026 | Status: REVIEW — awaiting approval*
