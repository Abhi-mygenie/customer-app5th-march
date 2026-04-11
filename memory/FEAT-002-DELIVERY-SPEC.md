# FEAT-002-DELIVERY: Delivery Flow Implementation Spec

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-002-DELIVERY |
| **Title** | Delivery Flow — Address Management + Distance/Zone APIs |
| **Created** | January 11, 2026 |
| **Last Updated** | January 11, 2026 |
| **Status** | BLOCKED — Waiting on Backend Team (Address schema + POS lat/lng confirmation) |
| **Priority** | P0 - Critical |
| **Pre-requisite** | FEAT-002 Phase 1 (Core Plumbing) ✅, Phase 2 (Takeaway) ✅ |
| **Depends On** | Customer address schema update, POS lat/lng confirmation, Add address endpoint |

---

## ⚠️ BLOCKERS FOR BACKEND TEAM

Before delivery can be implemented, the following must be resolved:

| # | Blocker | Owner | Status |
|---|---------|-------|--------|
| 1 | **POS to send lat/lng with customer address** — confirm if POS API will include `latitude`/`longitude` in customer data | POS Team | ❓ Pending confirmation |
| 2 | **Add address endpoint** — `POST /api/customer/addresses` to save new delivery addresses (with lat/lng) | Backend Team | ❓ Next phase |
| 3 | **Customer address schema migration** — single flat `address`/`city`/`pincode` → structured with lat/lng support, multiple addresses | Backend Team | ❓ Not started |
| 4 | **Google Maps API key** — needed as fallback if POS doesn't send lat/lng (geocoding) | Ops/Backend | ❓ Not provisioned |
| 5 | **Manage API token storage** — Bearer token for `manage.mygenie.online` distance API, how is it refreshed? | Backend Team | ❓ Pending |

---

## 1. Architecture Overview

### Two Backends in Play

| System | URL | Handles |
|--------|-----|---------|
| **Our Backend** (FastAPI + MongoDB) | `REACT_APP_BACKEND_URL` | Auth, customer data, app config, loyalty |
| **POS API** (MyGenie) | `REACT_APP_API_BASE_URL` = `preprod.mygenie.online` | Orders, menus, restaurant info, Razorpay, table status |
| **CRM Backend** (separate project) | `mygenie-crm-build-1.preview.emergentagent.com` | Customer OTP, verify, profile (reference implementation) |

### Customer Auth Flow

```
Frontend → OUR backend (/api/auth/login) → OUR MongoDB (customers collection) → JWT token
```

All customer data lives in OUR MongoDB. Addresses must also live here.

---

## 2. Customer Auth Endpoints (Reference from CRM Project)

These endpoints exist on the CRM project (`mygenie-crm-build-1`) and serve as the reference:

### 2.1 Send OTP — `POST /api/customer/send-otp`

```json
Request:  { "phone": "9876543210" }
Response: {
  "success": true,
  "message": "OTP sent to +91 9876543210",
  "expires_in_minutes": 10,
  "debug_otp": "544156"
}
```

### 2.2 Verify OTP — `POST /api/customer/verify-otp`

```json
Request:  { "phone": "9876543210", "otp": "544156" }
Response: {
  "success": true,
  "token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in_hours": 24,
  "customer": {
    "id": "25149198-...",
    "name": "errg frty",
    "phone": "9876543210",
    "email": "customer1179@mygenie.local",
    "country_code": "+91",
    "tier": "Bronze",
    "total_points": 0,
    "wallet_balance": 0.0,
    "total_visits": 2,
    "total_spent": 160.0,
    "address": "",
    "city": "",
    "state": null,
    "pincode": "",
    "allergies": [],
    "favorites": [],
    "restaurant_id": "pos_0001_restaurant_509"
  }
}
```

### 2.3 Get Me — `GET /api/customer/me`

```
Headers: Authorization: Bearer {token}
```

```json
Response: {
  "id": "25149198-...",
  "name": "errg frty",
  "phone": "9876543210",
  "country_code": "+91",
  "tier": "Bronze",
  "address": "",
  "city": "",
  "state": null,
  "pincode": "",
  ... (same fields as verify-otp customer object)
}
```

**Key finding:** Verify-OTP and /me return the **same customer fields** (including address, city, state, pincode). Verify-OTP just wraps it with token + success/message.

---

