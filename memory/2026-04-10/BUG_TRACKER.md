# Bug Tracker - MyGenie Customer App

## Last Updated: March 31, 2026 (Session 9 - Razorpay payment_type Fix)

---

## 📊 Bug Summary Dashboard

| Bug ID | Title | Priority | Status | Date Found | Date Fixed | Comments |
|--------|-------|----------|--------|------------|------------|----------|
| BUG-035 | f_order_status not set for Razorpay | 🔴 P0 | ⚠️ Partial | Mar 31 | Apr 10 | payment_type fixed, f_order_status TBD |
| BUG-034 | Incorrect payment_type for Razorpay | 🔴 P0 | ✅ Fixed | Mar 31 | Mar 31 | Session 9 |
| BUG-033 | POS token architecture redesign | 🔴 P0 | ✅ Fixed | Mar 26 | Mar 26 | localStorage now |
| BUG-032 | TypeScript compilation error | 🔴 P0 | ✅ Fixed | Mar 26 | Mar 26 | Property 'data' |
| BUG-031 | POS token not refreshed on login | 🔴 P0 | ✅ Fixed | Mar 26 | Mar 26 | QR page fix |
| BUG-030 | Restaurant 716 table check skip | 🟡 P1 | ✅ Fixed | Mar 25 | Mar 25 | Hyatt Goa |
| BUG-029 | QR Code URL empty | 🟡 P1 | ✅ Fixed | Mar 25 | Apr 10 | Uses API qr_code_urls now |

### Stats

| Metric | Count |
|--------|-------|
| **Total Bugs** | 13 |
| **Open (P0)** | 0 |
| **Open (P1)** | 0 |
| **Fixed** | 7 |
| **Partial** | 1 |
| **Parked** | 0 |

**Legend:** 🔴 P0 Critical | 🟡 P1 High | 🟢 P2 Medium | ✅ Fixed | ⚠️ Partial | ⏳ Pending | ⏸️ Parked

---

## Quick Summary - Session 9 (BUG-034, BUG-035)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-034 | 🔴 P0 | Incorrect payment_type for Razorpay orders | ✅ Fixed |
| BUG-035 | 🔴 P0 | f_order_status not set to 8 for Razorpay | 🟡 Pending |

---

## BUG-034: Incorrect payment_type for Razorpay Orders

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-034 |
| **Date Reported** | 2026-03-31 |
| **Date Fixed** | 2026-03-31 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **File** | `/app/frontend/src/pages/ReviewOrder.jsx` |

**Problem:**
- All orders (including Razorpay) were being created with `payment_type: 'postpaid'`
- POS expects `payment_type: 'prepaid'` for Razorpay transactions
- Caused incorrect order status mapping in POS backend

**Root Cause:**
- `placeOrder()` call in `ReviewOrder.jsx` did NOT pass `paymentType` parameter
- `orderService.ts` defaulted to `'postpaid'` when `paymentType` not provided

**Fix Applied:**
```jsx
// Added before placeOrder call:
const isRazorpayEnabled = !!restaurant?.razorpay?.razorpay_key;

// Added to placeOrder payload:
paymentType: isRazorpayEnabled ? 'prepaid' : 'postpaid'
```

**Files Changed:**
- `/app/frontend/src/pages/ReviewOrder.jsx` (Line 926 + Line 1136)

---

## BUG-035: f_order_status Not Set for Razorpay Orders

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-035 |
| **Date Reported** | 2026-03-31 |
| **Date Fixed** | 2026-04-10 (partial) |
| **Severity** | P0 - Critical |
| **Status** | ⚠️ Partial Fix |

**Problem:**
- `f_order_status` should be `8` for Razorpay orders (payment pending)
- Currently defaults to `7` (YET_TO_CONFIRM) for all orders
- POS needs to distinguish between COD and Razorpay orders

**What's Fixed (Apr 10, 2026):**
- ✅ `payment_type: 'prepaid'` is now sent for Razorpay orders
- ✅ Verified via console logs - payload correctly shows `payment_type: 'prepaid'`
- ✅ Razorpay flow working end-to-end

**Pending Clarification:**
- ⚠️ `f_order_status` field - Does POS backend auto-set to `8` when `payment_type: 'prepaid'`?
- ⚠️ Or does frontend need to explicitly send `f_order_status: 8`?
- **Action:** Team to verify order 730776 in POS admin - check f_order_status value

**Test Evidence (Apr 10):**
```
[BUG-035 TEST] Payment Config: {
  isRazorpayEnabled: true,
  paymentType: 'prepaid',
  restaurantId: '510'
}
[BUG-035 TEST] placeOrder Payload: {
  payment_type: 'prepaid',
  restaurant_id: '510'
}
```

---

## Quick Summary - Session 5 (BUG-031, BUG-032, BUG-033)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-031 | 🔴 P0 | POS token not refreshed on login - QR page fails | ✅ Fixed |
| BUG-032 | 🔴 P0 | TypeScript compilation error - Property 'data' does not exist | ✅ Fixed |
| BUG-033 | 🔴 P0 | POS token architecture - store in localStorage not database | ✅ Fixed |

---

## BUG-033: POS Token Architecture Redesign

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-033 |
| **Date Reported** | 2026-03-26 |
| **Date Fixed** | 2026-03-26 |
| **Severity** | P0 - Critical (Business Blocking) |
| **Status** | ✅ Fixed |

