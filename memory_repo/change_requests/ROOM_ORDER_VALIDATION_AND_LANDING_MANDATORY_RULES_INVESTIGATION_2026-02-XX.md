# Investigation Report — Room Order Validation + Landing Name/Phone Mandatory Rules

**Date:** 2026-02 (current session)
**Status:** Investigation only. No code touched. No `/app/memory/current-state/` edits.
**Scope:** Scan & Order — room scanner flow, landing name/phone capture, room guest data, order placement WC fallback.
**Locked zones (untouched):** order placement payload, tax/SC/GST/delivery charge math, KOT/bill/print, sockets, Firebase, payments, backend.

---

## 0. Bug classification & TL;DR

| # | Finding | Class | Owner |
|---|---|---|---|
| **1** | **Silent `table_id = '0'` fallback for non-716 room/table orders without scan context** (ReviewOrder.jsx:949-951) | **Frontend logic gap** | Frontend |
| 2 | Landing customer-capture for room QR is purely admin-config-driven; no room-specific override | Frontend behaviour (works as designed) | Frontend / Config |
| 3 | No backend integration for "room guest / check-in" data; `air_bnb_id` is hardcoded `''`; no room name/phone prefill | Missing integration | Backend confirmation needed |
| 4 | Customer name/phone is **optional** at order placement (validated only if provided); blank values do NOT cause WC classification | Frontend behaviour (intentional) | Frontend |
| 5 | This issue is **independent of G1** — G1 fixed the post-order sessionStorage wipe; this is the *pre-submit* path with missing/invalid scan context | — | Frontend |

**Bottom line:** Yes — a non-716 room order can be silently submitted with `table_id = '0'` and the dashboard will misclassify it as Walk-In / WC. The trigger is missing/invalid scanned `tableId`, **not** missing customer name/phone. Customer fields are decoupled from room/table classification.

---

## 1. Affected flows

| Flow | Risk | Notes |
|---|---|---|
| **716 Hyatt Centric room flow** | Safe (post-G1) | Mandatory room re-pick guards `'0'` at ReviewOrder.jsx:802-807 + 954-959. |
| **Non-716 dine-in/room scan with scanned tableId** | Safe | `finalTableId = scannedTableId` (validated by `hasAssignedTable`). |
| **Non-716 dine-in/room without scanned tableId** | **AT RISK** | Multi-menu has *partial* validation; non-multi-menu (typical) has **no validation** — payload silently sends `table_id = '0'`. |
| **Walk-in (`type=walkin`)** | By design `'0'` | Backend treats `'0'` as walk-in/WC — intentional. |
| **Takeaway / Delivery** | By design no table | `table_id = '0'` is correct. |

---

## 2. Current room scanner / context flow

### 2.1 URL params (`useScannedTable.js:23-46`)
Reads from URL search params on every mount:

| Param (synonyms) | Role | Required? |
|---|---|---|
| `tableId` / `table_id` | Room or table identifier (shared namespace) | Required for valid scan |
| `tableName` / `table_no` | Display label (e.g. "Room 102") | Optional |
| `type` | `"table"` \| `"room"` \| `"walkin"` \| invalid→null | Recognised values only |
| `orderType` / `order_type` | `"dinein"` \| `"delivery"` \| `"takeaway"` \| `"take_away"` \| invalid→`'dinein'` | Defaults to `dinein` (backward compat) |
| `foodFor` / `food_for` | Menu filter (e.g. "Normal", "Party") | Optional |

**Persistence:** `sessionStorage` key `scanned_table_${restaurantId}` — overwritten on every new scan (line 50). Read fallback when no URL params (line 56-67).

### 2.2 Distinguishing room / table / walk-in
Frontend uses **only** the `type` URL param (`useScannedTable.js:31-33`):
- `type=room` → `roomOrTable = 'room'`
- `type=table` → `roomOrTable = 'table'`
- `type=walkin` → `roomOrTable = 'walkin'`
- Anything else → `roomOrTable = null`

There is **no other distinguishing field**.

