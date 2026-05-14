# CR Planning Report — Delivery Address Selection Clarity + Saved Address Edit

**Date:** 2026-02 (current session)
**Status:** Planning / impact analysis only. **No code touched.** **No `/app/memory/current-state/` edits.**
**Predecessor doc:** `/app/memory/change_requests/DELIVERY_PHONE_AND_ADDRESS_FLOW_INVESTIGATION_2026-02-XX.md`
**Locked zones (untouched):** order placement payload structure, tax/SC/GST/delivery charge math, KOT/bill/print, sockets, Firebase, payments, backend.

---

## 1. CR classification

| # | Part | Class | Owner |
|---|---|---|---|
| **A** | Address selection clarity (header + SELECTED pill) | Frontend UX | Frontend only |
| **B** | Saved address edit pencil + reuse `da-form` | Frontend feature | Frontend only — backend already done |

Both parts are **fully shippable without backend changes**. Update API exists and is correctly typed.

---

## 2. Affected flow

`DeliveryAddress.jsx` — the customer-facing delivery address selection page. Reached after takeaway/delivery customer capture, before the menu screen. **No other surface touched.**

---

## 3. Current selected/default address behaviour

### 3.1 State (`DeliveryAddress.jsx`)
- `addresses` — saved list from CRM (`fetchAddresses` at line 131).
- `selectedId` — id of the currently chosen card.
- `markerPos` — `{ lat, lng }` map pin.
- `currentLocation` — last-known browser geolocation.
- `reverseAddress` — Google reverse-geocoded text used when no saved address is selected.
- `distanceResult` — `{ shipping_status, shipping_charge, shipping_time, distance }`.

### 3.2 Initial selection rules (lines 134-151)
1. On mount, `fetchAddresses()` runs.
2. Default = address with `is_default: true`. Fallback to first saved address if none flagged.
3. Default seeds `markerPos` and triggers `checkDistance()`.

### 3.3 What can the user see today
- Orange `IoCheckmarkCircle` icon when `isSelected === true` (line 686). This is the **only** "selected" visual signal.
- Static `Default` pill on cards where `is_default === true` (line 676). Independent of selection state.
- A `da-selected-display` text block above the saved address list (lines 611-616) shows the address text — but **without** a "Delivering to:" header.

### 3.4 Default vs Selected can diverge
| State | Card UI today |
|---|---|
| Default + selected (initial load) | Orange ✓ + Default pill on same card |
| User selects a non-default | Orange ✓ on selected; Default pill on another card |
| User drags map pin / "Use Current Location" | `selectedId = null`; **no card** has the ✓; `displayAddress` shows reverse-geocoded text |

The orange tick is the only signal — easily missed on small phones.

---

## 4. Confirm & Proceed address source (line 385-410)

```
if (selectedId matches a saved address)
   → setDeliveryAddress(<saved object>)
else
   → setDeliveryAddress({ address: reverseAddress, latitude, longitude, … })

setDeliveryCharge(distanceResult.shipping_charge || 0)
navigate(<menu>)
```

Cart's `deliveryAddress` is later flattened into the order payload via `helpers.js:441-459` — `address_id`, `address`, `latitude`, `longitude`, `pincode`, `house`, `road`, `floor`, `address_type`, `contact_person_name`, `contact_person_number`. **No payload changes proposed.**

---

## 5. Current GPS / current-location flow

- `<MdMyLocation />` floating button on the map (line 599-608).
- `requestCurrentLocation()` → `navigator.geolocation.getCurrentPosition` (high-accuracy, 10s timeout).
- `handleUseCurrentLocation()` sets marker, **clears `selectedId` to null**, reverse-geocodes via Google Maps, and runs `checkDistance()`.
- The reverse-geocoded address is **NOT auto-saved** to CRM. It's held only in state and flattened into cart on Confirm.
- Distance/charge/ETA: `${MANAGE_BASE_URL}/api/v1/config/distance-api-new` (POST), debounced 500 ms.

GPS-derived addresses are **transient** — not editable via the saved-address edit pencil in this CR. To save them, the user must add via the existing "Add New Address" form. (Not changing this here.)

---

## 6. Saved address API audit

