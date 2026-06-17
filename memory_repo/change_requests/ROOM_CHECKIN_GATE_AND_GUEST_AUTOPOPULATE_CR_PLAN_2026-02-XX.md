# CR Planning Report — Room Scanner Check-In Gate + Guest Auto-Populate

**Date:** 2026-02 (current session)
**Status:** Investigation + planning only. **No code touched.** **No `/app/memory/current-state/` edits.**
**Scope:** Scan & Order — room QR flow, check-in awareness, guest auto-prefill, blocked state, WC fallback guard.
**Locked zones (untouched):** order placement payload, tax/SC/GST/delivery charge math, KOT/bill/print, sockets, Firebase, payments.
**Predecessor doc:** `/app/memory/change_requests/ROOM_ORDER_VALIDATION_AND_LANDING_MANDATORY_RULES_INVESTIGATION_2026-02-XX.md`

---

## ⛔ STOP CONDITION TRIGGERED

The required backend contract for **room check-in status + guest data** does **NOT exist** in the frontend or in the FastAPI backend proxy.
- Backend confirmation required (see §6).
- This document defines the **exact contract** needed.
- No frontend work should ship until backend confirms availability/shape of the endpoint.

A separate frontend-only **fallback guard (Option F-1)** can ship independently to address the silent WC bug today, while waiting for the room-guest API. See §14.

---

## 1. Requirement summary

| # | Behavioural requirement | Owner expectation |
|---|---|---|
| 1A | Room QR scanned → if checked-in, auto-populate guest name + phone, lock fields, allow Browse Menu + place order. Order keeps room id, NOT WC. | NEW |
| 1B | Room QR scanned → if not checked-in, block Browse Menu, show "This room is not checked in. Please contact staff." Do not allow ReviewOrder, do not allow `table_id='0'` fallback. | NEW |
| 1C | Room context lost mid-flow → block submission, ask user to rescan; never silently submit as WC. | Carries over from previous investigation |
| 1D | Manual entry of name/phone in not-checked-in state must NOT bypass the block. | NEW |

---

## 2. Current room scanner flow (recap)

```
Customer scans QR ─► /<rid>/?tableId=X&type=room&orderType=dinein[&tableName=Room+102]
    │
    ▼
useScannedTable.js ─► sessionStorage['scanned_table_<rid>'] = { table_id, table_no, room_or_table:'room', order_type:'dinein' }
    │
    ▼
LandingPage.jsx ── checkTableStatus(tableId) ── handles ACTIVE-ORDER detection only
    │                                    (NOT check-in detection)
    ▼
[Browse Menu enabled unconditionally]
    │
    ▼
MenuItems → Cart → ReviewOrder
    │
    ▼
ReviewOrder.handlePlaceOrder
    │
    ▼
finalTableId = scannedTableId || (multi-menu manual entry) || '0'
    │
    ▼
placeOrder({ table_id: finalTableId, cust_name, cust_phone, air_bnb_id:'', ... })
```

**Key gaps relative to requirement:**
- No check-in awareness anywhere in the chain.
- `air_bnb_id` is hardcoded `''` (`orderService.ts:333, 465`, `helpers.js:460`).
- Name/phone come only from localStorage `guestCustomer` / authenticated user / sessionStorage `sessionCustomerInfo` — never from a room/guest API.
- Browse Menu is enabled unconditionally for any room QR; only post-order (existing) status check matters.
- Silent `'0'` fallback at `ReviewOrder.jsx:949-951` for non-716 → WC misclassification.

---

## 3. Current Browse Menu enable/disable logic

| Mode | Source | Enabled condition |
|---|---|---|
| Dine-in / Room scan | `LandingPage.jsx:573` | `showBrowseMenu = true` always |
| Takeaway / Delivery | `LandingPage.jsx:597-599` | gated on `capturedName` + `isPhoneValid(capturedPhone)` |

There is currently **no path** that disables Browse Menu based on room check-in status.

---

## 4. Current checked-in room detection availability

**None.**