### 2.3 What represents "valid room context"
- `tableId` non-empty AND `String(tableId) !== '0'` (`hasAssignedTable` in `orderTypeHelpers.js:42-44`).
- `room_or_table === 'room'` is purely a UI label / payload routing hint; it does NOT influence `table_id` validity.
- There is **no `room_id` field**, **no `air_bnb_id` derivation**, **no checked-in flag**.

### 2.4 What "room checked" / "checked-in" means in current code
**Nothing.** No occupancy or check-in concept exists in the frontend codebase. The phrase "room checked" maps onto **only one thing**: the scanned `tableId` is non-empty and non-`'0'`. There is:
- No API for room/check-in status (grep for `check-in`, `checkin`, `occupancy`, `occupant`, `guest` in `/app/frontend/src` returned **zero hits**).
- No active-room validation.
- No backend endpoint trace in `RUNTIME_API_FLOW_AUDIT.md` or `API_USAGE_MAP.md` referencing room occupancy.

### 2.5 Behaviour when room context is missing / cleared
- `useScannedTable()` returns `tableId: null`, `roomOrTable: null`, `isScanned: false`.
- LandingPage skips table-status check (`LandingPage.jsx:235-237`).
- ReviewOrder reaches the fallback at line 949-951 → `finalTableId = '0'`.

---

## 3. Landing name/phone mandatory rule — source

### 3.1 Mechanism (`LandingPage.jsx:586-599`)
```js
const showCustomerCapture = isTakeawayDeliveryMode
  ? !isAuthenticated
  : (configShowLandingCustomerCapture && !isAuthenticated);

const effectiveMandatoryName  = isTakeawayDeliveryMode ? true : mandatoryCustomerName;
const effectiveMandatoryPhone = isTakeawayDeliveryMode ? true : mandatoryCustomerPhone;
```

### 3.2 Source of each flag
| Flag | Source | Default |
|---|---|---|
| `isTakeawayDeliveryMode` | derived from `scannedOrderType` (`takeaway`/`delivery`/`take_away`) | computed |
| `configShowLandingCustomerCapture` | **Admin/local config** in `RestaurantConfigContext.jsx:25, 375` (`config.showLandingCustomerCapture === true`) | `false` |
| `mandatoryCustomerName` | **Admin config** `RestaurantConfigContext.jsx:93, 443` (`config.mandatoryCustomerName === true`) | `false` |
| `mandatoryCustomerPhone` | **Admin config** `RestaurantConfigContext.jsx:94, 444` (`config.mandatoryCustomerPhone === true`) | `false` |
| `isAuthenticated` / `isCustomer` | AuthContext (CRM token) | — |

### 3.3 Rule by channel
| Channel | Capture shown? | Name mandatory? | Phone mandatory? |
|---|---|---|---|
| **Takeaway** (URL) | YES (always, if not authed) | **YES** (always) | **YES** (always) |
| **Delivery** (URL) | YES (always, if not authed) | **YES** (always) | **YES** (always); also requires login at `LandingPage.jsx:432-435` to reach delivery address |
| **Dine-in (room scan)** | Only if `configShowLandingCustomerCapture === true` | Only if `mandatoryCustomerName === true` | Only if `mandatoryCustomerPhone === true` |
| **Dine-in (table scan)** | Same as room (config-driven) | Same as room | Same as room |
| **Walk-in (`type=walkin`)** | Same as dine-in (config-driven) | Same as dine-in | Same as dine-in |

**No restaurant-specific (e.g. 716) overrides**, no order-type-specific override beyond Takeaway/Delivery, no QR-type (room vs table) override.

### 3.4 Conclusion on mandatory rules
- For room scans, name/phone is **not enforced** unless the restaurant admin has flipped `mandatoryCustomerName` / `mandatoryCustomerPhone` flags in local config.
- The frontend has no API field like `customer_name_required`, `phone_required`, `customer_capture_required`, `room_customer_required`, etc.
- Default behaviour: capture is hidden, name/phone are blank → order placed with `cust_name: ''`, `cust_phone: ''`.

---

## 4. Room guest / customer data — population audit

### 4.1 Sources of `customerName` / `customerPhone` in ReviewOrder (`ReviewOrder.jsx:255-326`)

