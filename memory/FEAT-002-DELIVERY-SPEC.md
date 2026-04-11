# FEAT-002-DELIVERY: Delivery Flow Implementation Spec

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-002-DELIVERY |
| **Title** | Delivery Flow — Address Management + Distance/Zone APIs |
| **Created** | January 11, 2026 |
| **Status** | Planning — Ready for Implementation |
| **Priority** | P0 - Critical |
| **Pre-requisite** | FEAT-002 Phase 1 (Core Plumbing) ✅, Phase 2 (Takeaway) ✅ |
| **Depends On** | Customer address schema update |

---

## 1. Current Architecture (Important Context)

### Two Backends in Play

| System | URL | Handles |
|--------|-----|---------|
| **Our Backend** (FastAPI + MongoDB) | `REACT_APP_BACKEND_URL` = `https://customer-app-loyalty.preview.emergentagent.com` | Auth, customer data, app config, loyalty |
| **POS API** (MyGenie) | `REACT_APP_API_BASE_URL` = `https://preprod.mygenie.online/api/v1` | Orders, menus, restaurant info, Razorpay, table status |

### Customer Auth Flow

```
Frontend login → OUR backend (/api/auth/login) → OUR MongoDB (customers collection) → JWT token
```

**All customer data lives in OUR MongoDB.** Addresses must also live here.

---

## 2. Current Customer Schema (MongoDB `customers` collection)

Existing address-related fields:

| Field | Type | Sample Data | Notes |
|-------|------|-------------|-------|
| `address` | string | `"Ruby Residency, Chauri, Canacona, Goa, India"` | Single flat text |
| `city` | string | `""` or `None` | Often empty |
| `pincode` | string | `"403702"` | |

**371 customers** already have addresses. No lat/lng, no multiple addresses, no address type.

---

## 3. Required Schema Changes

### Option A: New `customer_addresses` Collection (Recommended)

```json
{
  "id": "addr-uuid",
  "customer_id": "cust-478-abc123",
  "user_id": "pos_0001_restaurant_478",
  "label": "Home",
  "address_type": "home",
  "flat_house": "Flat 301, Ruby Residency",
  "road_area": "Chauri Road",
  "landmark": "Near Canacona Bus Stand",
  "city": "Canacona",
  "state": "Goa",
  "pincode": "403702",
  "latitude": 15.0109,
  "longitude": 74.0510,
  "is_default": true,
  "created_at": "2026-01-11T10:00:00Z",
  "updated_at": "2026-01-11T10:00:00Z"
}
```

**Why separate collection?**
- Clean separation of concerns
- Easy to query/index by `customer_id` + `user_id`
- Doesn't bloat the customer document
- Easier migration — existing `address`/`city`/`pincode` on customer doc can be migrated later

### Option B: `addresses` Array on Customer Doc

```json
{
  "id": "cust-478-abc123",
  "name": "...",
  "phone": "...",
  "addresses": [
    { "id": "addr-1", "label": "Home", "address_type": "home", ... },
    { "id": "addr-2", "label": "Office", "address_type": "office", ... }
  ]
}
```

**Tradeoff:** Simpler queries but grows the customer document. Max ~5 addresses per customer recommended.

---

## 4. New Backend Endpoints (Our FastAPI `server.py`)

