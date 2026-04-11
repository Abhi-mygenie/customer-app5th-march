# FEAT-002: Scan & Order Expansion – Takeaway & Delivery

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-002 |
| **Title** | Scan & Order Expansion – Takeaway & Delivery |
| **Created** | April 11, 2026 |
| **Last Updated** | April 11, 2026 |
| **Status** | Planning (All decisions confirmed) |
| **Priority** | P0 - Critical |
| **Pre-requisite** | FEAT-002-PREP ✅ Complete |

---

## 1. Scanner Types & URL Patterns

### 3 Scanner Types from POS

**Type A: Walk-in QR (`walkin_qr_urls`)**
No table assigned. User walks in or orders remotely.

| Label | URL | `type` | `orderType` | `tableId` | `foodFor` |
|-------|-----|--------|-------------|-----------|-----------|
| walkin_dinein | `/478?type=walkin&orderType=dinein&foodFor=Normal` | `walkin` | `dinein` | None | Normal |
| delivery | `/478?type=walkin&orderType=delivery&foodFor=Normal` | `walkin` | `delivery` | None | Normal |
| takeaway | `/478?type=walkin&orderType=takeaway&foodFor=Normal` | `walkin` | `takeaway` | None | Normal |

**Type B: Walk-in Menu QR (`walkin_menu_qr_urls`)**
Same as walk-in dine-in but with different menu filters.

| Label | URL | `type` | `orderType` | `tableId` | `foodFor` |
|-------|-----|--------|-------------|-----------|-----------|
| Normal | `/478?type=walkin&orderType=dinein&foodFor=Normal` | `walkin` | `dinein` | None | Normal |
| Party | `/478?type=walkin&orderType=dinein&foodFor=Party` | `walkin` | `dinein` | None | Party |
| Premium | `/478?type=walkin&orderType=dinein&foodFor=Premium` | `walkin` | `dinein` | None | Premium |

**Type C: Table/Room QR (`qr_code_urls`)**
Assigned table or room. Existing flow — no changes.

| Label | URL | `type` | `orderType` | `tableId` | `foodFor` |
|-------|-----|--------|-------------|-----------|-----------|
| Normal | `/478?tableId=6182&tableName=e3&type=room&orderType=dinein&foodFor=Normal` | `room` | `dinein` | 6182 | Normal |
| Party | Same but `foodFor=Party` | `room` | `dinein` | 6182 | Party |
| Premium | Same but `foodFor=Premium` | `room` | `dinein` | 6182 | Premium |

---

## 2. Confirmed Decisions

| # | Question | Answer |
|---|----------|--------|
| 1 | Store `type=walkin` as recognized type? | **Yes** — store as `walkin` so we can distinguish from direct URL |
| 2 | Table required rule? | **Only when `tableId` is present in URL.** Walk-in dine-in, takeaway, delivery — all skip table. |
| 3 | Takeaway ↔ Delivery switching? | **Yes** — mode toggle allowed since both land on same page |
| 4 | Walk-in dine-in name+phone? | **From configuration** — same as existing config (`mandatoryCustomerName`, `mandatoryCustomerPhone`) |
| 5 | Takeaway/Delivery name+phone? | **Always mandatory** — must capture or login |
| 6 | Delivery address — where in flow? | **After landing page, before menu** — separate intermediate step |
| 7 | Walk-in dine-in ↔ Takeaway/Delivery switch? | **No** — different scanners, different flows |
| 8 | Walk-in dine-in `table_id` to POS? | Send `'0'` |
| 9 | `foodFor` for takeaway/delivery? | **Yes** — respect menu filter if present, fallback to full menu |

---

## 3. The New Table Requirement Rule

**OLD rule:** `isDineInOrRoom(orderType)` — order type determines table need
**NEW rule:** `tableId present in URL` — table presence determines table need

