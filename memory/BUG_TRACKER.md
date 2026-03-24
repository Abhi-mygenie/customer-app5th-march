# Bug Tracker - MyGenie Customer App

## Last Updated: March 24, 2026

---

## Legend

| Severity | Meaning |
|----------|---------|
| P0 | Critical - App broken, user blocked |
| P1 | High - Core flow impacted, workaround exists |
| P2 | Medium - Feature degraded, non-blocking |
| P3 | Low - Cosmetic, minor UX issue |

| Status | Meaning |
|--------|---------|
| Open | Identified, not yet worked on |
| In Progress | Currently being fixed |
| Fixed | Fix deployed and verified |
| Won't Fix | Accepted / not applicable |

---

## BUG-001: Customer stuck on OrderSuccess after table merge/transfer

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-001 |
| **Date Reported** | 2026-03-24 |
| **Date Fixed** | 2026-03-24 |
| **Severity** | P1 - High |
| **Status** | Fixed (v3 — final) |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Success Page / Table Management |
| **Branch** | 6marchv1 |
| **Customer Impact** | All dine-in customers on tables that get merged/transferred by POS staff. Affects any restaurant using table merge/transfer feature. |

### Summary
When POS staff merges or transfers a table's order to another table, the customer on the original table remains stuck on the OrderSuccess page with stale data. No redirect, no notification — the customer has no way to know their table is now free and they should start a new order.

### Steps to Reproduce
1. Customer scans QR code on Table A (e.g. table_id=3241) and places an order
2. Customer lands on OrderSuccess page (order polling every 60s)
3. POS staff merges Table A's order into Table B (or transfers to another table)
4. Table A is now "Available" in POS system
5. **Expected**: Customer on Table A gets redirected to landing page with table context preserved
6. **Actual (before fix)**: Customer stays on OrderSuccess page indefinitely with stale order data

### Root Cause
OrderSuccess page only handled 3 redirect scenarios:
- `fOrderStatus === 3` (Cancelled) → redirect
- `fOrderStatus === 6` (Paid) → redirect
- 404 (Order not found) → redirect

No check existed for table availability. When staff merges/transfers, the order's `fOrderStatus` doesn't change to 3 or 6 — it's still active but on a different table. The original table becomes "Available" but the app never checks this.

### Fix Iterations (3 attempts to get it right)

**v1 (FAILED)** — Placed check inside `previousItems.length > 0` → `fOrderStatus !== null` nested block. When POS merges, API returns `details: []` (empty), so the nested block was skipped entirely. Check never ran.

**v2 (FAILED)** — Moved check to top-level of `fetchOrderStatus()` but used React state (`isScanned`, `scannedTableId`) from `useScannedTable()` hook. Due to **stale closure** issue — `fetchOrderStatus` is captured in a `useEffect([orderId])` closure on first render when `useScannedTable` hasn't populated state yet — `isScanned` was always `false` and `scannedTableId` was always `null`. Check never ran.

Also in v2:
- Used `orderDetails.tableId` (from API) as primary source for table ID, but API returned a different table ID (`3237`) than the scanned table (`3241`). Wrong table was being checked.
- Called `clearScannedTable()` on redirect, which wiped sessionStorage. After redirect to landing page, new order had no table context — customer couldn't place a dine-in order for their table.

**v3 (FINAL — Working)** — Three key fixes:
1. Read `table_id` from **sessionStorage directly** (not React state) to bypass stale closure
2. Use **only scanned table ID** (no API fallback) — we're checking if the customer's physical table is free
3. **Don't call `clearScannedTable()`** on redirect — customer is still at the same table, preserve context for new order

### Final Fix Applied

**File Modified**: `/app/frontend/src/pages/OrderSuccess.jsx`

**Change 1 — Imports (Lines 10-11)**

Before:
```javascript
import { getOrderDetails } from '../api/services/orderService';
```

After:
```javascript
import { getOrderDetails, checkTableStatus } from '../api/services/orderService';
import { getStoredToken } from '../utils/authToken';
```

**Change 2 — useScannedTable destructure (Line 116)**

No change to the original destructure — `scannedTableId` is NOT used (we read from sessionStorage instead to avoid stale closure):
```javascript
const { tableNo: scannedTableNo, roomOrTable: scannedRoomOrTable, isScanned, clearScannedTable } = useScannedTable();
```

