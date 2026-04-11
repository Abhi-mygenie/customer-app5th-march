# FEAT-002: Scan & Order Expansion – Takeaway & Delivery

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-002 |
| **Title** | Scan & Order Expansion – Takeaway & Delivery |
| **Created** | April 11, 2026 |
| **Status** | Planning |
| **Priority** | P0 - Critical |

---

## 1. Overview

### 4 Order Channels

| Channel | Status | QR `type` param | QR `orderType` param | Table/Room Required |
|---------|--------|-----------------|---------------------|---------------------|
| **Dine-In** | ✅ Implemented | `table` | `dinein` | Yes (tableId from QR) |
| **Room Service** | ✅ Implemented | `room` | `dinein` | Yes (roomId from QR) |
| **Takeaway** | ❌ New | None | `takeaway` | No |
| **Delivery** | ❌ New | None | `delivery` | No |

### Flow Summary

```
User scans QR → URL parsed by useScannedTable hook
  │
  ├─ orderType = dinein  → Existing flow (table check, edit order, browse menu)
  ├─ orderType = room    → Existing flow (room service)
  │
  ├─ orderType = takeaway → NEW: Mode selector (Takeaway pre-selected)
  │     └─ Mandatory: Name + Phone (or Login)
  │     └─ → Menu → Cart → Review → Place Order
  │
  └─ orderType = delivery → NEW: Mode selector (Delivery pre-selected)
        └─ Mandatory: Name + Phone (or Login)
        └─ Address selection/entry
        └─ Delivery area validation
        └─ → Menu → Cart → Review → Place Order
```

---

## 2. Hardcoding Audit & Issues

### 2.1 `useScannedTable.js` – Default orderType

**Line 36-38:**
```javascript
const orderType = (urlOrderType === 'dinein' || urlOrderType === 'delivery' || urlOrderType === 'takeaway' || urlOrderType === 'take_away')
  ? urlOrderType
  : 'dinein';  // ← Hardcoded default
```
**Issue:** If no `orderType` in URL, defaults to `dinein`. This is correct for backward compatibility but must be documented.

**Decision needed:** Should QR codes without `orderType` param always default to `dinein`? Or should we infer from context (e.g., no tableId + no roomId = could be takeaway)?

### 2.2 `ReviewOrder.jsx` – Table requirement tied to `dinein`

**Line 484:**
```javascript
if (isScanned && scannedTableId && scannedOrderType === 'dinein') {
  setTableNumber(scannedTableId);
```

**Line 680:**
```javascript
const hasScannedTable = isScanned && scannedOrderType === 'dinein' && scannedTableId;
```

**Line 816:**
```javascript
const finalTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
  ? scannedTableId
  : (isMultiMenu && tableNumber ? tableNumber : '');
```

**Issue:** Table selection logic is tightly coupled to `orderType === 'dinein'`. This is actually correct behavior — takeaway/delivery should NOT require tables. But the multi-menu fallback (`isMultiMenu && tableNumber`) could be a problem: multi-menu restaurants doing takeaway shouldn't need a table either.

**Fix needed:** The condition should be:
```javascript
const needsTable = (scannedOrderType === 'dinein' || scannedOrderType === 'room');
```

### 2.3 `ReviewOrder.jsx` – isMultiMenu table validation

**Line 676-696 (handlePlaceOrder):**
```javascript
if (isMultiMenu) {
  const hasScannedTable = isScanned && scannedOrderType === 'dinein' && scannedTableId;
  if (!hasScannedTable) {
    if (!roomOrTable) { toast('Please Select Your Room or Table'); return; }
    if (!tableNumber.trim()) { ... return; }
  }
}
```

**Issue:** Multi-menu restaurants enforcing table selection even for takeaway/delivery orders. This is the main hardcoding concern.

**Fix needed:** Table/Room validation should ONLY apply when `orderType` is `dinein` or `room`:
```javascript
const isDineInOrRoom = (scannedOrderType === 'dinein' || scannedOrderType === 'room' || !scannedOrderType);
if (isMultiMenu && isDineInOrRoom) {
  // validate table/room selection
}
```

### 2.4 `LandingPage.jsx` – Table status check always runs

**Line 79-82:**
```javascript
const checkTable = async () => {
  if (!isScanned || !scannedTableId || !restaurantId) return;
  if (isMultipleMenu(restaurant)) return;
```

**Issue:** Table status check runs whenever `isScanned && scannedTableId`. For takeaway/delivery QR codes, there's no `scannedTableId`, so this naturally skips. However, if someone shares a takeaway URL with a stale `tableId` param, it could trigger incorrectly.

**Recommendation:** Add explicit orderType check:
```javascript
if (!isScanned || !scannedTableId || !restaurantId) return;
if (scannedOrderType !== 'dinein' && scannedOrderType !== 'room') return; // Skip for takeaway/delivery
```

### 2.5 `helpers.js` – Multi-menu payload hardcodes `order_type: 'dinein'`

**Line 361:**
```javascript
order_type: 'dinein',  // ← Hardcoded in buildMultiMenuPayload
```

