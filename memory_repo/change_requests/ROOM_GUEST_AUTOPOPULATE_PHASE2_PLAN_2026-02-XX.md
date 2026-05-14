# Phase 2 Planning Report — Room Guest Name/Phone Auto-Populate + Lock

**Date:** 2026-02 (current session)
**Status:** Planning / impact analysis only. **No code touched.** **No `/app/memory/current-state/` edits.**
**Predecessors:** Phase 1 Room Scanner Availability Gate (shipped); CR plan `ROOM_CHECKIN_GATE_AND_GUEST_AUTOPOPULATE_CR_PLAN_2026-02-XX.md`.
**Locked zones:** order placement payload, tax/SC/GST/delivery charge math, KOT/bill/print, sockets, Firebase, payments, backend.

---

## 1. Requirement summary

When a room QR is scanned **AND** `/customer/check-table-status` returns `table_type === 'RM'` and `table_status === 'Not Available'` (i.e. the room is checked-in / occupied), the frontend must:

1. Build `guestName = trim(userinfo.f_name + ' ' + userinfo.l_name)`.
2. Take `guestPhone = userinfo.phone` and normalize to E.164 (`+91` + 10 digits).
3. Auto-populate the customer name and phone fields on Landing AND on ReviewOrder.
4. Lock both fields (read-only) so the customer cannot edit them.
5. Allow Browse Menu and order placement to continue normally — payload contract unchanged.

When the room is `Available` → Phase 1 block remains. When `userinfo` is missing/incomplete → see §12.

---

## 2. Current data flow (verified in code)

### 2.1 API call
- `LandingPage.jsx:255` invokes `checkTableStatus(scannedTableId, restaurantId, token)`.
- Service at `frontend/src/api/services/orderService.ts:77-116` builds the request and **strips** the response down to:
  ```ts
  return { tableStatus, orderId, isOccupied, isAvailable, isInvalid };
  ```
  → `status.userinfo` and `status.table_type` are **discarded**. Phase 2 must forward them.

### 2.2 Customer capture state (LandingPage)
- `LandingPage.jsx:46-47` owns `capturedName` and `capturedPhone` in local state (E.164 phone).
- Bound to `<LandingCustomerCapture phone={capturedPhone} setPhone={...} name={capturedName} setName={...} />` at `LandingPage.jsx:780-791`.
- On `handleDiningMenuClick`, the values are persisted to `localStorage.guestCustomer = { name, phone, restaurantId }` (per existing logic in LandingCustomerCapture's effect at line 18-29 plus LandingPage's capture flow).

### 2.3 Landing → ReviewOrder transport
ReviewOrder reads in priority order (`ReviewOrder.jsx:252-326`):

| Priority | Source | Key |
|---|---|---|
| 1 | `sessionStorage.SESSION_CUSTOMER_KEY` (`'sessionCustomerInfo'`) | edit-order session |
| 2 | `localStorage.guestCustomer` | landing capture |
| 3 | `AuthContext.user` | logged-in customer |

All three set the same `customerName` + `customerPhone` state, then `<CustomerDetails name={customerName} phone={customerPhone} ... />` renders.

### 2.4 Order payload mapping
`orderService.ts:432-475` `placeOrder` builds payload with `cust_name: customerName || ''`, `cust_phone: custPhone || customerPhone || ''`. `helpers.js`:
- `extractPhoneNumber('+919626975145')` → `'9626975145'`
- `getDialCode('+919626975145')` → `'+91'`
→ `dial_code: '+91'` and `cust_phone: '9626975145'` in payload. **No payload changes needed for Phase 2.**

### 2.5 Phase 1 gate (already shipped)
`LandingPage.jsx`:
- Race-fix: waits for `restaurant` to load before calling API.
- 716 naturally excluded via `isMultipleMenu` skip.
- `roomBlocked = roomContextLost || roomNotCheckedIn` blocks UI when API says vacant, errored, or context lost.
- Edit Order branch still fires when `isOccupied && existingOrderId` (active-order case).

---

## 3. Files / components inspected (read-only)

