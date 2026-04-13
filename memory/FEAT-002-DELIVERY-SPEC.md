# FEAT-002-DELIVERY: Delivery Flow Implementation Spec

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-002-DELIVERY |
| **Title** | Delivery Flow — Address Management + Distance/Zone APIs |
| **Created** | January 11, 2026 |
| **Last Updated** | January 13, 2026 |
| **Status** | PLANNING — Pending architecture decisions |
| **Priority** | P0 - Critical |
| **Pre-requisite** | FEAT-002 Phase 1 (Core Plumbing) ✅, Phase 2 (Takeaway) ✅ |
| **Source Docs** | `SCAN_AND_ORDER_API.md` (CRM), `FEAT-002-takeaway-delivery.md` |

---

## ⚠️ OPEN DECISIONS (Must Resolve Before Implementation)

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | **CRM URL for frontend** — Should we add `REACT_APP_CRM_URL` pointing to CRM backend? | A) Add 3rd env var for CRM<br>B) Proxy all CRM calls through our FastAPI backend | Determines how frontend calls address/order endpoints |
| 2 | **X-API-Key for `/pos/orders` and `/pos/max-redeemable`** — These 2 CRM endpoints use server key, not customer token | A) Add `REACT_APP_CRM_API_KEY` to frontend .env (simpler, less secure)<br>B) Proxy through our FastAPI backend (backend holds key) | Security vs simplicity |
| 3 | **Order placement endpoint** — Currently frontend uses POS API (`/customer/order/update-customer-order`). Switch to CRM? | A) Switch to CRM `/pos/orders` (gets loyalty/wallet/WhatsApp auto-triggered)<br>B) Keep POS for orders, use CRM only for addresses<br>C) Dual — CRM for delivery orders, POS for dine-in/takeaway | Affects order flow, loyalty, wallet |
| 4 | **Google Maps API key** — Needed for geocoding when address has no lat/lng | Provide key or browser geolocation only? | Fallback accuracy |

---

## 1. Current Architecture — 3 Backends

### Frontend .env (current)

```
REACT_APP_BACKEND_URL=https://app-13-april.preview.emergentagent.com   ← Our FastAPI
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1                    ← POS API
REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online                          ← Image assets
```

### Three Backends in Play

| System | URL | Auth | Handles |
|--------|-----|------|---------|
| **Our Backend** (FastAPI) | `REACT_APP_BACKEND_URL` | JWT (our token) | Auth, customer data, app config, loyalty, notification popups |
| **POS API** (MyGenie) | `REACT_APP_API_BASE_URL` | Bearer (POS authToken) | Orders, menus, restaurant info, Razorpay, table status |
| **CRM Backend** (separate) | `mygenie-crm-build-1` | Customer Token + X-API-Key | Customer OTP, profile, **addresses**, **order placement**, coupons, points/wallet, feedback |

### Gap: CRM Not Connected to Customer App

The CRM backend has all the delivery-related endpoints we need, but the customer app frontend doesn't have a URL or API key for it. This is the primary architecture decision.

---

## 2. How Orders Are Placed TODAY

### Current Flow (POS API)

```
Frontend → POS API (preprod.mygenie.online)
  POST /customer/order/update-customer-order
  Auth: Bearer {POS authToken from localStorage}
  Format: FormData with JSON payload
  File: orderService.ts → placeOrder()
```

The payload already has delivery fields — **all currently empty strings**:

```javascript
{
  address_id: '',
  delivery_charge: '0',
  address: '',
  latitude: '',
  longitude: '',
  address_type: '',
  contact_person_name: '',
  contact_person_number: '',
  road: '',
  house: '',
  floor: '',
}
```

### CRM Flow (from SCAN_AND_ORDER_API.md)

```
Frontend → CRM Backend
  POST /pos/orders
  Auth: X-API-Key (server-side, NOT customer token)
  Format: JSON body
```

CRM order placement auto-triggers:
1. Loyalty points earned based on tier
2. Wallet deduction
3. Coupon usage recorded
4. Customer stats updated
5. WhatsApp notification

### Difference

| Aspect | Current (POS) | CRM |
|--------|--------------|-----|
| Auth | POS Bearer token | X-API-Key (server key) |
| Format | FormData | JSON |
| Loyalty/Wallet | Not auto-triggered | Auto-triggered |
| WhatsApp | Not triggered | Auto-triggered |
| Delivery address | Empty fields in payload | Full `delivery_address` object |

---

## 3. CRM Endpoints Available for Delivery

### Auth & Profile (Customer Token)

