# Customer Endpoints — Complete API Reference

**Base URL:** `https://loyalty-app-april-v1.preview.emergentagent.com`
**Database:** MongoDB (`customers` collection, scoped by `user_id = pos_{pos_id}_restaurant_{restaurant_id}`)
**Date:** April 11, 2026

---

## 1. Authentication Endpoints (`/api/auth/*`)

---

### 1.1 Check Customer

Checks if a customer exists for a specific restaurant by phone number.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/check-customer` |
| **Auth** | None |
| **Used by** | Landing page → "Browse Menu" click |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number (with or without +91) |
| `restaurant_id` | string | Yes | Restaurant ID (e.g., "478") |
| `pos_id` | string | No | POS ID, defaults to "0001" |

**cURL:**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/check-customer" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919579504871",
    "restaurant_id": "478",
    "pos_id": "0001"
  }'
```

**Response (Customer Exists):**
```json
{
  "exists": true,
  "customer": {
    "name": "John Doe",
    "phone": "9579504871",
    "has_password": true
  }
}
```

**Response (Customer Not Found):**
```json
{
  "exists": false,
  "customer": null
}
```

---

### 1.2 Unified Login

Login for both customers and restaurant admins. Supports OTP and password auth.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/login` |
| **Auth** | None |
| **Used by** | Login page, POS API token (env creds) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_or_email` | string | Yes | Phone or email identifier |
| `password` | string | No* | Password (required if no OTP) |
| `otp` | string | No* | OTP code (required if no password) |
| `restaurant_id` | string | No | Restaurant ID for customer-scoped login |
| `pos_id` | string | No | POS ID, defaults to "0001" |

*One of `password` or `otp` is required.

**cURL (Password Login):**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_or_email": "+919579504871",
    "password": "Qplazm@10",
    "restaurant_id": "478",
    "pos_id": "0001"
  }'
```

**cURL (OTP Login):**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_or_email": "+919579504871",
    "otp": "123456",
    "restaurant_id": "478"
  }'
```

**Response (Customer Login):**
```json
{
  "success": true,
  "user_type": "customer",
  "token": "eyJhbGciOiJI...",
  "pos_token": null,
  "user": {
    "id": "cust-478-abc12345",
    "name": "John Doe",
    "phone": "9579504871",
    "email": "",
    "tier": "Bronze",
    "total_points": 0,
    "wallet_balance": 0.0,
    "user_id": "pos_0001_restaurant_478",
    "has_password": true
  },
  "restaurant_context": {
    "restaurant_id": "478",
    "pos_id": "0001",
    "user_id": "pos_0001_restaurant_478"
  }
}
```

**Response (Restaurant Admin Login):**
```json
{
  "success": true,
  "user_type": "restaurant",
  "token": "eyJhbGciOiJI...",
  "pos_token": "eyJ0eXAiOiJK...",
  "user": {
    "id": "user-abc123",
    "restaurant_id": "478",
    "email": "admin@restaurant.com",
    "restaurant_name": "18march",
    "phone": "+919579504871",
    "pos_id": "0001",
    "pos_name": "MyGenie"
  }
}
```

**Error Responses:**
- `400` — "Password or OTP required for login"
- `401` — "Invalid password" / "Invalid or expired OTP" / "No password set"
- `404` — "Account not found. Please contact restaurant."

---

### 1.3 Send OTP

Sends OTP to customer's phone number for forgot password flow.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/send-otp` |
| **Auth** | None |
| **Used by** | Forgot password flow |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number |
| `restaurant_id` | string | No | Restaurant ID for scoped lookup |
| `pos_id` | string | No | POS ID, defaults to "0001" |