**Issue:** Multi-menu restaurants placing takeaway/delivery orders would always send `dinein` to the POS API.

**Fix needed:** Pass `orderType` through to `buildMultiMenuPayload`:
```javascript
order_type: orderData.orderType || 'dinein',
```

### 2.6 `TableRoomSelector.jsx` – Visibility check

**Line 81:**
```javascript
{showTableInfo && !isMultiMenu && isScanned && scannedOrderType === 'dinein' && (
```

**Status:** This is actually correct — only shows table badge for dine-in. But needs to also handle `room` type explicitly.

---

## 3. New API Endpoints

### 3.1 Customer Address List

```
GET https://preprod.mygenie.online/api/v1/customer/address/list
Headers:
  Content-Type: application/json; charset=UTF-8
  zoneId: (empty or zone ID)
  X-localization: en
  latitude: (empty or lat)
  longitude: (empty or lng)
  Authorization: Bearer {customer_token}
```

**Purpose:** Fetch saved delivery addresses for logged-in customers.
**Used in:** Delivery flow — auto-select default address, allow address change.
**Auth:** Requires customer auth token (from `/auth/login`).

### 3.2 Delivery Charge by Distance

```
GET https://manage.mygenie.online/api/v1/config/distance-api-new
  ?destination_lat={lat}
  &destination_lng={lng}
  &restaurant_id={id}
  &order_value={amount}
Headers:
  Content-Type: application/json; charset=UTF-8
  X-localization: en
  Authorization: Bearer {token}
```

**IMPORTANT:** This API is on `manage.mygenie.online`, NOT `preprod.mygenie.online`.

**Purpose:** Calculate delivery charge based on distance + order value. Also validates if delivery is available to that location.
**Used in:** Delivery flow — after address selection, before order placement.
**Returns:** Delivery charge amount + whether delivery is serviceable.

### 3.3 Get Zone ID

```
GET https://preprod.mygenie.online/api/v1/config/get-all-zone?lat={lat}&lng={lng}
```

**Purpose:** Get zone ID for a given lat/lng. Zone ID is required in headers for other API calls.
**Used in:** Delivery flow — determine zone for delivery address.

### 3.4 Customer Login

```
POST https://preprod.mygenie.online/api/v1/auth/login
```

**Purpose:** Existing endpoint. Customer login to get auth token for address list and other authenticated operations.
**Used in:** Takeaway/Delivery flow — user must be identified (login or guest capture).

---

## 4. Landing Page Flow — By Order Type

### 4.1 Dine-In / Room (Existing — No Changes)

```
Landing Page → Check table status → Edit Order / Browse Menu → Menu → Review → Place
```

### 4.2 Takeaway (NEW)

```
Landing Page
  └─ Detect orderType=takeaway from QR URL
  └─ Show Takeaway/Delivery mode toggle (Takeaway pre-selected)
  └─ Mandatory: Name + Phone capture (or Login button)
  └─ "Browse Menu" button (only after name+phone filled OR logged in)
  └─ NO table status check
  └─ NO Call Waiter / Pay Bill buttons
  └─ → Menu → Cart → ReviewOrder (no table selector) → Place Order
```

### 4.3 Delivery (NEW)

```
Landing Page
  └─ Detect orderType=delivery from QR URL
  └─ Show Takeaway/Delivery mode toggle (Delivery pre-selected)
  └─ Mandatory: Name + Phone capture (or Login button)
  │
  ├─ First-Time User (not logged in / no saved address):
  │     └─ Prompt address entry (manual or map/location picker)
  │     └─ Call distance-api-new to validate + get delivery charge
  │     └─ If deliverable → Proceed to menu
  │     └─ If NOT deliverable → Show "Delivery not available" message
  │
  ├─ Existing User (logged in with saved addresses):
  │     └─ Auto-select default saved address
  │     └─ Option to change address
  │     └─ Validate delivery availability
  │     └─ → Menu → Cart → ReviewOrder → Place Order
  │
  └─ NO table status check
  └─ NO Call Waiter / Pay Bill buttons
```

---

## 5. Component Architecture (Proposed)

### 5.1 New/Modified Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `OrderModeSelector` | NEW | `components/OrderModeSelector/` | Takeaway/Delivery toggle on landing |
| `DeliveryAddressSelector` | NEW | `components/DeliveryAddressSelector/` | Address list, add new, map picker |
| `DeliveryValidation` | NEW | `components/DeliveryValidation/` | Show delivery charge or "not available" |
| `LandingPage.jsx` | MODIFY | `pages/` | Add orderType branching, mode selector |
| `ReviewOrder.jsx` | MODIFY | `pages/` | Conditional table logic, delivery charge in bill |
| `useScannedTable.js` | MODIFY | `hooks/` | Already supports orderType — minor tweaks |
| `CartContext.js` | MODIFY | `context/` | Store delivery address + charge |
| `orderService.ts` | MODIFY | `api/services/` | Pass delivery fields in payload |
| `helpers.js` | MODIFY | `api/transformers/` | Fix hardcoded `order_type: 'dinein'` in multi-menu |
| `endpoints.js` | MODIFY | `api/config/` | Add new endpoints |