## 3. Lat/Lng Strategy — Geocode Once, Store Forever

### Principle
Google Geocoding API is a **fallback only**. Goal is zero Google API calls once all addresses have lat/lng stored.

### Three Tiers (Priority Order)

| Tier | Scenario | Google API? | Action |
|------|----------|:-----------:|--------|
| 1 | POS sends lat/lng with address (expected) | ❌ No | Use directly |
| 2 | POS doesn't send lat/lng (migration fallback) | ✅ Once | Geocode → store lat/lng in our DB. Next time: no API call |
| 3 | New address from browser geolocation (Case 2) | ❌ No | Device provides lat/lng directly |

### Data Storage — Current vs Target

```
CURRENT:  { address: "Ruby Residency, Goa", city: "", pincode: "403702" }
TARGET:   { address: "Ruby Residency, Goa", city: "", pincode: "403702", latitude: 15.01, longitude: 74.05 }
                                                                          ↑ from POS, or geocoded once & stored
```

### API Call Optimization

| Scenario | Google API? | Distance API? |
|----------|:-----------:|:------------:|
| Address has lat/lng (POS sent or previously stored) | ❌ | ✅ |
| Address missing lat/lng (first time only) | ✅ Once, then store | ✅ |
| New address from browser geolocation | ❌ (device gives lat/lng) | ✅ |
| New address manual entry (no geolocation) | ✅ Once, then store | ✅ |

---

## 4. Delivery Address Flow — Two Cases

### Case 1: Returning Customer (Has Saved Address)

```
Login/verify-otp → customer data has address
  │
  ├── Address has lat/lng? → use directly
  └── Address missing lat/lng? → Google Geocode (one-time) → store lat/lng
  │
  → Distance API (lat/lng → shipping_status, charge, ETA)
  → Deliverable? → Proceed to Menu
```

### Case 2: First-Time Customer (No Saved Address)

```
Login/verify-otp → customer has no address
  │
  → Browser geolocation prompt: "Allow location?"
  │
  ├── ALLOWED → lat/lng from device
  │     → Google Reverse Geocode → auto-fill pincode + area
  │     → User completes remaining fields (flat, road, landmark)
  │
  └── DENIED → fully manual entry
        → User types full address
        → Google Forward Geocode → lat/lng
  │
  → Full address + lat/lng → Distance API → charge, ETA
  → Deliverable? → Proceed to Menu
  → (Add address endpoint — NEXT PHASE — stores address + lat/lng together)
```

---

## 5. External APIs

### 5.1 Distance API (MyGenie Manage)

```
GET https://manage.mygenie.online/api/v1/config/distance-api-new
  ?destination_lat={lat}&destination_lng={lng}&restaurant_id={id}&order_value={amount}
Authorization: Bearer {MYGENIE_MANAGE_TOKEN}
```

```json
Response: {
  "distance": "5.2 km",
  "shipping_status": "Yes",        ← "Yes" = deliverable, "No" = out of range
  "shipping_charge": 50,            ← delivery fee
  "shipping_time": "25 mins",       ← ETA
  "distance_km": 5.2,
  "origin": { "lat": 25.42, "lng": 81.83 },
  "destination": { "lat": 25.45, "lng": 81.85 }
}
```

### 5.2 Zone API (MyGenie POS)

```
GET https://preprod.mygenie.online/api/v1/config/get-all-zone?lat={lat}&lng={lng}
```

```json
Response: {
  "zone_data": [
    {
      "id": 5,
      "name": "Agonda",
      "minimum_shipping_charge": 10,
      "per_km_shipping_charge": 10,
      "max_cod_order_amount": 1000,
      "maximum_shipping_charge": 100,
      "increased_delivery_fee_status": 0,
      "increase_delivery_charge_message": null,
      "matchstatus": 0                  ← 1 = customer is in this zone
    }
  ]
}
```

### 5.3 Google Maps Geocoding (Fallback Only)

| Type | Use Case | Call |
|------|----------|------|
| Forward Geocode | Address text → lat/lng | `GET /maps/api/geocode/json?address={text}&key={KEY}` |
| Reverse Geocode | lat/lng → pincode, area | `GET /maps/api/geocode/json?latlng={lat},{lng}&key={KEY}` |

**Cost:** ~$5 per 1000 requests. Goal: minimize by storing lat/lng after first geocode.