| File | Lines |
|---|---|
| `frontend/src/api/services/orderService.ts` | 60–116 (checkTableStatus), 432–475 (placeOrder) |
| `frontend/src/api/transformers/helpers.js` | 245–300 (phone helpers) |
| `frontend/src/api/transformers/orderTransformer.ts` | 167–208 |
| `frontend/src/types/api/order.types.ts` | 30–87 |
| `frontend/src/pages/LandingPage.jsx` | 30–45 (state), 230–340 (table check + race fix), 580–620 (Phase 1 derived flags), 780–820 (capture + buttons) |
| `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | 1–80 |
| `frontend/src/components/CustomerDetails/CustomerDetails.jsx` | 1–112 |
| `frontend/src/pages/ReviewOrder.jsx` | 230–326 (prefill chain), 800–870 (handlePlaceOrder + Phase 1 guard) |
| `frontend/src/hooks/useScannedTable.js` | 1–93 |
| `frontend/src/pages/OrderSuccess.jsx` | 305–370 (G1 fix) |

---

## 4. Is `userinfo` preserved today?

**No.** `checkTableStatus` strips it. Phase 2 must extend the return shape:

Proposed extension to `orderService.ts:checkTableStatus`:
```ts
return {
  tableStatus,
  orderId,
  isOccupied,
  isAvailable,
  isInvalid,
  // NEW (Phase 2)
  tableType: status.table_type || null,                      // 'RM' | 'TB' | ''
  guest: status.userinfo
    ? {
        firstName: String(status.userinfo.f_name || '').trim(),
        lastName:  String(status.userinfo.l_name || '').trim(),
        phone:     String(status.userinfo.phone || '').trim(),
      }
    : null,
};
```
Backwards-compatible — every existing field stays.

---

## 5. Proposed data model

### 5.1 New transport extension to `localStorage.guestCustomer`
```jsonc
{
  "name": "bolt",
  "phone": "+919626975145",        // E.164
  "restaurantId": "28",
  "locked": true,                   // NEW — true ⇒ inputs read-only
  "source": "checked-in-room"       // NEW — provenance marker
}
```

### 5.2 New session key (defensive)
`sessionStorage.roomGuestLocked = 'true'` — used by ReviewOrder if `localStorage.guestCustomer.locked` is missing (e.g. older shape) AND the current page is a room scan. Optional but cheap.

### 5.3 Component prop extension
- `LandingCustomerCapture` — add `readOnly: boolean = false` prop.
- `CustomerDetails` — add `readOnly: boolean = false` prop.

### 5.4 Lock control
The lock should be controlled by **a dedicated flag** (`locked: true` in `guestCustomer`), NOT inferred at render-time from "room scanner type + checked-in status". Reasons:
- Single source of truth — survives navigation, sessionStorage clears, restaurant switches.
- Edit-order flow already pulls from sessionStorage/localStorage; no new branching needed.
- Passing the explicit flag is cheaper than re-deriving on every page mount.

---

## 6. Proposed implementation steps

### Step A — Service layer
File: `frontend/src/api/services/orderService.ts`
- Extend `checkTableStatus` return to include `tableType` + `guest` (see §4).
- Update the type `TableStatus` (or local return alias) accordingly. Existing callers that destructure narrowly are unaffected.

### Step B — LandingPage gate
File: `frontend/src/pages/LandingPage.jsx`
1. Capture `result.guest` and `result.tableType` from the existing `checkTableStatus` call (line 255).
2. Decide eligibility for Phase 2 auto-fill:
   ```js
   const isCheckedInRoom =
     scannedRoomOrTable === 'room' &&
     result.tableType === 'RM' &&
     tableStatus === 'Not Available';     // strict: occupied/checked-in
   ```
3. If eligible AND `result.guest && result.guest.firstName && result.guest.phone`:
   - Build `name = (firstName + ' ' + lastName).trim().replace(/\s+/g, ' ')`.
   - Normalize phone: `phoneE164 = '+91' + result.guest.phone.replace(/\D/g,'').replace(/^91/, '').slice(-10);` (defensive — strips leading 91 if double-prefixed).
   - `setCapturedName(name); setCapturedPhone(phoneE164);`
   - Persist: `localStorage.setItem('guestCustomer', JSON.stringify({ name, phone: phoneE164, restaurantId, locked: true, source: 'checked-in-room' }));`
   - Pass `readOnly={true}` into `<LandingCustomerCapture>`.
4. If eligible BUT data incomplete → see §12 stop conditions.

### Step C — LandingCustomerCapture
File: `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx`
- Add `readOnly` prop. When true:
  - `<input ... readOnly disabled ... />`
  - `<PhoneInput ... disabled />`
  - Apply `.locked` style class (greyed bg, lock icon glyph).
  - Optional helper text: *"Fetched from checked-in room"*.
- Keep mount-effect `localStorage.getItem('guestCustomer')` prefill — augment to also seed when locked (already handled because LandingPage will set state explicitly first).

### Step D — ReviewOrder
File: `frontend/src/pages/ReviewOrder.jsx`
1. Read `guestCustomer.locked` in the existing prefill effect (lines 281-306). Store as `[isCustomerDetailsLocked, setIsCustomerDetailsLocked]` state.
2. Pass `readOnly={isCustomerDetailsLocked}` to `<CustomerDetails>` (existing render around line 1538-1568).
3. Customer name/phone validation in `handlePlaceOrder` is unchanged (phone is locked + already valid; name presence is already enforced if `mandatoryCustomerName` is set, and locked value will satisfy it).
4. Restaurant-change cleanup at lines 336-358 already wipes `localStorage.guestCustomer` — Phase 2 lock state is auto-cleared on restaurant change. ✅

### Step E — CustomerDetails
File: `frontend/src/components/CustomerDetails/CustomerDetails.jsx`
- Add `readOnly` prop.
- When true: `<input readOnly />`, `<PhoneInput disabled />`, apply `.locked` style.
- Optional helper text under fields.

### Step F — Tests
- Unit: `__tests__/services/orderService.test.js` — assert `checkTableStatus` returns `{ tableType, guest }` shape.
- Unit: new `__tests__/pages/LandingPage.guest.test.js` — mock `checkTableStatus` returning `userinfo` and assert `localStorage.guestCustomer.locked === true`.
- Component: `<CustomerDetails readOnly />` and `<LandingCustomerCapture readOnly />` render disabled inputs.

---

## 7. Files likely to change

| File | Change | Risk |
|---|---|---|
| `frontend/src/api/services/orderService.ts` | extend `checkTableStatus` return | LOW (additive only) |
| `frontend/src/pages/LandingPage.jsx` | wire auto-fill + lock + persist | LOW |
| `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | add `readOnly` prop | LOW |
| `frontend/src/components/CustomerDetails/CustomerDetails.jsx` | add `readOnly` prop | LOW |
| `frontend/src/pages/ReviewOrder.jsx` | read `locked` flag, pass to `<CustomerDetails>` | LOW |
| `frontend/src/__tests__/...` | new tests | LOW |