| Operation | v1 path | v2 path | Service method (`crmService.js`) | Wired in `DeliveryAddress.jsx`? |
|---|---|---|---|---|
| Fetch list | `GET /customer/me/addresses` | `GET /scan/addresses` | `crmGetAddresses` | ✅ line 131 |
| Create | `POST /customer/me/addresses` | `POST /scan/addresses` | `crmAddAddress` (line 486-507) | ✅ line 334 |
| **Update** | `PUT /customer/me/addresses/{id}` | `PUT /scan/addresses/{addr_id}` | **`crmUpdateAddress` (line 516-532)** | ❌ **NOT WIRED** |
| Delete | `DELETE /customer/me/addresses/{id}` | `DELETE /scan/addresses/{addr_id}` | `crmDeleteAddress` (line 541-555) | ✅ line 356 |
| Set default | `POST /customer/me/addresses/{id}/set-default` | `PUT /scan/addresses/{addr_id}/default` | `crmSetDefaultAddress` (line 565+) | ✅ line 375 |

### 6.1 Update API confirmed ready

```js
crmUpdateAddress(token, addressId, addressData) → {
  success: true,
  message: 'Address updated',
  address_id: <stable>,
}
```
- v1: returns full payload from server (`{ remaining_addresses }`-style).
- v2: returns only `address_id`; **caller must re-fetch the list** to render updated values (per the JSDoc comment on line 514).
- `addressData` is partial — send only fields to change. Service layer doesn't enforce shape, so we'll send full set of editable fields for safety.
- `address_id` stays stable across edits → cart's `address_id` reference remains valid.

**No backend confirmation needed.** API is documented + typed + verified ready.

---

## 7. Edit-API readiness verdict

✅ **Ready.**
- Service exists, handles v1+v2.
- Returns `address_id` for cache key continuity.
- Supports partial updates (per docstring).
- Not used by any current frontend file (verified: `grep crmUpdateAddress` → only the export line).
- No backend changes needed; no FastAPI proxy involvement (CRM endpoint is hit directly from frontend per existing pattern).

---

## 8. Proposed Part A — Address Selection Clarity

### 8.1 Header above the saved-address list
Render above the existing `da-saved-list` block:
```
┌──────────────────────────────────────────┐
│ DELIVERING TO:                           │   ← new uppercase, muted label
│ <selectedDisplayAddress text>            │
│ (existing distance/charge/ETA row stays) │
└──────────────────────────────────────────┘
```
- Uppercase 12px label, color `var(--text-light)`, padding `8px 16px`.
- The address text is the same `displayAddress` already computed; only the label is new.

### 8.2 SELECTED pill on the chosen card
Render inside the card header next to the existing `Default` pill:
```
🏠  Home  [Default]  [● SELECTED]                ✓
```
- Visible only when `addr.id === selectedId`.
- Visual: green dot + uppercase "SELECTED", `bg-green-50 text-green-700 border-green-200`, `rounded-full px-2 py-0.5 text-xs font-medium`.
- Does NOT replace the orange `IoCheckmarkCircle` — both stay (redundancy = clarity).

### 8.3 State variants
| User state | Header text | Card markers |
|---|---|---|
| Default + selected (initial) | "DELIVERING TO: <addr>" | `[Default] [● SELECTED]` + ✓ on default card |
| Selected ≠ default | "DELIVERING TO: <addr>" | `[● SELECTED]` + ✓ on chosen; `[Default]` on the other |
| Map-pin drag / Use Current Location | "DELIVERING TO: <reverse-geocoded text>" | No card has SELECTED or ✓ |
| Empty addresses list | "DELIVERING TO: Drag pin or add an address" | — |

### 8.4 Files
- `DeliveryAddress.jsx` — JSX additions (≈10 lines for header + 5 lines for pill).
- `DeliveryAddress.css` — 2 new rules (header label + pill styling). ~15 lines.

---

## 9. Proposed Part B — Saved Address Edit Pencil

### 9.1 UI surfaces
- New `<button data-testid="da-card-edit-{id}">` with `<MdOutlineEdit />` icon next to existing Set-Default + Delete buttons (line 685-706).
- Visible on every saved address card (default included).
- Tapping it opens the existing `da-form` (the same component used for Add New Address) in **edit mode**.

### 9.2 New state
```js
const [editingId, setEditingId] = useState(null);  // null = create mode; <id> = edit mode
```

### 9.3 Form open / preload behaviour
On pencil tap:
1. `setEditingId(addr.id)` → set form state from `addr` (address, city, pincode, house, road, floor, address_type, contact_person_name, contact_person_number, latitude, longitude).
2. Scroll the form into view (existing `<form ref={formRef} />` already supports this).
3. Form heading switches: `editingId ? "Edit Address" : "New Address"` (line 740-ish).
4. CTA label switches: `editingId ? "Save Changes" : "Save Address"`.
5. Cancel button stays — simply resets form + `setEditingId(null)`.
6. If user taps pencil on a different card while form is open, replace form contents with the new card's values.

