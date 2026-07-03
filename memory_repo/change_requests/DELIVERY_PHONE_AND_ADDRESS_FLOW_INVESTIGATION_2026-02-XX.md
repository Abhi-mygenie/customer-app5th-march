# Investigation Report — Delivery Phone Field + Current Address Flow + Saved Address Edit API

**Date:** 2026-02 (current session)
**Status:** Investigation only. No code touched. No memory/current-state edits.
**Scope:** Scan & Order customer app — delivery / customer-details / phone / address flow
**Restriction reminder:** No payload, tax, charge, payment, KOT, socket, or API contract changes.

---

## 0. Issue classification

| # | Issue | Class | Owner |
|---|-------|-------|-------|
| 1 | `+91` country code editable in phone field | UX bug / behavioural defect | Frontend |
| 2 | Selected/current delivery address visually unclear | UX clarity gap | Frontend |
| 3 | Saved-address edit support | Missing UI feature | Frontend (API already exists) |

---

## 1. Phone Field (`+91` country code editable)

### A. Where it lives
- Component: `/app/frontend/src/components/CustomerDetails/CustomerDetails.jsx` (lines 1–112)
- Component: `/app/frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` (lines 1–81)
- Library: `react-phone-number-input@^3.4.16` (`/app/frontend/package.json:66`)
- Used by:
  - `LandingCustomerCapture` → `LandingPage.jsx` (delivery / takeaway / dine-in capture)
  - `CustomerDetails` → `ReviewOrder.jsx` (checkout name+phone gate)

### B. Current behavior
- Both components use the `<PhoneInput>` shadow component.
- `LandingCustomerCapture` passes the `international` prop (line 41) → input value is always stored in **E.164** format (`+919876543210`) and the `+91` prefix is **rendered inside the editable `<input>`**. The country flag on the left IS a `<select>` dropdown of 200+ ISO countries (default `IN`).
- `CustomerDetails` passes only `defaultCountry="IN"` (no `international` prop, line 82). However once the user types or the value is hydrated from props, the library normalises to E.164 internally; the displayed text follows the active country format (national or international depending on entry).
- **CSS impact:** in `LandingCustomerCapture.css:72` there is an explicit comment `Hide the country code text (+91) — keep only the flag`. So the visible `+91` shown in screenshots is from `CustomerDetails` (Review Order screen), **not** the landing capture (which hides the dial code by design).
- **Editability:** `react-phone-number-input` lets the user backspace the `+91` characters out of the input. If they type a different leading code (e.g. `+1`), the library auto-switches the country flag accordingly. So the country IS technically selectable two ways:
  1. Clicking the flag dropdown on the left (intended UX).
  2. Manually editing the dial code prefix inside the text input (unintended UX — what the owner is calling out).

### C. State + payload mapping
- Component holds the full E.164 string in a single state `phoneValue` (e.g. `+919579504871`).
- Splitting into `dial_code` + `cust_phone` happens only at order placement, in `/app/frontend/src/api/transformers/helpers.js`:
  - `extractPhoneNumber()` (line 245–258): strips `+91` (or any leading `+<n>+`) → `cust_phone`.
  - `getDialCode()` (line 265–274): if string starts with `+91` → `'+91'`; else returns first whitespace-split token, fallback `+91`.
  - Final order payload (line 433–491) sends:
    - `dial_code`: e.g. `+91`
    - `cust_phone`: e.g. `9579504871`
    - `contact_person_number`: full `deliveryAddress.contact_person_number` (no split — sent as-is, line 463)
- CRM service additionally sends `country_code: '91'` (digits only, no `+`) to `/customer/send-otp`, `/customer/verify-otp`, `/customer/forgot-password` (`crmService.js:307, 346, 392`). The `phone` body for these calls is stripped of the `+91` prefix via `stripPhonePrefix()` (line 263).

