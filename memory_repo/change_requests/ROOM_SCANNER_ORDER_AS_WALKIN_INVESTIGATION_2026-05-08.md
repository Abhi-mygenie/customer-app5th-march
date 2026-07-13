# BUG INVESTIGATION — Room Scanner Order Appearing as Walk-in / "WC" on Dashboard

**Date:** 2026-05-08
**Owner:** E1 Agent (investigation only — **NO CODE CHANGED**, no fix applied)
**Branch:** `main` @ `b89587d` · `/app/memory/` from branch `6-may`
**Scope:** Investigation only. Implementation gated on owner approval.
**Companion CRs:**
- `/app/memory/change_requests/ITEM_CHANNEL_AVAILABILITY_BUG_INVESTIGATION_2026-05-08.md`
- `/app/memory/change_requests/PRODUCT_API_FIELD_MAPPING_INVESTIGATION_2026-05-08.md`

---

## 1. Bug classification

| Field | Value |
|---|---|
| Type | Functional / contract gap between customer app and POS dashboard |
| Class | Room context detected by the customer app is **dropped before order placement**. POS dashboard receives no room signal in the order payload. |
| Severity | **High for hotels and aparthotels** that rely on room-vs-table distinction in the operations dashboard, KOTs and bills |
| Reproducibility | Deterministic given the current frontend payload contract — every room-QR order will send `order_type='dinein'` (or similar) with no room flag |
| Affects business logic? | The misclassification itself is operational; cart/payments/totals/KOT line items are unaffected |
| Affects desktop & mobile? | Yes — same code path for both |

---

## 2. Affected flow (high-level diagram)

```
  ┌────────────────┐        ┌──────────────────┐       ┌─────────────────┐
  │ POS admin gen  │  →     │ Room-QR URL      │  →    │ Customer scans  │
  │ Room QR (POS)  │        │ ?type=room&...   │       │ → useScannedTable│
  └────────────────┘        └──────────────────┘       └────────┬────────┘
                                                                │
                                  detected: roomOrTable='room', orderType='dinein'
                                                                │
                                                                ▼
                                                       ┌─────────────────┐
                                                       │  ReviewOrder    │
                                                       │  builds payload │
                                                       └────────┬────────┘
                                                                │
                                  payload.order_type = 'dinein' (NOT 'room')
                                  payload.air_bnb_id = '' (hardcoded)
                                  payload.table_id   = <room's table-config id>
                                  payload has NO room_id / no roomOrTable flag
                                                                │
                                                                ▼
                                              ┌──────────────────────────┐
                                              │ POS  POST /place-order   │
                                              │  classifies → … ???      │
                                              └────────────┬─────────────┘
                                                           │
                                   "Walk-in / WC" label appears on dashboard
                                   (POS classifier likely falling back)
```

---

## 3. Current room-scanner detection flow (frontend)

### 3.1 QR URL contract (parser side — `useScannedTable.js:23-45`)
The customer app reads the following from the URL on first scan:

| Param (alt names) | Allowed values | Stored as |
|---|---|---|
| `tableId` / `table_id` | string/number | `table_id` |
| `tableName` / `table_no` | string | `table_no` |
| `type` | `'table'`, `'room'`, `'walkin'` (or **null** → stored as null) | `room_or_table` |
| `orderType` / `order_type` | `'dinein'`, `'delivery'`, `'takeaway'`, `'take_away'` (or anything else → defaulted to `'dinein'`) | `order_type` |
| `foodFor` / `food_for` | menu name | `food_for` |

> **NOTE 1:** `'room'` is NOT in the allow-list for `orderType`. Even if a QR URL had `orderType=room`, `useScannedTable.js:37-39` would silently coerce it to `'dinein'`.
> **NOTE 2:** If the QR URL omits `type` (or sends an unknown value), `room_or_table` is stored as `null` — the room context is lost. The frontend can no longer tell room from table.