### 9.4 Save handler
```js
async function handleSaveAddress() {
  validate();
  if (editingId) {
    const result = await crmUpdateAddress(crmToken, editingId, payload);
    toast.success('Address updated');
  } else {
    const newAddr = await crmAddAddress(crmToken, payload);
    setSelectedId(newAddr.id);
    toast.success('Address saved');
  }
  await fetchAddresses();          // re-pull canonical list (v2 update returns only id)
  setEditingId(null);
  resetForm();
}
```

### 9.5 Post-save behaviour
| State | Behaviour |
|---|---|
| Edited address was the selected one | Keep `selectedId === editingId` → re-pull list → re-pick same card → `markerPos` re-syncs to new lat/lng → `checkDistance()` recomputes delivery charge/ETA |
| Edited address was the default | `is_default` is preserved (never sent in update payload) — Default pill survives |
| Edited address was unselected | List refreshes silently; no map / charge change |
| User cancels mid-edit | No mutation; form closes; `selectedId` unchanged |
| Failed update | Toast `Failed to update address. Please try again.`; form stays open with edits intact |

### 9.6 Files
- `DeliveryAddress.jsx` — add pencil button (≈3 lines), `editingId` state + form preload + save branching (≈25 lines).
- `DeliveryAddress.css` — pencil button styling (already exists for Set-Default + Delete; reuse `.da-card-action`).
- ZERO changes to: `crmService.js`, payload helpers, cart context, ReviewOrder.

---

## 10. Files likely to change

| File | Part A | Part B | Risk |
|---|---|---|---|
| `frontend/src/pages/DeliveryAddress.jsx` | header + pill | pencil + edit mode | LOW |
| `frontend/src/pages/DeliveryAddress.css` | label + pill rules | reuse existing | LOW |
| `frontend/src/api/services/crmService.js` | — | — (already has `crmUpdateAddress`) | NONE |
| `frontend/src/__tests__/pages/DeliveryAddress.test.js` | extend | extend | LOW |

NO change to: `cartTransformer.ts`, `helpers.js`, `orderService.ts`, `ReviewOrder.jsx`, `OrderSuccess.jsx`, `LandingPage.jsx`, `CartContext.js`.

---

## 11. Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| User confuses Default vs Selected | Low | Two distinct pills (`[Default]` orange, `[● SELECTED]` green) + uppercase header |
| Map-pin drag de-selects the saved card silently | Already today | Header swap to "DELIVERING TO: <reverse text>" makes the change explicit |
| Edit invalidates `address_id` reference in cart | Very Low | `crmUpdateAddress` returns same `address_id`. Verified in service docstring. |
| Edit changes lat/lng → delivery charge stale | Low | `fetchAddresses()` post-save → re-pick card → `checkDistance()` re-runs (debounced 500 ms) |
| Edit changes pincode → free-zone calc stale | Low | Same — re-pull list rehydrates state; distance API recomputes |
| GPS-derived address doesn't have a save → user expects pencil | N/A | Pencil only on saved cards; existing "Add New Address" form is the path to save GPS results (no change to that flow) |
| v1 vs v2 API drift | Low | `crmUpdateAddress` already handles both via `isV2()` |
| Delete or set-default flows broken by edit-mode state | Low | `editingId` is independent state; Delete/Set-Default ignore it |
| Edit-mode preserves default flag accidentally | None | `is_default` never sent in update payload; backend retains existing flag |
| Order payload contract change | None | Payload unchanged; only address VALUES potentially differ when user actually edits |
| Tax / SC / GST math change | None | None of those formulas reference saved-address fields |
| Restaurant change cleanup | None | `editingId` is local component state; resets on unmount/route change |

---

## 12. Validation checklist

### 12.1 Part A — Selection clarity
- [ ] On load, default address auto-selects → header shows "DELIVERING TO: <default text>", chosen card shows `[Default] [● SELECTED]` + ✓.
- [ ] Tapping a non-default card moves SELECTED pill + ✓ to that card; Default pill stays on its original card; header text updates to the new selection.
- [ ] Confirm & Proceed sends `setDeliveryAddress(<chosen>)` with `address_id` matching the SELECTED card.
- [ ] Use Current Location → no card has SELECTED/✓; header reads "DELIVERING TO: <reverse-geocoded text>".
- [ ] Map pin drag → same behaviour as Use Current Location.
- [ ] Distance / charge / ETA bar continues to work; no regression.