| Scenario | `type` | `orderType` | `tableId` | Table required? | `table_id` sent to POS |
|----------|--------|-------------|-----------|-----------------|----------------------|
| Table QR | `table` | `dinein` | `6182` | ✅ Yes (auto-filled) | `'6182'` |
| Room QR | `room` | `dinein` | `6182` | ✅ Yes (auto-filled) | `'6182'` |
| Walk-in dine-in | `walkin` | `dinein` | None | ❌ No | `'0'` |
| Walk-in takeaway | `walkin` | `takeaway` | None | ❌ No | `'0'` |
| Walk-in delivery | `walkin` | `delivery` | None | ❌ No | `'0'` |
| Walk-in menu QR | `walkin` | `dinein` | None | ❌ No | `'0'` |
| Direct URL (no params) | None | defaults `dinein` | None | ❌ No | `'0'` |
| Multi-menu + Table QR | `table` | `dinein` | `6182` | ✅ Yes (auto-filled) | `'6182'` |
| Multi-menu + Walk-in | `walkin` | any | None | ❌ No | `'0'` |

**Impact on `orderTypeHelpers.js`:**
The `isDineInOrRoom()` function is no longer the right check for table requirement. We need:

```javascript
// NEW: Table is needed only when a tableId was scanned from QR
export const needsTable = (scannedTableId) => {
  return !!scannedTableId;
};
```

The existing `isDineInOrRoom()` is still useful for:
- Call Waiter / Pay Bill visibility (dine-in/room context actions)
- Table status polling (only for seated orders)

---

## 4. Complete Flow Map — All 5 Scenarios

### 4.1 Table/Room QR Scan (Existing — No Changes)

```
Scan QR → /478?tableId=6182&tableName=e3&type=room&orderType=dinein&foodFor=Normal
  │
  └─ LandingPage
       ├─ tableId present → check table status
       │   ├─ Table occupied → auto-redirect to OrderSuccess (edit order)
       │   └─ Table free → show "Browse Menu"
       ├─ Show table badge: "Room e3"
       ├─ Show Call Waiter / Pay Bill
       └─ → Menu (filtered by foodFor) → Cart → ReviewOrder (table auto-filled) → Place Order
```

### 4.2 Walk-in Dine-in (NEW handling for existing orderType)

```
Scan QR → /478?type=walkin&orderType=dinein&foodFor=Normal
  │
  └─ LandingPage
       ├─ No tableId → skip table status check
       ├─ No table badge
       ├─ Show Call Waiter / Pay Bill (dine-in context)
       ├─ Name+Phone from config (mandatoryCustomerName/Phone)
       └─ → Menu (filtered by foodFor) → Cart → ReviewOrder (table_id='0') → Place Order
```

### 4.3 Walk-in Takeaway (NEW)

```
Scan QR → /478?type=walkin&orderType=takeaway&foodFor=Normal
  │
  └─ LandingPage
       ├─ No tableId → skip table status check
       ├─ No table badge, No Call Waiter, No Pay Bill
       ├─ Show Takeaway/Delivery toggle (Takeaway pre-selected)
       ├─ Name + Phone MANDATORY (or Login)
       └─ → Menu (filtered by foodFor) → Cart → ReviewOrder (table_id='0', order_type='takeaway') → Place Order
```

### 4.4 Walk-in Delivery (NEW)

```
Scan QR → /478?type=walkin&orderType=delivery&foodFor=Normal
  │
  └─ LandingPage
       ├─ No tableId → skip table status check
       ├─ No table badge, No Call Waiter, No Pay Bill
       ├─ Show Takeaway/Delivery toggle (Delivery pre-selected)
       ├─ Name + Phone MANDATORY (or Login)
       │
       └─ DeliveryAddressPage (intermediate, BEFORE menu)
            ├─ First-time user → enter address manually
            ├─ Logged-in user → show saved addresses, option to change
            ├─ Call distance-api-new → validate + get delivery charge
            │   ├─ Deliverable → store address + charge → proceed to Menu
            │   └─ NOT deliverable → show message, block ordering
            │
            └─ → Menu (filtered by foodFor) → Cart → ReviewOrder (delivery charge in bill, table_id='0') → Place Order
```

### 4.5 Takeaway → Delivery Switch (via Mode Toggle)

```
User on Takeaway landing → clicks "Delivery" toggle
  │
  └─ orderType changes to 'delivery'
  └─ DeliveryAddressPage appears (address required before menu)
  └─ Rest of delivery flow follows
```

```
User on Delivery landing → clicks "Takeaway" toggle
  │
  └─ orderType changes to 'takeaway'
  └─ Address step skipped
  └─ Directly to Menu
```