**Problem:**
- POS token (`mygenie_token`) was stored in `db.users` during onboarding
- Token was never refreshed, became stale/expired
- QR page failed with "POS API error" (401 Unauthorized)
- Wrong POS login endpoint was used (`/auth/login` instead of `/auth/vendoremployee/login`)

**Root Cause:**
- Token stored in database instead of localStorage
- Token not cleared on logout
- Wrong POS API endpoint for admin login

**Architecture Change:**

| Aspect | Before (Wrong) | After (Correct) |
|--------|----------------|-----------------|
| POS token storage | `db.users.mygenie_token` | `localStorage['pos_token']` |
| When token obtained | Once during onboarding | Every admin login |
| POS login endpoint | `/api/v1/auth/login` | `/api/v1/auth/vendoremployee/login` |
| Payload format | `{"phone_or_email": ...}` | `{"email": ...}` |
| Cleared on logout | No | Yes |

**Files Changed:**

| File | Change |
|------|--------|
| `server.py` | `LoginResponse` model - added `pos_token` field |
| `server.py` | `refresh_pos_token()` - changed endpoint and payload, removed DB storage |
| `server.py` | `unified_login()` - return `pos_token` to frontend |
| `server.py` | `/api/table-config` - accept `X-POS-Token` header |
| `Login.jsx` | Store `pos_token` in localStorage after login |
| `AuthContext.jsx` | Clear `pos_token` on logout |
| `AdminQRPage.jsx` | Pass `X-POS-Token` header to API |

**New Flow:**
```
Login → Our Backend verifies password + calls POS vendoremployee/login
      → Returns {app_token, pos_token}
      → Frontend stores both in localStorage
      
QR Page → Gets pos_token from localStorage
        → Passes X-POS-Token header to our backend
        → Backend uses it for POS API call
        → QR codes load successfully
        
Logout → Clears auth_token and pos_token from localStorage
```

---