**cURL:**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919579504871",
    "restaurant_id": "478"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp_for_testing": "482917"
}
```

**Note:** `otp_for_testing` is returned for development. In production, OTP is sent via SMS only.

**Error:** `404` — "Phone number not registered for this restaurant"

---

### 1.4 Set Password

Sets password for a new customer or existing customer without password. Creates customer record if new.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/set-password` |
| **Auth** | None |
| **Used by** | Password Setup page (new + returning without password) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number |
| `password` | string | Yes | Password (min 6 chars) |
| `confirm_password` | string | Yes | Must match password |
| `restaurant_id` | string | Yes | Restaurant ID |
| `pos_id` | string | No | Defaults to "0001" |
| `name` | string | No | Customer name |

**cURL:**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/set-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "MyPass123",
    "confirm_password": "MyPass123",
    "restaurant_id": "478",
    "name": "Jane Doe"
  }'
```

**Response (Existing Customer Updated):**
```json
{
  "success": true,
  "message": "Password set successfully",
  "token": "eyJhbGciOiJI...",
  "customer": {
    "id": "cust-478-abc12345",
    "name": "Jane Doe",
    "phone": "9876543210"
  }
}
```

**Response (New Customer Created):**
```json
{
  "success": true,
  "message": "Account created with password",
  "token": "eyJhbGciOiJI...",
  "customer": {
    "id": "cust-478-f7e2a3b1",
    "name": "Jane Doe",
    "phone": "9876543210"
  }
}
```

**Errors:**
- `400` — "Passwords do not match"
- `400` — "Password must be at least 6 characters"

---

### 1.5 Verify Password

Login for returning customer with existing password.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/verify-password` |
| **Auth** | None |
| **Used by** | Password Setup page (existing customer with password) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number |
| `password` | string | Yes | Customer's password |
| `restaurant_id` | string | Yes | Restaurant ID |
| `pos_id` | string | No | Defaults to "0001" |

**cURL:**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/verify-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919579504871",
    "password": "Qplazm@10",
    "restaurant_id": "478"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJI...",
  "customer": {
    "id": "cust-478-abc12345",
    "name": "John Doe",
    "phone": "9579504871",
    "tier": "Bronze",
    "total_points": 0
  }
}
```

**Errors:**
- `400` — "No password set for this account"
- `401` — "Invalid password"
- `404` — "Customer not found"

---

### 1.6 Reset Password

Reset password using OTP verification.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/auth/reset-password` |
| **Auth** | None |
| **Used by** | Forgot password flow |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Phone number |
| `new_password` | string | Yes | New password (min 6 chars) |
| `confirm_password` | string | Yes | Must match new_password |
| `otp` | string | Yes | OTP received via SMS |
| `restaurant_id` | string | Yes | Restaurant ID |
| `pos_id` | string | No | Defaults to "0001" |