### D. Is the editable `+91` intentional?
**No.** It is the default behaviour of `react-phone-number-input` with `international` mode + a visible dial code prefix. The `LandingCustomerCapture.css` already hides the dial-code text intentionally; `CustomerDetails.css` does not, which is why the prefix appears visible & editable on Review Order.

There is no business reason for the user to type the country code by hand — every checkout payload normalises to `+91` / `dial_code: +91` regardless. The only legitimate user-facing affordance for changing country is the flag dropdown.

### E. Implementation options + risks
| Option | Description | Risk |
|---|---|---|
| **A. Hide the dial-code text (CSS only)** | Mirror `LandingCustomerCapture.css:72-79` style on `CustomerDetails.css` to hide the `+91` text but keep the flag dropdown clickable. | LOW — CSS-only, no payload change. The internal value still stays E.164, transformer untouched. Confirmation: the user can still tap the flag to switch country. |
| **B. Replace input with a flag-dropdown + plain digit-only `<input>`** | Wrap with a custom country-picker; phone state stitches `dialCode + nationalDigits` on every change. | MEDIUM — adds bespoke component + state plumbing; risk of regression in the OTP/order flow. Requires retest of `extractPhoneNumber` and `getDialCode`. |
| **C. Lock country to IN, no picker** | Disable the country dropdown (single-country mode). | HIGH — strips legitimate international support; not desired by owner. |
| **D. Leave as-is** | No change. | Owner explicitly flagged this as undesired. |

**Recommended:** Option A (CSS hide). Smallest blast radius, fully reversible, no business logic touched, no payload field changes. Aligns Review Order with the existing Landing Capture style.

---

## 2. Address Selection / Current-Address Flow

### A. Where it lives
- Page: `/app/frontend/src/pages/DeliveryAddress.jsx` (846 lines)
- Styles: `/app/frontend/src/pages/DeliveryAddress.css`
- Tests: `/app/frontend/src/__tests__/pages/DeliveryAddress.test.js`

### B. State model
- `addresses` (saved list from CRM)
- `selectedId` — id of the saved address currently chosen
- `markerPos` `{ lat, lng }` — current map pin position
- `currentLocation` — last-known browser geolocation lat/lng
- `reverseAddress` — formatted string from Google reverse-geocode (used when no saved address is selected)
- `distanceResult` — `{ shipping_status, shipping_charge, shipping_time, distance }`

### C. Selection rules (line 128–151)
1. On page mount, `fetchAddresses()` runs.
2. Default = address with `is_default: true`. If none, fall back to first address (`addrs[0]`).
3. The default's lat/lng seeds `markerPos` and triggers `checkDistance()` for delivery cost/ETA.

### D. Selection UI affordances
- Saved address cards (line 660–711): clicking sets `selectedId`, recenters map, runs distance check.
- "Default" badge (line 676): purely visual — does NOT mean it's the active selection.
- Orange checkmark `<IoCheckmarkCircle className="da-card-check" />` (line 686): rendered ONLY when `isSelected === true`. So the orange tick = "this is the chosen delivery address." Owner's confusion is valid — this is not labelled.
- Selected address text appears in `da-selected-display` block above the addresses list (line 611–616) but with no "Delivering to:" header.

### E. Default vs. selected can diverge
Yes. Once user clicks a different card, `selectedId` changes but `is_default` stays where it was. Three states:
- Default + selected (initial load): orange tick + "Default" badge on same card.
- Selected ≠ default: orange tick on a non-default card; "Default" badge on another card.
- Neither (after dragging map pin or `Use Current Location`): `selectedId = null` and reverse-geocoded text drives `displayAddress`.

### F. What is sent on `Confirm & Proceed to Menu` (line 385–410)
- If `selectedId` matches a saved address → that full address object stored to cart (`setDeliveryAddress`).
- Else (pin dragged or current-location used) → an ad-hoc object `{ address: reverseAddress, latitude, longitude }` is stored.
- `setDeliveryCharge(distanceResult.shipping_charge || 0)` updates the cart delivery charge.
- The cart's `deliveryAddress` is later flattened into the order payload (`helpers.js:441-459`) — `address_id`, `address`, `latitude`, `longitude`, `pincode`, `house`, `road`, `floor`, `address_type`, `contact_person_name`, `contact_person_number`. **No edits to this contract are proposed.**

