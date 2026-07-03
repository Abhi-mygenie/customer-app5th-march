# Document Audit Status
- Source File: CUSTOMER_ENDPOINTS.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: backend/server.py, frontend/src/api/services/crmService.js, frontend/src/context/AuthContext.jsx, frontend/src/pages/Profile.jsx, frontend/src/pages/DeliveryAddress.jsx, frontend/src/pages/PasswordSetup.jsx
- Notes: Rewritten to separate verified backend endpoints from externally integrated CRM endpoints. The previous version mixed our backend, CRM, and POS surfaces with deployment-specific base URLs and several assumptions not provable from code alone.

# Customer Endpoints Reference

## Scope
This document covers customer-related endpoints visible in the current codebase.

It is split into:
1. **Customer app backend endpoints** implemented in `backend/server.py`
2. **CRM endpoints** consumed directly by the frontend
3. **Customer-adjacent POS endpoints** used during ordering

---

## 1. Customer App Backend Endpoints (`/api/...`)
Verified in `backend/server.py`.

### 1.1 Check Customer
- **Method:** `POST`
- **Path:** `/api/auth/check-customer`
- **Auth:** None
- **Status:** Verified in code

**Purpose**
Checks whether a customer exists for a restaurant-scoped `user_id` and whether they have a password hash.

**Verified request body**
```json
{
  "phone": "+919579504871",
  "restaurant_id": "478",
  "pos_id": "0001"
}
```

**Verified response shape**
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

### 1.2 Unified Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth:** None
- **Status:** Verified in code

**Behavior**
- If `restaurant_id` is supplied, backend first checks scoped customers.
- If customer not found, backend checks restaurant users/admins.
- Customer login supports password or OTP.
- Restaurant login requires password and may return `pos_token`.

**Verified request fields**
- `phone_or_email`
- `password` or `otp`
- optional `restaurant_id`
- optional `pos_id`

### 1.3 Send OTP
- **Method:** `POST`
- **Path:** `/api/auth/send-otp`
- **Auth:** None
- **Status:** Verified in code

**Code-verified note**
Returns `otp_for_testing` directly in the response.

### 1.4 Set Password
- **Method:** `POST`
- **Path:** `/api/auth/set-password`
- **Auth:** None
- **Status:** Verified in code

**Behavior**
- Updates an existing scoped customer password, or
- creates a new scoped customer record

### 1.5 Verify Password
- **Method:** `POST`
- **Path:** `/api/auth/verify-password`
- **Auth:** None
- **Status:** Verified in code

### 1.6 Reset Password
- **Method:** `POST`
- **Path:** `/api/auth/reset-password`
- **Auth:** None
- **Status:** Verified in code

### 1.7 Get Current User
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth:** Bearer token
- **Status:** Verified in code

**Response shape**
```json
{
  "user_type": "customer|restaurant",
  "user": { }
}
```

---

## 2. Customer Profile Endpoints on Customer App Backend
Verified in `backend/server.py`.

### 2.1 Get Customer Profile
- **Method:** `GET`
- **Path:** `/api/customer/profile`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

### 2.2 Update Customer Profile
- **Method:** `PUT`
- **Path:** `/api/customer/profile`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

**Allowed fields in code**
- `name`
- `email`
- `allergies`
- `diet_preference`
- `preferred_dining_type`

### 2.3 Get Customer Orders
- **Method:** `GET`
- **Path:** `/api/customer/orders`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

**Query params in code**
- `limit` default `20`
- `skip` default `0`

### 2.4 Get Points History
- **Method:** `GET`
- **Path:** `/api/customer/points`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

### 2.5 Get Wallet
- **Method:** `GET`
- **Path:** `/api/customer/wallet`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

**Verified response shape**
```json
{
  "balance": 250.0,
  "transactions": []
}
```

### 2.6 Get Coupons
- **Method:** `GET`
- **Path:** `/api/customer/coupons`
- **Auth:** Bearer token, customer only
- **Status:** Verified in code

**Behavior**
Returns active coupons for the current customer's `user_id` restaurant scope.

---

## 3. Public Customer Utility Endpoints on Customer App Backend

### 3.1 Customer Lookup
- **Method:** `GET`
- **Path:** `/api/customer-lookup/{restaurant_id}?phone={phone}`
- **Auth:** None
- **Status:** Verified in code

**Purpose**
Quick lookup by phone for customer name, points, tier, and wallet balance.

### 3.2 Loyalty Settings
- **Method:** `GET`
- **Path:** `/api/loyalty-settings/{restaurant_id}`
- **Auth:** None
- **Status:** Verified in code

**Behavior**
Returns configured loyalty settings or hardcoded defaults if not found.

---

## 4. CRM Endpoints Used by Frontend
Verified in `frontend/src/api/services/crmService.js`.

**Important**
These are external APIs. They are not implemented in `backend/server.py`.