---

## 5. useScannedTable Hook Changes

### Current parsing:
```javascript
const roomOrTable = (urlType === 'room' || urlType === 'table') ? urlType : null;
```

### New parsing needed:
```javascript
const roomOrTable = (urlType === 'room' || urlType === 'table' || urlType === 'walkin')
  ? urlType
  : null;
```

### New return values:

| URL Param | `roomOrTable` | `orderType` | `tableId` | `isScanned` | `foodFor` |
|-----------|--------------|-------------|-----------|-------------|-----------|
| `type=table&tableId=X` | `'table'` | `'dinein'` | `'X'` | `true` | value |
| `type=room&tableId=X` | `'room'` | `'dinein'` | `'X'` | `true` | value |
| `type=walkin&orderType=dinein` | `'walkin'` | `'dinein'` | `null` | `true` | value |
| `type=walkin&orderType=takeaway` | `'walkin'` | `'takeaway'` | `null` | `true` | value |
| `type=walkin&orderType=delivery` | `'walkin'` | `'delivery'` | `null` | `true` | value |
| No params | `null` | `null` | `null` | `false` | `null` |

---

## 6. Component Architecture (Updated)

### 6.1 Landing Page Changes

```
LandingPage.jsx
  │
  ├─ IF tableId present (Table/Room QR)
  │     └─ Existing flow: table status check → edit order / browse menu
  │
  ├─ IF orderType = takeaway OR delivery (Walk-in QR)
  │     ├─ <OrderModeSelector mode={orderType} onModeChange={...} />
  │     ├─ Name + Phone (mandatory)
  │     ├─ IF delivery → "Set Delivery Address" button → navigate to address page
  │     ├─ IF takeaway → "Browse Menu" button (enabled after name+phone)
  │     └─ Hide: table badge, Call Waiter, Pay Bill
  │
  └─ IF walkin dinein (no tableId, orderType=dinein)
        ├─ Name + Phone from config
        ├─ Show Call Waiter / Pay Bill
        └─ "Browse Menu" button
```

### 6.2 New Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `OrderModeSelector` | Takeaway/Delivery toggle pill | `components/OrderModeSelector/` |
| `DeliveryAddressPage` | Intermediate page: address entry/selection + validation | `pages/DeliveryAddress.jsx` |

### 6.3 Modified Components

| Component | Change |
|-----------|--------|
| `useScannedTable.js` | Recognize `type=walkin`, expose `isWalkin` |
| `orderTypeHelpers.js` | Update `needsTable()` → check `tableId` not `orderType` |
| `LandingPage.jsx` | Add orderType branching, mode selector, mandatory fields |
| `ReviewOrder.jsx` | Update table logic to use `tableId` presence, delivery charge in bill |
| `OrderSuccess.jsx` | Already fixed in FEAT-002-PREP |
| `TableRoomSelector.jsx` | Update table logic to use `tableId` presence |
| `CartContext.js` | Store `orderType`, `deliveryAddress`, `deliveryCharge` |
| `orderService.ts` | Pass delivery fields (`address_id`, `address`, `lat`, `lng`, `delivery_charge`) |
| `helpers.js` | Pass delivery fields in `buildMultiMenuPayload` |
| `endpoints.js` | Add delivery endpoints |
| `App.js` | Add route for `DeliveryAddressPage` |

---

## 7. API Endpoints

### 7.1 Customer Address List
```
GET {API_BASE_URL}/customer/address/list
Auth: Bearer {customer_token}
Headers: Content-Type, zoneId, X-localization, latitude, longitude
```

### 7.2 Delivery Charge + Area Validation
```
GET https://manage.mygenie.online/api/v1/config/distance-api-new
  ?destination_lat={lat}&destination_lng={lng}&restaurant_id={id}&order_value={amount}
Auth: Bearer {token}
```
**Note:** Different base URL — needs `REACT_APP_MANAGE_BASE_URL` env var.

### 7.3 Get Zone ID
```
GET {API_BASE_URL}/config/get-all-zone?lat={lat}&lng={lng}
```

### 7.4 Customer Login (existing)
```
POST {API_BASE_URL}/auth/login
```

---