### G. UX clarity gap
- The orange checkmark + card highlight is the only signal of "this is the active delivery address."
- There is no inline label like "Delivering to:" or "Selected".
- The top `da-selected-display` panel just shows raw text without a "Selected delivery address" header.

### H. Implementation options + risks
| Option | Description | Risk |
|---|---|---|
| **A. Add a "Delivering to:" label above `da-selected-display`** | Static text + small icon. | LOW — purely additive UI. |
| **B. Add a "SELECTED" pill on the selected card** | Render a small badge next to the address-type label (similar to "Default") only when `isSelected`. | LOW — JSX + CSS only. |
| **C. Both A + B** | Maximum clarity. | LOW — same as above combined. |
| **D. Restructure the page (move map / collapse cards)** | Bigger redesign. | HIGH — out of scope; risk of regression in geocoding/places autocomplete. |

**Recommended:** Option C. Two small JSX additions, fully isolated, no payload effect.

---

## 3. Current Location / GPS Flow

### A. Where it lives
- `/app/frontend/src/pages/DeliveryAddress.jsx` line 156–186, plus the `<button class="da-current-location-btn">` overlay on map (line 599–608). The icon is `<MdMyLocation />`.
- The "Search Your Location" surface in the owner's screenshot corresponds to the `da-search-wrapper` Places Autocomplete UI inside the **Add New Address form** (line 745–784), NOT a separate page. The "Use Current Location Using GPS" CTA the owner shows is actually the floating map button (`da-current-location-btn`), not a button inside the search form. (Confirmed via grep: no separate SearchLocation component exists.)

### B. Mechanism (line 156–186)
1. `requestCurrentLocation()` invokes `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true, timeout: 10000`.
2. On grant: stores `{ lat, lng }` in `currentLocation` state. **Does not yet move the marker.**
3. On error/denied: silently sets `geoLoading=false`. No toast.
4. `handleUseCurrentLocation()` is the explicit "use it now" handler:
   - If `currentLocation` is already known → sets marker + map center to it, sets `selectedId = null`, calls `reverseGeocode()` and `checkDistance()`.
   - If not yet known → calls `requestCurrentLocation()` and shows toast `Requesting location access...`.

### C. Reverse geocoding (line 191–204)
- `https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={GOOGLE_MAPS_API_KEY}`
- Uses `REACT_APP_GOOGLE_MAPS_API_KEY` from `.env`.
- Result populates `reverseAddress` string only — no lat/lng or component breakdown is stored from reverse geocode.
- Silent failure on network/error.

### D. Generated address persistence
- The result is **NOT saved as a CRM address automatically.**
- It is held only in component state (`reverseAddress` + `markerPos`) and flattened into the cart on `Confirm & Proceed to Menu` (line 389–393). The user must explicitly click `Add New Address` and run a Places Autocomplete search to persist.

### E. Distance / ETA
- `${MANAGE_BASE_URL}/api/v1/config/distance-api-new` POST (line 223).
- Body: `{ destination_lat, destination_lng, restaurant_id, order_value: '0' }`.
- Returns `{ shipping_status, shipping_charge, shipping_time, distance }`.
- Debounced 500 ms (line 221, 240).

### F. Failure / edge cases (current behaviour)
- Permission denied → silent.
- Timeout (10 s) → silent.
- No network for reverse-geocode → silent fail; only marker moves.
- Distance API error → `da-distance-error` bar shows generic message; Continue button gets disabled (line 831, 833).
- Coordinates `null` / `NaN` → guarded by `hasValidLatLng()` (line 37).

### G. Risks (no change implied)
- Silent denial of geolocation permission may confuse users — they tap the button and nothing happens. Could be improved with a toast on `error` callback. **Out of scope unless approved.**