### 4.1 CRM Auth Endpoints
| Method | Path | Purpose | Status |
|---|---|---|---|
| POST | `/customer/register` | Register customer + set password | Verified in frontend integration |
| POST | `/customer/login` | Customer password login | Verified in frontend integration |
| POST | `/customer/send-otp` | Send OTP | Verified in frontend integration |
| POST | `/customer/verify-otp` | Verify OTP | Verified in frontend integration |
| POST | `/customer/forgot-password` | Forgot password OTP | Verified in frontend integration |
| POST | `/customer/reset-password` | Reset password with OTP | Verified in frontend integration |

### 4.2 CRM Profile Endpoints
| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/customer/me` | Current customer profile | Verified in frontend integration |
| GET | `/customer/me/orders` | Customer order history | Verified in frontend integration |
| GET | `/customer/me/points` | Points summary/history | Verified in frontend integration |
| GET | `/customer/me/wallet` | Wallet summary/history | Verified in frontend integration |

### 4.3 CRM Address Endpoints
| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/customer/me/addresses` | List addresses | Verified in frontend integration |
| POST | `/customer/me/addresses` | Add address | Verified in frontend integration |
| PUT | `/customer/me/addresses/{id}` | Update address | Verified in frontend integration |
| DELETE | `/customer/me/addresses/{id}` | Delete address | Verified in frontend integration |
| POST | `/customer/me/addresses/{id}/set-default` | Set default address | Verified in frontend integration |

**Code-verified behavior**
- CRM auth uses Bearer token
- phone numbers are normalized before CRM auth calls using `stripPhonePrefix()`
- `buildUserId(restaurantId, posId)` builds `pos_{posId}_restaurant_{restaurantId}`

---

## 5. Customer-Adjacent POS Endpoints in Ordering Flow
These are not customer-profile endpoints, but they are customer-facing and used in active order flows.

| Method | Path | Used For | Verified In Code |
|---|---|---|---|
| POST | `/web/restaurant-info` | Restaurant details | Yes |
| POST | `/web/restaurant-product` | Menu items | Yes |
| POST | `/web/menu-master` | Stations/menu master | Yes |
| GET | `/customer/check-table-status` | Table occupancy | Yes |
| GET | `/air-bnb/get-order-details/{id}` | Order details | Yes, routing path needs env clarification |
| POST | `/customer/order/place` | Place order | Yes |
| POST | `/customer/order/autopaid-place-prepaid-order` | Special case order placement | Yes |
| POST | `/customer/order/update-customer-order` | Edit order | Yes |
| POST | `/razor-pay/create-razor-order` | Razorpay order creation | Yes |
| POST | `/razor-pay/verify-payment` | Razorpay verification | Yes |

---

## 6. Current Customer Flow Ownership Map
| Flow | Current Primary Surface | Status |
|---|---|---|
| Landing customer existence check | Customer app backend | Verified |
| Admin login | Customer app backend | Verified |
| Customer profile via backend | Backend supports it | Verified |
| Customer profile via frontend active path | CRM | Verified |
| Delivery address CRUD | CRM | Verified |
| Loyalty settings lookup | Customer app backend | Verified |
| Name/points lookup at review order | Customer app backend | Verified |
| Order placement | POS API | Verified |

This split is important: customer functionality is not owned by a single service in the current codebase.

---

## Key Conflicts Found During Audit
| Topic | Earlier Doc Claim | Current Code Reality | Classification |
|---|---|---|---|
| Single customer backend narrative | Most customer flows described under one backend base URL | Customer flows are split across backend, CRM, and POS | Outdated |
| Base URLs | Specific preview-domain URLs treated as canonical | Runtime code depends on env vars | Partially verified only |
| CRM ownership | Some earlier docs framed CRM as future/planned | CRM is actively integrated in frontend | Contradicted by current code |
| Wallet response shape | Prior examples used `wallet_balance` top-level | backend code returns `balance`, CRM shape may differ | Needs clarification by surface |

---

## Open Questions
1. Which customer profile surface is considered authoritative long term: backend or CRM?
2. Should backend customer endpoints remain documented as active product surface, or be reclassified as legacy/internal?
3. What are the exact production base URLs for backend and CRM in the target environment?
4. Are CRM coupon/listing endpoints in active use anywhere beyond the inspected code paths?

## Needs Backend Clarification
- Intended long-term role of `/api/customer/*` endpoints after CRM integration.
- Whether backend and CRM data models are guaranteed to stay aligned.

## Assumptions Made
- CRM endpoint behavior was documented only to the extent visible in frontend integration code.
- Example payloads for CRM are intentionally minimal because live response contracts were not re-sampled in this audit.

---

## What changed from previous version
- Split the document by actual ownership surface: backend vs CRM vs POS-adjacent flows.
- Removed preview-domain base URL assumptions as source-of-truth product documentation.
- Downgraded claims that could not be proven from the code.
- Clarified that customer functionality is currently distributed across multiple systems.

## Unverified items
- Live CRM response payloads in the current environment.
- Which of the overlapping customer profile endpoints are used in production more heavily.
- Coupon and wallet details beyond the shapes hard-coded in backend/frontend service usage.

## Follow-ups recommended
1. Add a separate CRM contract doc with live samples if CRM remains a core dependency.
2. Decide whether backend customer endpoints are public product APIs or transition-state support APIs.
3. Align Profile page documentation with whichever customer data source is intended as authoritative.