| Endpoint candidate | Purpose today | Useful for check-in? |
|---|---|---|
| `POST /web/table-config` (`tableRoomService.js`) | Returns `{ tables: [{ id, table_no, rtype: 'RM' | 'TB' }] }` | NO — no check-in / guest fields |
| `GET /customer/check-table-status?table_id&restaurant_id` (`orderService.ts:77`) | Returns `{ table_status:'Available'|'Not Available', order_id }` — about active orders, not occupancy | NO — different semantic |
| `GET /air-bnb/get-order-details/{order_id}` (`backend/server.py:789-810`) | Order-scoped detail proxy to MyGenie POS | NO — needs an existing `order_id` |

**Backend FastAPI proxy** (`/app/backend/server.py`) exposes only `air_bnb_router` with one route (`get-order-details`). The naming `/air-bnb/...` strongly suggests the upstream MyGenie POS has hotel-style room/booking endpoints, but **none are wired** in either the FastAPI proxy or the frontend.

---

## 5. Existing API availability — verdict

| Need | Status |
|---|---|
| Room **check-in status** API | **NOT FOUND** in frontend or FastAPI proxy. Backend confirmation needed: does upstream MyGenie POS expose this? |
| **Guest name/phone** for a checked-in room | **NOT FOUND**. Backend confirmation needed. |
| Room metadata (id, room_no, rtype) | **EXISTS** via `/web/table-config` — but no check-in fields |
| `air_bnb_id` field in payload | **EXISTS** in payload schema but hardcoded `''` everywhere |

---

## 6. Required backend contract (if missing)

**The contract below MUST be confirmed/implemented by backend before frontend Option F-2 can ship.**

### 6.1 Endpoint

```
GET /api/scan/room-status?room_id={room_id}&restaurant_id={restaurant_id}
```

Or, to mirror existing `/customer/check-table-status` shape:

```
GET /customer/room-checkin-status?table_id={table_id}&restaurant_id={restaurant_id}
```