### 3.2 QR URL contract (producer side — POS-owned)
The customer app does **not** generate QR URLs. They are returned by the backend proxy at:
- Backend: `GET /api/table-config` → `frontend/src/pages/admin/AdminQRPage.jsx:108`
- Upstream: POS `GET /api/v2/vendoremployee/restaurant-settings/table-config` (proxied in `backend/server.py:812-877`)
- Each table/room object carries `qr_code_urls[<menu>]` — a pre-rendered URL string built by **the POS upstream**, not by us.
- The frontend distinguishes room vs table only by `rtype === 'RM'` vs `rtype === 'TB'` (admin UI only — for label rendering and download filename).

> **Critical unknown:** the exact query string that the POS bakes into a *room* QR URL is owned by the POS team. We cannot see it in this codebase. We need a real sample.

### 3.3 Where the room signal is consumed in the customer app (post-scan)
`roomOrTable === 'room'` is used in 6 places — **all UI-display only**, NEVER in the order payload:

| File / Line | Use |
|---|---|
| `LandingPage.jsx:666-669` | Renders “Room / Table” icon and label |
| `OrderSuccess.jsx:497, 573-576` | Renders “Room / Table” label on the success screen |
| `ReviewOrder.jsx:164-203, 491-547, 812-1353` | UI mode toggle for the table/room picker; restaurant 716 (Hyatt Centric) is forced to room mode |
| `TableRoomSelector.jsx:49-145` | Radio button + dropdown options |
| `orderTypeHelpers.js:23, 72-74` | `isDineInOrRoom()` returns `true` for `'room'` (helper) and `isWalkin(roomOrTable === 'walkin')` |
| `__tests__/pages/OrderSuccess.test.js:43` | Test fixture |

---

## 4. Current room-order placement payload (frontend → POS)

Three payload builders — all with the same root issue.

### 4.1 Normal place-order (`api/services/orderService.ts:271-406`)
Lines `322-379` (root payload). Relevant fields:
```text
table_id      = String(orderData.tableId || orderData.tableNumber || '')
air_bnb_id    = ''                   ← HARDCODED on line 333
order_type    = orderData.orderType || 'dinein'   ← line 343
restaurant_id = String(orderData.restaurantId)
cust_name     = orderData.customerName
cust_phone    = ...
```
**No `room_id`, no `roomOrTable`, no `is_room` flag, no `type` field.**

### 4.2 Edit-order / update (`api/services/orderService.ts:411-533`)
Same shape. Lines `464` (`table_id`), `465` (`air_bnb_id: ''`), `475` (`order_type: orderType`).

### 4.3 Multi-menu place-order (`api/transformers/helpers.js:391-491`)
Same shape. Lines `442` (`order_type: orderData.orderType || 'dinein'`), `460` (`air_bnb_id: ''`), `467` (`table_id`).

### 4.4 What `orderType` actually carries when the user came from a room QR
`scannedOrderType` (read from `useScannedTable()`) = whatever `orderType` query param was on the QR URL.

- For a room QR generated with `orderType=dinein` → `scannedOrderType = 'dinein'` → payload `order_type='dinein'`
- For a room QR generated with `orderType=room` → `useScannedTable.js:37-39` coerces to `'dinein'` → payload `order_type='dinein'`
- For a room QR generated with no `orderType` param → defaults to `'dinein'` → payload `order_type='dinein'`

> **In every case, the room-vs-table-vs-walk-in distinction is invisible in the payload `order_type`.** A room order, a table dine-in order and a walk-in dine-in order are sent with **identical** `order_type='dinein'`. Only `table_id` differs (and the POS itself must look up `rtype` to recover the room label).

### 4.5 `air_bnb_id` is HARDCODED to empty
All three payload builders set `air_bnb_id = ''` literally. There is no code path anywhere in `frontend/src/` that ever sets a non-empty `air_bnb_id`. If POS uses `air_bnb_id` to identify room orders for aparthotels/B&Bs, **the frontend never populates it**.

### 4.6 Restaurant 716 (Hyatt Centric) special path — uses autopaid endpoint
`orderService.ts:283-301` routes id 716 through `PLACE_ORDER_AUTOPAID()` instead of `PLACE_ORDER()`. The payload is `multiMenuPayload`, which still has the same `order_type / table_id / air_bnb_id` shape (also empty `air_bnb_id`). Restaurant 716 is forced to "room" mode in the UI but the payload still sends `order_type='dinein'`.

---

## 5. Current dashboard label / display flow