| Priority | Source | Notes |
|---|---|---|
| 1 | sessionStorage `sessionCustomerInfo` (line 255-277) | Set by checkout funnel within session |
| 2 | localStorage `guestCustomer` (line 281-306) | Set by `LandingCustomerCapture` on Browse Menu submit |
| 3 | Authenticated user (`AuthContext.user`, line 309-326) | CRM-logged-in customer |

### 4.2 What is **NOT** there
- **No room/check-in API call** anywhere in `/app/frontend/src/api/services/` (verified by grepping the directory).
- **No prefill from room data** — there is no code path that takes a room id and fetches a guest's name/phone.
- `air_bnb_id` is **hardcoded `''`** in both `placeOrder` (line 333) and `updateCustomerOrder` (line 465); never populated from room metadata.
- `pos_address_id` / `address_id` is irrelevant to room flow.

### 4.3 If room is checked-in, does name/phone become optional?
N/A — no concept of "checked-in" in code. Name/phone optionality comes purely from `mandatoryCustomerName/Phone` admin flags.

### 4.4 If room data is missing, what happens?
Same as if it's a table or walk-in flow without room data — the frontend doesn't know there is a "room" beyond the bare `roomOrTable === 'room'` UI label. The room-flag does not influence which fields are sent.

### 4.5 Can a room order proceed with blank name/phone?
**YES.** Verified at `ReviewOrder.jsx:826-831`:
```js
// Validate phone number only if provided (optional field)
if (customerPhone && customerPhone.trim() !== '' && !isPhoneNumberValid) {
  setShowPhoneError(true);
  toast.error('Please enter a valid 10-digit phone number');
  return;
}
```
The validation triggers only **if** phone is non-empty and invalid format. Blank phone passes through. There is no `if (!customerName)` block at all.

---

## 5. `finalTableId` calculation + fallback behaviour

### 5.1 The exact code (`ReviewOrder.jsx:949-951`)
```js
const finalTableId = hasAssignedTable(scannedTableId)
  ? scannedTableId
  : (isMultiMenu && tableNumber && hasAssignedTable(tableNumber) ? tableNumber : '0');
```

### 5.2 Conditions that yield `finalTableId = '0'`
| Path | scannedTableId valid? | isMultiMenu? | tableNumber valid? | result |
|---|---|---|---|---|
| Direct URL with no QR (any restaurant) | NO | * | * | `'0'` |
| Broken QR missing `tableId` param | NO | NO | NO | `'0'` |
| Multi-menu without scanned + manual entry empty | NO | YES | NO | `'0'` |
| Multi-menu without scanned + valid manual entry | NO | YES | YES | `tableNumber` |
| Any restaurant with valid scan | YES | * | * | `scannedTableId` |

### 5.3 Pre-submit guards that block `'0'`
| Guard | Where | Covers |
|---|---|---|
| 716 mandatory room pick | `ReviewOrder.jsx:802-807` and `954-959` | Restaurant 716 only |
| Multi-menu with no scan AND no `scannedOrderType` | `ReviewOrder.jsx:810-823` | **Logically unreachable** — condition `isDineInOrRoom(scannedOrderType) && !scannedOrderType` is contradictory unless `scannedOrderType` is `null/undefined` (the only case where both halves are true). Effective only for direct-URL multi-menu visits. |
| Phone validity check | `ReviewOrder.jsx:826-831` | Only when phone is provided |

### 5.4 The gap
**Non-716, non-multi-menu, room/table scan-context lost** — the order is silently placed with `table_id = '0'`. There is **no toast**, **no warning**, **no block**.

This matches the user's hypothesis: missing room context falls back to `table_id = 0` and dashboard classifies as walk-in/WC.

### 5.5 What happens at the API
`orderService.ts:332` builds `table_id: String(orderData.tableId || orderData.tableNumber || '')` — but ReviewOrder always passes the pre-computed `finalTableId` ('0' fallback). Backend behavior of `'0'` → WC is documented behaviour (the existing G1 fix comment at `OrderSuccess.jsx:317-319` literally says *"table_id falls back to '0' at ReviewOrder.jsx:949-951 and POS misclassifies the next order as walk-in / WC."*).

