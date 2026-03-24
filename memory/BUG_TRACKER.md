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