### 5.2 New Endpoints to Add in `endpoints.js`

```javascript
// Delivery endpoints
CUSTOMER_ADDRESS_LIST: () => `${API_BASE_URL}/customer/address/list`,
DELIVERY_CHARGE: (lat, lng, restaurantId, orderValue) =>
  `https://manage.mygenie.online/api/v1/config/distance-api-new?destination_lat=${lat}&destination_lng=${lng}&restaurant_id=${restaurantId}&order_value=${orderValue}`,
GET_ZONE: (lat, lng) => `${API_BASE_URL}/config/get-all-zone?lat=${lat}&lng=${lng}`,
```

**Note:** `DELIVERY_CHARGE` endpoint uses a different base URL (`manage.mygenie.online`). This needs to be handled — possibly via a new env var `REACT_APP_MANAGE_BASE_URL`.

---

## 6. Data Flow Changes

### 6.1 Order Payload Changes

| Field | Current | Takeaway | Delivery |
|-------|---------|----------|----------|
| `order_type` | `dinein` | `takeaway` | `delivery` |
| `table_id` | From QR / manual | Empty `''` | Empty `''` |
| `delivery_charge` | `'0'` | `'0'` | Dynamic (from API) |
| `address_id` | `''` | `''` | From saved address |
| `address` | `''` | `''` | Full address text |
| `latitude` | `''` | `''` | From address |
| `longitude` | `''` | `''` | From address |
| `cust_name` | Optional | **Mandatory** | **Mandatory** |
| `cust_phone` | Optional | **Mandatory** | **Mandatory** |

### 6.2 CartContext Changes

Need to store:
- `orderType` — takeaway/delivery/dinein
- `deliveryAddress` — selected address object
- `deliveryCharge` — from distance API
- `zoneId` — from zone API

---

## 7. Open Questions / Discussion Items

1. **Mode switching:** Can a user switch between Takeaway and Delivery after starting to browse the menu? Or is it locked after the landing page?

2. **Delivery charge in bill:** Should delivery charge show in the ReviewOrder price breakdown? (Likely yes — as a new line item)

3. **Minimum order for delivery:** Does `distance-api-new` return minimum order value? Should we enforce it?

4. **Address add/edit:** For first-time users, do we show a full address form or a map-based picker? What fields are required?

5. **Multi-menu + Takeaway:** For a multi-menu restaurant with takeaway QR — should we still show station selection (menu master) but skip table selection?

6. **Room service vs Delivery:** Room service currently uses `orderType=dinein` with `type=room`. Should room service have its own distinct `orderType` value?

7. **QR code generation:** Will the POS system generate takeaway/delivery QR codes? Or will these be static URLs configured by the restaurant?

---

## 8. Implementation Phases (Proposed)

### Phase 1: Takeaway (Lower complexity)
- OrderModeSelector component
- Landing page branching by orderType
- Mandatory name+phone for takeaway
- Skip table logic for takeaway
- Fix hardcoded `dinein` in multi-menu payload
- Test end-to-end takeaway order

### Phase 2: Delivery (Higher complexity)
- Address list integration (API)
- Address entry UI for new users
- Delivery charge calculation (distance API)
- Zone ID resolution
- Delivery availability validation
- Delivery charge in bill summary
- Test end-to-end delivery order

### Phase 3: Polish
- Mode switching between takeaway/delivery
- Address management (save, edit, delete)
- Map/location picker integration
- Estimated delivery time display

---

## 9. Pre-Scale Preparation (FEAT-002-PREP)

See `/app/memory/FEAT-002-PREP-hardcoding-removal.md` for full audit.

**17 issues found across 8 files.** 6 HIGH risk, 4 MEDIUM risk, 7 LOW risk.

Must be completed BEFORE any takeaway/delivery code is written.

---

## 10. Key Learnings (Updated April 11)

1. **4 channels, not 2:** dine-in, room, takeaway, delivery. Room uses `type=room` with `orderType=dinein` currently.
2. **LandingPage is order-type-blind:** Doesn't even destructure `orderType` from `useScannedTable()`.
3. **OrderSuccess is order-type-blind:** Same issue — no orderType awareness.
4. **Multi-menu + table validation is the #1 blocker:** `isMultiMenu` check forces table selection regardless of order type.
5. **`buildMultiMenuPayload` hardcodes `order_type: 'dinein'`:** Multi-menu restaurants can never send takeaway/delivery to POS.
6. **`delivery_charge` hardcoded to `'0'` in 3 places:** orderService.ts (x2) + helpers.js (x1).
7. **Address fields all empty strings:** `address_id`, `address`, `latitude`, `longitude`, `address_type` — all hardcoded to `''`.
8. **Delivery charge API uses different base URL:** `manage.mygenie.online` not `preprod.mygenie.online`.

---

## Document History

| Date | Changes |
|------|---------|
| April 11, 2026 | Added FEAT-002-PREP audit results, key learnings, API endpoints |
| April 11, 2026 | Initial planning document created |