### 5.1 Where the "WC" label originates — **NOT in this codebase**
There is **zero** reference to `"WC"`, `'WC'`, `walk-in`, `walkin` (as a display label), `Walk-in Customer`, or `Walk Counter` anywhere in `frontend/src/` that would render that string on a dashboard. (`'walkin'` exists only as the *URL param* for walk-in QRs and as an internal `roomOrTable` value — never as a dashboard label.)

The dashboard with "WC" cards is the **POS / CRM dashboard** at `crm.mygenie.online`, which is a **separate codebase** maintained by the MyGenie POS team. We do not have its source in this repo.

### 5.2 What the customer-app side DOES render
The customer-app's "Order Success" / "My Orders" pages do read the order_type from the order-details API and render it for the customer (`OrderSuccess.jsx:497-576`):
- Maps backend `table_type === 'RM'` → display label = `"Room"`
- Maps `table_type === 'TB'` (or default) → display label = `"Table"`
- This is a separate display path from the POS dashboard.

### 5.3 Most likely classifier on POS side (best-evidence inference — needs POS-team confirmation)
Given that the customer payload sends only:
- `order_type` ∈ {`dinein`, `delivery`, `takeaway`, `take_away`} — with `'dinein'` for both room and table dine-in
- `table_id` — same numeric id for both rooms and tables (rooms are stored alongside tables with `rtype='RM'`)
- `air_bnb_id` — always `''`
- `cust_name` / `cust_phone`

The POS dashboard most likely:
- (a) reads `order_type` and labels everything `dinein` as "Dine-in" or "WC" if `table_id == 0` or unmatched
- (b) joins `table_id` against the table-config and reads `rtype` to distinguish room from table for display
- (c) when the join fails (wrong restaurant_id, type mismatch like string-vs-int, stale id, deleted table), falls back to "WC"

Reading the customer-app side, the join in step (b) appears to be POS-side logic since `OrderSuccess.jsx:497` reads back `apiTableType === 'RM'` to render "Room" — meaning the POS DOES return `table_type` on order-detail reads. So the room mapping is *recoverable* on read, but only if the POS dashboard's renderer uses it.

---

## 6. Expected vs actual behavior

| Step | Expected | Actual |
|---|---|---|
| Room QR URL contains room context | `?type=room&tableId=<roomTableId>&...` (or `room_id=...`) | Owner-supplied URL not yet captured. **Evidence needed.** |
| Customer app detects room | `useScannedTable().roomOrTable === 'room'` if `type=room` is in URL | ✅ Works **only when** the QR URL contains `type=room`. If POS QR omits this, frontend treats it as table dine-in or walk-in. |
| Customer app stores room context | Persisted in sessionStorage | ✅ Correctly persisted as `room_or_table: 'room'` |
| Customer app renders room UI | Show "Room X" label and room-mode picker | ✅ Works |
| Order payload carries room signal | At least one of: `order_type='room'`, dedicated `room_id`, `air_bnb_id`, or `room_or_table` flag | 🔴 **NONE of these are sent.** All payloads send `order_type='dinein'` and `air_bnb_id=''`. |
| POS classifies order as room | Dashboard label = "Room X" | 🔴 **Classifier has no reliable signal.** Falls back, often to "WC" / Walk-in Customer label. |

---

## 7. Root cause / most-likely root cause

### Primary root cause (high confidence — verified in code)
> **The customer-app frontend silently drops the room signal between scan-detection and order-placement.** `roomOrTable === 'room'` is captured by `useScannedTable`, used for UI rendering only, and **never propagated** into the place-order or update-order payload. The order payload sends:
> - `order_type = 'dinein'` (same as table dine-in and walk-in dine-in)
> - `air_bnb_id = ''` (hardcoded in all three payload builders)
> - `table_id = <room's table-config id>` (correct, but POS-side join is the only thing that can recover room-ness from this — and that is fragile)
>
> The POS dashboard cannot reliably distinguish a room order from a table dine-in order or walk-in order using `order_type` alone. When its `table_id`-to-`rtype` join misses (or it never attempts the join for a `dinein` order), it falls back to "WC".