| Endpoint | Method | Auth | What It Does |
|----------|--------|------|-------------|
| `/customer/send-otp` | POST | None | Send OTP. Needs `user_id` (restaurant) |
| `/customer/verify-otp` | POST | None | Verify → token + profile + **addresses array** |
| `/customer/me` | GET | Token | Refresh profile + addresses |
| `/customer/me/points` | GET | Token | Points balance & history |
| `/customer/me/wallet` | GET | Token | Wallet balance & history |
| `/customer/me/orders` | GET | Token | Order history with delivery addresses |

### Address CRUD (Customer Token) ✅ READY

| Endpoint | Method | Auth | What It Does |
|----------|--------|------|-------------|
| `/customer/me/addresses` | GET | Token | List all saved addresses (with lat/lng) |
| `/customer/me/addresses` | POST | Token | Add new address |
| `/customer/me/addresses/{id}` | PUT | Token | Edit address |
| `/customer/me/addresses/{id}` | DELETE | Token | Delete address |
| `/customer/me/addresses/{id}/set-default` | POST | Token | Set default |

### Checkout (X-API-Key) ⚠️ NEEDS KEY

| Endpoint | Method | Auth | What It Does |
|----------|--------|------|-------------|
| `/coupons/validate` | POST | Token | Validate coupon code |
| `/pos/max-redeemable` | POST | **X-API-Key** | Check max redeemable points for bill |
| `/pos/orders` | POST | **X-API-Key** | Place order (triggers loyalty/wallet/WhatsApp) |

### Post-Order (Customer Token)

| Endpoint | Method | Auth | What It Does |
|----------|--------|------|-------------|
| `/feedback` | POST | Token | Submit rating after delivery |

---

## 4. CRM Address Object Schema

```json
{
  "id": "addr_abc123",
  "pos_address_id": 2010,
  "is_default": true,
  "address_type": "Home",
  "address": "123 Main Street, Shoghi",
  "house": "A-101",
  "floor": "1st",
  "road": "Main Road",
  "city": "Shimla",
  "state": "HP",
  "pincode": "171219",
  "country": "India",
  "latitude": "31.0537",
  "longitude": "77.1273",
  "contact_person_name": "Vivan",
  "contact_person_number": "9876543210",
  "delivery_instructions": "Ring bell at gate"
}
```

### Add Address — Required Fields

At least one of `address`, `city`, or `pincode` required. Everything else optional.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| address | string | Yes* | Street address |
| city | string | Yes* | City |
| pincode | string | Yes* | Pincode |
| house | string | No | Flat/House number |
| floor | string | No | Floor |
| road | string | No | Road / Landmark |
| state | string | No | State |
| country | string | No | Default: India |
| latitude | string | No | GPS lat |
| longitude | string | No | GPS lng |
| address_type | string | No | Home / Work / Other |
| contact_person_name | string | No | Delivery contact name |
| contact_person_number | string | No | Delivery contact phone |
| delivery_instructions | string | No | Special notes |

---

## 5. CRM Order Payload (for delivery)

```json
{
  "pos_id": "mygenie",
  "restaurant_id": "509",
  "order_id": "SCAN-001",
  "cust_mobile": "9876543210",
  "cust_name": "Vivan",
  "order_amount": 570.00,
  "delivery_charge": 30.00,
  "wallet_used": 100.00,
  "coupon_code": "SAVE10",
  "redeem_points": 200,
  "payment_status": "success",
  "payment_method": "upi",
  "order_type": "delivery",
  "delivery_address": {
    "address": "123 Main Street, Shoghi",
    "city": "Shimla",
    "pincode": "171219",
    "house": "A-101",
    "contact_person_name": "Vivan",
    "contact_person_number": "9876543210"
  },
  "order_note": "Less spicy please",
  "items": [
    {
      "item_name": "Farm Fresh Pizza",
      "item_qty": 1,
      "item_price": 350.00,
      "item_category": "Pizza"
    }
  ]
}
```

---

## 6. Distance & Zone APIs (MyGenie Manage/POS)

### Distance API

```
GET https://manage.mygenie.online/api/v1/config/distance-api-new
  ?destination_lat={lat}&destination_lng={lng}&restaurant_id={id}&order_value={amount}
Authorization: Bearer {MYGENIE_MANAGE_TOKEN}
```

```json
Response: {
  "shipping_status": "Yes",
  "shipping_charge": 50,
  "shipping_time": "25 mins",
  "distance_km": 5.2
}
```

### Zone API

```
GET https://preprod.mygenie.online/api/v1/config/get-all-zone?lat={lat}&lng={lng}
```

```json
Response: {
  "zone_data": [{
    "id": 5, "name": "Agonda",
    "minimum_shipping_charge": 10,
    "max_cod_order_amount": 1000,
    "matchstatus": 0
  }]
}
```