## BUG-032: TypeScript Compilation Error in orderService.ts

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-032 |
| **Date Reported** | 2026-03-26 |
| **Date Fixed** | 2026-03-26 |
| **Severity** | P0 - Critical (App won't compile) |
| **Status** | ✅ Fixed |
| **File** | `/app/frontend/src/api/services/orderService.ts` |
| **Line** | 257 |

**Error Message:**
```
TS2339: Property 'data' does not exist on type 'Object'.
```

**Problem:**
- `buildMultiMenuPayload()` function returns a generic `Object` type
- TypeScript doesn't know the object has a `.data` property
- Accessing `multiMenuPayload.data` causes compilation error
- App fails to start

**Root Cause:**
```typescript
// helpers.js returns Object type (no TypeScript definition)
export const buildMultiMenuPayload = (orderData, gstEnabled) => {
  return {
    data: { ... }  // TypeScript doesn't know this structure
  };
};

// orderService.ts tries to access .data
const multiMenuPayload = buildMultiMenuPayload(orderData, gstEnabled);
formData.append('data', JSON.stringify(multiMenuPayload.data));  // ❌ TS Error
```

**Fix Applied:**
```typescript
// Added type assertion to tell TypeScript the expected shape
const multiMenuPayload = buildMultiMenuPayload(orderData, gstEnabled) as { data: any };
formData.append('data', JSON.stringify(multiMenuPayload.data));  // ✅ Works
```

**Why This Fix:**
- Type assertion `as { data: any }` tells TypeScript "trust me, this object has a data property"
- Proper fix would be to add TypeScript types to `helpers.js` (convert to `.ts`)
- This is a quick fix that unblocks the app; full TS migration is in backlog (P2-5)

**Related:**
- This is part of the mixed JS/TS codebase challenge documented in `ARCHITECTURE.md`
- Full TypeScript migration planned in `ROADMAP.md` as P2-5

---

## BUG-031: POS Token Not Refreshed on Admin Login

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-031 |
| **Date Reported** | 2026-03-26 |
| **Date Fixed** | 2026-03-26 |
| **Severity** | P0 - Critical (Business Blocking) |
| **Status** | ✅ Fixed |
| **Affected Restaurant** | 18march (restaurant_id: 478) |

**Problem:**
- Admin logs in successfully
- Goes to QR Codes page → Shows "POS API error"
- Root cause: `mygenie_token` stored in database was expired
- Token was set once during onboarding and never refreshed

**Fix Applied:**

1. **Backend - `server.py`**
   - Added `refresh_pos_token()` helper function
   - Modified `unified_login()` to call POS API login and refresh token
   - Better error handling in `get_table_config()` for 401 errors

2. **Frontend - `AdminQRPage.jsx`**
   - Better error display for session expired scenarios
   - Shows "Please logout and login again" message

---

## Quick Summary - Session 4 (BUG-030)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-030 | 🔴 P0 | Restaurant 716 unable to place orders on occupied table | ✅ Fixed |

---

## BUG-030: Restaurant 716 Unable to Place Orders on Occupied Table

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-030 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical (Business Blocking) |
| **Status** | ✅ Fixed |
| **File** | `/app/frontend/src/pages/ReviewOrder.jsx` |
| **Line** | ~893 |

**Problem:**
- Restaurant 716 (Hyatt Centric) allows multiple orders per table
- Table status check was blocking ALL new orders on occupied tables
- User saw: "This table already has an active order. Please edit the existing order instead."
- User was stuck - couldn't place order, couldn't edit existing

**Root Cause:**
```javascript
// ReviewOrder.jsx - This check applied to ALL restaurants
if (finalTableId && String(finalTableId) !== '0') {
  const tableStatus = await checkTableStatus(...);
  if (tableStatus.isOccupied) {
    // BLOCKED - even for restaurant 716
  }
}
```

**Fix Applied:**
```javascript
// Skip table check for restaurant 716 (allows multiple orders per table)
const skipTableCheckFor716 = String(restaurantId) === '716';

if (!skipTableCheckFor716 && finalTableId && String(finalTableId) !== '0') {
  // Table check only for non-716 restaurants
}
```

**⚠️ CRITICAL HARDCODING:**
- This is a restaurant-specific exception
- Documented in `CODE_AUDIT.md` Section 11
- Removing this will break Restaurant 716 operations

---

## BUG-029: QR Code URL Empty

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-029 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-04-10 |
| **Severity** | P1 - Important |
| **Status** | ✅ Fixed |
| **File** | `/app/frontend/src/pages/admin/AdminQRPage.jsx` |

**Problem (was):**
```javascript
const baseUrl = subdomain ? `https://${subdomain}/${restaurantId}` : '';
// If subdomain undefined, QR codes have empty URLs
```

**Fix Applied:**
- QR URLs now fetched directly from POS API via `item.qr_code_urls[selectedMenu]`
- No longer building URLs manually with subdomain
- Menu filter extracts available menus from `qr_code_urls` keys

**Current Code (Line 151):**
```javascript
const getQRUrl = (item) => {
  return item.qr_code_urls?.[selectedMenu] || '';
};
```

**Verified:** Apr 10, 2026 - Code review confirms fix is in place

---

## Quick Summary - Session 3 (BUG-023 to BUG-028)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-023 | 🔴 P0 | Item price wrong on OrderSuccess (₹136 instead of ₹88) | ✅ Fixed |
| BUG-024 | 🔴 P0 | `table_id: 'undefined'` SQL error | ✅ Fixed |
| BUG-025 | 🔴 P0 | `air_bnb_id` missing from payload | ✅ Fixed |
| BUG-026 | 🟡 P1 | All items show "Yet to be confirmed" status | ✅ Fixed |
| BUG-027 | 🔴 P0 | LandingPage cache not invalidating for paid orders | ✅ Fixed |
| BUG-028 | 🔴 P0 | Multi-menu orders broken after refactor | ✅ Fixed |

---

## Quick Summary - Session 2 (BUG-015 to BUG-022)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-015 | 🟡 P1 | Variation name not displayed on OrderSuccess | ✅ Fixed |
| BUG-016 | 🟡 P1 | Variation labels not displayed in PreviousOrderItems | ✅ Fixed |
| BUG-017 | 🔴 P0 | Variation names incorrect in Update Order API | ✅ Fixed |
| BUG-018 | 🟡 P1 | QR scan doesn't auto-redirect to OrderSuccess | ✅ Fixed |
| BUG-019 | 🟢 P2 | "View Bill" button missing in edit mode | ✅ Fixed |
| BUG-020 | 🔴 P0 | Item prices rounded to ceiling (wrong decimals) | ✅ Fixed |
| BUG-021 | 🟡 P1 | "View Bill" button not passing orderId | ✅ Fixed |
| BUG-022 | 🔴 P0 | Stale previousOrderItems causing wrong totals | ✅ Fixed |

---

## Quick Summary - Session 1 (BUG-001 to BUG-014)

| Bug ID | Severity | Summary | Status |
|--------|----------|---------|--------|
| BUG-001 | 🟡 P1 | Customer stuck on OrderSuccess after table merge | ✅ Fixed |
| BUG-002 | 🔴 P0 | Place Order button permanently locked | ✅ Fixed |
| BUG-003 | 🟡 P1 | `foodFor` URL param not supported | ✅ Fixed |
| BUG-004 | 🟢 P2 | Egg filter button color mismatch | ✅ Fixed |
| BUG-005 | 🟢 P2 | "Earn rewards" prompt hidden behind button | ✅ Fixed |
| BUG-006 | 🔴 P0 | `updateCustomerOrder` sends hardcoded zero | ✅ Fixed |
| BUG-007 | 🟡 P1 | OrderSuccess grand total reverts after poll | ✅ Fixed |
| BUG-008 | 🟡 P1 | Edit Order shown when yet to be confirmed | ✅ Fixed |
| BUG-009 | 🔴 P0 | Multiple orders created for same table | ✅ Fixed |
| BUG-010 | 🟡 P1 | Edit Order shown on LandingPage incorrectly | ✅ Fixed |
| BUG-011 | 🔴 P0 | Edit mode persists after order paid/cancelled | ✅ Fixed |
| BUG-012 | 🔴 P0 | Variations/Add-ons not displayed, price wrong | ✅ Fixed |
| BUG-013 | 🟡 P1 | GST calculated when disabled at restaurant | ✅ Fixed |
| BUG-014 | 🔴 P0 | Bill Summary showing incorrect totals | ✅ Fixed |

---

## Session 3 Bug Details (Transform & Refactor v1)

### BUG-023: Item price wrong on OrderSuccess

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-023 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **Root Cause** | Module resolution - bundler used old `.js` file instead of new `.ts` |
| **Fix** | Created JS wrapper that re-exports from TypeScript file |

### BUG-024: `table_id: 'undefined'` SQL error

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-024 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **Root Cause** | New TS file used `tableId` but ReviewOrder passes `tableNumber` |
| **Fix** | Accept both: `tableId || tableNumber || ''` |

### BUG-025: `air_bnb_id` missing from payload

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-025 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **Root Cause** | New TS payload missing required field |
| **Fix** | Added `air_bnb_id: ''` to both placeOrder and updateCustomerOrder |

### BUG-026: All items show "Yet to be confirmed" status

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-026 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | ✅ Fixed |
| **Root Cause** | Transformer read `api.foodStatus` (camelCase) but API returns `food_status` (snake_case) |
| **Fix** | Read `(api as any).food_status ?? api.foodStatus` |

### BUG-027: LandingPage cache not invalidating

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-027 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **Root Cause** | `tableStatusCheck.isChecked` never reset on component remount |
| **Fix** | Reset state on mount + clear cart when paid order detected |

### BUG-028: Multi-menu orders broken

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-028 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | ✅ Fixed |
| **Root Cause** | New TS file missing multi-menu functions: `buildMultiMenuPayload`, `transformCartItemsForMultiMenu` |
| **Fix** | Added all multi-menu functions to helpers.js |

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

## BUG-011: Edit mode persists after order is paid/cancelled - allows update on closed order

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-011 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Edit Order / ReviewOrder |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers who enter edit mode and whose order gets paid/cancelled before they update. Could result in duplicate orders or API errors. |

### Summary
When a user enters edit mode and their order gets paid/cancelled via POS before they click "Update Order", the system would still try to call `updateCustomerOrder()` on the closed order. The table status check only ran for new orders, not for updates.

### Root Cause
```javascript
if (isEditMode && editingOrderId) {
  // ❌ NO STATUS CHECK - directly calls update API
  response = await updateCustomerOrder({ orderId: editingOrderId, ... });
} else {
  // ✅ Has table status check
  const tableStatus = await checkTableStatus(...);
  response = await placeOrder({ ... });
}
```

The edit mode branch bypassed all status checks.

### Fix Applied
**Files Modified**:
- `/app/frontend/src/pages/ReviewOrder.jsx`
- `/app/frontend/src/pages/LandingPage.jsx`

**Change 1 — ReviewOrder.jsx (edit mode branch):**
Before calling `updateCustomerOrder()`, verify order is still active:
```javascript
if (isEditMode && editingOrderId) {
  const currentOrderDetails = await getOrderDetails(editingOrderId);
  if (currentOrderDetails.fOrderStatus === 3 || currentOrderDetails.fOrderStatus === 6) {
    // Order is cancelled/paid - clear edit mode, fall through to place new order
    toast('Order has been completed. Placing as new order.');
    clearEditMode();
  } else {
    // Order still active - proceed with update
    response = await updateCustomerOrder({ ... });
  }
}

if (!response) {
  // Place new order (table check runs here)
  ...
}
```

**Change 2 — LandingPage.jsx (handleEditOrderClick):**
Added check for paid/cancelled orders:
```javascript
if (orderDetails.fOrderStatus === 3 || orderDetails.fOrderStatus === 6) {
  toast(orderDetails.fOrderStatus === 3 ? 'This order was cancelled.' : 'This order has been paid.');
  navigate(`/${restaurantId}/menu`);  // Go to menu for new order
  return;
}
```

### Flow After Fix
| Order Status | LandingPage (Edit Click) | ReviewOrder (Update Click) |
|--------------|--------------------------|---------------------------|
| `7` (Yet to confirm) | → Redirect to OrderSuccess | N/A |
| `1, 2, 5` (Active) | → Enter edit mode | → Update order |
| `3` (Cancelled) | → Toast + Go to menu | → Clear edit, place new order |
| `6` (Paid) | → Toast + Go to menu | → Clear edit, place new order |

### Verification
- Frontend compiles with no errors
- Edit mode with paid/cancelled order → gracefully handled
- Falls through to new order flow with table status check

### Regression Risk
Low — Added verification before update. On API error, falls back to attempting update (fail-safe).

---

## BUG-012: Variations/Add-ons not displayed and price incorrect for previously ordered items

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-012 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Edit Order / Previous Items Display |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers editing orders. Variations/add-ons not shown, prices incorrect, totals don't match. |

### Summary
When viewing previously ordered items (on OrderSuccess page or in Edit Mode), variations and add-ons were:
1. Not displayed in the UI
2. Not included in price calculations
3. Causing total mismatch between cart and after-order views

**Example:**
- Cart (new order): Cabo White Rum = ₹150 (base) + ₹100 (variant) = **₹250**
- After order: Cabo White Rum = ₹150 (base only) - **Missing ₹100!**

### Root Cause
Multiple files used `unitPrice` directly without adding variations/add-ons:

1. `CartContext.js` - `getPreviousOrderTotal()`: Used `item.unitPrice` directly
2. `PreviousOrderItems.jsx`: Used `item.unitPrice` for display, no variations UI
3. `ReviewOrder.jsx` - tax calculation: Used base price only for previous items

The API returns `unit_price` as base price only. Variations/add-ons are in separate fields that need to be summed.

### Fix Applied
**Files Modified**:
- `/app/frontend/src/context/CartContext.js`
- `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx`
- `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.css`
- `/app/frontend/src/pages/ReviewOrder.jsx`

**Change 1 — CartContext.js `getPreviousOrderTotal()`:**
```javascript
// Now calculates: basePrice + variationsTotal + addonsTotal
const fullUnitPrice = basePrice + variationsTotal + addonsTotal;
return total + (fullUnitPrice * quantity);
```

**Change 2 — PreviousOrderItems.jsx:**
- Added `calculateFullItemPrice()` helper function
- Added `getVariationLabels()` and `getAddonLabels()` for display
- UI now shows variations and add-ons under each item
- Price calculation includes all components

**Change 3 — ReviewOrder.jsx tax calculation:**
```javascript
// Previous items tax now calculated on full price
const fullItemPrice = basePrice + variationsTotal + addonsTotal;
const totalTaxForItem = ((fullItemPrice * quantity * taxPercent) / 100);
```

### Verification
- Frontend compiles with no errors
- Previous items show variations/add-ons in UI
- Prices include all components
- Totals match between cart and edit mode views

### Regression Risk
Low — Changes are additive. Uses same calculation pattern as cart items.

---

## BUG-013: GST calculated even when disabled at restaurant level (gst_status)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-013 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Tax Calculation / GST |
| **Branch** | 6marchv1 |
| **Customer Impact** | All restaurants with GST disabled. Customers were charged GST even when restaurant had `gst_status = false`. |

### Summary
GST was being calculated based solely on item-level `item.tax` field, without checking the restaurant-level `gst_status` field from `/web/restaurant-info` API. If a restaurant had GST disabled (`gst_status = false`), GST should not be applied regardless of item-level tax settings.

### Root Cause
The tax calculation code in `ReviewOrder.jsx` and `orderService.js` used:
```javascript
const taxPercent = parseFloat(cartItem.item.tax) || 0;
if (taxType === 'GST') totalGst += totalTaxForItem;  // No gst_status check!
```

This always calculated GST if the item had a non-zero `tax` value, ignoring the restaurant's `gst_status` setting.

### Fix Applied
**Files Modified**:
- `/app/frontend/src/pages/ReviewOrder.jsx`
- `/app/frontend/src/api/services/orderService.js`

**Change 1 — ReviewOrder.jsx (tax calculation):**
```javascript
// Added gst_status check
const isGstEnabled = restaurant?.gst_status === true || restaurant?.gst_status === 'Yes';

// Only add GST if enabled at restaurant level
if (taxType === 'GST' && isGstEnabled) {
  totalGst += totalTaxForItem;
} else if (taxType === 'VAT') {
  totalVat += totalTaxForItem;
}
```

**Change 2 — orderService.js (transformCartItemsMultiMenu):**
```javascript
const transformCartItemsMultiMenu = (cartItems, gstEnabled = true) => {
  // Only calculate GST if enabled
  const gstTaxAmount = (taxType === 'GST' && gstEnabled) ? taxAmount : 0;
};
```

**Change 3 — orderService.js (placeOrder):**
```javascript
export const placeOrder = async (orderData) => {
  const { gstEnabled = true } = orderData;
  const payload = buildMultiMenuPayload(orderData, gstEnabled);
};
```

**Change 4 — ReviewOrder.jsx (placeOrder call):**
```javascript
const isGstEnabled = restaurant?.gst_status === true || restaurant?.gst_status === 'Yes';
response = await placeOrder({
  // ... other fields
  gstEnabled: isGstEnabled
});
```

### Tax Calculation Logic After Fix

| `gst_status` | `item.tax` | `item.tax_type` | Result |
|--------------|------------|-----------------|--------|
| `true` | `5` | `GST` | ✅ Calculate 5% GST |
| `true` | `0` | `GST` | No GST (0%) |
| `false` | `5` | `GST` | ❌ **Skip GST** (disabled) |
| `false` | `5` | `VAT` | ✅ Calculate 5% VAT (VAT not affected by gst_status) |

### Verification
- Frontend compiles with no errors
- GST only calculated when `restaurant.gst_status === true`
- VAT calculation unchanged (always calculated if item has VAT)
- gstEnabled passed through placeOrder → buildMultiMenuPayload → transformCartItemsMultiMenu

### Regression Risk
Low — Added check is additive. If `gst_status` is missing/undefined, defaults to `true` (backward compatible).

---

## BUG-014: Bill Summary showing incorrect totals for previously ordered items

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-014 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Details / Bill Summary |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers viewing OrderSuccess page. Local calculation didn't match POS total for orders with multiple batches. |

### Summary
When viewing order details on OrderSuccess page, the Item Total and Subtotal were calculated locally from visible items only. This caused mismatch with POS total when order had items from previous batches (edit order scenario).

**Example:**
- POS Grand Total: ₹3580
- Local calculation: ₹2580 (missing ₹1000 from previous batch)

### Root Cause
The API previously only returned `order_amount` (grand total). Item Total and Subtotal had to be calculated locally, but we only had access to visible items, not all items from previous batches.

### Fix Applied
**New API Fields Added:**
- `order_sub_total_amount` → Item Total
- `order_sub_total_without_tax` → Subtotal
- `order_amount` → Grand Total (existed)

**File Modified:** `/app/frontend/src/api/services/orderService.js`

```javascript
// Use API values if available, fallback to local calculation
const apiItemTotal = parseFloat(firstDetail.order_sub_total_amount) || 0;
const apiSubtotal = parseFloat(firstDetail.order_sub_total_without_tax) || 0;
const orderAmount = parseFloat(firstDetail.order_amount) || 0;

const finalItemTotal = apiItemTotal > 0 ? apiItemTotal : calculatedItemTotal;
const finalSubtotal = apiSubtotal > 0 ? apiSubtotal : calculatedSubtotal;
const finalGrandTotal = orderAmount > 0 ? orderAmount : calculatedGrandTotal;
```

### Verification
- Frontend compiles with no errors
- Bill summary now uses API values directly
- Fallback to local calculation if API returns 0 (backward compatible)

### Regression Risk
Low — Uses API values with fallback. Old orders without new fields will use local calculation.

---

## BUG-015: Variation name not displayed on OrderSuccess page (BUG-012 incomplete fix)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-015 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Author** | Abhi-mygenie |
| **Fixed By** | Abhi-mygenie |
| **Related Feature** | Order Success Page / Item Display |
| **Branch** | 6marchv1 |
| **Customer Impact** | All customers viewing OrderSuccess page. Variation names not displayed even though price was correctly included. |

### Summary
BUG-012 fixed variation/addon display and pricing in `PreviousOrderItems.jsx` and `ReviewOrder.jsx`, but the same fix was not applied to `OrderSuccess.jsx`. The variation label extraction logic in OrderSuccess was using a different (broken) pattern that didn't match the API response structure.

### Root Cause
`OrderSuccess.jsx` used this logic to extract variation labels:
```javascript
if (v.values?.label) {
  return Array.isArray(v.values.label) ? v.values.label.join(', ') : v.values.label;
}
```

This expected `v.values.label` directly, but the API returns `v.values` as an object with a `label` property (e.g., `{ label: "60ml", optionPrice: "40" }`), or as an array of such objects.

The fixed logic in `PreviousOrderItems.jsx` correctly handles both cases:
```javascript
const vals = Array.isArray(v.values) ? v.values : [v.values];
return vals.map(val => val.label || '').filter(Boolean).join(', ');
```

### Fix Applied
**File Modified**: `/app/frontend/src/pages/OrderSuccess.jsx`

**Change 1 — Added helper functions (after isConfigEnabled)**:
```javascript
// Helper: Extract variation labels from API response
const getVariationLabels = (variations) => {
  if (!variations || variations.length === 0) return '';
  return variations.map(v => {
    if (v.values) {
      const vals = Array.isArray(v.values) ? v.values : [v.values];
      return vals.map(val => val.label || '').filter(Boolean).join(', ');
    }
    return v.label || v.name || '';
  }).filter(Boolean).join(', ');
};

// Helper: Extract addon labels from API response
const getAddonLabels = (addons) => {
  if (!addons || addons.length === 0) return '';
  return addons.map(a => `${a.name || 'Addon'} x${a.quantity || 1}`).join(', ');
};
```

**Change 2 — Updated JSX to use helper functions**:
```jsx
{item.variations && item.variations.length > 0 && getVariationLabels(item.variations) && (
  <span className="order-success-item-customization">
    Variants: {getVariationLabels(item.variations)}
  </span>
)}
{item.add_ons && item.add_ons.length > 0 && (
  <span className="order-success-item-customization">
    Addons: {getAddonLabels(item.add_ons)}
  </span>
)}
```

### What was already working
- **Price calculation**: Variations and addons were correctly included in item price (lines 182-199)
- **Addon display**: Addons were showing correctly (same `a.name x${a.quantity}` format)

### What was broken
- **Variation label display**: Labels not extracted correctly from API response structure

### Verification
- Variation names now display correctly (e.g., "Variants: 60ml")
- Addon names continue to display correctly (e.g., "Addons: coconut x1, garlic x1")
- Price calculations unchanged (already correct)

### Regression Risk
None — Logic matches the verified fix in PreviousOrderItems.jsx. Helper functions are pure and isolated.

---

## BUG-016: Variation labels not displayed in PreviousOrderItems (BUG-012 incomplete)

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-016 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Related Bug** | BUG-012, BUG-015 |
| **Customer Impact** | Variation names not showing in ReviewOrder page (PreviousOrderItems component) |

### Summary
BUG-012 attempted to fix variation display but used incorrect logic that didn't match the actual API structure. The code expected `v.values.label` directly, but the API returns `v.values` as an **array** of objects.

### Root Cause Analysis

**Actual API Response (confirmed via live API call):**
```json
"variation": [
  {
    "name": "CHOICE OF SIZE",
    "values": [                    // <-- ARRAY of objects!
      { "label": "30ML", "optionPrice": "0" }
    ]
  }
]
```

**Broken code in PreviousOrderItems.jsx (BUG-012):**
```javascript
if (v.values?.label) {  // ❌ v.values is ARRAY, has no .label property
  return Array.isArray(v.values.label) ? v.values.label.join(', ') : v.values.label;
}
```

**Why it failed:**
- `v.values` = `[{ label: "30ML" }]` (array)
- `v.values?.label` = `undefined` (arrays don't have `.label`)
- Falls through to fallback which returns empty

### Fix Applied
**File Modified**: `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx`

```javascript
const getVariationLabels = (variations) => {
  if (!variations || variations.length === 0) return null;
  
  // API returns: variation: [{ name: "CHOICE OF SIZE", values: [{ label: "30ML", optionPrice: "0" }] }]
  // We need to extract labels from values[] array
  const labels = variations.map(v => {
    if (v.values) {
      // values is an ARRAY of objects with label property
      const vals = Array.isArray(v.values) ? v.values : [v.values];
      return vals.map(val => val.label || '').filter(Boolean).join(', ');
    }
    // Fallback for other formats
    return v.label || v.name || v.option_name || '';
  }).filter(Boolean);
  
  return labels.length > 0 ? labels.join(', ') : null;
};
```

### Files Updated
- `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx` - Fixed getVariationLabels()
- `/app/memory/API_MAPPING.md` - Updated with correct variation structure (confirmed from live API)

### Related Fixes
- **BUG-015**: Fixed same issue in `OrderSuccess.jsx` (already had correct logic)
- **BUG-012**: Original incomplete fix

---

## BUG-018: QR scan doesn't auto-redirect to OrderSuccess for active orders

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-018 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Customer Impact** | Users scanning QR for table with active order see "EDIT ORDER" button instead of being auto-redirected to OrderSuccess |

### Summary
When a user scans a QR code for a table that already has an active order, they should be automatically redirected to the OrderSuccess page. Instead, they were seeing the LandingPage with an "EDIT ORDER" button, requiring a manual click.

### Root Cause
The `checkTable()` useEffect in LandingPage.jsx only checked if the table was occupied and set state accordingly. It did not:
1. Fetch order details to check `fOrderStatus`
2. Auto-navigate to OrderSuccess for active orders

### Fix Applied
**File:** `/app/frontend/src/pages/LandingPage.jsx`

Added auto-redirect logic in the `checkTable()` useEffect:
```javascript
// If table has an active order, auto-redirect to OrderSuccess
if (result.isOccupied && result.orderId) {
  const orderDetails = await getOrderDetails(result.orderId);
  
  // Only redirect if order is active (not cancelled=3, not paid=6)
  if (orderDetails.fOrderStatus !== 3 && orderDetails.fOrderStatus !== 6) {
    navigate(`/${numericRestaurantId}/order-success`, {
      state: { orderData: { orderId: result.orderId, ... } }
    });
    return;
  }
}
```

### New Flow
1. User scans QR → LandingPage loads
2. `checkTableStatus` API called → finds order exists
3. `getOrderDetails` API called → checks `fOrderStatus`
4. If active order → **Auto-redirect to OrderSuccess** ✅
5. If cancelled/paid → Show Browse Menu button

---

## BUG-017: Variation names incorrect in Update Order API payload

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-017 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Customer Impact** | Variation names sent as "CHOICE OF" instead of actual names (e.g., "Choice Of Size") when updating orders |

### Summary
When updating an order, variation group names were always sent as "CHOICE OF" instead of the actual names like "Choice Of Size". This was because the `updateCustomerOrder` function tried to get the name from the selected variation object (`v.variationName || v.name`), but selected variations only contain `{ label, optionPrice }`.

### Root Cause
**Place Order** uses `transformVariations()` which correctly gets names from `cartItem.item.variations` (original menu structure).

**Update Order** had inline logic that looked for `v.variationName || v.name` on the selected variation object - which doesn't have these properties.

### Fix Applied
**File:** `/app/frontend/src/api/services/orderService.js` (lines 1026-1041)

Changed from:
```javascript
const name = v.variationName || v.name || 'CHOICE OF';
```

To:
```javascript
// Find the variation group name from original item variations
let name = 'CHOICE OF'; // fallback
if (cartItem.item?.variations && cartItem.item.variations.length > 0) {
  const matchingGroup = cartItem.item.variations.find(origVar => 
    origVar.values?.some(val => val.label === v.label)
  );
  if (matchingGroup) {
    name = matchingGroup.name || 'CHOICE OF';
  }
}
```

### Verification
Now both Place Order and Update Order use the same logic to extract variation group names from the original menu item structure.

---

## BUG-019: "View Bill" button missing in edit mode banner

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-019 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Customer Impact** | Users editing orders couldn't navigate to OrderSuccess to view bill/pay without adding items |

### Summary
When in edit mode on the menu page, users had no way to go to the OrderSuccess page (to view bill or proceed with payment) without adding new items first. Only "Clear New Items" button was available.

### Fix Applied
**File:** `/app/frontend/src/pages/MenuItems.jsx`

Added "View Bill" button next to "Clear New Items" in the edit mode banner:
```jsx
<div className="edit-mode-banner-buttons">
  <button onClick={() => navigate(`/${restaurantId}/order-success`, {
    state: { orderData: { orderId: editingOrderId } }
  })}>View Bill</button>
  <button onClick={clearCart}>Clear New Items</button>
</div>
```

**File:** `/app/frontend/src/pages/MenuItems.css`
Added styling for the new button.

---

## BUG-020: Item prices rounded to ceiling instead of showing decimals

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-020 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P1 - High |
| **Status** | Fixed |
| **Customer Impact** | Item prices displayed as whole numbers (₹200) instead of actual price (₹199.50), causing confusion and trust issues |

### Summary
Item prices were being displayed with `.toFixed(0)` (rounds to nearest integer) instead of `.toFixed(2)` (2 decimal places). Only the final Grand Total should be ceiling-rounded, not individual item prices.

### Root Cause
Multiple files used `.toFixed(0)` for visual cleanliness:
- `OrderSuccess.jsx` line 537
- `PreviousOrderItems.jsx` line 198
- `CartBar.jsx` line 113
- `CustomizeItemModal.jsx` lines 201, 245, 313

### Fix Applied
Changed all `.toFixed(0)` to `.toFixed(2)` in:
- `/app/frontend/src/pages/OrderSuccess.jsx`
- `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx`
- `/app/frontend/src/components/CartBar/CartBar.jsx`
- `/app/frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx`

### Rounding Rules (Corrected)
| Level | Rounding | Format |
|-------|----------|--------|
| Item Price | ❌ NO rounding | `.toFixed(2)` |
| Variation/Addon Price | ❌ NO rounding | `.toFixed(2)` |
| Item Total | ❌ NO rounding | `.toFixed(2)` |
| Subtotal | ❌ NO rounding | `.toFixed(2)` |
| Tax | ❌ NO rounding | `.toFixed(2)` |
| **Grand Total** | ✅ Ceiling round | `Math.ceil()` |

---

## BUG-021: "View Bill" button not passing orderId to OrderSuccess

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-021 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Customer Impact** | Clicking "View Bill" showed blank OrderSuccess page |

### Summary
The "View Bill" button in the edit mode banner was navigating to OrderSuccess without passing the `orderId` in navigation state. OrderSuccess requires `orderId` to fetch order details.

### Root Cause
Initial implementation:
```javascript
onClick={() => navigate(`/${restaurantId}/order-success`)}  // No state!
```

OrderSuccess expects:
```javascript
const orderId = location.state?.orderData?.orderId;  // undefined!
if (!orderId) return;  // Exits early
```

### Fix Applied
**File:** `/app/frontend/src/pages/MenuItems.jsx`

```javascript
onClick={() => navigate(`/${restaurantId}/order-success`, {
  state: {
    orderData: {
      orderId: editingOrderId
    }
  }
})}
```

---

## BUG-022: Stale previousOrderItems causing wrong totals after order paid on POS

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-022 |
| **Date Reported** | 2026-03-25 |
| **Date Fixed** | 2026-03-25 |
| **Severity** | P0 - Critical |
| **Status** | Fixed |
| **Customer Impact** | After POS clears/pays an order, new orders on same table showed inflated totals (old order amount added) |

### Summary
When an order was paid/cleared on POS, but user returned to web app:
1. Old `previousOrderItems` from CartContext persisted
2. User clicked "Edit Order" → detected as paid → navigated to menu
3. But `clearEditMode()` was NOT called
4. New order included old items in total calculation

**Example:** Old order ₹484 paid on POS. User adds ₹60 item. Shows ₹544 instead of ₹63.

### Root Cause
Two missing checks:

**Issue A:** `handleEditOrder` in OrderSuccess.jsx didn't call `checkTableStatus` first
- Allowed entering edit mode even when table was free

**Issue B:** `handlePlaceOrder` (update path) in ReviewOrder.jsx didn't verify table status
- Updated order without checking if table was still occupied

### Fix Applied

**Fix A - OrderSuccess.jsx (`handleEditOrder`):**
```javascript
// FIRST: Check if table is still occupied
const tableStatus = await checkTableStatus(scannedTableId, restaurantId, token);
if (!tableStatus.isOccupied || !tableStatus.orderId) {
  clearEditMode();
  clearCart();
  navigate(`/${restaurantId}`, { replace: true });  // Fresh order
  return;
}
// Then check order status...
```

**Fix B - ReviewOrder.jsx (`handlePlaceOrder` - update path):**
```javascript
// FIRST: Check table status before updating
const tableStatus = await checkTableStatus(finalTableId, restaurantId, token);
if (!tableStatus.isOccupied || !tableStatus.orderId) {
  clearEditMode();
  clearCart();
  navigate(`/${restaurantId}`, { replace: true });
  return;
}
// Then check order status and update...
```

### New Flow
```
EDIT ORDER (from OrderSuccess):
1. checkTableStatus → If FREE → redirect to landing
2. getOrderDetails → If paid/cancelled → redirect to landing
3. startEditOrder → Navigate to menu

UPDATE ORDER (from ReviewOrder):
1. checkTableStatus → If FREE → redirect to landing
2. getOrderDetails → If paid/cancelled → place as new order
3. updateCustomerOrder
```

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

---

## BUG-034: Hardcoded Razorpay POS API URLs (CRITICAL-006)

**Status:** ✅ FIXED  
**Priority:** CRITICAL  
**Date Reported:** March 31, 2026  
**Date Fixed:** March 31, 2026  
**Found By:** Code Audit V1

### Description
Razorpay payment endpoints were hardcoded with `https://preprod.mygenie.online/api/v1/razor-pay/...` instead of using the centralized ENDPOINTS pattern.

### Root Cause
Razorpay integration was added without following existing codebase patterns for API endpoint management.

### Impact
- Hardcoded preprod URL would fail in production
- Inconsistent with rest of codebase
- Manual changes needed for environment switching

### Files Changed
| File | Change |
|------|--------|
| `/app/frontend/src/api/config/endpoints.js` | Added `RAZORPAY_CREATE_ORDER`, `RAZORPAY_VERIFY_PAYMENT` |
| `/app/frontend/src/pages/ReviewOrder.jsx` | Import ENDPOINTS, use `ENDPOINTS.RAZORPAY_CREATE_ORDER()` |
| `/app/frontend/src/pages/OrderSuccess.jsx` | Import ENDPOINTS, use `ENDPOINTS.RAZORPAY_VERIFY_PAYMENT()` |

### Testing
- Razorpay payment flow should work as before
- URLs now sourced from centralized config