**cURL:**
```bash
curl -X POST "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919579504871",
    "new_password": "NewPass123",
    "confirm_password": "NewPass123",
    "otp": "482917",
    "restaurant_id": "478"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Errors:**
- `400` — "Passwords do not match" / "Password must be at least 6 characters"
- `401` — "Invalid or expired OTP"
- `404` — "Customer not found"

---

### 1.7 Get Current User

Get profile of the currently authenticated user (customer or admin).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/auth/me` |
| **Auth** | Bearer token (from login/set-password) |
| **Used by** | Profile page |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
{
  "user_type": "customer",
  "user": {
    "id": "cust-478-abc12345",
    "name": "John Doe",
    "phone": "9579504871",
    "email": "",
    "tier": "Bronze",
    "total_points": 0,
    "wallet_balance": 0.0,
    "total_visits": 0,
    "total_spent": 0.0
  }
}
```

---

## 2. Customer Profile Endpoints (`/api/customer/*`)

All endpoints require Bearer token authentication (customer type only).

---

### 2.1 Get Customer Profile

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/profile` |
| **Auth** | Bearer token (customer) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/profile" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
{
  "id": "cust-478-abc12345",
  "name": "John Doe",
  "phone": "9579504871",
  "email": null,
  "total_points": 0,
  "wallet_balance": 0.0,
  "tier": "Bronze",
  "total_visits": 0,
  "total_spent": 0.0,
  "allergies": null,
  "diet_preference": null
}
```

**Error:** `403` — "Customer access only"

---

### 2.2 Update Customer Profile

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `/api/customer/profile` |
| **Auth** | Bearer token (customer) |

**Allowed Fields:** `name`, `email`, `allergies`, `diet_preference`, `preferred_dining_type`

**cURL:**
```bash
curl -X PUT "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJI..." \
  -d '{
    "name": "John Updated",
    "diet_preference": "vegetarian",
    "allergies": ["peanuts", "gluten"]
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cust-478-abc12345",
    "name": "John Updated",
    "phone": "9579504871",
    "diet_preference": "vegetarian",
    "allergies": ["peanuts", "gluten"],
    "updated_at": "2026-04-11T12:00:00+00:00"
  }
}
```

**Error:** `400` — "No valid fields to update"

---

### 2.3 Get Customer Orders

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/orders` |
| **Auth** | Bearer token (customer) |
| **Query Params** | `limit` (default 20), `skip` (default 0) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/orders?limit=10&skip=0" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
[
  {
    "id": "order-abc123",
    "order_amount": 450.0,
    "points_earned": 45,
    "created_at": "2026-04-11T10:30:00+00:00",
    "order_type": "dinein",
    "items": [
      {"name": "Butter Chicken", "quantity": 1, "price": 350},
      {"name": "Naan", "quantity": 2, "price": 50}
    ]
  }
]
```

---

### 2.4 Get Points History

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/points` |
| **Auth** | Bearer token (customer) |
| **Query Params** | `limit` (default 50), `skip` (default 0) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/points?limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
[
  {
    "id": "txn-abc123",
    "points": 45,
    "transaction_type": "earn",
    "description": "Order #order-abc123",
    "created_at": "2026-04-11T10:30:00+00:00",
    "balance_after": 145
  }
]
```

---

### 2.5 Get Wallet

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/wallet` |
| **Auth** | Bearer token (customer) |
| **Query Params** | `limit` (default 50), `skip` (default 0) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/wallet" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
{
  "balance": 250.0,
  "transactions": [
    {
      "id": "wallet-txn-123",
      "amount": 100.0,
      "type": "credit",
      "description": "Cashback on order",
      "created_at": "2026-04-11T10:30:00+00:00"
    }
  ]
}
```

---

### 2.6 Get Coupons

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/coupons` |
| **Auth** | Bearer token (customer) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/coupons" \
  -H "Authorization: Bearer eyJhbGciOiJI..."
```

**Response:**
```json
{
  "coupons": [
    {
      "id": "coupon-abc123",
      "code": "WELCOME10",
      "discount_type": "percentage",
      "discount_value": 10,
      "min_order": 200,
      "is_active": true,
      "start_date": "2026-01-01T00:00:00",
      "end_date": "2026-12-31T23:59:59"
    }
  ]
}
```

---

## 3. Public Lookup Endpoints (`/api/*`)

---

### 3.1 Customer Lookup

Quick lookup by phone — no auth required. Returns name, points, tier, wallet.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer-lookup/{restaurant_id}?phone={phone}` |
| **Auth** | None |
| **Used by** | ReviewOrder page (loyalty display) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer-lookup/478?phone=9579504871"
```

**Response (Found):**
```json
{
  "found": true,
  "name": "John Doe",
  "phone": "9579504871",
  "country_code": "+91",
  "total_points": 145,
  "tier": "Bronze",
  "wallet_balance": 250.0
}
```

**Response (Not Found):**
```json
{
  "found": false,
  "name": "",
  "phone": "9579504871",
  "total_points": 0,
  "tier": "Bronze",
  "wallet_balance": 0.0
}
```

---

## 4. Customer Data Model (MongoDB)

**Collection:** `customers`
**Scoping:** Each customer is scoped to a restaurant via `user_id = pos_{pos_id}_restaurant_{restaurant_id}`

```json
{
  "id": "cust-478-f7e2a3b1",
  "user_id": "pos_0001_restaurant_478",
  "name": "John Doe",
  "phone": "9579504871",
  "country_code": "+91",
  "email": "",
  "tier": "Bronze",
  "total_points": 0,
  "wallet_balance": 0,
  "total_visits": 0,
  "total_spent": 0.0,
  "password_hash": "$2b$12$...",
  "allergies": null,
  "diet_preference": null,
  "created_at": "2026-04-11T12:00:00+00:00",
  "updated_at": "2026-04-11T12:00:00+00:00"
}
```

**Phone normalization:** Backend strips `+91` prefix for matching. Both `+919579504871` and `9579504871` match the same customer.

---

## 5. POS API Endpoints (External — `preprod.mygenie.online`)

**Base URL:** `https://preprod.mygenie.online/api/v1`
**Auth:** Bearer token (from POS API login — env creds `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD`)
**Called by:** Frontend directly via `REACT_APP_API_BASE_URL` or backend proxy via `MYGENIE_API_URL`

---

### 5.1 Restaurant Info

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/web/restaurant-info` |
| **Auth** | Bearer token |
| **Called by** | Frontend (RestaurantConfigContext) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/web/restaurant-info" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}"
```

---

### 5.2 Restaurant Products (Menu Items)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/web/restaurant-product` |
| **Auth** | Bearer token |
| **Called by** | Frontend (MenuItems page) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/web/restaurant-product" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "restaurant_id": "478"
  }'
```

---

### 5.3 Menu Master (Stations / Menu Types)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/web/menu-master` |
| **Auth** | Bearer token |
| **Called by** | Frontend (multi-menu restaurants) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/web/menu-master" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "restaurant_id": "478"
  }'
```

---

### 5.4 Place Order

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/customer/order/place` |
| **Auth** | Bearer token |
| **Called by** | Frontend (ReviewOrder → placeOrder) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/customer/order/place" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "restaurant_id": "478",
    "order_type": "dinein",
    "table_id": "6182",
    "delivery_charge": "0",
    "address_id": "",
    "address": "",
    "latitude": "",
    "longitude": "",
    "items": [...],
    "cust_name": "John",
    "cust_phone": "9579504871"
  }'
```

---

### 5.5 Place Order (Auto-Paid / Prepaid) — Restaurant 716 ONLY

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/customer/order/autopaid-place-prepaid-order` |
| **Auth** | Bearer token |
| **Called by** | Frontend (ReviewOrder) — **ONLY for restaurant 716 (Hyatt Centric)** |
| **Note** | All other restaurants use `/customer/order/place` regardless of payment type |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/customer/order/autopaid-place-prepaid-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "restaurant_id": "716",
    "order_type": "dinein",
    "table_id": "6182",
    "payment_method": "cash_on_delivery",
    "payment_type": "postpaid",
    "items": [...]
  }'
```

**Payment Rules (applies to ALL endpoints):**

| Field | Value | Rule |
|-------|-------|------|
| `payment_method` | Always `"cash_on_delivery"` | Hardcoded, never changes |
| `payment_type` | `"prepaid"` if Razorpay, `"postpaid"` if COD | Based on user's UI selection, sent upfront |

**Endpoint Routing:**

| Restaurant | Endpoint |
|-----------|----------|
| 716 only | `/customer/order/autopaid-place-prepaid-order` |
| All others | `/customer/order/place` |

---

### 5.6 Update Customer Order (Edit Order)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/customer/order/update-customer-order` |
| **Auth** | Bearer token |
| **Called by** | Frontend (ReviewOrder → edit existing order) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/customer/order/update-customer-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "order_id": "12345",
    "restaurant_id": "478",
    "order_type": "dinein",
    "items": [...]
  }'
```

---

### 5.7 Check Table Status

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/customer/check-table-status?table_id={id}&restaurant_id={id}` |
| **Auth** | Bearer token |
| **Called by** | Frontend (LandingPage, OrderSuccess — table occupancy check) |

**cURL:**
```bash
curl -X GET "https://preprod.mygenie.online/api/v1/customer/check-table-status?table_id=6182&restaurant_id=478" \
  -H "Authorization: Bearer {pos_token}"
```

---

### 5.8 Get Order Details (via Backend Proxy)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/air-bnb/get-order-details/{order_id}` |
| **Auth** | None (proxied through our backend) |
| **Called by** | Frontend → our backend → POS API |

**cURL (via our backend):**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/air-bnb/get-order-details/12345"
```

**cURL (direct POS):**
```bash
curl -X GET "https://preprod.mygenie.online/api/v1/air-bnb/get-order-details/12345" \
  -H "Content-Type: application/json"
```

---

### 5.9 Table Config (via Backend Proxy)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/web/table-config` |
| **Auth** | Bearer token (admin, via X-POS-Token header) |
| **Called by** | Frontend → our backend (`/api/table-config`) → POS v2 API |
| **Note** | Uses POS **v2** API (`/api/v2/vendoremployee/restaurant-settings/table-config`) |

**cURL (via our backend):**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/table-config" \
  -H "Authorization: Bearer {admin_token}" \
  -H "X-POS-Token: {pos_token}"
```

---

### 5.10 Razorpay — Create Order

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/razor-pay/create-razor-order` |
| **Auth** | Bearer token |
| **Called by** | Frontend (online payment flow) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/razor-pay/create-razor-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "amount": 45000,
    "currency": "INR",
    "restaurant_id": "478"
  }'
```

---

### 5.11 Razorpay — Verify Payment

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/razor-pay/verify-payment` |
| **Auth** | Bearer token |
| **Called by** | Frontend (after Razorpay checkout callback) |

**cURL:**
```bash
curl -X POST "https://preprod.mygenie.online/api/v1/razor-pay/verify-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {pos_token}" \
  -d '{
    "razorpay_payment_id": "pay_abc123",
    "razorpay_order_id": "order_xyz789",
    "razorpay_signature": "sig_..."
  }'
```

---

## 6. Loyalty & Points Endpoints

### 6.1 Loyalty Settings (Our Backend)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/loyalty-settings/{restaurant_id}` |
| **Auth** | None |
| **Called by** | ReviewOrder page (to calculate earn/redeem rates) |
| **Source** | Our backend → MongoDB `loyalty_settings` collection |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/loyalty-settings/478"
```

**Response (settings found):**
```json
{
  "found": true,
  "bronze_earn_percent": 5.0,
  "silver_earn_percent": 7.0,
  "gold_earn_percent": 10.0,
  "platinum_earn_percent": 15.0,
  "redemption_value": 0.25,
  "min_order_value": 100.0,
  "first_visit_bonus_enabled": true,
  "first_visit_bonus_points": 50
}
```

**Response (defaults — no settings configured):**
```json
{
  "found": false,
  "bronze_earn_percent": 5.0,
  "silver_earn_percent": 7.0,
  "gold_earn_percent": 10.0,
  "platinum_earn_percent": 15.0,
  "redemption_value": 0.25,
  "min_order_value": 100.0,
  "first_visit_bonus_enabled": true,
  "first_visit_bonus_points": 50
}
```

**How loyalty works in ReviewOrder:**
- Restaurant must have `is_loyalty: "Yes"` in POS config
- Customer must have phone number filled (for lookup)
- `customer-lookup` returns `total_points` and `tier`
- `loyalty-settings` returns earn/redeem rates per tier
- User can choose to redeem points → `points_redeemed` and `points_discount` in order payload

---

### 6.2 Customer Lookup (Our Backend — used for loyalty display)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer-lookup/{restaurant_id}?phone={phone}` |
| **Auth** | None |
| **Called by** | ReviewOrder page (loyalty points display + name auto-fill) |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer-lookup/478?phone=9579504871"
```

**Response (found):**
```json
{
  "found": true,
  "name": "Abhishek",
  "phone": "9579504871",
  "country_code": "+91",
  "total_points": 145,
  "tier": "Bronze",
  "wallet_balance": 250.0
}
```

**Response (not found):**
```json
{
  "found": false,
  "name": "",
  "phone": "9579504871",
  "total_points": 0,
  "tier": "Bronze",
  "wallet_balance": 0.0
}
```

---

### 6.3 Customer Points History (Our Backend — authenticated)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/points?limit=50&skip=0` |
| **Auth** | Bearer token (customer) |
| **Called by** | Profile page |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/points?limit=20" \
  -H "Authorization: Bearer {customer_token}"
```

---

### 6.4 Customer Wallet (Our Backend — authenticated)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/wallet?limit=50&skip=0` |
| **Auth** | Bearer token (customer) |
| **Called by** | Profile page |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/wallet" \
  -H "Authorization: Bearer {customer_token}"
```

---

### 6.5 Customer Coupons (Our Backend — authenticated)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/customer/coupons` |
| **Auth** | Bearer token (customer) |
| **Called by** | ReviewOrder page (coupon code entry) |
| **Gated by** | Restaurant config `is_coupon: "Yes"` |

**cURL:**
```bash
curl -X GET "https://loyalty-app-april-v1.preview.emergentagent.com/api/customer/coupons" \
  -H "Authorization: Bearer {customer_token}"
```

---

### Loyalty + Points Flow in Order

```
ReviewOrder loads
  │
  ├─ GET /api/loyalty-settings/{restaurantId}
  │     └─ Gets earn/redeem rates per tier
  │
  ├─ GET /api/customer-lookup/{restaurantId}?phone=X
  │     └─ Gets total_points, tier, wallet_balance
  │
  ├─ User sees: "You have X points (Tier)"
  ├─ User can toggle "Redeem Points"
  │     └─ Points converted to discount using redemption_value
  │     └─ pointsRedeemed + pointsDiscount added to order payload
  │
  └─ Order payload includes:
       points_redeemed: 100,
       points_discount: 25.0,
       discount_type: "Loyality",
       discount_amount: 25.0
```

---

## 7. Delivery-Specific POS Endpoints (Phase 3 — NEXT TASK)

**Status:** Not yet integrated. API endpoints confirmed, need response samples for implementation.

### 7.1 Customer Address List

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/customer/address/list` |
| **Base** | `https://preprod.mygenie.online/api/v1` |
| **Auth** | Bearer {customer_token} |
| **Used by** | Delivery flow — saved addresses for logged-in users |
| **Integration status** | ❌ Not integrated — needs response sample |

**cURL:**
```bash
curl -X GET "https://preprod.mygenie.online/api/v1/customer/address/list" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -H "zoneId;" \
  -H "X-localization: en" \
  -H "latitude;" \
  -H "longitude;" \
  -H "Authorization: Bearer {customer_pos_token}"
```

**TODO:** Need response sample to understand:
- Address object structure (fields: flat, road, landmark, pincode, city?)
- Default address flag
- Address type (home/office/other)
- lat/lng in address object

---

### 7.2 Delivery Charge / Distance Validation

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/config/distance-api-new?destination_lat={lat}&destination_lng={lng}&restaurant_id={id}&order_value={amount}` |
| **Base** | `https://manage.mygenie.online/api/v1` (**DIFFERENT base URL!**) |
| **Auth** | Bearer token |
| **Used by** | Delivery flow — validate area + calculate delivery charge |
| **Integration status** | ❌ Not integrated — needs response sample |
| **Note** | Needs new env var `REACT_APP_MANAGE_BASE_URL` |

**cURL:**
```bash
curl -X GET "https://manage.mygenie.online/api/v1/config/distance-api-new?destination_lat=27.1791026&destination_lng=78.0013866&restaurant_id=478&order_value=0" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -H "X-localization: en" \
  -H "Authorization: Bearer {token}"
```

**TODO:** Need response sample to understand:
- Is delivery available (boolean)?
- Delivery charge amount
- Distance in km
- Minimum order value for delivery
- Estimated delivery time

---

### 7.3 Get Zone ID

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/config/get-all-zone?lat={lat}&lng={lng}` |
| **Base** | `https://preprod.mygenie.online/api/v1` |
| **Auth** | None / Bearer token |
| **Used by** | Delivery flow — get zone ID for API headers |
| **Integration status** | ❌ Not integrated — needs response sample |

**cURL:**
```bash
curl -X GET "https://preprod.mygenie.online/api/v1/config/get-all-zone?lat=27.179&lng=78.001"
```

**TODO:** Need response sample to understand:
- Zone ID format
- Multiple zones possible?
- Zone-based delivery rules

---

### Delivery Flow (Planned)

```
Landing Page (orderType=delivery)
  │
  ├─ Mandatory: Name + Phone (or Login)
  │
  └─ DeliveryAddressPage (intermediate, BEFORE menu)
       │
       ├─ Logged-in user:
       │     GET /customer/address/list → show saved addresses
       │     User selects or adds new
       │
       ├─ New user:
       │     Manual address entry form
       │
       ├─ GET /config/get-all-zone → get zoneId for headers
       │
       ├─ GET /config/distance-api-new → validate + get charge
       │     ├─ Deliverable → store address + charge → Menu
       │     └─ NOT deliverable → show message, block
       │
       └─ → Menu → Cart → ReviewOrder
              └─ delivery_charge: {from API}
              └─ address fields filled
              └─ order_type: "delivery"
```

---

## 8. Flow Summary

```
Landing Page (phone + name entered)
  │
  ├─ POST /api/auth/check-customer
  │    ├─ exists + has_password=true  → Password Login (verify-password)
  │    ├─ exists + has_password=false → Set Password (set-password)
  │    └─ not exists                 → Create Account (set-password, creates new customer)
  │
  ├─ POST /api/auth/verify-password  → returns token → Menu
  ├─ POST /api/auth/set-password     → returns token → Menu
  │
  ├─ Forgot Password:
  │    POST /api/auth/send-otp → POST /api/auth/reset-password
  │
  └─ Skip → saves as guest (localStorage) → Menu

Menu / Review Order
  ├─ GET /api/loyalty-settings/{id} → earn/redeem rates
  ├─ GET /api/customer-lookup/{id}?phone=X → points, tier, name
  └─ GET /api/customer/coupons → available coupons

Place Order
  ├─ Restaurant 716 → POST /customer/order/autopaid-place-prepaid-order
  └─ All others     → POST /customer/order/place
       └─ payment_method: always "cash_on_delivery"
       └─ payment_type: "prepaid" (Razorpay) | "postpaid" (COD)

Delivery (Phase 3 — NOT YET)
  ├─ GET /customer/address/list → saved addresses
  ├─ GET /config/get-all-zone → zone ID
  └─ GET /config/distance-api-new → delivery charge + validation

Profile (authenticated)
  ├─ GET  /api/auth/me
  ├─ GET  /api/customer/profile
  ├─ PUT  /api/customer/profile
  ├─ GET  /api/customer/orders
  ├─ GET  /api/customer/points
  ├─ GET  /api/customer/wallet
  └─ GET  /api/customer/coupons
```

---
*Last Revised: April 11, 2026 — 21:45 IST | Updated: Added Loyalty endpoints (Section 6), enhanced Delivery endpoints with TODO items (Section 7), updated flow summary*
