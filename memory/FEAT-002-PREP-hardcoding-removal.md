# FEAT-002-PREP: Hardcoding Removal & Pre-Scale Fixes

**Purpose:** Remove all dine-in hardcoding and fix conditions BEFORE building Takeaway & Delivery.
**Status:** ✅ Complete — All 10 HIGH+MEDIUM fixes implemented and tested.
**Date:** April 11, 2026

---

## Audit Results: 17 Issues Across 8 Files

---

## FILE 1: `useScannedTable.js` — 1 Issue

### ISSUE-01: Default orderType hardcoded to `dinein`

**Line 36-38:**
```javascript
const orderType = (urlOrderType === 'dinein' || urlOrderType === 'delivery' || urlOrderType === 'takeaway' || urlOrderType === 'take_away')
  ? urlOrderType
  : 'dinein';  // ← HARDCODED
```

**Risk:** LOW — backward compatible. Old QR codes without `orderType` param should default to `dinein`. This is acceptable.

**Action:** KEEP as-is. Add a comment documenting WHY this default exists. No functional change needed.

---

## FILE 2: `LandingPage.jsx` — 3 Issues

### ISSUE-02: `orderType` not destructured from `useScannedTable()`

**Line 32:**
```javascript
const { tableNo: scannedTableNo, tableId: scannedTableId, roomOrTable: scannedRoomOrTable, isScanned } = useScannedTable();
// ← orderType is MISSING
```

**Risk:** HIGH — LandingPage is completely order-type-blind. It cannot branch behavior for takeaway/delivery. The table status check runs purely based on `isScanned && scannedTableId`, which accidentally works for takeaway (no tableId in URL) but is fragile.

**Action:** Add `orderType: scannedOrderType` to destructuring. Required for all subsequent fixes.

### ISSUE-03: Table status check has no orderType guard

**Line 79-83:**
```javascript
const checkTable = async () => {
  if (!isScanned || !scannedTableId || !restaurantId) return;
  if (isMultipleMenu(restaurant)) return;
  if (tableStatusCheck.isChecked) return;
  // ← No orderType check
```