---

## 6. Relationship — name/phone vs room/table classification

| Scenario | Name | Phone | tableId | Dashboard shows |
|---|---|---|---|---|
| Room id present, name/phone blank | '' | '' | room id | **Room** (correct) |
| Room id missing, name/phone present | "Alice" | "+91…" | `'0'` | **WC / Walk-In** (incorrect for room flow) |
| Room id present, name/phone present | "Alice" | "+91…" | room id | **Room** (correct) |
| All missing | '' | '' | `'0'` | **WC / Walk-In** |

**Conclusion:** WC classification is purely a function of `table_id`. Name/phone fields are **decoupled** from the room/walk-in classification. They are not conflated.

---

## 7. Relation to prior G1 fix

| Aspect | G1 (fixed) | This issue (open) |
|---|---|---|
| Trigger | `clearScannedTable()` wiping sessionStorage on status 3 / 6 / 404 | scan context never present (broken QR, direct URL, sessionStorage cleared by browser, restaurant change cleanup at `ReviewOrder.jsx:336-358`) |
| When | Post-order completion (next order goes WC) | Pre-submit (current order goes WC) |
| Path | `OrderSuccess.jsx:320-322`, `360-362` | `ReviewOrder.jsx:949-951` |
| Restaurant gate | 716-only intentional wipe | No restaurant gate — affects all non-716 |
| sessionStorage involvement | YES — premature wipe | YES — context never set or cleared by other code paths |

### 7.1 Independence check
Even if sessionStorage is **never** wiped (G1 fix in place), this issue can still trigger when:
- A user opens the URL directly without QR params.
- Restaurant change cleanup wipes it (`ReviewOrder.jsx:336-358`).
- A new tab is opened on the same device after `sessionStorage` has been browser-cleared.
- The QR code itself is malformed (missing `tableId`).

### 7.2 G3 silent toast at `ReviewOrder.jsx:949` — would it help?
Yes — adding a defensive toast + return when `finalTableId === '0'` AND `roomOrTable === 'room'` (or `scannedRoomOrTable === 'room'`) would convert the silent WC fallback into a user-visible block. This is precisely the deferred G3 patch the previous session warmed-up.

---

## 8. Files inspected (read-only)