NO change to: `helpers.js`, `cartTransformer.ts`, `orderTransformer.ts`, `orderService.placeOrder/updateCustomerOrder`, `useScannedTable.js`, `OrderSuccess.jsx`.

---

## 8. Order payload — confirmed unchanged

| Payload field | Source post-Phase-2 | Diff vs today |
|---|---|---|
| `cust_name` | `capturedName` → `customerName` (now seeded from guest) | **value differs**, structure same |
| `cust_phone` | `extractPhoneNumber(customerPhone)` (E.164 input) | **value differs**, structure same |
| `dial_code` | `getDialCode(customerPhone)` → `'+91'` | unchanged |
| `table_id` | `finalTableId = scannedTableId` (room id) | unchanged |
| `air_bnb_id` | hardcoded `''` (not in this CR) | unchanged |
| All other fields | unchanged | unchanged |

`orderService.placeOrder` and `updateCustomerOrder` are NOT touched.

---

## 9. Phone / dial_code helper reuse — verified safe

The API returns 10 digits: `"9626975145"`. After normalization to E.164 (`+919626975145`):
- `extractPhoneNumber('+919626975145')` → `'9626975145'` ✅
- `getDialCode('+919626975145')` → `'+91'` ✅
- `stripPhonePrefix('+919626975145')` → `'9626975145'` ✅ (used only by CRM OTP path; not relevant here since locked customer skips OTP)
- `isPhoneValid('+919626975145')` (LandingCustomerCapture export) → `true` ✅

No helper changes required.

---

## 10. 716 impact assessment

