# BUG INVESTIGATION (FOLLOW-UP) — Why a Room QR *Sometimes* Posts as Walk-in

**Date:** 2026-05-08
**Scope:** Investigation only — extension of the prior CR. **NO CODE CHANGED.**
**Companion CR:** `/app/memory/change_requests/ROOM_SCANNER_ORDER_AS_WALKIN_INVESTIGATION_2026-05-08.md`
**Owner statement (verbatim):** *"`table_id` is enough — POS already takes care of room mapping. But sometimes orders from the same scanner go as walk-in. Not sure why."*

---

## 1. Conclusion (one line)

> The customer app sends **`table_id='0'`** to POS when the room context — which lives in *sessionStorage* and React state — has been wiped between scan and place-order. POS can't look up table 0 in its table-config, so it falls back to **walk-in / WC**.

This happens *intermittently* because the wipe is event-driven (success/cancel/payment, tab close, network blip), not deterministic.

---

## 2. The single line of code that produces `table_id='0'`

`/app/frontend/src/pages/ReviewOrder.jsx:949-951` (and again at `:1245-1247` for the auth-retry path):

```js
const finalTableId = hasAssignedTable(scannedTableId)
  ? scannedTableId                                                 // ✅ ideal path
  : (isMultiMenu && tableNumber && hasAssignedTable(tableNumber)
       ? tableNumber                                               // fallback A
       : '0');                                                     // fallback B  🔴
```

`hasAssignedTable()` (`/app/frontend/src/utils/orderTypeHelpers.js:42-44`):
```js
return !!scannedTableId && String(scannedTableId) !== '0';
```

**Decision tree at place-order time:**

| `scannedTableId` (sessionStorage) | `tableNumber` (React state) | restaurant is multi-menu? | what's sent |
|---|---|---|---|
| `"3245"` (still present) | anything | anything | ✅ `"3245"` |
| empty / null / `"0"` | `"3245"` (user picked from dropdown) | yes (e.g. 478) | ✅ `"3245"` |
| empty / null / `"0"` | empty | no | 🔴 `"0"` |
| empty / null / `"0"` | empty | yes | 🔴 `"0"` |

`finalTableId` is then passed to `placeOrder({ tableNumber: finalTableId, ... })` (line 1127), which becomes `payload.table_id = String(orderData.tableId || orderData.tableNumber || '')` in `orderService.ts:332`. POS receives `"0"` (or `""`).

> POS cannot find row 0 in `table_config` → no `rtype` to inspect → falls back to walk-in / WC.

---

## 3. Six paths that wipe the room context (causing fallback B)

For a room order to end up with `scannedTableId = empty`, **one** of these has to happen between the moment the customer scanned and the moment they hit Place Order:

### Path 1 — Order paid (status 6) → sessionStorage cleared
`/app/frontend/src/pages/OrderSuccess.jsx:311-323`:
```js
if (orderDetails.fOrderStatus === 3 || orderDetails.fOrderStatus === 6) {
  clearCart();
  clearEditMode();
  clearScannedTable();      // 🔴 wipes sessionStorage['scanned_table_<rid>']
  navigate(`/${restaurantId}`, { replace: true });
}
```
**Status 6 = Paid.** As soon as the cashier marks the order paid (or the customer completes online payment which polls and reads the new status), the success-page poller wipes the scanned-table sessionStorage.

**Reproducer:**
1. Customer scans room r1 QR (`tableId=3245`)
2. Places order #1 → goes to OrderSuccess (still polling status)
3. **Cashier marks paid** OR **status changes to 6 between polls**
4. Poller hits the branch above → sessionStorage cleared
5. Customer wants more drinks → taps "Order More" / back button to menu
6. Page now shows the menu, `useScannedTable()` returns `tableId: null`
7. They tap Place Order
8. `finalTableId = "0"` → POS → **"WC" with name "Gaurav"** ← matches the screenshot

### Path 2 — Order cancelled (status 3) → sessionStorage cleared
Same line (`OrderSuccess.jsx:311`). If POS rejects/cancels an order (status 3), the same wipe runs. Subsequent orders → table_id="0" → WC.

### Path 3 — Order-detail 404 → sessionStorage cleared
`/app/frontend/src/pages/OrderSuccess.jsx:346-352`:
```js
if (error?.response?.status === 404 || error?.response?.data?.errors) {
  clearCart();
  clearEditMode();
  clearScannedTable();      // 🔴
  ...
}
```
Network blip / temporary 404 from POS during status poll → sessionStorage gone. Often invisible to the customer (toast hidden, then they keep using the app).