### Contributing factors (each could ALSO trigger the same symptom independently)
1. **POS QR URL may omit `type=room`.** The QR string is generated by the POS team; we have no sample. If the URL only carries `tableId` and not `type`, the customer app sees `roomOrTable = null` and treats the order as a table dine-in (or walk-in if `tableId` is also absent/0). This would **also** show as "WC" if subsequent classification fails.
2. **Customer-app parser allow-list excludes `'room'` for `orderType`.** `useScannedTable.js:37-39` does not accept `orderType=room`; it silently coerces to `'dinein'`. If the POS team intended room QRs to send `orderType=room`, it's lost client-side.
3. **`air_bnb_id` is hardcoded `''` everywhere.** If the POS team's classifier prefers `air_bnb_id` to identify room orders for aparthotels, the frontend never honors it.
4. **POS dashboard display logic.** Even if the order is correctly stored as a room order, a render-side bug on the POS dashboard could show "WC" for room orders (the customer-app `OrderSuccess` does honor `table_type === 'RM'`, but the POS dashboard is a different codebase).
5. **Restaurant 716 special path.** Forces UI to "room mode" but does NOT change `order_type` in the payload. Same gap.

> **Without (a) the exact QR URL the customer scanned, (b) the order_id, (c) the order-details API response, and (d) the POS dashboard's classification rules, we cannot single out which of (1–4) is actually the trigger for the reported "Gaurav / WC" order.** What is certain is that even if the QR URL is perfect, the customer-app payload provides no robust room signal, so a POS misclassification will be the eventual result for some non-trivial fraction of room orders.

---

## 8. Ownership classification

| Concern | Owner | Confidence |
|---|---|---|
| Frontend captures room context but doesn't include it in payload | **Frontend (customer app)** — this repo | High |
| `air_bnb_id` hardcoded to empty everywhere | **Frontend (customer app)** | High |
| Parser drops `orderType=room` value | **Frontend (customer app)** | High |
| POS-side QR URL contract | **Backend / POS team** | High (file is upstream-owned) |
| POS classification rules (how `order_type`, `table_id`, `rtype` map to dashboard label) | **Backend / POS team** | Medium (best-evidence) |
| POS dashboard ("WC" label rendering) | **Backend / Dashboard codebase** (`crm.mygenie.online`) — NOT in this repo | High |
| Customer-app order-success "Room/Table" label rendering | **Frontend (customer app)** — this repo | High (correct: reads `table_type`) |
| Decision on which field should authoritatively distinguish room orders | **Architecture / Product** | — |

---

## 9. Files / components inspected