---

## 7. Lat/Lng Strategy — Geocode Once, Store Forever

| Tier | Scenario | Google API? |
|------|----------|:-----------:|
| 1 | CRM address already has lat/lng | ❌ No — use directly |
| 2 | CRM address missing lat/lng (old data) | ✅ Once — geocode + store via PUT |
| 3 | Browser geolocation (user allows) | ❌ No — device provides lat/lng |
| 4 | Manual entry (user denies location) | ✅ Once — forward geocode |

**Goal:** Zero Google API calls once all addresses have lat/lng.

---

## 8. Delivery Address Flow

### Case 1: Returning Customer (Has Saved Address)

```
Login/verify-otp → customer has addresses[]
  → List addresses (default pre-selected)
  → Address has lat/lng? → use directly
  → Address missing lat/lng? → Google Geocode once → store via PUT
  → Distance API (lat/lng → charge, ETA)
  → Deliverable? → Proceed to Menu
```

### Case 2: First-Time Customer (No Saved Address)

```
Login/verify-otp → customer addresses[] is empty
  → Browser geolocation prompt
  ├── ALLOWED → lat/lng → reverse geocode → auto-fill pincode/area
  └── DENIED → manual entry → forward geocode → lat/lng
  → Save address via POST /customer/me/addresses
  → Distance API → charge, ETA
  → Deliverable? → Proceed to Menu
```

---

## 9. Checklist & Known Constraints

- ⚠️ **Phone stored without `+91` prefix** — strip before matching
- ✅ **verify-otp returns addresses array** (with lat/lng when available)
- ✅ **CRM has full address CRUD** — no need to build our own
- ✅ **CRM addresses include lat/lng** — no need for Google in most cases
- ✅ **Manage API token available** — distance API can be called
- ⚠️ **X-API-Key needed** for `/pos/orders` and `/pos/max-redeemable` — decision pending (env var vs proxy)
- ⚠️ **CRM base URL not in frontend .env** — needs `REACT_APP_CRM_URL` or proxy decision
- ⚠️ **Google Maps API key** — still needed as fallback for old addresses without lat/lng
- 📌 **Current order flow uses POS API** (`/customer/order/update-customer-order` via FormData + POS Bearer token) — switching to CRM `/pos/orders` gives auto loyalty/wallet/WhatsApp but is a bigger change

---

## 10. Blocker Status (Updated)

| # | Blocker | Old Status | New Status |
|---|---------|-----------|-----------|
| 1 | POS to send lat/lng with address | ❓ Pending | ✅ CRM addresses have lat/lng |
| 2 | Add address endpoint | ❓ Next phase | ✅ CRM has full CRUD (`/customer/me/addresses`) |
| 3 | Customer address schema migration | ❓ Not started | ✅ CRM handles it |
| 4 | Google Maps API key | ❓ Not provisioned | 🟡 Still needed for fallback (old addresses without lat/lng) |
| 5 | Manage API token | ✅ Already shared | ✅ Available |
| 6 | **NEW: CRM URL for frontend** | — | ❓ Decision needed |
| 7 | **NEW: X-API-Key for order/points endpoints** | — | ❓ Decision needed |
| 8 | **NEW: Switch order placement to CRM?** | — | ❓ Decision needed |

---

## 11. Implementation Plan (Once Decisions Resolved)

| Step | Task | Effort | Blocked By |
|------|------|--------|-----------|
| 1 | Add `REACT_APP_CRM_URL` + `REACT_APP_CRM_API_KEY` to frontend .env (or set up proxy) | 30 min | Decision #1, #2 |
| 2 | Backend: Distance-check proxy endpoint | 1 hr | — |
| 3 | Backend: Zone lookup proxy endpoint | 30 min | — |
| 4 | Frontend: CRM API service (address CRUD, token-based calls) | 2 hrs | Step 1 |
| 5 | Frontend: DeliveryAddressPage (list addresses, add new, geolocation, distance check) | 3-4 hrs | Steps 2-4 |
| 6 | Frontend: LandingPage → navigate to address page on delivery mode | 30 min | Step 5 |
| 7 | Frontend: ReviewOrder — delivery charge in bill | 1-2 hrs | Step 5 |
| 8 | Frontend: Order payload — populate delivery fields (address, lat/lng, charge) | 1-2 hrs | Decision #3 |
| 9 | Frontend: CartContext delivery state | 30 min | — |
| 10 | Polish: Error handling, "not deliverable" UX | 1-2 hrs | Step 5 |
| **Total** | | **~10-14 hrs** | |

---

*Created: January 11, 2026 | Updated: January 13, 2026 | Status: PLANNING — resolve decisions in Section 0*