**Change 3 — Table status check (Lines 153-177, top-level in `fetchOrderStatus()`)**

```javascript
const orderDetails = await getOrderDetails(orderId);

// Check if table has been merged/transferred (table now free = order moved away)
// Read scanned table from sessionStorage (always current, avoids stale closure)
const storageKey = `scanned_table_${restaurantId}`;
const storedTable = sessionStorage.getItem(storageKey);
const scannedData = storedTable ? JSON.parse(storedTable) : null;
const tableIdForCheck = scannedData?.table_id;

if (tableIdForCheck && String(tableIdForCheck) !== '0') {
  try {
    const tableCheckResult = await checkTableStatus(
      tableIdForCheck,
      numericRestaurantId,
      getStoredToken()
    );
    if (tableCheckResult.isAvailable || tableCheckResult.isInvalid) {
      clearCart();
      clearEditMode();
      // DO NOT clear scanned table — customer is still at this physical table
      toast('Your table has been reassigned. Please place a new order.', { icon: '🔄', duration: 4000 });
      navigate(`/${restaurantId}`, { replace: true });
      return;
    }
  } catch (tableCheckErr) {
    console.error('Table status check failed:', tableCheckErr);
  }
}

if (orderDetails?.previousItems && orderDetails.previousItems.length > 0) {
  // ... existing items/status logic ...
```

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| Read from sessionStorage, not React state | Avoids stale closure in `useEffect([orderId])` — sessionStorage is always current on every read |
| Use scanned table_id only, no API fallback | API's `table_id` can differ from scanned table (e.g. 3237 vs 3241). We're checking the customer's physical table. |
| Don't clear scanned table on redirect | Customer is still sitting at the same table. New order needs the table context for dine-in. |
| Top-level in fetchOrderStatus, before previousItems check | When order is merged, API returns `details: []` — nested checks would be skipped |
| Skip if tableId is '0' or falsy | Takeaway/delivery orders have no table — skip check |

### API Used
- **Endpoint**: `GET /api/v1/customer/check-table-status?table_id={id}&restaurant_id={id}`
- **Source**: External POS API (`preprod.mygenie.online`)
- **Auth**: Bearer token from `localStorage["order_auth_token"]` (via `getStoredToken()`)
- **Responses handled**:
  - `"Available"` → Table freed (merged/transferred) → redirect to landing
  - `"Not Available"` → Table still occupied → do nothing (normal)
  - `"Invalid Table ID or QR code"` → Table deleted → redirect to landing
  - API error → fail silently, stay on page (safe default)

### Token Strategy
- `getStoredToken()` — synchronous read from localStorage, no API call
- Token already exists from ReviewOrder step (placed order seconds before)
- If token expired (after 10 min polling), the `apiClient` response interceptor catches 401 and auto-refreshes via `getAuthToken(true)`
- Three safety layers: request interceptor (auto-attach), explicit param, response interceptor (401 retry)

### Verification
- Frontend compiles cleanly (only pre-existing eslint warnings)
- Logic runs on initial `fetchOrderStatus()` call + every 60s poll interval
- Only triggers for scanned-table dine-in orders (sessionStorage has table data)
- Skipped for takeaway/delivery orders (no scanned table)
- Cancel/Paid redirects (existing) take priority — table check runs for active orders only
- After redirect, table context preserved — new order picks up same table automatically
- Debug console.log removed from final version

### Regression Risk
Low — Change is additive (new check after existing logic). Existing cancel/paid/404 redirects untouched. On API failure, falls through silently to existing behavior. No existing code was modified.

### Notes
- `checkTableStatus` was already built in `orderService.js` (used by LandingPage.jsx). No changes needed to the API layer.
- `getStoredToken` was already exported from `authToken.js`. No changes needed to the auth layer.
- No changes to any other file. All changes in `OrderSuccess.jsx` only.

---

## BUG-002: Place Order button permanently locked after validation failure (all restaurants, critical on multi-menu)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-002 |
| **Date Reported** | 2026-03-24 |
| **Date Fixed** | 2026-03-24 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Place Order / ReviewOrder Page |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers on multi-menu restaurants (716, etc.) where room/table validation can fail. Also affects all restaurants if phone validation or token fetch fails on first click. |