**Risk:** MEDIUM — Currently works by accident (takeaway URLs won't have `scannedTableId`). But if someone manually adds `tableId` to a takeaway URL, it would trigger table status check and potentially auto-redirect to OrderSuccess for someone else's dine-in order.

**Action:** Add explicit guard:
```javascript
if (scannedOrderType && scannedOrderType !== 'dinein' && scannedOrderType !== 'room') return;
```

### ISSUE-04: Call Waiter / Pay Bill shown regardless of orderType

**Line 372-373:**
```javascript
const showCallWaiter = configShowLandingCallWaiter;
const showPayBill = configShowLandingPayBill;
```

**Risk:** LOW for now (config defaults these to false). But when takeaway/delivery goes live, these must be hidden.

**Action:** Add orderType condition:
```javascript
const isDineInOrRoom = !scannedOrderType || scannedOrderType === 'dinein' || scannedOrderType === 'room';
const showCallWaiter = configShowLandingCallWaiter && isDineInOrRoom;
const showPayBill = configShowLandingPayBill && isDineInOrRoom;
```

---

## FILE 3: `ReviewOrder.jsx` — 6 Issues (Most Critical)

### ISSUE-05: Table auto-fill only for `dinein`

**Line 484:**
```javascript
if (isScanned && scannedTableId && scannedOrderType === 'dinein') {
  setTableNumber(scannedTableId);
  setRoomOrTable(scannedRoomOrTable || 'table');
}
```

**Risk:** MEDIUM — Room service also uses scanned tables. If a room QR has `orderType=dinein` + `type=room`, this works. But if room QR ever gets `orderType=room`, this would NOT auto-fill.

**Action:** Change condition to include both dine-in and room:
```javascript
const needsTableAutoFill = scannedOrderType === 'dinein' || scannedOrderType === 'room' || (!scannedOrderType && scannedTableId);
if (isScanned && scannedTableId && needsTableAutoFill) {
```

### ISSUE-06: Multi-menu table validation ignores orderType

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

**Risk:** HIGH — This is the #1 hardcoding problem. A multi-menu restaurant doing takeaway/delivery will ALWAYS be blocked by "Please Select Your Room or Table". The `isMultiMenu` check should not enforce table selection for takeaway/delivery.

**Action:** Wrap in orderType guard:
```javascript
const isDineInOrRoom = !scannedOrderType || scannedOrderType === 'dinein' || scannedOrderType === 'room';
if (isMultiMenu && isDineInOrRoom) {
  // existing table validation
}
```

### ISSUE-07: `finalTableId` computation assumes dine-in

**Line 816-818:**
```javascript
const finalTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
  ? scannedTableId
  : (isMultiMenu && tableNumber ? tableNumber : '');
```

**Risk:** MEDIUM — For takeaway/delivery, `finalTableId` correctly becomes `''`. But the fallback `isMultiMenu && tableNumber` could accidentally pick up a stale table number if the user switches from dine-in to takeaway mid-session.

**Action:** Make explicit:
```javascript
const isDineInOrRoom = scannedOrderType === 'dinein' || scannedOrderType === 'room' || !scannedOrderType;
const finalTableId = isDineInOrRoom
  ? ((isScanned && scannedTableId) ? scannedTableId : (isMultiMenu && tableNumber ? tableNumber : ''))
  : '';  // No table for takeaway/delivery
```

### ISSUE-08: Table status check before placing new order

**Line 917-920:**
```javascript
if (!skipTableCheckFor716 && finalTableId && String(finalTableId) !== '0') {
  const tableStatus = await checkTableStatus(finalTableId, restaurantId, token);
```

**Risk:** LOW — Already guarded by `finalTableId` being non-empty. If ISSUE-07 is fixed, this naturally skips for takeaway/delivery. No direct change needed.

**Action:** No change required — depends on ISSUE-07 fix.

### ISSUE-09: `orderType` fallback to `dinein` in multiple API calls

**Line 865, 891, 1056:**
```javascript
orderType: scannedOrderType || 'dinein',
```

**Risk:** MEDIUM — If `scannedOrderType` is null (e.g., user navigated directly without QR), it defaults to `dinein`. This is acceptable for backward compatibility but should be explicit.

**Action:** KEEP as-is — the `|| 'dinein'` fallback is correct for backward compatibility. The order type comes from the QR URL; if there's no QR, it's a dine-in walkup.

### ISSUE-10: Payment method per orderType defaults to `dinein`

**Line 442-446:**
```javascript
const orderType = scannedOrderType || 'dinein';
if (orderType === 'dinein') return onlinePaymentDinein;
if (orderType === 'takeaway') return onlinePaymentTakeaway;
if (orderType === 'delivery') return onlinePaymentDelivery;
return onlinePaymentDinein; // ← default fallback
```

**Risk:** LOW — Logic is already correct for all 3 types. The fallback is fine.

**Action:** No change needed. Already handles takeaway/delivery correctly.

---

## FILE 4: `TableRoomSelector.jsx` — 2 Issues

### ISSUE-11: Scanned table display only for `dinein`

**Line 81:**
```javascript
{showTableInfo && !isMultiMenu && isScanned && scannedOrderType === 'dinein' && (
```

**Risk:** MEDIUM — Room service with `type=room` but `orderType=dinein` works today. But if room ever gets its own orderType, this breaks. Also, this should be the reverse — show for dine-in AND room, hide for takeaway/delivery.

**Action:** Change to:
```javascript
const isDineInOrRoom = scannedOrderType === 'dinein' || scannedOrderType === 'room' || !scannedOrderType;
{showTableInfo && !isMultiMenu && isScanned && isDineInOrRoom && (
```

### ISSUE-12: Multi-menu table selection shown unconditionally

**Line 101:**
```javascript
{isMultiMenu && (
```

**Risk:** HIGH — For takeaway/delivery at a multi-menu restaurant, this will render the Room/Table selector even though it's not needed.

**Action:** Add orderType guard:
```javascript
const isDineInOrRoom = !scannedOrderType || scannedOrderType === 'dinein' || scannedOrderType === 'room';
{isMultiMenu && isDineInOrRoom && (
```

This requires passing `scannedOrderType` as a prop (currently not passed).

---

## FILE 5: `helpers.js` — 1 Issue

### ISSUE-13: `buildMultiMenuPayload` hardcodes `order_type: 'dinein'`

**Line 361:**
```javascript
order_type: 'dinein',
```

**Risk:** HIGH — Multi-menu restaurants will ALWAYS send `dinein` to POS API, even for takeaway/delivery orders. POS will treat it as dine-in.

**Action:** Use orderData:
```javascript
order_type: orderData.orderType || 'dinein',
```

---

## FILE 6: `orderService.ts` — 1 Issue

### ISSUE-14: `updateCustomerOrder` defaults orderType to `dinein`

**Line 370:**
```javascript
orderType = 'dinein',
```

**Risk:** LOW — This is a default parameter value. Callers already pass `orderType: scannedOrderType || 'dinein'`. The default is a safety net.

**Action:** KEEP as-is. The default is correct for backward compatibility.

---

## FILE 7: `OrderSuccess.jsx` — 2 Issues

### ISSUE-15: `orderType` not destructured from `useScannedTable()`

**Line 123:**
```javascript
const { tableNo: scannedTableNo, tableId: scannedTableId, roomOrTable: scannedRoomOrTable, isScanned, clearScannedTable } = useScannedTable();
// ← orderType MISSING
```

**Risk:** HIGH — OrderSuccess has table-specific logic (table status poll, edit order button, table number display) that should NOT run for takeaway/delivery.

**Action:** Add `orderType: scannedOrderType` to destructuring.

### ISSUE-16: Edit Order / Browse Menu logic assumes table = dine-in

**Line 478-481:**
```javascript
const hasTable = isScanned && scannedTableNo;
const showYetToBeConfirmed = hasTable && fOrderStatus === 7;
const showEditOrder = hasTable && fOrderStatus !== 7 && fOrderStatus !== null;
const showBrowseMenu = !hasTable;
```

**Risk:** HIGH — For takeaway/delivery orders, `hasTable` is false, so it shows "Browse Menu" instead of a takeaway/delivery-appropriate action. Also, the table status polling (line 220-228) would run if someone had a stale `scannedTableId` in session.

**Action:** Add orderType awareness:
```javascript
const isDineInOrRoom = !scannedOrderType || scannedOrderType === 'dinein' || scannedOrderType === 'room';
const hasTable = isDineInOrRoom && isScanned && scannedTableNo;
```

Also guard the table status poll (line 222):
```javascript
if (tableIdForCheck && String(tableIdForCheck) !== '0' && isDineInOrRoom) {
```

---

## FILE 8: `CartContext.js` — 1 Issue

### ISSUE-17: No orderType awareness in cart

**Risk:** LOW for now. CartContext stores cart items but has no concept of order type. When delivery is implemented, it will need to store `deliveryAddress`, `deliveryCharge`, and `orderType`.

**Action:** No change needed now. Flag for FEAT-002 Phase 2 (Delivery).

---

## Execution Plan (Ordered by Risk)

### Step 1: Introduce `isDineInOrRoom` helper constant
Create a single source of truth for the condition check. Either:
- A utility function: `const isDineInOrRoom = (orderType) => !orderType || orderType === 'dinein' || orderType === 'room';`
- Or inline in each file

**Recommendation:** Utility function in `utils/orderTypeHelpers.js` since it's used in 5+ files.

### Step 2: Fix HIGH-risk issues first

| Order | Issue | File | Risk | Change |
|-------|-------|------|------|--------|
| 2a | ISSUE-06 | ReviewOrder.jsx | HIGH | Guard multi-menu table validation with orderType |
| 2b | ISSUE-13 | helpers.js | HIGH | Pass orderType through buildMultiMenuPayload |
| 2c | ISSUE-12 | TableRoomSelector.jsx | HIGH | Guard multi-menu selector render with orderType |
| 2d | ISSUE-02 | LandingPage.jsx | HIGH | Destructure orderType from useScannedTable |
| 2e | ISSUE-15 | OrderSuccess.jsx | HIGH | Destructure orderType from useScannedTable |
| 2f | ISSUE-16 | OrderSuccess.jsx | HIGH | Guard hasTable / edit order with orderType |

### Step 3: Fix MEDIUM-risk issues

| Order | Issue | File | Risk | Change |
|-------|-------|------|------|--------|
| 3a | ISSUE-03 | LandingPage.jsx | MEDIUM | Guard table status check with orderType |
| 3b | ISSUE-05 | ReviewOrder.jsx | MEDIUM | Include room in table auto-fill condition |
| 3c | ISSUE-07 | ReviewOrder.jsx | MEDIUM | Clear finalTableId for takeaway/delivery |
| 3d | ISSUE-11 | TableRoomSelector.jsx | MEDIUM | Include room in scanned table display |

### Step 4: Fix LOW-risk / cosmetic issues

| Order | Issue | File | Risk | Change |
|-------|-------|------|------|--------|
| 4a | ISSUE-04 | LandingPage.jsx | LOW | Hide Call Waiter/Pay Bill for non-dine-in |
| 4b | ISSUE-01 | useScannedTable.js | LOW | Add comment documenting default |

### Step 5: Verify existing dine-in + room flows still work
Test the following MANUALLY or with test agent:
1. Dine-in QR scan → table status check → edit order / browse menu → place order
2. Room QR scan → room service flow → place order
3. Multi-menu restaurant → station selection → table selection → place order
4. Direct URL access (no QR) → default dine-in behavior
5. Edit order flow → order update
6. Razorpay payment flow (if applicable)
7. OrderSuccess → table status poll → edit order / browse menu

---

## Changes NOT Made (Deferred to FEAT-002)

| Item | Reason |
|------|--------|
| Takeaway mode selector component | New feature, not hardcoding fix |
| Delivery address UI | New feature |
| Delivery charge dynamic calculation | New feature |
| CartContext orderType storage | Needed only for delivery |
| New API endpoint integration | New feature |
| Mandatory name/phone for takeaway | New business logic |
| Landing page branching for takeaway/delivery | New feature |

---

## Summary

**Total issues found:** 17
**HIGH risk (must fix before scale):** 6
**MEDIUM risk (should fix):** 4
**LOW risk (can defer):** 7

**Estimated effort:** 2-3 hours for all fixes + 1-2 hours for regression testing

**Key principle:** Every change should be backward-compatible. Existing dine-in and room QR codes must continue to work exactly as they do today.