## 8. Order Payload Changes

### 8.1 Takeaway Order
```javascript
{
  order_type: 'takeaway',
  table_id: '0',
  delivery_charge: '0',
  address_id: '',
  address: '',
  latitude: '',
  longitude: '',
  cust_name: 'REQUIRED',
  cust_phone: 'REQUIRED',
  // everything else same as dinein
}
```

### 8.2 Delivery Order
```javascript
{
  order_type: 'delivery',
  table_id: '0',
  delivery_charge: '{from_distance_api}',
  address_id: '{from_saved_address_or_new}',
  address: '{full_address_text}',
  latitude: '{lat}',
  longitude: '{lng}',
  address_type: '{home/office/other}',
  cust_name: 'REQUIRED',
  cust_phone: 'REQUIRED',
}
```

### 8.3 Walk-in Dine-in (no table)
```javascript
{
  order_type: 'dinein',
  table_id: '0',
  delivery_charge: '0',
  // name+phone from config (may or may not be mandatory)
}
```

---

## 9. Implementation Phases

### Phase 1: Core Plumbing (Estimated: 3-4 hours)
1. Update `useScannedTable.js` — recognize `type=walkin`
2. Update `orderTypeHelpers.js` — `needsTable(tableId)` instead of `isDineInOrRoom(orderType)`
3. Update table logic in ReviewOrder, TableRoomSelector, LandingPage — use `tableId` presence
4. Walk-in dine-in sends `table_id: '0'`
5. `foodFor` fallback to full menu if absent
6. Test: all 5 scenarios with URL params

### Phase 2: Takeaway Flow (Estimated: 4-6 hours)
1. `OrderModeSelector` component (Takeaway/Delivery toggle)
2. LandingPage branching for takeaway/delivery
3. Mandatory name+phone enforcement for takeaway/delivery
4. Mode switching (takeaway ↔ delivery)
5. CartContext stores `orderType`
6. ReviewOrder sends correct `order_type` and `table_id: '0'`
7. Test: end-to-end takeaway order placement

### Phase 3: Delivery Flow (Estimated: 8-10 hours)
1. `DeliveryAddressPage` — new intermediate page
2. Add route in App.js
3. Address list API integration (saved addresses for logged-in users)
4. Manual address entry for new users
5. Distance API integration (delivery charge + validation)
6. Zone ID API integration
7. CartContext stores `deliveryAddress`, `deliveryCharge`, `zoneId`
8. ReviewOrder shows delivery charge in bill breakdown
9. Order payload includes all delivery fields
10. `REACT_APP_MANAGE_BASE_URL` env var
11. Test: end-to-end delivery order placement (both new + existing user)

### Phase 4: Polish (Estimated: 2-3 hours)
1. Error handling for all delivery APIs
2. Loading states for address validation
3. "Delivery not available" message UI
4. Address management (save/edit/delete for logged-in users)

---

## 10. Remaining Gaps / Open Items

| # | Item | Status | Blocking? |
|---|------|--------|-----------|
| 1 | Distance API response format — need sample response to understand fields | Need from you | Yes (Phase 3) |
| 2 | Address list API response format — need sample response | Need from you | Yes (Phase 3) |
| 3 | Zone API response format | Need from you | Yes (Phase 3) |
| 4 | Delivery address form fields — what's required? (flat/house, road, landmark, pincode, city?) | Need from you | Yes (Phase 3) |
| 5 | Minimum order value for delivery — does distance API enforce it? | Need from you | No (can add later) |
| 6 | Delivery charge display — in bill breakdown on ReviewOrder? | Assumed yes | No |
| 7 | `REACT_APP_MANAGE_BASE_URL` value for this environment | Need from you | Yes (Phase 3) |

**Phase 1 and Phase 2 (Takeaway) can proceed immediately — no gaps.**
**Phase 3 (Delivery) needs API response samples before implementation.**

---

## Document History

| Date | Changes |
|------|---------|
| April 11, 2026 | Complete rewrite — all decisions confirmed, 5 scenario flows mapped, 3 scanner types documented, phase plan finalized |
| April 11, 2026 | Added FEAT-002-PREP audit results, key learnings, API endpoints |
| April 11, 2026 | Initial planning document created |