---

## 6. Backend Proxy Endpoints Needed (Our FastAPI)

| # | Endpoint | Proxies To | Purpose |
|---|----------|-----------|---------|
| 1 | `GET /api/delivery/distance-check` | `manage.mygenie.online/.../distance-api-new` | Delivery feasibility + charge |
| 2 | `GET /api/delivery/zones` | `preprod.mygenie.online/.../get-all-zone` | Zone lookup |
| 3 | `GET /api/customer/addresses` | Our MongoDB | List saved addresses (with lat/lng) |
| 4 | `POST /api/customer/addresses` | Our MongoDB | Save new address (**NEXT PHASE — you will provide**) |

---

## 7. Environment Variables Needed

```
# Backend .env additions
MYGENIE_MANAGE_URL=https://manage.mygenie.online/api/v1
MYGENIE_MANAGE_TOKEN=<long-lived POS Bearer token for distance API>
GOOGLE_MAPS_API_KEY=<for geocoding fallback>
```

---

## 8. Frontend Changes Summary

| # | File | Change |
|---|------|--------|
| 1 | `DeliveryAddressPage.jsx` | NEW — intermediate page between landing and menu |
| 2 | `endpoints.js` | Add delivery endpoints (our backend) |
| 3 | `CartContext.js` | Store deliveryAddress, deliveryCharge, zoneId, shippingTime |
| 4 | `LandingPage.jsx` | Navigate to address page on delivery mode |
| 5 | `ReviewOrder.jsx` | Delivery charge line in bill + payload fields |
| 6 | `helpers.js` | delivery_charge, address, lat, lng in order payload |
| 7 | `App.js` | Route for DeliveryAddressPage |

---

## 9. Order Payload — Delivery Fields

```javascript
{
  order_type: 'delivery',
  table_id: '0',
  delivery_charge: '{from distance API}',
  address_id: '{saved address ID or empty}',
  address: '{full address text}',
  latitude: '{lat}',
  longitude: '{lng}',
  address_type: '{home/office/other}',
  cust_name: 'REQUIRED',
  cust_phone: 'REQUIRED',
  payment_method: 'cash_on_delivery',
  payment_type: 'postpaid',  // or 'prepaid' if Razorpay
}
```

---

## 10. Checklist & Known Constraints

- ⚠️ **Phone stored without `+91` prefix** — matching is exact string (`9876543210` not `+919876543210`). Any endpoint with `country_code` must strip prefix before DB lookup
- ✅ **verify-otp and /me return same customer fields** including address, city, state, pincode
- ✅ **verify-otp is standalone endpoint** — returns token + full customer in one shot
- 📌 **Expect POS to send lat/lng** — confirm with POS team. If not, geocode once and store
- 📌 **Google Maps API key required** — fallback only, minimized by caching lat/lng
- 📌 **Add address endpoint deferred** — next phase, you will provide
- 📌 **Distance API + Zone API** — called every delivery order (lat/lng required)
- 📌 **Goal: zero Google API calls** once all addresses have lat/lng stored in our DB
- 📌 **Manage API token** (`manage.mygenie.online`) — storage and refresh strategy TBD with backend team

---

## 11. Implementation Order (Once Blockers Resolved)

| Step | Task | Effort | Blocked By |
|------|------|--------|-----------|
| 1 | Backend: Distance-check proxy endpoint | 1 hr | Manage API token |
| 2 | Backend: Zone lookup proxy endpoint | 30 min | — |
| 3 | Backend: Address read endpoint (from our MongoDB) | 1 hr | — |
| 4 | Backend: Geocode + store lat/lng logic | 2 hrs | Google API key |
| 5 | Frontend: DeliveryAddressPage (address display + geolocation + validation) | 3-4 hrs | Steps 1-4 |
| 6 | Frontend: LandingPage → navigate to address page | 30 min | Step 5 |
| 7 | Frontend: ReviewOrder — delivery charge in bill + payload | 1-2 hrs | Step 5 |
| 8 | Frontend: CartContext delivery state | 30 min | — |
| 9 | Polish: Error handling, "not deliverable" UX, loading states | 1-2 hrs | Step 5 |
| **Total** | | **~10-12 hrs** | |

---

*Created: January 11, 2026 | Status: BLOCKED — resolve items in Section 0 with backend/POS team before implementation*
