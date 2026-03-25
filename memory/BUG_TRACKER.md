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

## BUG-004: Egg filter button color mismatch with food card egg icon

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-004 |
| **Date Reported** | 2026-03-24 |
| **Date Fixed** | 2026-03-24 |
| **Severity** | P3 - Low |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Menu Page / Veg-NonVeg-Egg Filters |
| **Branch** | 6marchv1 |
| **Customer Impact** | All restaurants with egg items. Visual inconsistency — filter button appears dark amber (#D97706) while food card egg icon is bright orange (#FFA500). |

### Summary
The "Egg" filter toggle button on the menu page uses a different orange shade (#D97706 dark amber) than the egg indicator on food item cards (#FFA500 bright orange). Both should be the same color for visual consistency.

### Root Cause
`SearchAndFilterBar.css` line 112 had a **hardcoded** `color: #D97706` for `.veg-toggle-btn.egg.active`, instead of using the CSS variable `var(--color-egg)` which is `#FFA500`. All other egg-related styles (MenuItem.css, MenuItems.css, FilterPanel.css) correctly use the CSS variable.

### Fix Applied

**File Modified**: `/app/frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css`

Before:
```css
.veg-toggle-btn.egg.active {
  color: #D97706;           /* hardcoded dark amber */
}
```

After:
```css
.veg-toggle-btn.egg.active {
  color: var(--color-egg);   /* #FFA500 — matches food card egg icon */
}
```

### Verification
- 1 file, 1 line change
- Egg filter button now matches food card egg icon color (#FFA500)

### Regression Risk
None — purely cosmetic, single CSS property change.

---

## BUG-005: "Earn rewards" prompt hidden behind fixed Place Order button on ReviewOrder page

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-005 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P2 - Medium |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | ReviewOrder Page / Loyalty Rewards Prompt |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers on the ReviewOrder page. The "Earn rewards on this order!" prompt is partially or fully obscured by the fixed Place Order button at the bottom of the screen, especially on smaller mobile screens. |

### Summary
The "Earn rewards on this order!" loyalty prompt at the bottom of the ReviewOrder page content is clipped/hidden behind the fixed-position Place Order button footer. Users cannot fully see the rewards information.

### Steps to Reproduce
1. Add items to cart on any restaurant with loyalty enabled
2. Go to ReviewOrder page
3. Scroll to the bottom
4. **Expected**: "Earn rewards on this order!" prompt is fully visible above the Place Order button
5. **Actual**: The prompt is partially hidden behind the fixed footer button

### Root Cause
`.review-order-content` had `padding-bottom: 80px` to account for the fixed footer (`.review-order-footer` with `position: fixed; bottom: 0`). However, the total footer height (button padding + border + shadow) is ~85-90px on mobile, so 80px was insufficient. The "Earn rewards" prompt, being the last content element, got clipped.

### Fix Applied
**File Modified**: `/app/frontend/src/pages/ReviewOrder.css`

**Change (line 52)**:
```css
/* Before */
padding-bottom: 80px;

/* After */
padding-bottom: 110px;
```

### Verification
- 1 file, 1 line change
- "Earn rewards" prompt now fully visible above the Place Order button on all screen sizes

### Regression Risk
None — purely cosmetic, single CSS padding change. No layout shifts or element repositioning.

---

## BUG-006: `updateCustomerOrder` sends hardcoded zero for `order_amount` and financial fields

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-006 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Edit Order / ReviewOrder Page |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers who edit/update an existing order. The POS receives `order_amount: 0`, `tax_amount: 0`, `discount_amount: 0`, `order_sub_total_amount: 0` — potentially corrupting the order total on the POS side. |

### Summary
When a customer updates an existing order (edit mode), the `updateCustomerOrder` API call sends hardcoded `0` for all financial fields (`order_amount`, `tax_amount`, `discount_amount`, `order_sub_total_amount`). The `placeOrder` function correctly passes real calculated values, but the update function was never wired up.

### Root Cause
The `updateCustomerOrder` function in `orderService.js` had hardcoded zeros in its payload:
```javascript
order_amount: 0,            // should be roundedTotal
discount_amount: 0,         // should be pointsDiscount
tax_amount: 0,              // should be adjustedTotalTax
order_sub_total_amount: 0,  // should be subtotalAfterDiscount
```
The function signature also did not accept these financial parameters, and `ReviewOrder.jsx` did not pass them.

### Fix Applied
**Files Modified**:
- `/app/frontend/src/api/services/orderService.js`
- `/app/frontend/src/pages/ReviewOrder.jsx`

**Change 1 — Function signature** (`orderService.js`):
Added params: `totalToPay`, `subtotal`, `totalTax`, `pointsDiscount`, `pointsRedeemed`

**Change 2 — Payload** (`orderService.js`):
```javascript
// Before
order_amount: 0,
discount_amount: 0,
tax_amount: 0,
order_sub_total_amount: 0,
discount_type: ''

// After
order_amount: parseFloat(Number(totalToPay).toFixed(2)),
discount_amount: parseFloat(Number(pointsDiscount).toFixed(2)),
tax_amount: parseFloat(Number(totalTax).toFixed(2)),
order_sub_total_amount: parseFloat(Number(subtotal).toFixed(2)),
discount_type: pointsRedeemed > 0 ? 'Loyality' : '',
points_redeemed: pointsRedeemed,
points_discount: pointsDiscount
```

**Change 3 — Caller** (`ReviewOrder.jsx`, both primary + retry paths):
Now passes `roundedTotal`, `subtotalAfterDiscount`, `adjustedTotalTax`, `pointsDiscount`, `pointsToRedeem` to `updateCustomerOrder`.

### Verification
- Frontend compiles cleanly
- Financial fields now match `placeOrder` behavior
- Both primary and 401-retry paths updated

### Regression Risk
Low — Only added missing data to API payload. No existing logic changed. Backward compatible (API was receiving zeros before, now receives correct values).

---

## BUG-007: OrderSuccess grand total reverts to non-rounded value after API poll

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-007 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | OrderSuccess Page / total_round |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers on restaurants with `total_round = 'Yes'`. Grand total initially shows rounded value (e.g., ₹106) from ReviewOrder, then reverts to non-rounded (₹105.30) after the first API poll recalculates it locally. |

### Summary
On the OrderSuccess page, the grand total initially displays the correct rounded value passed from ReviewOrder. However, when `fetchOrderStatus` polls the API and recalculates the bill summary, it computed the grand total locally (subtotal + tax) without using the `order_amount` from the API, losing the rounding.

### Root Cause
The recalculation block in `fetchOrderStatus()` computed:
```javascript
const grandTotal = parseFloat((subtotalAfterDiscount + adjustedTotalTax).toFixed(2));
```
This raw local calculation doesn't include rounding. The API's `order_amount` field (which contains the rounded value sent at order placement) was stored in state but never used for the bill summary display.

### Fix Applied
**File Modified**: `/app/frontend/src/pages/OrderSuccess.jsx`

**Change 1 — Recalculation block**:
```javascript
// Before
const grandTotal = parseFloat((subtotalAfterDiscount + adjustedTotalTax).toFixed(2));
setBillSummary({ ...apiBillSummary, grandTotal: grandTotal });

// After
const localGrandTotal = parseFloat((subtotalAfterDiscount + adjustedTotalTax).toFixed(2));
const apiOrderAmount = orderDetails.orderAmount || localGrandTotal;
const hasRoundingDiff = apiOrderAmount !== localGrandTotal;
setBillSummary({ ...apiBillSummary, grandTotal: apiOrderAmount, originalTotal: hasRoundingDiff ? localGrandTotal : null });
```

**Change 2 — Display**:
```jsx
// Before
<span className="bill-value-total">₹{billSummary.grandTotal.toFixed(2)}</span>

// After
<span className="bill-value-total">
  ₹{billSummary.grandTotal.toFixed(2)}
  {billSummary.originalTotal != null && (
    <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '4px' }}>(₹{billSummary.originalTotal.toFixed(2)})</span>
  )}
</span>
```

### Verification
- Grand total now shows `order_amount` from API (rounded) as primary value
- Locally calculated total (without rounding) shown in brackets when different
- Matches ReviewOrder display style exactly

### Regression Risk
Low — Additive change. If `orderDetails.orderAmount` is missing, falls back to local calculation (existing behavior).

---

## BUG-008: Edit Order button shown when order is yet to be confirmed (fOrderStatus === 7)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-008 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Success Page / Edit Order |
| **Branch** | 6marchv1 |
| **Customer Impact** | All dine-in customers. Edit Order button was shown immediately after placing order, even when restaurant hasn't confirmed yet. Editing an unconfirmed order could cause sync issues with POS. |

### Summary
When a customer places an order and lands on OrderSuccess page, the Edit Order button was shown immediately based only on table presence (`hasTable`). However, orders with `fOrderStatus === 7` (Yet to be confirmed) should NOT be editable — the restaurant needs to confirm the order first before customer can add more items.

### Steps to Reproduce
1. Scan QR code on a table
2. Add items to cart and place order
3. Land on OrderSuccess page
4. **Expected**: Show "Yet to be confirmed" message, no Edit button
5. **Actual (before fix)**: Edit Order button shown immediately

### Root Cause
The `showEditOrder` variable was set purely based on table presence:
```javascript
const showEditOrder = hasTable;  // No status check
```

This ignored the `fOrderStatus` value, allowing edit attempts on unconfirmed orders.

### Fix Applied
**Files Modified**:
- `/app/frontend/src/pages/OrderSuccess.jsx`
- `/app/frontend/src/pages/OrderSuccess.css`

**Change 1 — Logic variables (Lines 406-413)**:
```javascript
// Before
const showEditOrder = hasTable;

// After
const showYetToBeConfirmed = hasTable && fOrderStatus === 7;
const showEditOrder = hasTable && fOrderStatus !== 7 && fOrderStatus !== null;
```

**Change 2 — UI element (Lines 640-646)**:
```jsx
{showYetToBeConfirmed && (
  <div className="order-success-pending-msg" data-testid="order-pending-confirmation">
    <IoTimeOutline />
    <span>Yet to be confirmed</span>
  </div>
)}
```

**Change 3 — CSS styling**:
```css
.order-success-pending-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: #FFF8E6;
  border: 1.5px solid #F59E0B;
  border-radius: var(--radius-button, 8px);
  color: #B45309;
  font-family: var(--font-body, 'Montserrat', sans-serif);
  font-size: 0.85rem;
  font-weight: 600;
}
```

### Edit Order Logic Summary

| fOrderStatus | Status | UI Display |
|--------------|--------|------------|
| `7` | Yet to be confirmed | "Yet to be confirmed" message (no edit) |
| `1` | Confirmed | Edit Order button |
| `2` | Preparing | Edit Order button |
| `5` | Served | Edit Order button |
| `3` | Cancelled | Redirects to landing (existing) |
| `6` | Paid | Redirects to landing (existing) |

### Verification
- Frontend compiles with no errors (only pre-existing eslint warnings)
- `IoTimeOutline` icon already imported
- Amber/warning color scheme matches UX pattern for pending states

### Regression Risk
Low — Additive change. Existing redirect logic for Cancelled/Paid untouched. Edit button still works for confirmed orders (1, 2, 5).

### Notes
- `fOrderStatus` defaults to `null` initially, then updates from API polling
- When `fOrderStatus === null` (loading), neither edit button nor pending message shows (safe default)
- Once API returns status, appropriate UI renders

---

## BUG-009: Multiple orders created for same table (duplicate order prevention)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-009 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Placement / Edit Mode |
| **Branch** | 6marchv1 |
| **Customer Impact** | All dine-in customers. Multiple orders could be created for the same table through various escape routes, causing confusion for both customers and kitchen staff. |

### Summary
Multiple bugs allowed duplicate orders to be created for the same table:
1. **Different browsers**: Two customers scanning same QR could each place separate orders
2. **Clear Cart in edit mode**: Clicking "Clear Cart" exited edit mode, allowing new order
3. **Sidebar navigation**: Clicking "Home" or "Menu" in sidebar escaped edit mode
4. **No edit mode lock**: User could navigate away and place new order

### Scenarios Fixed

| Scenario | Before | After |
|----------|--------|-------|
| Browser A & B scan same table | Both can place orders | Second blocked with error |
| Click "Clear Cart" in edit mode | Exits edit mode | Only clears NEW items, stays in edit mode |
| Click "Home" in sidebar (edit mode) | Navigates to landing | Blocked with warning |
| Click "Menu" in sidebar (edit mode) | Can browse and place new order | Allowed (stays in edit mode) |

### Root Cause
1. **No table status check at order placement** — `ReviewOrder.jsx` didn't verify table availability before `placeOrder()`
2. **"Clear Cart" called `clearEditMode()`** — Should have called `clearCart()` only
3. **Sidebar navigation unrestricted** — No edit mode awareness

### Fix Applied
**Files Modified**:
- `/app/frontend/src/pages/ReviewOrder.jsx`
- `/app/frontend/src/pages/MenuItems.jsx`
- `/app/frontend/src/components/HamburgerMenu/HamburgerMenu.jsx`

**Change 1 — Table status check before new order (ReviewOrder.jsx)**:
```javascript
// Before placing NEW order, check if table already occupied
if (finalTableId && String(finalTableId) !== '0') {
  const tableStatus = await checkTableStatus(finalTableId, restaurantId, token);
  if (tableStatus.isOccupied && tableStatus.orderId) {
    toast.error('This table already has an active order. Please edit the existing order instead.');
    navigate(`/${restaurantId}`);
    return;
  }
}
```

**Change 2 — Clear Cart only clears NEW items (MenuItems.jsx)**:
```javascript
// Before
onClick={clearEditMode}  // Exited edit mode
>Clear Cart</button>

// After  
onClick={clearCart}  // Only clears new cart items, stays in edit mode
>Clear New Items</button>
```

**Change 3 — Block Home navigation in edit mode (HamburgerMenu.jsx)**:
```javascript
const handleNavigation = (path) => {
  // Block navigation to Home in edit mode
  if (isEditMode && (path === menuBasePath || path === '/')) {
    toast('Please complete or update your order first', { icon: '⚠️' });
    return;
  }
  navigate(path);
};
```

### Edit Mode Lock Rules
```
✅ ALLOWED in Edit Mode:
   - Navigate to Menu (preserves edit mode)
   - Add items to cart
   - Clear NEW items (previous order items preserved)
   - Go to ReviewOrder → Update Order

❌ BLOCKED in Edit Mode:
   - Navigate to Home/Landing
   - Logout
   - Place NEW order (auto-redirected to edit existing)
```

### Verification
- Frontend compiles with no errors
- Table status checked before every new order placement
- Edit mode persists through menu navigation
- "Clear New Items" only clears cart, not previous order items

### Regression Risk
Low — Changes are additive guards. Existing edit/update flow unchanged. Fail-safe on API errors (allows order to proceed).

---

## BUG-010: Edit Order button shown on LandingPage even when order is "yet to be confirmed"

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-010 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | LandingPage / Edit Order Flow |
| **Branch** | 6marchv1 |
| **Customer Impact** | All dine-in customers who scan QR while their order is still "yet to be confirmed". They see Edit Order button and can enter edit mode, causing confusion. |

### Summary
When a customer scans QR code on a table with an existing order that is "yet to be confirmed" (fOrderStatus === 7), the LandingPage shows "EDIT ORDER" button. Clicking it enters edit mode, but the order shouldn't be editable until restaurant confirms it.

### Root Cause
`checkTableStatus()` API only returns `{ isOccupied, orderId }` — it does NOT return `fOrderStatus`. The LandingPage showed Edit Order button purely based on `isOccupied = true`, without checking if the order was confirmed.

### Fix Applied
**File Modified**: `/app/frontend/src/pages/LandingPage.jsx`

**Change in `handleEditOrderClick()` function:**
```javascript
const handleEditOrderClick = async () => {
  const orderDetails = await getOrderDetails(tableStatusCheck.existingOrderId);

  // NEW: If order is "yet to be confirmed", redirect to OrderSuccess
  if (orderDetails.fOrderStatus === 7) {
    navigate(`/${restaurantId}/order-success`, {
      state: {
        orderData: {
          orderId: tableStatusCheck.existingOrderId,
          totalToPay: orderDetails.billSummary?.grandTotal || 0,
          billSummary: orderDetails.billSummary,
        }
      }
    });
    return;  // Don't enter edit mode
  }

  // Only enter edit mode for confirmed orders (fOrderStatus 1, 2, 5)
  startEditOrder(...);
};
```

### Flow After Fix
| fOrderStatus | Meaning | Action on Edit Order Click |
|--------------|---------|---------------------------|
| `7` | Yet to be confirmed | → Redirect to OrderSuccess |
| `1` | Confirmed | → Enter edit mode ✅ |
| `2` | Preparing | → Enter edit mode ✅ |
| `5` | Served | → Enter edit mode ✅ |

### Verification
- Frontend compiles with no errors
- User clicking "Edit Order" with fOrderStatus === 7 is redirected to OrderSuccess
- User sees "Yet to be confirmed" message on OrderSuccess page
- Edit mode only accessible for confirmed orders

### Regression Risk
Low — Single check point in `handleEditOrderClick`. Uses existing `getOrderDetails` API which already returns `fOrderStatus`.

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