- `frontend/src/hooks/useScannedTable.js` — parser
- `frontend/src/utils/orderTypeHelpers.js` — helpers
- `frontend/src/pages/LandingPage.jsx:36, 203, 555, 666-669` — display
- `frontend/src/pages/ReviewOrder.jsx:147-547, 811-1353` — UI mode + payload origination
- `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx` — UI selector
- `frontend/src/api/services/orderService.ts:271-406` — `placeOrder`
- `frontend/src/api/services/orderService.ts:411-533` — `updateCustomerOrder`
- `frontend/src/api/transformers/helpers.js:391-491` — `buildMultiMenuPayload`
- `frontend/src/api/services/orderService.ts:121-258` — `getOrderDetails` (read path) — **does** read `table_type`
- `frontend/src/pages/OrderSuccess.jsx:131-576` — read-side display
- `frontend/src/pages/admin/AdminQRPage.jsx:24-340` — confirms QR URL is supplied by upstream POS
- `backend/server.py:812-877` — confirms `/api/table-config` is a thin proxy to POS
- `frontend/src/api/config/endpoints.js` — endpoint constants (verified)
- `frontend/src/__tests__/pages/OrderSuccess.test.js:43` — test fixture
- `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `MODULE_MAP.md`, `RUNTIME_API_FLOW_AUDIT.md`, `API_USAGE_MAP.md`, `API_DEPENDENCY_TRACE.md`, `USER_CONFIRMED_RUNTIME_CONTEXT_ADDENDUM.md` — baseline (read; no prior CR on this exact bug)

No code modified. No baseline doc modified.

---

## 10. Evidence still needed (BLOCKING — must be collected before any fix)

To distinguish whether the root cause is QR-URL-side, frontend-payload-side, POS-classifier-side, or POS-dashboard-render-side, please provide:

1. **Order-id** of the “Gaurav / WC” order shown in the screenshot.
2. **Restaurant id** (and a confirmation whether this is restaurant 716 / Hyatt Centric or another).
3. **Exact QR URL** the client scanned for that room (please scan the same QR with any QR reader and copy the decoded text — including all query params).
4. **Expected room number / room name** for that QR.
5. **Timestamp** (date + time) of the order.
6. **Order-details API response** for that order_id (`GET /customer/order/get-order-details/{orderId}`) — to read back `table_type`, `table_id`, and `order_type` actually stored.
7. **POS dashboard order log entry** for that order — to see exactly which field drives the "WC" badge on the POS side.
8. **Optional but valuable:** screenshot/video of the customer app right after scanning that QR (Landing screen header should say "Room X" if frontend detection worked).

If item (3) and (6) confirm:
- URL contains `type=room` AND order_type stored is `'dinein'` AND `table_type === 'RM'` returned → **POS dashboard render bug** (Owner: POS team)
- URL contains `type=room` AND order_type stored is `'dinein'` AND `table_type` is NULL/missing → **POS storage bug** (Owner: POS team)
- URL does NOT contain `type=room` → **POS QR generator bug** (Owner: POS team)
- URL contains `type=room` AND customer landing screen showed "Table" or no room badge → **Frontend parser bug** (Owner: this repo)
- All of (URL ok, frontend ok, payload ok) but POS still misclassifies → **Need explicit room signal in payload** (Owner: this repo + POS contract change)

---

## 11. Proposed minimal fix options (NOT applied — for future approval, gated on Evidence-collection in §10)

> **None of these touch:** order placement business logic, totals, taxes, service charge, delivery charge, GST math, KOT/bill payloads, payment, sockets, Firebase, or any unrelated UI.
> **None of these change** the *amount* fields or any monetary value in the payload — only the order-classification fields.

### Option F1 — Send room signal in `order_type` (frontend-only IF POS already accepts `'room'`)
- Update `useScannedTable.js:37-39` to also accept `urlOrderType === 'room'`.
- Update `ReviewOrder.jsx:1006, 1043, 1134, 1266, 1306` (the 5 places passing `orderType` to `placeOrder` / `updateCustomerOrder`) to send `'room'` when `roomOrTable === 'room'`.
- Backend POS must accept `order_type: 'room'` and classify accordingly. **Confirm contract first.**

### Option F2 — Add explicit `room_or_table` flag to payload (frontend + POS contract)
- Append `room_or_table: scannedRoomOrTable || 'table'` to all three payload builders.
- POS reads the flag for classification. Most defensive, contract-aligned.

### Option F3 — Populate `air_bnb_id` for room orders (only if POS uses it)
- Map `tableId` for rooms (or a separate room-id field returned from `/api/table-config`) into `air_bnb_id` on payload build.
- Risk: silently changes the meaning of an existing field. Confirm with POS.

### Option F4 — Update parser to recognise more room URL formats
- Extend `useScannedTable.js` to also detect room context from `room_id` / `air_bnb_id` URL params (not just `type=room`).
- Useful as a defense-in-depth even if POS QR URL contract is upgraded.

### Option F5 — Telemetry + diagnostic landing-screen badge
- Add a non-business-logic console log at landing scan: log the parsed `{ tableId, type, orderType, roomOrTable }` to make field-side debugging easier for the next "WC" report.

### Option F6 — POS-side fix (for POS team, NOT this repo)
- Fix POS dashboard to honor `table_type === 'RM'` join even for `order_type='dinein'` orders.
- Fix POS QR generator to always include `type=room` in room QRs.
- Fix POS classifier to never fall back to "WC" without an explicit walk-in marker.

### Recommended bundle (subject to Evidence in §10)
> **F2** (explicit `room_or_table` flag) + **F4** (more permissive parser) + **F5** (diagnostic log).
> This is the minimum that makes the customer app robust to POS QR URL variations and removes the dependency on a join-based POS classifier.
> F1 is also acceptable instead of F2 if the POS team confirms `order_type: 'room'` is a valid value end-to-end.
> F3 should NOT be done unless POS explicitly asks for it.

---

## 12. Validation checklist (for future implementation)

### Field-evidence (precondition — §10)
- [ ] Captured QR URL, order_id, restaurant_id, expected room, order-details response for the reported order
- [ ] Confirmed which axis (URL / payload / POS-classifier / POS-dashboard) is the actual trigger
- [ ] POS team confirmed which payload field they will treat as authoritative for room vs table vs walk-in dine-in

### Functional regression — must remain unchanged
- [ ] Cart, quantities, item totals, subtotal, tax, service charge, delivery charge unchanged
- [ ] Place Order succeeds for: dine-in (table QR), dine-in (room QR), walk-in dine-in, takeaway, delivery
- [ ] Edit Order succeeds and posts identical payload **except** the new room-classification field(s)
- [ ] Razorpay flow unchanged
- [ ] KOT / bill / print payloads unchanged
- [ ] Sockets / Firebase / buzzer events unchanged
- [ ] Coupon / loyalty / wallet sections unaffected
- [ ] Order-success "Room/Table" label still correct

### Room-scanner scenarios — primary
1. **Room QR with `type=room` AND `orderType=dinein`**
   - [ ] Customer landing screen shows "Room X" badge
   - [ ] Payload carries unambiguous room signal (per chosen Option)
   - [ ] POS dashboard shows "Room X", NOT "WC"
   - [ ] Order-details API returns `table_type === 'RM'`
2. **Room QR with no `type` param** (defensive — Option F4)
   - [ ] Frontend recovers room context from room_id / air_bnb_id alternates if present, else escalates clearly
3. **Room QR with `orderType=room`** (after Option F1)
   - [ ] Parser accepts the value; payload sends it; POS classifies as room
4. **Restaurant 716 (Hyatt Centric)** — already room-only
   - [ ] Forced room mode UI still works
   - [ ] Payload now also carries explicit room signal
   - [ ] POS dashboard shows "Room X"

### Cross-channel regression
- [ ] Table QR → "Table X" on dashboard (unchanged)
- [ ] Walk-in QR → "WC / Walk-in" on dashboard (unchanged — only a true walk-in should show as walk-in)
- [ ] Takeaway → unchanged
- [ ] Delivery → unchanged

### Edge cases
- [ ] `tableId` missing or `0` and `type=room` → behavior documented (block place-order? or allow?)
- [ ] `air_bnb_id` present and `type=room` → both honored consistently (Option F3 only if POS asks for it)
- [ ] Customer name missing → still classifies correctly (room status independent of name)
- [ ] Customer phone missing → same

### Cross-platform smoke
- [ ] iPhone Safari, iPhone Chrome, Android Chrome, Desktop Chrome — all show "Room X" on landing for a room QR

---

## 13. Approval gate

> 🛑 **No code has been changed. No probe call has been issued. Awaiting owner approval AND field evidence (§10) before any fix.**

Please decide / authorize:

1. ✅ Approve the investigation findings? Yes / No / Clarify.
2. **Provide the field evidence in §10** for the reported "Gaurav / WC" order so we can confirm the trigger axis (QR / FE / POS) before coding.
3. **Coordinate with the POS team** on which field they will treat as authoritative going forward:
   - (a) `order_type: 'room'` (Option F1)
   - (b) explicit `room_or_table` flag (Option F2)
   - (c) `air_bnb_id` populated for rooms (Option F3)
4. **Approve which option(s) to implement** (subject to (2) and (3)):
   - [ ] F1 — send `'room'` as `order_type`
   - [ ] F2 — explicit `room_or_table` payload flag (recommended)
   - [ ] F3 — `air_bnb_id` mapping
   - [ ] F4 — broader parser tolerance (recommended)
   - [ ] F5 — diagnostic log
   - [ ] F6 — POS-team-owned fixes (track separately)
5. **Edit-order parity** — should `updateCustomerOrder` also be updated, or only `placeOrder` initially?
6. Permission to run testing agent (Playwright) for end-to-end validation across Room QR / Table QR / Walk-in / Takeaway / Delivery once a fix is chosen?

Once you reply with the chosen options and field evidence, I'll either continue investigation against the captured artifacts (§10) or implement the authorized option(s) with a focused diff and the validation checklist above.