### 12.2 Part B — Saved address edit
- [ ] Pencil icon appears on every saved card (default + non-default).
- [ ] Tapping pencil opens `da-form` prefilled with that card's data; heading reads "Edit Address"; CTA reads "Save Changes".
- [ ] User changes address text → tapping Save Changes calls `crmUpdateAddress(token, <id>, payload)` exactly once.
- [ ] On success: toast shown; list re-fetches; updated card reflects new text; if it was selected, it stays selected; map + delivery charge re-sync if lat/lng changed.
- [ ] Default flag preserved across edits.
- [ ] Tapping Cancel discards edits; list unchanged.
- [ ] Tapping pencil on another card mid-edit replaces form contents.
- [ ] Failed update → toast `Failed to update address. Please try again.`; form stays open.
- [ ] Delete and Set-Default unaffected.
- [ ] Order payload uses updated address values + correct `address_id`.
- [ ] v1+v2 both work (toggle `REACT_APP_CRM_API_VERSION`).

### 12.3 Regression
- [ ] No payload structure change to `placeOrder` / `updateCustomerOrder`.
- [ ] No tax / SC / GST / delivery charge formula change (charge value may differ if user edits coordinates — that's correct behaviour, not a regression).
- [ ] No KOT / bill / print / payment / socket / FastAPI changes.
- [ ] No `/app/memory/current-state/` change.

---

## 13. Implementation phases

Both parts are **isolated to `DeliveryAddress.jsx` + `DeliveryAddress.css`** with no shared logic, **no risk of conflict**, and roughly equal effort.

### Recommended: ship as a single PR (one phase)
- Combined diff is small (~50 lines of JSX + ~30 lines of CSS).
- Reduces test cycle overhead (one validation pass covers both).
- Same risk surface; same rollback; same regression check.

### Alternative: ship Part A first, Part B second
- Use only if owner wants to validate selection clarity in isolation before adding edit capability.
- Part A alone unblocks the most common UX confusion (selected vs default).
- Part B can ship 1-2 days later with no rework.

**My recommendation:** single PR (one phase). Owner override welcome.

---

## 14. Approval gate — STOP

This is planning only. **No code modified. No `/app/memory/current-state/` modified.**

Owner approval required on:

| # | Question | Default if you don't override |
|---|---|---|
| **D1** | Approve Part A (header "DELIVERING TO:" + green "SELECTED" pill on selected card) | YES |
| **D2** | Approve Part B (pencil icon on each saved card → reuse `da-form` in edit mode → `crmUpdateAddress`) | YES |
| **D3** | Ship as single PR or two phases? | Single PR |
| **D4** | Header copy: "DELIVERING TO:" or "Delivering To" or "Currently Selected" | "DELIVERING TO:" (uppercase, terse, matches owner's wording in CR brief) |
| **D5** | Selected pill copy: "SELECTED" or "Delivering Here" or "Currently Selected" | "SELECTED" (terse, fits next to Default pill) |
| **D6** | Pencil icon: `MdOutlineEdit` (already imported) or `IoCreateOutline` | `MdOutlineEdit` |
| **D7** | What to do if user edits the currently-SELECTED address and lat/lng changed | Re-pick same id post-fetch, auto-recenter map, run `checkDistance()` |
| **D8** | What to do if user edits a non-selected address | Refresh list silently, no selection change |

Reply **"approve all defaults"** and I'll implement (~80 LOC total, single PR, only `DeliveryAddress.jsx` + `DeliveryAddress.css`).
Or override any of D1–D8 with your preferences.

---

## 15. Out of scope (locked)

- Backend / FastAPI / API contract — no changes.
- Order placement / update payload structure — no changes (only address VALUES change when user edits).
- Tax / SC / GST / delivery charge formula — no changes.
- Payment / KOT / bill / print / sockets / Firebase — no changes.
- GPS-derived address persistence (auto-save on Use Current Location) — out of scope; existing behaviour preserved (user must explicitly Add New Address to save).
- New filtering on saved address types — no changes.
- `/app/memory/current-state/` — no changes.

---

## 16. Final recommendation

**Status:** READY FOR IMPLEMENTATION pending D1–D8 owner answers.

| Gate | Outcome |
|---|---|
| Backend confirmation needed? | **NO** |
| API contract change? | **NO** |
| Payload structure change? | **NO** |
| Edit-address API ready? | **YES — `crmUpdateAddress` v1+v2 verified** |
| Distance/charge recalc clear? | **YES** — existing `checkDistance()` rerun on `markerPos` change |
| 716 / non-room flow impact? | **NONE** — `DeliveryAddress.jsx` only renders for delivery mode |
| Estimated diff | ~50 LOC JSX + ~30 LOC CSS in 2 files |

If you accept D1–D8 defaults, implementation is a one-shot ~80-line change with low risk. If you override any, share the wording/icon/behaviour and I'll re-confirm before coding.
