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
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Success Page / Table Management |
| **Branch** | 6marchv1 |

### Summary
When POS staff merges or transfers a table's order to another table, the customer on the original table remains stuck on the OrderSuccess page with stale data. No redirect, no notification — the customer has no way to know their table is now free and they should start a new order.

### Steps to Reproduce
1. Customer scans QR code on Table A and places an order
2. Customer lands on OrderSuccess page (order polling every 60s)
3. POS staff merges Table A's order into Table B (or transfers to another table)
4. Table A is now "Available" in POS system
5. **Expected**: Customer on Table A gets redirected to landing page
6. **Actual (before fix)**: Customer stays on OrderSuccess page indefinitely with stale order data

### Root Cause
OrderSuccess page only handled 3 redirect scenarios:
- `fOrderStatus === 3` (Cancelled) → redirect
- `fOrderStatus === 6` (Paid) → redirect
- 404 (Order not found) → redirect

No check existed for table availability. When staff merges/transfers, the order's `fOrderStatus` doesn't change to 3 or 6 — it's still active but on a different table. The original table becomes "Available" but the app never checks this.

### Fix Applied

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

**Change 2 — Destructure tableId from hook (Line 116)**

Before:
```javascript
const { tableNo: scannedTableNo, roomOrTable: scannedRoomOrTable, isScanned, clearScannedTable } = useScannedTable();
```

After:
```javascript
const { tableId: scannedTableId, tableNo: scannedTableNo, roomOrTable: scannedRoomOrTable, isScanned, clearScannedTable } = useScannedTable();
```

**Change 3 — Table status check logic (Lines 218-237)**

Added after the existing cancel/paid redirect block (line 216), inside `fetchOrderStatus()`:

```javascript
// Check if table has been merged/transferred (table now free = order moved away)
if (isScanned && scannedTableId) {
  try {
    const tableCheckResult = await checkTableStatus(
      orderDetails.tableId || scannedTableId,
      numericRestaurantId,
      getStoredToken()
    );
    if (tableCheckResult.isAvailable || tableCheckResult.isInvalid) {
      clearCart();
      clearEditMode();
      clearScannedTable();
      toast('Your table has been reassigned. Please place a new order.', { icon: '🔄', duration: 4000 });
      navigate(`/${restaurantId}`, { replace: true });
      return;
    }
  } catch (tableCheckErr) {
    console.error('Table status check failed:', tableCheckErr);
  }
}
```

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
- Only triggers for scanned-table orders (`isScanned && scannedTableId`)
- Skipped for takeaway/delivery orders (no table)
- Cancel/Paid redirects (existing) take priority — table check only runs for active orders

### Regression Risk
Low — Change is additive (new check after existing logic). Existing cancel/paid/404 redirects untouched. On API failure, falls through silently to existing behavior.

### Notes
- The `check-table-status` function was already built in `orderService.js` (used by LandingPage.jsx). No changes needed to the API layer.
- `getStoredToken` was already exported from `authToken.js`. No changes needed to the auth layer.
- `tableId` was already exposed by `useScannedTable` hook. Only needed to destructure it in OrderSuccess.

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

### Summary

### Steps to Reproduce

### Root Cause

### Fix Applied
**Files Modified**:

### Verification

### Regression Risk

### Notes

-->