---

## 4. Saved Address Edit Capability

### A. API audit
| Operation | v1 path | v2 path | Service method | Frontend usage |
|---|---|---|---|---|
| Fetch list | `GET /customer/me/addresses` | `GET /scan/addresses` | `crmGetAddresses` | YES — `DeliveryAddress.jsx:131` |
| Create | `POST /customer/me/addresses` | `POST /scan/addresses` | `crmAddAddress` | YES — `DeliveryAddress.jsx:334` |
| **Update** | `PUT /customer/me/addresses/{id}` | `PUT /scan/addresses/{addr_id}` | **`crmUpdateAddress`** (`crmService.js:516`) | **NOT USED** anywhere in frontend |
| Delete | `DELETE /customer/me/addresses/{id}` | `DELETE /scan/addresses/{addr_id}` | `crmDeleteAddress` | YES — `DeliveryAddress.jsx:356` |
| Set default | `POST /customer/me/addresses/{id}/set-default` | `PUT /scan/addresses/{addr_id}/default` | `crmSetDefaultAddress` | YES — `DeliveryAddress.jsx:375` |

### B. Confirmation
- **Backend supports edit.** Documented in `/app/memory/SCAN_AND_ORDER_API_v2.md:760-783` and `/app/memory/CUSTOMER_ENDPOINTS_v2.md:234`. Partial-field updates allowed (only changed fields sent; rest preserved server-side).
- **Service-layer method exists** in `crmService.js:516-532` and supports both v1 and v2 contracts via `isV2()` flag.
- **Frontend never imports it.** Confirmed via grep:
  ```
  grep crmUpdateAddress → only the definition line; zero call-sites.
  ```
- The current-state map already noted this gap: `current-state/API_USAGE_MAP.md:1313` — *"`DeliveryAddress.jsx` currently uses get/add/delete/set-default; update exists in service but was not seen used."*

### C. Frontend UI inventory
- Saved address card actions (line 685–706): `Set default` button, `Delete` button. **No edit/pencil icon.**
- Add New Address form (line 725–824): supports create only. Inputs are single-purpose (no `editingId` mode).

### D. address_id during checkout
- `address_id` is read from `deliveryAddress.id || deliveryAddress.pos_address_id` (`helpers.js:441`). For ad-hoc current-location addresses (`reverseAddress` only) this is `''` and the order is placed with raw lat/lng + address text.
- Editing a saved address does NOT change its `id`; the CRM `PUT` returns `{ address_id }` unchanged. So edit + checkout chain is safe — `address_id` stays stable.

### E. Implementation options + risks
| Option | Description | Risk |
|---|---|---|
| **A. Add an "Edit" pencil icon on each saved-address card** | Tapping opens the existing `da-form` pre-populated with the address; on save call `crmUpdateAddress(token, addr.id, form)` instead of `crmAddAddress`. Re-fetch list. | MEDIUM — needs a new `editingId` state, form preload helper, branched `handleSaveAddress` (create vs update), and re-fetch on success. No payload contract changes. v1+v2 already covered by `crmUpdateAddress`. |
| **B. Inline edit (replace card with inputs in place)** | More complex UX. | HIGH — bigger UI rewrite, accessibility risk. |
| **C. Defer (no UI)** | Owner can manage addresses elsewhere (e.g. dashboard/profile). | LOW — but loses parity with industry-standard food delivery UX. |

**Recommended:** Option A. Reuses the existing form, smallest delta, follows the same lifecycle as create. **Backend confirmation:** none required — the API contract is verified in current-state docs and `SCAN_AND_ORDER_API_v2.md`.

---

## 5. Files inspected (read-only)