### Path 4 — Browser tab close / reopen
`sessionStorage` is **per-tab**. The customer-app stores the scan at `sessionStorage["scanned_table_<rid>"]` (`/app/frontend/src/hooks/useScannedTable.js:20, 50`).

**Reproducer:**
1. Customer scans, orders, gets food.
2. Hours later, swipes Safari closed (or the OS evicts the tab on iOS).
3. Re-opens the menu via the home-screen icon / a shared link / a recent tab → **new tab → empty sessionStorage**.
4. They re-order without re-scanning → `scannedTableId = null` → table_id="0" → WC.

### Path 5 — Second tab without QR params
sessionStorage is also **NOT shared across tabs**. If the customer has the room-QR-scanned menu in tab A and opens the menu in tab B via a bookmark / shared link / autocomplete (no `?tableId=…` in URL), tab B has no scan context. Place order from tab B → table_id="0" → WC.

### Path 6 — Restaurant 716 forced reset between orders (timing-sensitive)
`/app/frontend/src/pages/ReviewOrder.jsx:1180-1184`:
```js
// Restaurant 716: every new order must require a fresh room selection.
if (String(restaurantId) === '716') {
  setTableNumber('');
  setRoomOrTable('room');
}
```
Plus the same reset on Razorpay payment success (`:903-907`) and the catch-block retry path (`:1352-1353`).

This forces `tableNumber=''` after every successful order. The auto-fill `useEffect` (lines 532-540) is supposed to re-hydrate it on the next render from `scannedTableId`, BUT:
- If sessionStorage was also cleared by Path 1/2/3 above, hydration has nothing to re-fill from → `tableNumber` stays empty → `finalTableId='0'` on the next place-order.
- If hydration *does* fire but the user clicks Place Order in the small window before the next render, `finalTableId` is computed from stale state (only matters in edge cases).

This is why **restaurant 716 (Hyatt Centric, the room-only hotel) is the most exposed** to the WC bug — every new order is one frame away from `tableNumber=''`.

---

## 4. Why this looks "intermittent" to the user

| Factor | Why it appears random |
|---|---|
| Status 6 timing | Depends on when the cashier taps "Paid" (or when online payment completes) — outside the customer's control |
| Status 3 timing | Cancellation reason (POS-side, accidental edit, etc.) |
| 404 timing | Network flake during the 60-second status poll |
| Tab close / reopen | Customer behaviour; iOS-Safari memory eviction |
| Multi-tab | Customer behaviour; sharing menu links in groups |
| Restaurant 716 reset | Frame-timing edge case |

In contrast, **the very first order on a freshly-scanned QR always works** — that's why the bug looks intermittent rather than constant.

---

## 5. Why "POS handles it via `table_id` lookup" doesn't save us

The POS look-up (`table_id` → `rtype='RM'` → "Room") only works if `table_id` ≠ `'0'`. Once we send `table_id='0'`, the POS has nothing to look up — there is no row with id 0. The classifier defaults to walk-in.

So the contract `table_id` IS sufficient — but only when the customer-app actually sends a real id. Right now, the app sends `'0'` in any of the six scenarios above.

---

## 6. Targeted fix options (NOT applied — for owner approval)

All options are CSS-of-business-logic terms — i.e., they don't touch payload math, taxes, KOT, payments, or sockets. They only change *when* and *what* identifier is sent for `table_id`.

### Option G1 — Don't clear `scannedTable` on payment / cancellation / 404 (recommended, least invasive)
Remove `clearScannedTable()` from the three call-sites in `OrderSuccess.jsx` (lines 314, 349). Keep `clearCart()` and `clearEditMode()` — those are correct. The room context is a property of the **physical room scanner**, not the **order**, and shouldn't be wiped when an order's status changes.

- Files touched: 1 (`OrderSuccess.jsx`)
- Lines changed: ~2
- Side effect: a customer who finishes paying for order #1 in room r1 can immediately place order #2 from the same scanned context (today they can't — they'd be classified as walk-in).
- Edge case to discuss: what if a customer leaves the room and reuses the app? The room context persists for that browser-tab session anyway (sessionStorage). And `'food_for'`-driven menu still loads correctly. So this is mostly a safer default.

### Option G2 — Promote scanned-table store from sessionStorage to localStorage (defense-in-depth)
Change the storage backend from `sessionStorage` to `localStorage` so it survives Path 4 (tab close/reopen) and Path 5 (multi-tab).

- Files touched: 1 (`useScannedTable.js`) — change two `sessionStorage.*` calls to `localStorage.*`
- Side effect: the room context persists until the customer leaves the restaurant or the browser is fully cleared. For most hotels this is the *desired* UX (customers reorder for hours from the same room).
- Risk: cross-restaurant tab reuse — already handled by the `scanned_table_<restaurantId>` key shape and `CartContext`'s prev-restaurant check.