### 4.1 Customer Address CRUD

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/customer/addresses` | Bearer (customer) | List saved addresses for logged-in customer |
| `POST` | `/api/customer/addresses` | Bearer (customer) | Save new delivery address |
| `PUT` | `/api/customer/addresses/{address_id}` | Bearer (customer) | Update existing address |
| `DELETE` | `/api/customer/addresses/{address_id}` | Bearer (customer) | Remove saved address |
| `PUT` | `/api/customer/addresses/{address_id}/default` | Bearer (customer) | Set as default address |

#### POST/PUT Request Body

```json
{
  "label": "Home",
  "address_type": "home",
  "flat_house": "Flat 301, Ruby Residency",
  "road_area": "Chauri Road",
  "landmark": "Near Bus Stand",
  "city": "Canacona",
  "state": "Goa",
  "pincode": "403702",
  "latitude": 15.0109,
  "longitude": 74.0510,
  "is_default": false
}
```

#### GET Response

```json
{
  "addresses": [
    {
      "id": "addr-uuid",
      "label": "Home",
      "address_type": "home",
      "flat_house": "Flat 301, Ruby Residency",
      "road_area": "Chauri Road",
      "landmark": "Near Bus Stand",
      "city": "Canacona",
      "state": "Goa",
      "pincode": "403702",
      "latitude": 15.0109,
      "longitude": 74.0510,
      "is_default": true,
      "full_address": "Flat 301, Ruby Residency, Chauri Road, Canacona, Goa 403702"
    }
  ]
}
```

### 4.2 Delivery Distance Check (Proxy to MyGenie Manage API)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/delivery/distance-check` | None (public) | Check if delivery is possible + get charge |

#### Query Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `destination_lat` | float | Yes | Customer's latitude |
| `destination_lng` | float | Yes | Customer's longitude |
| `restaurant_id` | string | Yes | Restaurant ID |
| `order_value` | float | No | Order value (may affect free delivery thresholds) |

#### Proxies To

```
GET https://manage.mygenie.online/api/v1/config/distance-api-new
  ?destination_lat={lat}&destination_lng={lng}&restaurant_id={id}&order_value={amount}
Authorization: Bearer {MYGENIE_MANAGE_TOKEN}  ← stored as backend env var
```

#### Response (pass-through from POS)

```json
{
  "distance": "5.2 km",
  "shipping_status": "Yes",
  "shipping_charge": 50,
  "shipping_time": "25 mins",
  "distance_km": 5.2,
  "origin": { "lat": 25.42, "lng": 81.83 },
  "destination": { "lat": 25.45, "lng": 81.85 }
}
```

**Key fields:**
- `shipping_status` = `"Yes"` → deliverable, `"No"` → out of range
- `shipping_charge` → delivery fee to add to bill
- `shipping_time` → ETA to show customer

### 4.3 Zone Lookup (Proxy to POS API)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/delivery/zones` | None (public) | Get delivery zones for lat/lng |

#### Query Params

| Param | Type | Required |
|-------|------|----------|
| `lat` | float | Yes |
| `lng` | float | Yes |

#### Proxies To

```
GET https://preprod.mygenie.online/api/v1/config/get-all-zone?lat={lat}&lng={lng}
```

#### Response (pass-through)

```json
{
  "zone_id": "[5,6,7]",
  "zone_data": [
    {
      "id": 5,
      "name": "Agonda",
      "status": 1,
      "minimum_shipping_charge": 10,
      "per_km_shipping_charge": 10,
      "max_cod_order_amount": 1000,
      "maximum_shipping_charge": 100,
      "increased_delivery_fee": 0,
      "increased_delivery_fee_status": 0,
      "increase_delivery_charge_message": null,
      "matchstatus": 0
    }
  ]
}
```

**Key fields:**
- `matchstatus` = `1` → customer is in this zone
- `max_cod_order_amount` → COD limit for the zone
- `increased_delivery_fee_status` = `1` → surge pricing active

---

## 5. Environment Variables Needed

### Backend `.env` (additions)

```
MYGENIE_MANAGE_URL=https://manage.mygenie.online/api/v1
MYGENIE_MANAGE_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...  # Long-lived POS token for distance API
```

### Frontend `.env` (no changes needed — all calls go through our backend)

---

## 6. Frontend Changes Needed

### 6.1 New Page: `DeliveryAddressPage.jsx`

Intermediate page shown AFTER landing, BEFORE menu (only for delivery orders).