### Summary
After clicking "Place Order" once and hitting any validation failure (no room selected, no table number, invalid phone), the button becomes permanently unresponsive. No error, no toast, no console logs — complete silence on all subsequent clicks. Page refresh is the only recovery.

### Steps to Reproduce
1. Go to restaurant 716 (multi-menu), add item to cart
2. Go to ReviewOrder page
3. Click "Place Order" WITHOUT selecting a room/table first
4. Toast shows: "Please Select Your Room or Table"
5. Now select room + room number
6. Click "Place Order" again
7. **Expected**: Order is placed
8. **Actual**: Nothing happens. No logs, no toast, no API call. Button appears enabled but is dead.

### Root Cause
`isPlacingOrderRef` (synchronous double-click guard) was set to `true` **before** validation. Validation failures returned early **without resetting** the ref. Once locked, every subsequent click exits silently at line 692.

```
BEFORE (broken):
  Line 692: if (isPlacingOrderRef.current) return;   ← blocks all clicks
  Line 693: isPlacingOrderRef.current = true;          ← LOCKED before validation

  Line 704: return;  ← validation fail: no room selected    — REF STAYS LOCKED ❌
  Line 711: return;  ← validation fail: no table number     — REF STAYS LOCKED ❌
  Line 720: return;  ← validation fail: invalid phone       — REF STAYS LOCKED ❌
  Line 742: return;  ← token fetch fail                     — REF STAYS LOCKED ❌

  Line 978: isPlacingOrderRef.current = false;  ← only reset in finally (never reached)
```

### Why 478 worked but 716 didn't
- **478** (`isMultiMenu = false`): The room/table validation block (lines 696-713) is **skipped entirely**. Fewer early-return paths before the `try` block. Harder to trigger the lock.
- **716** (`isMultiMenu = true`): The validation block **runs**, creating 3 extra early-return paths that can lock the ref permanently.

### Fix Applied

**File Modified**: `/app/frontend/src/pages/ReviewOrder.jsx`

**Change: Moved validation BEFORE the ref lock**

Before (broken order):
```
1. Lock ref                    ← too early
2. Validate room/table         ← can return, ref stuck
3. Validate phone              ← can return, ref stuck
4. Lock ref (duplicate)
5. Fetch token                 ← can return, ref stuck
6. try/finally (resets ref)
```

After (fixed order):
```
1. Validate room/table         ← returns safely, ref not locked yet
2. Validate phone              ← returns safely, ref not locked yet
3. Lock ref                    ← only AFTER all validation passes
4. Fetch token                 ← if fails, explicitly resets ref
5. try/finally (resets ref)
```

Specific changes:
- **Moved** validation blocks (room/table + phone) to BEFORE `isPlacingOrderRef.current = true`
- **Added** `isPlacingOrderRef.current = false` in the token fetch error handler (the one remaining early-return after the lock)
- Updated comment to explain why ref lock is placed after validation

### Verification
- Frontend compiles cleanly
- Validation failures no longer lock the button — user can retry immediately
- Double-click guard still works (ref locks after validation, before API call)
- Token fetch failure now properly resets the ref
- Affects all restaurants (global fix), not just 716

### Regression Risk
Low — Only reordered existing code. No new logic added. Double-click guard still functional. All early-return paths before ref lock are pure validation (synchronous, no side effects).

### Notes
- The `isPlacingOrderRef` pattern is a valid double-click guard — the bug was only in its placement (before validation instead of after)
- `isPlacingOrder` state (button disabled UI) was never the issue — it's set at line 749 inside the try block. The ref is the synchronous guard that runs before React re-renders.

---

## BUG-003: `foodFor` URL param not supported — menu page shows all items instead of filtered menu

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-003 |
| **Date Reported** | 2026-03-24 |
| **Date Fixed** | 2026-03-24 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Menu Page / QR Code URL Params |
| **Branch** | 6marchv1 |
| **Customer Impact** | All non-multi-menu restaurants where QR URLs include `foodFor` param. Customer sees all 144 items instead of filtered 135 (Normal menu only). Affects order accuracy for restaurants with distinct menu types (Normal, Party, Premium). |