| Concern | Status | Evidence |
|---|---|---|
| `checkTableStatus` API call | **Naturally skipped** for 716 (multi-menu) at `LandingPage.jsx:240` — Phase 2 inherits this skip | `if (isMultipleMenu(restaurant)) return;` |
| Auto-fill / lock | Never triggers for 716 because the API call doesn't run | Same |
| Manual room re-pick | Untouched | `ReviewOrder.jsx:545-554, 802-807, 954-959` |
| Restaurant-change cleanup | Already wipes `guestCustomer` on restaurant switch | `ReviewOrder.jsx:336-358` |

**716 is naturally unaffected.** No code branch touches it.

---

## 11. Non-room flow impact assessment

| Flow | Auto-fill / lock fires? | Why |
|---|---|---|
| Walk-in (`type=walkin`) | NO | gate requires `scannedRoomOrTable === 'room'` |
| Table scan (`type=table`) | NO | gate requires `scannedRoomOrTable === 'room'` |
| Takeaway / Delivery | NO | API call is skipped (Phase 1: `if (!hasAssignedTable(scannedTableId)) return;`) |
| Direct URL (no QR) | NO | `isScanned === false` |
| Room scan, vacant (`Available`) | NO | gate requires `Not Available` + `RM` (Phase 1 blocks the page) |
| Room scan, checked-in but `userinfo` empty | depends on §12 decision | edge case |

---

## 12. Edge cases — proposed safe behaviour

Owner asked for explicit recommendations. Each edge case has a STOP CONDITION; these are safe-default options for owner decision:

| Case | API condition | Recommendation | Owner decision needed? |
|---|---|---|---|
| Both `f_name` and `phone` present | `userinfo: { f_name: 'bolt', phone: '9626975145' }` | Auto-fill + lock both. | NO — primary happy path |
| `f_name` present, `l_name` empty | `f_name: 'bolt', l_name: ''` | `name = 'bolt'`. Auto-fill + lock. | NO |
| `f_name` empty, `l_name` present | `f_name: '', l_name: 'sharma'` | `name = 'sharma'`. Auto-fill + lock. | maybe |
| `f_name` and `l_name` both empty, phone present | `f_name: '', l_name: '', phone: '...'` | **Recommended:** lock phone (read-only), leave name editable + required. Banner "Phone fetched from check-in. Please enter your name." | **YES** — confirm |
| `f_name` present, phone missing/empty | `f_name: 'bolt', phone: ''` | **Recommended:** lock name (read-only), leave phone editable + validate. Banner "Name fetched from check-in. Please confirm phone." | **YES** — confirm |
| `userinfo` missing entirely | `status: { table_status: 'Not Available', table_type: 'RM', order_id: 0 }` and no `userinfo` key | **Recommended:** treat as "checked-in but data unavailable" — allow Browse Menu, do NOT lock, do NOT auto-fill. Equivalent to today's manual capture flow. | **YES** — confirm |
| `userinfo` present but `phone` invalid (<10 digits) | `phone: '12345'` | **Recommended:** treat phone as missing, fall back to "name only" rule | maybe |
| `tableType !== 'RM'` (e.g. `'TB'` table scan returning userinfo) | Should never happen for room QR; edge case | **Recommended:** ignore guest data; Phase 2 auto-fill only when `tableType === 'RM'` | NO — follows the rule |

---

## 13. Validation plan

### 13.1 Happy path — checked-in room with full guest data
- [ ] Scan room QR → API returns `table_type='RM'`, `table_status='Not Available'`, `userinfo: {f_name, phone}`.
- [ ] Landing capture form shows pre-filled name + phone (E.164), inputs disabled, lock helper text visible.
- [ ] `localStorage.guestCustomer.locked === true`, `source === 'checked-in-room'`.
- [ ] Browse Menu enabled (no validation blocks since fields are filled+locked).
- [ ] Add item → ReviewOrder → CustomerDetails shows same name + phone, both disabled.
- [ ] Place Order → payload `cust_name: 'bolt'`, `cust_phone: '9626975145'`, `dial_code: '+91'`.
- [ ] Dashboard shows order under correct Room.

### 13.2 Vacant room (Phase 1 still works)
- [ ] API returns `table_type='RM'`, `table_status='Available'`.
- [ ] Phase 1 blocked card shown with "Room Checked Out" title.
- [ ] No auto-fill, no lock applied.