**Flow:**
```
LandingPage (delivery selected)
  → DeliveryAddressPage
      ├── Logged-in? → Show saved addresses + "Add New"
      ├── Guest? → Manual address form + "Use My Location"
      ├── Address selected/entered → Call distance-check API
      │     ├── shipping_status = "Yes" → Show charge + ETA → "Proceed to Menu"
      │     └── shipping_status = "No"  → "Delivery not available" message
      └── → Menu → Cart → ReviewOrder
```

### 6.2 New Endpoints in `endpoints.js` (our backend)

```javascript
// Delivery endpoints (our backend)
CUSTOMER_ADDRESSES: () => `${BACKEND_URL}/api/customer/addresses`,
DISTANCE_CHECK: () => `${BACKEND_URL}/api/delivery/distance-check`,
DELIVERY_ZONES: () => `${BACKEND_URL}/api/delivery/zones`,
```

**Note:** These use `REACT_APP_BACKEND_URL`, NOT `REACT_APP_API_BASE_URL`.

### 6.3 CartContext Changes

Store delivery state:

```javascript
const [deliveryAddress, setDeliveryAddress] = useState(null);
const [deliveryCharge, setDeliveryCharge] = useState(0);
const [deliveryTime, setDeliveryTime] = useState('');
const [zoneId, setZoneId] = useState(null);
```

### 6.4 ReviewOrder Changes

- Show "Delivery Charge" line in bill summary (only for delivery orders)
- Include delivery fields in order payload:
  ```
  delivery_charge, address_id, address, latitude, longitude, address_type
  ```

### 6.5 Route in `App.js`

```
/restaurant/:id/delivery-address → DeliveryAddressPage
```

---

## 7. Order Payload — Delivery Fields

```javascript
{
  order_type: 'delivery',
  table_id: '0',
  delivery_charge: '{from distance API}',
  address_id: '{saved address ID or empty for new}',
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

## 8. Implementation Checklist

| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 1 | MongoDB: Create `customer_addresses` collection schema | 1 hr | None |
| 2 | Backend: Customer address CRUD endpoints | 2-3 hrs | #1 |
| 3 | Backend: Distance-check proxy endpoint | 1 hr | Env var for manage token |
| 4 | Backend: Zone lookup proxy endpoint | 30 min | None |
| 5 | Frontend: `endpoints.js` — add delivery endpoints | 15 min | #2, #3, #4 |
| 6 | Frontend: `CartContext.js` — delivery state | 30 min | None |
| 7 | Frontend: `DeliveryAddressPage.jsx` — full page | 3-4 hrs | #2, #3 |
| 8 | Frontend: Route in `App.js` | 15 min | #7 |
| 9 | Frontend: `LandingPage.jsx` — navigate to address page on delivery | 30 min | #7 |
| 10 | Frontend: `ReviewOrder.jsx` — delivery charge in bill + payload | 1-2 hrs | #6 |
| 11 | Frontend: `helpers.js` — delivery fields in order payload | 30 min | #10 |
| 12 | Polish: Error handling, loading states, "not deliverable" UX | 1-2 hrs | #7 |
| **Total** | | **~10-12 hrs** | |

---

## 9. Migration Consideration

The existing 371 customers with `address`/`city`/`pincode` fields can be migrated to the new `customer_addresses` collection later via a one-time script. No need to block delivery feature on this.

---

## 10. Open Questions for Implementation Team

1. **Address form fields** — confirm required fields: flat/house, road/area, landmark, city, state, pincode. Any others?
2. **Geolocation** — use browser "Use My Location" for lat/lng? Or integrate a geocoding/map picker?
3. **Max addresses per customer** — limit? (suggest 5)
4. **Manage API token** — the Bearer token for `manage.mygenie.online` distance API — how is it refreshed? Is it long-lived or does it expire?
5. **Zone validation** — is zone check mandatory before placing a delivery order, or just informational?

---

*Created: January 11, 2026 | For handoff to implementation team*