| File | Lines |
|---|---|
| `/app/frontend/src/hooks/useScannedTable.js` | 1–93 |
| `/app/frontend/src/utils/orderTypeHelpers.js` | 1–80 |
| `/app/frontend/src/pages/LandingPage.jsx` | 120–500, 570–750 |
| `/app/frontend/src/pages/ReviewOrder.jsx` | 270–365, 505–560, 790–980 |
| `/app/frontend/src/pages/OrderSuccess.jsx` | 305–370 (G1 fix) |
| `/app/frontend/src/api/services/orderService.ts` | 300–490 (placeOrder + updateCustomerOrder payloads) |
| `/app/frontend/src/api/transformers/helpers.js` | 400–493 (multi-menu payload) |
| `/app/frontend/src/api/utils/restaurantIdConfig.js` | 1–15 |
| `/app/frontend/src/context/RestaurantConfigContext.jsx` | grep hits for capture / mandatory flags |
| `/app/frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | (already inspected last session) |
| `/app/memory/current-state/API_USAGE_MAP.md` | scan/order entries |
| `/app/memory/current-state/RUNTIME_API_FLOW_AUDIT.md` | scan/order entries |
| `/app/memory/change_requests/ROOM_SCANNER_INTERMITTENT_WC_INVESTIGATION_2026-05-08.md` | full |
| `/app/memory/change_requests/ROOM_SCANNER_INTERMITTENT_WC_STATUS_2026-05-09.md` | full |

No files modified.

---

## 9. Root cause

**For each leaked WC there is exactly one root cause:** `finalTableId` resolves to the literal string `'0'` at `ReviewOrder.jsx:949-951`, and the only restaurant-aware guard that blocks `'0'` lives in the 716-specific block at line 803-807 / 954-959.

For all other restaurants — including hotels with room scanners other than 716 — the order is permitted to be placed with `table_id = '0'`, and the backend interprets this payload as walk-in/WC. Customer name/phone fields play **no role** in this classification.

---

## 10. Ownership classification

| Concern | Owner | Notes |
|---|---|---|
| Silent `table_id = '0'` block at submit | **Frontend** | Add a guard mirroring the 716 pattern but generalised: when scanned context says `roomOrTable === 'room'` (or QR `type=room`) and `finalTableId` is `'0'`, block + toast. |
| Restoring scan context that was wiped | Frontend | Already partially fixed by G1; remaining wipe paths (`ReviewOrder.jsx:336-358` on restaurant change) are intentional. |
| Room/check-in / guest API | **Backend** | No frontend can prefill room guest data without an API; backend confirmation needed if owner wants this. |
| Backend interpretation of `table_id = '0'` | Backend | Documented as walk-in/WC; no change requested. |
| Mandatory name/phone for room flows | Frontend (config) | Owner can add a `mandatoryCustomerName/Phone` admin toggle for room QR if desired — already supported via existing flags. |

---

## 11. Proposed fix options (no code applied)

### Option A — Generic "missing room/table id" pre-submit block (frontend-only, smallest delta)
Add an early-return guard in `ReviewOrder.jsx` `handlePlaceOrder` mirroring the 716 pattern but for any room QR:

```pseudo
if (scannedRoomOrTable === 'room' && !hasAssignedTable(finalTableId)) {
  toast.error('Room context lost. Please rescan the QR code.');
  return;
}
```

- **Pros:** smallest blast radius; blocks the silent WC silent fall-through; works for all hotels, not just 716; reuses existing `hasAssignedTable` helper; no payload change.
- **Cons:** does not auto-recover; user must rescan.
- **Risk:** very low. No backend, payload, tax, KOT, payment touched.

### Option B — Stronger universal guard for all dine-in/room
Block `'0'` for any `scannedRoomOrTable === 'room' || 'table'` AND `isDineInOrRoom(scannedOrderType)`. Same pattern as A but covering table scans too.

- **Pros:** catches stale/missing scan for both rooms and tables.
- **Cons:** could surprise direct-URL dine-in walk-in users who legitimately want `'0'` (rare but possible).
- **Risk:** low; need to confirm legitimate walk-in flows still pass (`type=walkin` keeps `roomOrTable='walkin'` so it passes the guard).

### Option C — Re-instate the G3 silent-toast fallback (minimal)
Append a non-blocking toast `'Order placed as walk-in (table not detected)'` when the fallback fires. Doesn't block; informs.

- **Pros:** lowest UX disruption.
- **Cons:** does not prevent misclassified orders; only makes it observable.
- **Risk:** very low; cosmetic only.

### Option D — Backend room/check-in API + auto-prefill name/phone
Owner adds a backend endpoint `GET /room/{room_id}/guest` returning `{ name, phone, checked_in: bool }`. Frontend calls it on room scan and prefills LandingCustomerCapture / ReviewOrder.

- **Pros:** delivers the feature owner originally asked about ("room checked-in" semantic).
- **Cons:** large effort; backend confirmation required; out of current scope.
- **Risk:** medium-high; touches multiple layers.

### Recommended path (matches owner's "minimal" preference)
**Option A** for now (1-line guard, mirrors 716 pattern, prevents silent WC) **+ Option C** (toast on remaining fallback for visibility). Both can ship as one CSS-light JSX patch in `ReviewOrder.jsx` only. Option D parked unless owner wants the room-guest feature.

---

## 12. Risks & edge cases

| Edge case | Impact | Mitigation |
|---|---|---|
| User scans valid room QR, then opens a NEW tab on same device | sessionStorage carries (same-origin) → safe | None needed |
| User scans valid room QR, then closes browser, reopens | sessionStorage cleared by browser → fallback fires | Option A blocks correctly |
| QR explicitly omits `tableId` for "scan to walk-in" | should classify as WC (intentional) | Option A guards on `roomOrTable === 'room'` only — walk-ins still pass |
| Restaurant 716 (intentional 716-only behavior) | unchanged | Option A's guard is additive, runs before 716-only block — must `return` early so 716 block still runs |
| Multi-menu legacy direct-URL dine-in | already partially handled at line 810 | unchanged |
| Edit-order flow | uses `editingOrderId` + `finalTableId`; if room context lost mid-edit, same fallback applies | guard equally applies pre-update |

---

## 13. Validation checklist (for future implementation)

### 13.1 Valid room QR (non-716 hotel)
- [ ] Scan → `useScannedTable` returns `{ tableId: <id>, roomOrTable: 'room', orderType: 'dinein' }`.
- [ ] LandingPage shows room badge; capture shown only if config flags set.
- [ ] ReviewOrder auto-fills `tableNumber` and `roomOrTable === 'room'`.
- [ ] On Place Order: `finalTableId === scannedTableId`, payload `table_id` matches.
- [ ] Dashboard shows order under correct **Room**, not WC.

### 13.2 Room QR with cleared sessionStorage (mid-flow)
- [ ] Manual `sessionStorage.removeItem('scanned_table_…')` from devtools.
- [ ] Reload `/review-order`.
- [ ] Place Order should be **blocked** with a "Room context lost" toast (Option A).
- [ ] No `table_id = '0'` payload should leave the browser.

### 13.3 Direct URL `/<rid>/review-order` (no scan)
- [ ] Fallback to `'0'` triggers, but Option A blocks for room flow.
- [ ] Walk-in path remains unblocked (when `type=walkin`).

### 13.4 Missing customer name/phone in room flow
- [ ] If `mandatoryCustomerName/Phone` flags off → order proceeds, `cust_name/phone` blank.
- [ ] Dashboard still shows correct **Room**, not WC.
- [ ] Confirm classification depends only on `table_id`, not on name/phone (regression).

### 13.5 716 — no regression
- [ ] Mandatory room pick still triggers at line 802-807.
- [ ] Re-pick flow on cancel/paid still wipes scan context (G1 716-only path).
- [ ] No new toast appears that would confuse 716 users.

### 13.6 Walk-in (`type=walkin`)
- [ ] `roomOrTable === 'walkin'` → Option A guard does NOT fire.
- [ ] Order placed with `table_id = '0'` as expected (walk-in semantics).

### 13.7 Normal table scan (non-room)
- [ ] `roomOrTable === 'table'` with valid `tableId` → unchanged behavior.
- [ ] If table scan context is lost, optional: extend Option B to cover tables too.

### 13.8 Takeaway / Delivery
- [ ] `effectiveMandatoryName/Phone` remain `true` (always); validation on Browse Menu unchanged.
- [ ] Order proceeds with `table_id = '0'` (walk-in-of-takeaway is correct).

### 13.9 Regression — payload/tax/print/socket/backend
- [ ] No changes to: `placeOrder` payload shape, tax calc, SC/GST, KOT, bill print, sockets, payments, backend.
- [ ] `git diff` shows changes only inside `ReviewOrder.jsx` `handlePlaceOrder`.

---

## 14. Approval gate — STOP

This document is investigation only. No code or memory/current-state has been modified.

Owner approval required before any of the following are implemented:
1. **Option A** — pre-submit "Room context lost" guard in `ReviewOrder.jsx` (recommended).
2. **Option B** — extend the guard to table scans.
3. **Option C** — silent informational toast on remaining `'0'` fallbacks.
4. **Option D** — backend room/check-in API + auto-prefill (out of scope unless backend ready).

Each item is independently approvable.

---

## 15. Backend confirmations needed (if pursuing room-guest features)

If owner wants room-guest auto-prefill (Option D):
- Confirm whether a hotel-PMS / check-in API exists at backend.
- Confirm field names: `guest_name`, `guest_phone`, `checked_in`, `room_no`, `air_bnb_id`.
- Confirm whether `air_bnb_id` is *meant* to map to a room booking id.
- Confirm whether the backend already has a `room_id` distinct from `table_id`.

If pursuing only Options A/B/C — **no backend confirmation needed**.