### 13.3 Partial guest data (each variant from §12)
- [ ] Only name → name locked + phone editable, banner shown.
- [ ] Only phone → phone locked + name editable, banner shown.
- [ ] Neither → fallback to standard capture; no lock.
- [ ] No `userinfo` key → fallback to standard capture; no lock.

### 13.4 Restaurant 716 (must remain unchanged)
- [ ] Scan 716 → `checkTableStatus` not called → no auto-fill → manual room pick still works.

### 13.5 Walk-in / Table / Takeaway / Delivery (no regression)
- [ ] No locking behaviour anywhere.
- [ ] Customer capture rules per existing config.

### 13.6 Restaurant switch
- [ ] User switches between two restaurants → `guestCustomer` (incl. `locked`) wiped at `ReviewOrder.jsx:358` → next room scan re-fetches.

### 13.7 Edit-order flow
- [ ] When entering an existing order via the Edit Order button (Phase 1 active-order branch), `sessionCustomerInfo` was already used to seed customer data. If the order was originally placed locked, the seed values flow through unchanged. If a new fetch happens, the new `userinfo` overwrites localStorage (latest is canonical).
- [ ] Cancel-edit and re-enter must not double-prefill or duplicate values.

### 13.8 Payload regression
- [ ] No structural change to `placeOrder` / `updateCustomerOrder` payload — verified by snapshot test.
- [ ] Tax / SC / GST / discount / delivery charge math identical to current production for the same cart and same totals.

### 13.9 Phone format
- [ ] Live API gives `9626975145` → after E.164 normalization, payload sends `cust_phone: '9626975145'`, `dial_code: '+91'`. Matches today's format for India users.

---

## 14. Stop conditions — must NOT proceed without owner decision on:

| # | Stop | Reason |
|---|---|---|
| **S1** | **§12 partial-guest-data behaviour** | Owner must confirm: full lock vs partial lock vs fallback to manual capture |
| **S2** | Whether `tableType` field is reliably present in production responses | Sample provided shows `"table_type": "RM"`. Confirm field name (`table_type` vs `table type`) — Phase 1 transformer already saw a quirk (`"table type"` with space in some legacy responses). Recommend supporting both keys defensively. |
| **S3** | Whether `userinfo.phone` is always 10 digits without country code, or sometimes already prefixed | We will normalize defensively (`replace(/\D/g,'')` + last-10) but owner should confirm canonical shape |
| **S4** | Whether the locked-fields UX is preferred as **disabled** vs **read-only** vs **show-only-display-row** (no input element) | Affects accessibility and visual styling. Recommend `disabled` + visible value + lock icon. |
| **S5** | Helper text wording — recommend **"Fetched from checked-in room"** with a small lock icon. Owner can override. |

---

## 15. Final recommendation

**Status:** Plan is **ready for implementation pending owner answers to S1–S5**.

| Concern | Verdict |
|---|---|
| Architecture changes required? | NO — additive only (extend service return, add 2 prop names, persist 2 extra keys) |
| Payload changes required? | NO |
| Backend changes required? | NO (backend already returns the data per the sample provided) |
| Helper changes required? | NO |
| 716 impact | NONE (naturally excluded) |
| Non-room flow impact | NONE |
| Phase 1 gate compatibility | INTACT |
| Test coverage | Existing patterns extend cleanly |
| Estimated diff | ~80 lines across 5 files + ~60 lines of new tests |

### Decision matrix for owner

| Question | Default I'll use if you don't override |
|---|---|
| **S1** Behaviour for partial guest data | "Lock the field that has data; leave the other editable. Banner explains." |
| **S2** Defensive support both `table_type` and `"table type"` (with space) keys | Yes |
| **S3** Phone normalization | E.164 with `+91` prefix; strip leading 91 if double-prefixed; reject if `< 10 digits` |
| **S4** Lock UX | `disabled` + visible value + small lock icon + helper text |
| **S5** Helper text | "Fetched from checked-in room" |

If you reply with overrides for any of S1–S5, I'll update the plan and proceed. Otherwise approve the defaults and I'll implement.

---

## 16. Out of scope (explicit)

- Backend changes — none.
- `air_bnb_id` payload wiring — deferred (separate CR).
- New backend endpoint — none needed.
- Order payload contract — unchanged.
- Tax / SC / GST / delivery / payment / KOT / bill / print / sockets — unchanged.
- `/app/memory/current-state/` — unchanged.