### Option G3 — Block place-order if `roomOrTable='room'` but `finalTableId='0'`
Defensive guard at `ReviewOrder.jsx:949-959`. If we know it's a room scan (because `roomOrTable === 'room'` is in sessionStorage) but we're about to send `'0'`, abort and show a clear toast: *"Please rescan your room QR code"*.

- Files touched: 1 (`ReviewOrder.jsx`)
- Side effect: customer sees a friendly error instead of a silently misclassified order. Forces them to rescan.

### Option G4 — Send `room_or_table` flag in payload (carries forward from prior CR's Option F2)
Already covered. Defense-in-depth so even if `table_id` becomes "0", the POS dashboard knows it's a room order. **Requires POS contract change.**

### Option G5 — Diagnostic logging on every place-order
Log the snapshot of `{ scannedTableId, tableNumber, roomOrTable, finalTableId, restaurantId, isMultiMenu }` at the moment of place-order, so the next "WC" report can be triaged from the logs in seconds.

- Files touched: 1 (`ReviewOrder.jsx`) — add one log line
- Risk: zero (already has similar `logger.order` lines on the same path)

### Recommended bundle for the intermittent symptom
> **G1 + G2 + G3 + G5.** Each tackles a different wipe path. None are mutually exclusive. None require a POS contract change. G4 still on the menu separately as a long-term hardening.

---

## 7. Validation checklist (for future implementation)

### Reproduce the bug as a regression test before fixing
- [ ] Scan room QR, place order #1, mark paid in POS, return to menu, place order #2 → confirm order #2 is "WC" (Path 1)
- [ ] Scan room QR, place order #1, force a 404 in dev tools on `/get-order-details/...`, place order #2 → "WC" (Path 3)
- [ ] Scan room QR, close the tab, re-open menu URL without params, place an order → "WC" (Path 4)
- [ ] Scan room QR in tab A, open menu URL in tab B, place an order from tab B → "WC" (Path 5)
- [ ] Restaurant 716, scan + order + immediately try to place a second order before re-picking a room → "WC" (Path 6)

### After fix (Option G1+G2+G3+G5)
- [ ] All 5 reproducers above now produce **room** orders, not WC
- [ ] Genuine walk-in QRs (`type=walkin`) still produce WC
- [ ] Genuine table QRs still produce table dine-in
- [ ] Cancellation (status 3) → cart cleared but room context preserved (so re-ordering from same room works)
- [ ] Order-not-found (404) → cart cleared but room context preserved
- [ ] Restaurant 716: order #2 immediately after order #1 → "Room X", not WC, **without** the customer manually re-picking
- [ ] **Diagnostic log** present in every place-order entry — verifiable via `logger.order` channel

### Regression — must remain unchanged
- [ ] Cart, totals, tax, service charge, delivery charge, GST math unchanged
- [ ] Payment / Razorpay flow unchanged
- [ ] KOT / bill / print payloads unchanged
- [ ] Sockets / Firebase / buzzer unchanged
- [ ] Edit-order flow unchanged

---

## 8. Approval gate

> 🛑 **Investigation only. No code changed. No config changed. Awaiting owner approval.**

Please confirm:

1. ✅ Approve / ❌ No / 🔄 Clarify the intermittent root-cause analysis above?
2. **Please share the order-id and restaurant-id of the "Gaurav / WC" order** so we can read back its order-details API response and confirm whether the stored `table_id` is `0` (which would prove Path 1/2/3/4/5/6) — vs a non-zero id with a render-side issue (which would shift ownership to POS dashboard).
3. **Authorize which fix options to plan around** (independent toggles):
   - [ ] G1 — Remove `clearScannedTable()` from OrderSuccess on status 3/6/404 (recommended)
   - [ ] G2 — Move scanned-table store from sessionStorage → localStorage (recommended)
   - [ ] G3 — Block place-order with toast when room context is missing (recommended)
   - [ ] G4 — Add `room_or_table` flag to payload (POS contract change required)
   - [ ] G5 — Add diagnostic log at place-order (zero risk)
4. **For Option G2 — eviction policy:** clear room context on (a) restaurant change *(already exists)*, (b) explicit "Change Room" button, (c) X-hour TTL? Suggest (a)+(b) only.
5. **Permission to run the testing agent** for the 5 reproducer scenarios above once a fix is chosen?

Once you reply, I'll either continue investigation against the captured artifacts or implement the authorized option(s) with a focused diff and the validation checklist above. No code will be touched until approval.