(`table_id` here is the same id namespace as `/web/table-config`'s `id` for `rtype='RM'` rooms.)

### 6.2 Request

| Param | Required | Source on FE |
|---|---|---|
| `table_id` (= room id) | YES | `useScannedTable().tableId` |
| `restaurant_id` | YES | `useRestaurantId().restaurantId` |
| Auth | Bearer token | `getAuthToken()` (existing) |

### 6.3 Response shape (proposal)

```json
{
  "status": {
    "room_id": "12345",
    "room_no": "Room 102",
    "checkin_status": "checked_in" | "vacant" | "checked_out" | "not_found",
    "guest": {
      "name": "Alice Sharma",
      "phone": "+919876543210",
      "dial_code": "+91",
      "air_bnb_id": "BNB-2026-00742"
    }
  }
}
```

Notes:
- `guest` should be `null` when `checkin_status !== "checked_in"`.
- `phone` returned in **E.164** to match existing `react-phone-number-input` value contract.
- `air_bnb_id` is the booking/reservation id and would populate the existing payload field (currently hardcoded `''`).

### 6.4 Error semantics

| HTTP | Meaning | FE behaviour |
|---|---|---|
| 200 + `checkin_status:'checked_in'` + `guest` | Allow Browse Menu; auto-prefill + lock | — |
| 200 + `checkin_status:'vacant'` / `'checked_out'` | Block Browse Menu; show "Room not checked in" | — |
| 200 + `checkin_status:'not_found'` | Block; show "Invalid room" | — |
| 404 | Block; show "Invalid room QR" | — |
| 5xx / network | Block with retry button (do NOT silently allow WC) | — |
| 401 | Refresh token, retry once | existing pattern |

---

## 7. Proposed checked-in room data flow

```
Room QR scan
    │
    ▼
useScannedTable: roomOrTable='room', tableId=X
    │
    ▼  (NEW)
useRoomCheckin(tableId, restaurantId)  ──► GET /room-checkin-status
    │            │
    │            ├── { checkin_status: 'checked_in', guest: {...} } ──► STATE: roomCheckinReady=true
    │            └── otherwise                                       ──► STATE: roomCheckinBlocked=true
    │
    ▼
LandingPage:
  • If checkin_status === 'checked_in':
       - prefill capturedName / capturedPhone from guest
       - mark fields read-only with "Guest details fetched from checked-in room"
       - Browse Menu enabled (no name/phone validation needed since locked + filled)
  • If blocked:
       - hide capture form
       - show blocked card
       - hide Browse Menu (or disable)
       - keep Call Waiter visible (still relevant for "contact staff")
```

State plumbing (new):
- A small hook `useRoomCheckin(tableId, restaurantId)` returning `{ status, guest, isLoading, error, refetch }`.
- LandingPage invokes it ONLY when `roomOrTable === 'room'` AND `hasAssignedTable(tableId)` AND restaurant supports room flow.
- Guest data persisted to localStorage `guestCustomer` (existing key) so ReviewOrder picks it up via the existing prefill at `ReviewOrder.jsx:281-306` — **no payload code change**.
- Optional: also stash guest into a new sessionStorage key `room_guest_<rid>_<tableId>` to enforce read-only across reloads.

---

## 8. Proposed not-checked-in blocked flow

| State | UI |
|---|---|
| Browse Menu | Hidden (preferred) or visibly disabled with reason |
| Customer capture form | Hidden |
| Call Waiter | Visible (still useful) |
| Pay Bill | Hidden |
| Blocked card | Centered card: icon + "This room is not checked in." + "Please contact staff to check in before placing an order." + "Rescan QR" button |
| Hamburger menu | Visible |
| Login button | Hidden (irrelevant here) |

A "Refresh status" / "Rescan QR" CTA helps if check-in completes while user is on screen.

Manual entry of name/phone CANNOT bypass — capture form is hidden, and the absence of `roomCheckinReady=true` blocks `handleDiningMenuClick` regardless of typed values.

---

## 9. Proposed name/phone auto-populate and lock behaviour

### 9.1 Population
- On `useRoomCheckin` success → `setCapturedName(guest.name)` + `setCapturedPhone(guest.phone)`.
- Mirror to `localStorage.guestCustomer` so `ReviewOrder` prefills via the existing path.

### 9.2 Lock UI
- Pass new prop `readOnly={roomCheckinReady}` to `LandingCustomerCapture`.
- `<input>` and `<PhoneInput>` set `disabled` + visual cue (greyed bg, lock icon).
- Helper text under each field: "Fetched from checked-in room — cannot edit."

### 9.3 Same lock applied at ReviewOrder
- ReviewOrder also needs to honour `roomCheckinReady` (e.g. via a flag in localStorage `guestCustomer.locked: true` or a new sessionStorage key `room_checkin_locked_<rid>`).
- `<CustomerDetails>` already supports `showName/showPhone` toggles; add a `readOnly` prop for the locked case.

### 9.4 Incomplete guest data edge cases
| Returned guest | Action |
|---|---|
| `{ name, phone }` both present | Standard flow |
| `{ name }` only | Auto-fill name (locked); leave phone blank but still locked. Allow proceed (matches optional-phone existing rule). Show banner: "Phone not on file — proceeding without it." |
| `{ phone }` only | Auto-fill phone (locked); name field becomes editable (since name is the only thing missing). |
| neither | Treat as "checked-in but data incomplete" → show capture form fully editable, with "Verify details" banner. Block proceed if phone missing AND mandatoryCustomerPhone is true. |

These rules are tunable; owner to confirm preferred behaviour for incomplete data.

---

## 10. Proposed room-context / WC fallback guard

This is the **frontend-only Option F-1 (was "Option A"** in predecessor doc). It can ship **independently** of the backend room-status endpoint and addresses the silent WC bug today.

### 10.1 Pre-submit guard in `ReviewOrder.handlePlaceOrder`
Add early return BEFORE the existing 716 block at line 803:
```
if (scannedRoomOrTable === 'room' && !hasAssignedTable(finalTableId)) {
  toast.error('Room context lost. Please rescan the QR code.');
  setIsPlacingOrder(false);
  isPlacingOrderRef.current = false;
  return;
}
```

### 10.2 Browse Menu pre-gate (when room scan but no valid tableId)
Add to `LandingPage.handleDiningMenuClick` (early return):
```
if (scannedRoomOrTable === 'room' && !hasAssignedTable(scannedTableId)) {
  toast.error('Room context lost. Please rescan the QR code.');
  return;
}
```

### 10.3 Independence from G1 + G3
- G1 already prevents post-order sessionStorage wipe for non-716. Still relevant.
- G3 (the deferred silent toast) is **superseded** by F-1 — F-1 is a stronger blocker.

---

## 11. Payload impact assessment

| Field | Current | After CR (when checked-in) | After CR (when not checked-in) |
|---|---|---|---|
| `table_id` | scannedTableId or `'0'` | `scannedTableId` (room id) | order never placed |
| `cust_name` | from localStorage / auth | from guest | order never placed |
| `cust_phone` | from localStorage / auth | from guest (E.164) | order never placed |
| `dial_code` | derived from phone | derived from guest phone | order never placed |
| `air_bnb_id` | hardcoded `''` | guest.air_bnb_id (if backend provides) | — |
| `order_type` | `'dinein'` | `'dinein'` (unchanged) | — |
| All other fields | unchanged | unchanged | unchanged |

**Payload structure unchanged.** Only the **values** of existing fields change for checked-in case. `air_bnb_id` finally gets populated from a real source (backend confirmation needed on whether to populate it).

---

## 12. WC fallback impact assessment

| Scenario | Today | After CR |
|---|---|---|
| Room QR + checked-in | Blank fields → may classify as Room (if tableId valid) or WC (if tableId lost) | Always Room (gated by F-1 + check-in) |
| Room QR + not-checked-in | Order proceeds → may end up WC | **Blocked** — no order placed |
| Room QR + tableId lost | Silent WC | **Blocked** by F-1 guard |
| Walk-in QR | WC (intentional) | Unchanged |
| Table QR | Table (correct) | Unchanged |
| Takeaway / Delivery | Unchanged | Unchanged |
| Restaurant 716 | Mandatory room re-pick | Unchanged (716 has its own flow that runs after F-1) |

**No regressions to walk-in / table / takeaway / delivery / 716.**

---

## 13. Ownership classification

| Concern | Owner |
|---|---|
| Room check-in status API | **Backend** (define + expose) |
| Guest name/phone/air_bnb_id from check-in | **Backend** (PMS/MyGenie integration) |
| `useRoomCheckin` hook + LandingPage gate + lock UI | **Frontend** |
| Pre-submit guard at `ReviewOrder.handlePlaceOrder` | **Frontend** |
| `air_bnb_id` payload wiring | **Frontend** (consumes backend data) |
| Backend interpretation of `table_id='0'` as WC | Backend (existing — no change) |

---

## 14. Implementation options

### Option F-1 — Frontend-only WC fallback guard (no backend dep)
Adds two early-return guards (LandingPage Browse Menu + ReviewOrder submit) when `scannedRoomOrTable === 'room'` AND `!hasAssignedTable(...)`. Toast: "Room context lost. Please rescan the QR code."
- **Code touched:** `LandingPage.jsx` (1 add), `ReviewOrder.jsx` (1 add).
- **Risk:** very low. Walk-in / table / takeaway / delivery / 716 unaffected.
- **Coverage:** addresses silent WC for missing room context. Does NOT distinguish checked-in vs not-checked-in.
- **Ship-able now.**

### Option F-2 — Full check-in gate + auto-prefill (depends on backend)
Adds `useRoomCheckin` hook, blocked card UI, locked-prefilled customer fields, ReviewOrder readonly mode, Browse Menu gate.
- **Code touched:** new hook file, `LandingPage.jsx`, `LandingCustomerCapture.jsx` (readOnly prop), `CustomerDetails.jsx` (readOnly prop), `ReviewOrder.jsx` (read state + lock + payload `air_bnb_id` wiring).
- **Risk:** medium. Multiple touch points; needs careful regression on takeaway/delivery (must not run room-status fetch there).
- **Depends on:** backend endpoint (§6) being available + stable.

### Option F-3 — Hybrid (recommended)
Ship **F-1 immediately** to stop the silent WC bug today. Plan **F-2** in parallel and ship after backend endpoint is live.
- Two ships, smallest risk per ship.

### Option F-4 — Defer entire CR
Continue with deferred G3 silent-toast only. Not recommended — does not satisfy owner requirement and does not stop silent WC.

### Recommended option
**F-3 (Hybrid)**.
- Phase 1 (this sprint, frontend-only): F-1 guard ships, closes silent-WC for room flow.
- Phase 2 (after backend): F-2 ships full check-in gate + auto-prefill + lock + populated `air_bnb_id`.

---

## 15. Risks and edge cases

| Edge case | Plan |
|---|---|
| Backend endpoint slow → user waits on Landing | Show "Verifying room..." spinner; timeout 5–8 s; on timeout treat as `status:'error'` with retry CTA |
| Endpoint flaky / 5xx | Block with retry; do NOT fall through to allow order |
| User scans valid room QR, but backend returns `vacant` | Block with check-in CTA; offer "Rescan QR" + "Call Waiter" |
| User refreshes while in checked-in flow | `useRoomCheckin` re-runs; cache last-known guest in sessionStorage to avoid flicker |
| User changes room mid-flow (rescans different QR) | New scan overwrites sessionStorage (existing); `useRoomCheckin` re-runs against new tableId |
| Name/phone present in localStorage from prior restaurant | Existing cleanup at `ReviewOrder.jsx:336-358` handles |
| Restaurant 716 (room-only, manual room pick, not always QR) | F-1 still safe; F-2 only triggers when scan provides tableId. 716's manual room re-pick logic remains intact. Owner to decide whether 716 should ALSO call check-in API or skip. |
| Multi-menu restaurants (716, others) | Run F-2 only when `roomOrTable === 'room'`; multi-menu station selection unchanged |
| Walk-in/Takeaway/Delivery | F-2 hooks gated on `roomOrTable === 'room'`; never fires elsewhere |
| Edit order flow (existing-order detection) | F-2 must run AFTER `checkTableStatus`; if existing-order found, route to Edit Order as today (no change to that flow) |
| `mandatoryCustomerName/Phone` flags ON for room | Bypassed when guest data is locked-and-filled; if guest data is partial, fall back to existing rule |
| `mandatoryCustomerName/Phone` flags ON for room not checked-in | Irrelevant — Browse Menu blocked anyway |
| User in offline mode | Block with retry; sync banner |
| Stale `roomCheckinReady` after refresh | Re-fetch on every Landing mount; don't rely solely on sessionStorage cache |

---

## 16. Validation checklist (for future implementation)

### 16.1 Phase 1 — F-1 (frontend-only guard)
- [ ] Room QR with valid tableId → Browse Menu works → ReviewOrder works → payload `table_id` = scanned id.
- [ ] Room QR with cleared sessionStorage → Browse Menu blocked with toast "Room context lost. Please rescan the QR code."
- [ ] Direct URL `/<rid>/menu` (no QR) → Browse Menu Click → not affected (only `roomOrTable === 'room'` triggers).
- [ ] Direct URL `/<rid>/review-order` → submit blocked when `scannedRoomOrTable === 'room'` and `finalTableId === '0'`.
- [ ] Walk-in (`type=walkin`) → unaffected, places as WC.
- [ ] Table scan → unaffected.
- [ ] Takeaway / Delivery → unaffected.
- [ ] 716 → unaffected (716 block runs after F-1; F-1 only triggers if `scannedRoomOrTable === 'room'` AND `!hasAssignedTable`, which 716's pre-validation already covers).

### 16.2 Phase 2 — F-2 (check-in gate + auto-prefill)
1. **Checked-in room with full guest data**
   - [ ] Room QR opens → Landing shows "Verifying room…" → name + phone auto-populated, locked, with helper text.
   - [ ] Browse Menu enabled.
   - [ ] ReviewOrder shows name + phone read-only with helper text.
   - [ ] Payload: `cust_name`, `cust_phone`, `dial_code` from guest; `air_bnb_id` populated; `table_id` = room id.
   - [ ] Dashboard classifies as Room.

2. **Checked-in room with partial guest data**
   - [ ] Name only → name locked, phone editable, banner "Phone not on file".
   - [ ] Phone only → phone locked, name editable.
   - [ ] Neither → fallback to standard capture (banner: "Verify details").

3. **Room not checked-in**
   - [ ] Blocked card shown: "This room is not checked in. Please contact staff."
   - [ ] Browse Menu hidden / disabled.
   - [ ] Capture form hidden.
   - [ ] No order placed.
   - [ ] Call Waiter still visible; tapping it works as today.
   - [ ] Manual nav to `/menu` or `/review-order` is also blocked.

4. **Room context missing**
   - [ ] Browse Menu blocked (F-1 + F-2 same path).
   - [ ] User asked to rescan QR.
   - [ ] No `table_id='0'` order placed.

5. **Network failure**
   - [ ] Spinner → timeout/error UI with Retry button.
   - [ ] No fallback to allow Browse Menu while error is shown.

6. **Normal walk-in** (`type=walkin`)
   - [ ] Unaffected; standard WC behaviour.

7. **Normal table scan** (`type=table`)
   - [ ] Unaffected; standard table flow.

8. **Delivery / Takeaway**
   - [ ] `useRoomCheckin` not invoked.
   - [ ] Mandatory name/phone rules unchanged.

9. **Restaurant 716**
   - [ ] Behaviour unchanged unless owner explicitly opts 716 in to F-2.
   - [ ] Manual room re-pick still works.

10. **Payload assertions**
    - [ ] `cust_name`, `cust_phone`, `dial_code` correctly mapped via existing `extractPhoneNumber` / `getDialCode`.
    - [ ] `table_id` = scanned room id, never `'0'` for room flow.
    - [ ] `air_bnb_id` populated when backend returns one.
    - [ ] Payload structure unchanged.

11. **Regression**
    - [ ] No change to: tax/SC/GST math, KOT, bill, print, sockets, Firebase, payments.
    - [ ] No backend changes outside the new room-status endpoint (Phase 2).

---

## 17. Approval gate — STOP

This is investigation + planning only. Awaiting owner decisions on:

| Decision | Options |
|---|---|
| **D1.** Ship Phase 1 (F-1 guard) now? | a) Approve → frontend-only ship  b) Hold |
| **D2.** Backend room-status endpoint | a) Owner confirms upstream MyGenie POS already exposes it (provide URL + sample response) → frontend can wire directly  b) Build new FastAPI proxy in `/app/backend/server.py`  c) Hold backend; F-1 only |
| **D3.** Endpoint shape | Confirm or amend §6.3 contract |
| **D4.** Incomplete-guest behaviour | Pick rule from §9.4 (full lock, partial lock, fallback) |
| **D5.** 716 inclusion in F-2 | a) Apply F-2 to 716 too  b) Keep 716 on its existing manual flow |
| **D6.** Disable vs hide Browse Menu in not-checked-in state | a) Hide  b) Disable with reason |
| **D7.** Show check-in helper text on locked fields | a) "Fetched from checked-in room"  b) Custom copy |

No code will be written until at least D1 is approved. F-2 will not be written until D2 + D3 are settled.

---

## 18. Suggested next steps for owner

1. **Confirm D1** — approve F-1 frontend-only guard ship to stop silent WC today.
2. **Provide D2 evidence** — share MyGenie POS docs / sample response for any room-checkin or room-detail endpoint, OR confirm backend team will build it.
3. **Iterate on §6.3 contract** — adjust field names/shape to match upstream.
4. **Decide D4–D7** — these can be answered once you know what the upstream returns.

Once D2 is settled, I will produce the F-2 implementation plan with file-by-file change list and re-request approval.