### Summary
When a QR code URL includes `foodFor=Normal` (e.g. `/{restaurantId}?tableId=3241&foodFor=Normal`), the menu page should only show items belonging to the "Normal" menu. Instead, it ignored the `foodFor` param and showed ALL items from all menus combined.

### Steps to Reproduce
1. Open URL: `/478?tableId=3241&tableName=5&type=table&orderType=dinein&foodFor=Normal`
2. Click "BROWSE MENU" on landing page
3. **Expected**: Menu shows only Normal menu items (29 categories, 135 items)
4. **Actual (before fix)**: Menu shows ALL items from Normal + Party + Premium (30 categories, 144 items)

### Root Cause
The `foodFor` URL parameter was never read or used anywhere in the app. The flow was:
1. `useScannedTable` hook only read `tableId`, `tableName`, `type`, `orderType` from URL — **no `foodFor`**
2. `MenuItems.jsx` used `stationId` from route params (`:stationId`), which is `undefined` for non-multi-menu routes (`/:restaurantId/menu`)
3. `useMenuSections(undefined, restaurantId)` → API called without `food_for` param → returned all items

### Fix Applied

**File 1: `/app/frontend/src/hooks/useScannedTable.js`**

- Read `foodFor` (or `food_for`) from URL query params
- Store as `food_for` in the sessionStorage object alongside `table_id`, `table_no`, etc.
- Return `foodFor` from the hook

```javascript
// New: read foodFor from URL
const urlFoodFor = searchParams.get('foodFor') || searchParams.get('food_for');

// Store in sessionStorage
const newTable = {
  table_id: urlTableId,
  table_no: urlTableNo,
  room_or_table: roomOrTable,
  order_type: orderType,
  food_for: urlFoodFor || null    // ← NEW FIELD
};

// Return from hook
return {
  ...existing fields,
  foodFor: scannedTable?.food_for || null,  // ← NEW RETURN
};
```

**File 2: `/app/frontend/src/pages/MenuItems.jsx`**

- Import `useScannedTable` hook
- Read `foodFor` from hook
- Use as fallback when `stationId` (from route) is undefined

```javascript
const { foodFor } = useScannedTable();
const effectiveStationId = stationId || foodFor;
useMenuSections(effectiveStationId, numericRestaurantId);
```

### Priority Logic
- `stationId` (from route `/menu/:stationId`) takes priority — for multi-menu station clicks
- `foodFor` (from sessionStorage/URL) kicks in when `stationId` is undefined — for non-multi-menu restaurants
- Neither present → no `food_for` sent → all items (backward compatible)

### Verification
- Frontend compiles cleanly
- `/478?foodFor=Normal` → menu shows 29 categories, 135 items (Normal only) ✅
- `/478` (no foodFor) → menu shows 30 categories, 144 items (all menus) ✅
- `/716?foodFor=Breakfast` → still goes to station selection page (multi-menu) ✅
- API payload confirmed: `{ restaurant_id: "478", category_id: "0", food_for: "Normal" }` ✅

### Regression Risk
Low — `foodFor` is purely additive. If not present in URL, `foodFor` = null → `effectiveStationId` falls back to `stationId` → existing behavior unchanged.

### Notes
- `foodFor` supports both camelCase (`foodFor`) and snake_case (`food_for`) in URL params
- Stored in sessionStorage so it persists across page navigations within the same session
- For multi-menu restaurants, `stationId` from route always takes priority over `foodFor`

---

<!-- TEMPLATE FOR NEW BUGS

## BUG-XXX: [One-line summary]

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-XXX |
| **Date Reported** | YYYY-MM-DD |
| **Date Fixed** | YYYY-MM-DD |
| **Severity** | P0/P1/P2/P3 |
| **Status** | Open / In Progress / Fixed / Won't Fix |
| **Author** | Abhi-mygenie |
| **Fixed By** |  |
| **Related Feature** |  |
| **Branch** |  |
| **Customer Impact** | Who is affected, how many, which restaurants/flows |

### Summary

### Steps to Reproduce

### Root Cause

### Fix Applied
**Files Modified**:

### Verification

### Regression Risk

### Notes

-->