| File | Lines |
|---|---|
| `/app/frontend/src/components/CustomerDetails/CustomerDetails.jsx` | 1–112 |
| `/app/frontend/src/components/CustomerDetails/CustomerDetails.css` | 1–188 (phone block 60–145) |
| `/app/frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | 1–81 |
| `/app/frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.css` | 1–110 (phone block 46–104) |
| `/app/frontend/src/pages/DeliveryAddress.jsx` | 1–846 |
| `/app/frontend/src/api/services/crmService.js` | 1–581 |
| `/app/frontend/src/api/transformers/helpers.js` | 235–493 |
| `/app/frontend/src/__tests__/services/orderService.test.js` | phone payload tests (118–135) |
| `/app/memory/SCAN_AND_ORDER_API_v2.md` | 680–820 |
| `/app/memory/CUSTOMER_ENDPOINTS_v2.md` | 229–240 |
| `/app/memory/current-state/API_USAGE_MAP.md` | 1300–1320 |
| `/app/frontend/package.json` | dep list (line 66) |

No files modified.

---

## 6. Ownership classification

| Issue | Owner |
|---|---|
| Hide / lock `+91` prefix in phone input | **Frontend** (CSS or component prop change). Backend payload contract unaffected. |
| "Delivering to:" / "Selected" badge | **Frontend** (DeliveryAddress JSX + CSS). |
| Saved address edit | **Frontend** (UI + wire `crmUpdateAddress`). Backend already done. |

No backend confirmations needed for any of the three.

---

## 7. Validation checklist (for any future implementation)

### Phone field (Option A — CSS hide)
- [ ] On Review Order, `+91` text no longer visible inside the input.
- [ ] Country flag remains tappable; clicking it opens the country dropdown.
- [ ] User can still select a different country from the dropdown.
- [ ] Order payload still sends `dial_code: +91` and `cust_phone: <10 digits>` for India.
- [ ] OTP flow still strips `+91` correctly (regression-test `crmSendOtp`, `crmVerifyOtp`).
- [ ] Existing tests in `__tests__/services/orderService.test.js` still pass.
- [ ] iPhone Safari does not auto-zoom on focus (preserve 16 px font rule).

### Address selection clarity
- [ ] "Delivering to:" header visible above selected-address panel.
- [ ] Selected card shows a "SELECTED" pill in addition to orange checkmark.
- [ ] Default card without selection state still shows "Default" badge only.
- [ ] When user uses current location or drags pin, no card shows "SELECTED" (selectedId=null) — `displayAddress` shows reverse-geocoded text.

### Saved address edit
- [ ] Pencil icon appears on every saved address card.
- [ ] Tap → form opens prefilled with that address.
- [ ] Save → `crmUpdateAddress` called with correct addressId and only changed fields.
- [ ] Address list refreshes; edited card shows updated text.
- [ ] If edited address was selected, `selectedId` and `markerPos` re-sync.
- [ ] Cancelling reverts to list, no partial mutation.
- [ ] Editing a default address keeps it default.
- [ ] v1+v2 paths both pass (toggle `REACT_APP_CRM_API_VERSION`).

---

## 8. Approval gate — STOP

This document is investigation-only. No code or memory/current-state has been modified.

Owner approval required before any of the following can be implemented:
1. Hide `+91` editable prefix in `CustomerDetails` phone input (CSS-only).
2. "Delivering to:" / "SELECTED" labels in `DeliveryAddress.jsx`.
3. Edit-saved-address feature in `DeliveryAddress.jsx` using existing `crmUpdateAddress`.

Each item is independently approvable.

---

## 9. Recommendation summary

| # | Recommended Option | Effort | Blast radius |
|---|---|---|---|
| 1 | Phone — Option A (CSS hide `+91`, keep flag dropdown) | XS | None (CSS only) |
| 2 | Address clarity — Option C (label + pill) | S | None (additive UI) |
| 3 | Saved address edit — Option A (pencil → reuse form → wire `crmUpdateAddress`) | M | Local (DeliveryAddress only) |

All three avoid the locked zones: order payload, tax/charge math, edit-order previous items, KOT, sockets, payments. Awaiting owner go-ahead per item.
