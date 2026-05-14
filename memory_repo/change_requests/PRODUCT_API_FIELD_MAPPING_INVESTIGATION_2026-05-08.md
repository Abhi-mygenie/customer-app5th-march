# BUG INVESTIGATION — Product API Field Mapping, Visibility Gates, and Business Logic

**Date:** 2026-05-08
**Owner:** E1 Agent (investigation only — **NO CODE CHANGED**, no fix applied)
**Branch:** `main` @ `b89587d` · `/app/memory/` from branch `6-may`
**Scope:** Investigation only. Implementation gated on owner approval.
**Companion CR:** `/app/memory/change_requests/ITEM_CHANNEL_AVAILABILITY_BUG_INVESTIGATION_2026-05-08.md`

---

## 1. Bug classification

| Field | Value |
|---|---|
| Type | Functional / Contract-mapping correctness |
| Class | Multiple raw Product-API fields are dropped or mismapped by the customer-app transformer; some admin-side configuration (`status`, `jain`, `egg` field, `discount`, `tax_calc`, channel availability) is silently ignored |
| Severity | **High** for any restaurant relying on per-item active/inactive (`status`), Jain filter, egg field (separate from `veg`), per-item discount, or per-channel availability configured on POS admin |
| Reproducibility | Deterministic — these are static code paths in the transformer |
| Affects business logic? | Yes — `status`, `tax_calc`, and `discount` mapping gaps affect what users can buy and how prices are computed; channel-availability gap was previously documented |
| Affects desktop & mobile? | Yes — same transformer runs on every device |

---

## 2. Product/Menu API endpoint and request shape

### 2.1 Endpoint
- **Method:** `POST`
- **URL:** `${REACT_APP_API_BASE_URL}/web/restaurant-product`
- **Service:** `frontend/src/api/services/restaurantService.js:61-84` (`getRestaurantProducts`)
- **Endpoint constant:** `frontend/src/api/config/endpoints.js` — `RESTAURANT_PRODUCTS()`
- **Caller:** `frontend/src/hooks/useMenuData.js:32` (`fetchMenuSections`)
- **Hook:** `useMenuSections(stationId, restaurantId)` (line 144)
- **Cache key:** `['menuSections', restaurantId, stationId]` (line 128)

### 2.2 Request payload (current)
```json
{
  "restaurant_id": "<restaurantId-as-string>",
  "category_id": "0",
  "food_for": "<station-or-menu-name>"   // optional, only when stationId provided
}
```

### 2.3 Is `order_type` sent? — **NO**
The current request does **not** carry `order_type` / `orderType` / `channel` / any equivalent. The hook's signature `useMenuSections(stationId, restaurantId)` does not accept order type at all. Therefore the backend has no signal it could use to pre-filter by channel even if it wanted to (this is a frontend-side request gap; see §9 and §13).

### 2.4 `food_for` ≠ channel
`food_for` is the menu/sub-menu axis (`Normal`, `Party`, `Premium`, `Aggregator`, station-named menu) — see `useMenuData.js:162-198` (`STANDARD_MENUS`). It is NOT the order channel. Conflating them is a known anti-pattern called out in the prior CR.

---

## 3. Raw Product API field inventory (from owner-supplied sample)

The owner provided this sample item for `id: 87597 "smirnof vodka"`:

```
id, name, description, price, image, portion_size, variations, add_ons,
attributes, tax, tax_type, tax_calc, discount, discount_type,
web_available_time_starts, web_available_time_ends, live_web,
veg, egg, jain, allergens, kcal, status, station_name
```

**Total raw fields observed: 25.**
**Channel-availability fields present in this sample: 0.** No `dine_in`, `dinein`, `is_dine_in`, `delivery`, `is_delivery`, `takeaway`, `take_away`, `is_takeaway`, `room`, `room_service`, `is_room`, `order_channels`, `allowed_channels`, or per-item `order_type` field. This confirms the open question from the previous CR: the contract today has no per-item channel field.

---

## 4. Field-by-field frontend mapping table

Source: `frontend/src/hooks/useMenuData.js:39-91` (transformer). Verified by direct grep across `/app/frontend/src` for every raw field.

| # | Raw API field | Sample value | Carried by transformer? | Mapped frontend key | Used in display | Used in business logic | Status |
|---|---|---|---|---|---|---|---|
| 1 | `id` | `87597` | ✅ | `id` (cast to `String`) | Yes (cart key, DOM key) | Yes (cartId, payloads) | OK |
| 2 | `name` | `"smirnof vodka"` | ✅ | `name` | Yes | Search match | OK |
| 3 | `description` | `""` | ✅ | `description` (default `''`) | Yes (Read More) | — | OK |
| 4 | `price` | `280` | ✅ | `price` (default `0`) | Yes | Yes (subtotal, tax base, payload) | OK |
| 5 | `image` | URL `…food-default-image.png` | ✅ | `image` (constructed URL or null) | Yes (with POS-default detection in `MenuItem.jsx:33-39`) | — | OK |
| 6 | `portion_size` | `null` | ✅ (renamed) | `portion` (default `''`) | Yes (only) | — | OK (display-only) |
| 7 | `variations` | `[]` | ✅ | `variations` (default `[]`) | Yes (modal) | Yes (cart price calc, payload) | OK |
| 8 | `add_ons` | `[]` | ✅ | `add_ons` (default `[]`) | Yes (modal) | Yes (cart price calc, payload) | OK |
| 9 | `attributes` | `"[]"` (string) | ❌ | — | — | — | 🔴 **DROPPED.** Zero references to `item.attributes` anywhere in `frontend/src`. |
| 10 | `tax` | `"5.00"` | ✅ | `tax` (default `0`) | — | Yes (tax calc — `taxCalculation.js:18`, `ReviewOrder.jsx:576`) | OK |
| 11 | `tax_type` | `"GST"` | ✅ | `tax_type` (default `'GST'`) | — | Yes (GST vs VAT branch — `taxCalculation.js:41`, `ReviewOrder.jsx:577`) | OK |
| 12 | `tax_calc` | `"Exclusive"` | ❌ | — | — | — | 🔴 **DROPPED.** Zero references to `item.tax_calc`. The `.tax_calc` references found in code are at the **restaurant level** (`taxCalculationType` from restaurant settings), not per-item. |
| 13 | `discount` | `0` | ❌ | — | — | — | 🔴 **DROPPED.** Zero references to `item.discount` anywhere. |
| 14 | `discount_type` | `"percent"` | ❌ | — | — | — | 🔴 **DROPPED.** Zero references to `item.discount_type`. |
| 15 | `web_available_time_starts` | `null` | ✅ | `web_available_time_starts` (default `null`) | — | Yes (time-of-day gate in `isItemAvailable`) | OK |
| 16 | `web_available_time_ends` | `null` | ✅ | `web_available_time_ends` (default `null`) | — | Yes (same) | OK |
| 17 | `live_web` | `"Y"` | ✅ | `live_web` (default `null`) | — | Yes (kill-switch — `itemAvailability.js:59`) | OK |
| 18 | `veg` | `1` | ✅ (derived) | `isVeg = (veg === 1)` | Yes (veg dot color) | Yes (Veg filter) | ⚠ See row 19 |
| 19 | `egg` | `0` | ❌ (**dropped**) | — | — | — | 🔴 **MAPPING BUG.** Transformer derives `isEgg = (veg === 2)` (line 45), but the API has a **dedicated `egg` field**. For an item with `veg: 0, egg: 1`, the frontend computes `isEgg = false` and treats the item as plain non-veg. Egg filter is broken. |
| 20 | `jain` | `0` | ❌ | — | — | — | 🔴 **DROPPED.** No `isJain` derivation; no Jain filter exists in `MenuItems.jsx:341-348`. Admin's Jain flag is silently lost. |
| 21 | `allergens` | `[]` | ✅ | `allergens` (default `[]`) | Yes (chips + dietary-tag mapping) | Yes (dietary filter via `dietaryTagsMapping`) | OK |
| 22 | `kcal` | `null` | ✅ | `kcal` (default `''`) | Yes only when > 0 | — | OK |
| 23 | `status` | `1` | ❌ | — | — | — | 🔴 **DROPPED.** All `item.status` references in code (17 hits) are at the **order-item level** (`OrderSuccess.jsx`, `pages/admin/*`), not the menu transformer. Admin's active/inactive item flag is not enforced. |
| 24 | `station_name` | `"BAR"` | ✅ (renamed) | `station` (default `''`) | — | Used in order-payload routing (KOT) elsewhere; **NOT** a visibility gate | OK (display silently; not gated on) |
| 25 | *(channel availability)* | *not present in sample* | n/a | n/a | n/a | n/a | 🔴 **MISSING FROM CONTRACT.** Confirmed by sample. |

### 4.1 Reverse map — fields the frontend reads that DO survive

```
id  name  description  price  image  isVeg  isEgg  allergens  variations  add_ons
kcal  portion  station  live_web  web_available_time_starts  web_available_time_ends
tax  tax_type
```

That's 18 mapped keys, of which only 17 carry information from the raw API (because `isEgg` is derived from `veg`, not from the raw `egg` field).

### 4.2 Reverse map — fields PRESENT in API but NEVER read by the frontend

```
attributes   tax_calc   discount   discount_type   egg   jain   status
```

Seven raw fields are dropped. Three of them (`status`, `egg`, `jain`) likely encode admin-side configuration that should affect visibility or filtering. Three more (`tax_calc`, `discount`, `discount_type`) potentially affect pricing math. `attributes` is a stringified JSON whose intended meaning is unclear from the codebase alone.

---

## 5. Current item visibility gate flow

Source files: `pages/MenuItems.jsx`, `components/MenuItem/MenuItem.jsx`, `utils/itemAvailability.js`.

```
┌───────────────────────────────────────────┐
│  /web/restaurant-product (POST)           │
└───────────────────┬───────────────────────┘
                    │
       ┌────────────▼─────────────┐
       │  Transformer             │  → drops attributes, tax_calc,
       │  useMenuData.js:39-91    │     discount, discount_type, egg, jain, status
       └────────────┬─────────────┘
                    │
       ┌────────────▼────────────────────┐
       │  MenuItems.jsx — page filter    │
       │  filterItems(items)             │
       │   • search text                 │  (no live_web gate here — items remain)
       │   • veg/non-veg/egg radio       │  (egg branch broken — see §4 row 19)
       │   • dietary tags (multi)        │  (driven by allergens + dietaryTagsMapping)
       └────────────┬────────────────────┘
                    │
       ┌────────────▼────────────────────────────┐
       │  MenuItem.jsx — render-time per card   │
       │  isAvailable = isItemAvailable(...)     │
       │    ▶ live_web === 'Y'                   │
       │    ▶ category timing                    │
       │    ▶ item timing                        │
       │    ▶ web_available_time_starts/ends     │
       │  AND isOnlineOrderEnabled (global)      │
       └────────────┬────────────────────────────┘
                    │
                  ADD button shown ↩ (still card visible — only ADD is hidden)
```

### What the visibility gates actually check today

| Gate | Drives… | Visibility behavior |
|---|---|---|
| `live_web === 'Y'` | ADD button visibility (per `MenuItem.jsx:150,211`) | Card is **still visible**. Only ADD button is hidden. |
| Category timing (admin) | ADD button | Same — card visible, ADD hidden when outside window |
| Item timing (admin) | ADD button | Same |
| `web_available_time_starts/ends` (POS) | ADD button | Same — null = 24/7 |
| `isOnlineOrderEnabled` = (`restaurant.online_order === 'Yes' AND restaurantOpen AND isRestaurantOpen(shifts))` | Global ADD-disable | Card visible, ADD hidden everywhere |
| Search text | Page-level filter | Card hidden if name doesn't match |
| Veg / Non-Veg / Egg radio | Page-level filter | Card hidden — but egg branch is broken (row 19) |
| Dietary tags (multi-select) | Page-level filter via `allergens` | Card hidden if mismatch |
| Jain filter | — | **Does not exist** despite API providing `jain` flag |
| Per-item `status` | — | **Not enforced** — `status: 0` items are still rendered |
| Channel (dine-in/delivery/takeaway/room) | — | **Not enforced** — no field, no signal |

---

## 6. Current add-to-cart gate flow

Source: `pages/MenuItems.jsx:380-431`, `components/MenuItem/MenuItem.jsx:150,211`, `context/CartContext.js:205-251`.

```
1. User clicks ADD on a rendered card
   ↓ (ADD only renders if isAvailable && isOnlineOrderEnabled)
2. handleAddToCart(item) in MenuItems.jsx
   → if (item.variations.length || item.add_ons.length) → open CustomizeItemModal
   → else                                               → addToCart(item, [], [])
3. CartContext.addToCart(item, variations, add_ons)
   → no eligibility check
   → no live_web/status/timing/channel re-validation
   → cartId generated and item appended
```

### What gates the cart actually enforces

| Gate | Where | Behavior |
|---|---|---|
| `live_web !== 'Y'` | Render-time only (ADD hidden) | If ADD is hidden, user can't click. But `addToCart()` itself does NOT re-check. |
| `status: 0` | — | **Never checked.** If `status` ever leaked into the cart (e.g., via search for a stale item, or via deep-link), it would not be blocked. |
| Stock / out-of-stock | — | **No "stock" field exists in the sample;** if it ever does, the frontend wouldn't honor it. |
| Channel availability | — | **Never checked.** |
| Variations/add-ons required | `CustomizeItemModal.jsx` | Modal validates required selections before calling `handleAddToCartFromModal`. ✅ |
| Quantity limits | — | None enforced. |
| Edit-order rules (`isEditMode`) | `CartContext` | Tracks previous items but does not enforce eligibility. |

> **Net:** the cart is essentially "open" — any item that survives render gates can be added; any item that bypasses render gates (search bar, deep link, future programmatic flow) faces zero defense in `CartContext.addToCart`.

---

## 7. Admin configuration fields currently respected

From the sample fields, these are honored:

| Admin field | How the frontend honors it |
|---|---|
| `live_web` | ✅ Respected — `isItemAvailable` returns `false` if `live_web !== 'Y'`, hiding the ADD button |
| `web_available_time_starts/ends` | ✅ Respected — same gate, time-window check |
| Item-level admin timing (overrides POS) | ✅ Respected — via `categoryTiming`/`itemTiming` props |
| Category-level admin timing | ✅ Respected — same |
| `tax`, `tax_type` | ✅ Respected — used in tax calculation |
| `variations`, `add_ons` | ✅ Respected — modal selection |
| `allergens` | ✅ Respected — display + dietary tag filter |
| `veg` (value 1 = veg) | ✅ Respected — sets isVeg + drives veg filter |

---

## 8. Admin configuration fields IGNORED or MISSING

### 8.1 Present in API but ignored by frontend

| Admin field | Sample value | Likely admin meaning | What the frontend does today |
|---|---|---|---|
| `status` | `1` | Active / Inactive item flag | 🔴 **Ignored.** `status === 0` items are still shown if `live_web === 'Y'`. |
| `egg` (separate field) | `0` | Egg-containing food flag | 🔴 **Ignored.** Egg-ness is mistakenly derived from `veg === 2` instead of this dedicated field. |
| `jain` | `0` | Jain-friendly flag | 🔴 **Ignored.** No `isJain` and no Jain filter UI. |
| `discount` | `0` | Per-item promotional discount amount/percent | 🔴 **Ignored.** Cart subtotal does not apply a per-item discount; coupon discounts are separate. |
| `discount_type` | `"percent"` | "percent" or "amount" type for `discount` | 🔴 **Ignored.** Same as above. |
| `tax_calc` | `"Exclusive"` | Inclusive vs Exclusive tax calc per item | 🔴 **Ignored.** `taxCalculation.js:18` always computes `(price × tax%) ÷ 100`, treating every item as exclusive. Restaurants with mixed inclusive/exclusive items would see incorrect totals. |
| `attributes` | `"[]"` | Unknown — stringified JSON; possibly metadata | 🟡 **Ignored.** Unknown intent; backend confirmation needed. |

### 8.2 Not present in API at all (contract gap)

| Concept | Possible field names | Current state |
|---|---|---|
| Dine-in availability | `is_dine_in`, `dine_in`, `dinein` | 🔴 **Not in API response.** Not in transformer. Not enforced in frontend. |
| Delivery availability | `is_delivery`, `delivery` | 🔴 Same |
| Takeaway availability | `is_takeaway`, `takeaway`, `take_away` | 🔴 Same |
| Room-service availability | `is_room`, `room`, `room_service` | 🔴 Same |
| Order-channel array | `order_channels`, `allowed_channels`, `order_type` | 🔴 Same |
| Stock / out-of-stock | `stock`, `is_out_of_stock`, `available_qty` | 🔴 Same — not present in sample, not in transformer |

---

## 9. Channel-availability finding (consolidated)

| Statement | Verdict | Evidence |
|---|---|---|
| Channel availability fields are returned by the API and dropped by the transformer | ❌ FALSE | Sample shows zero such fields |
| Channel availability fields are returned and unused | ❌ FALSE | Same |
| Channel availability fields are not returned by the backend | ✅ **TRUE** (based on owner-provided sample for `id 87597`) | Sample inventory in §3 has zero channel fields |
| `order_type` is sent in the request to allow backend pre-filter | ❌ NOT SENT | `restaurantService.getRestaurantProducts` payload is `{restaurant_id, category_id, food_for?}` only |
| Backend confirmation needed | ✅ **YES** — confirm whether channel availability exists on the POS admin side at all, or whether the contract needs to be extended | One sample is sufficient to falsify "fields present"; insufficient to prove "fields never exist." Recommend a second probe with a deliberately channel-restricted item |

---

## 10. Does any frontend logic OVERRIDE admin menu config? — Mostly no, but there are silent drops

| Behavior | Verdict |
|---|---|
| Frontend overrides admin's `live_web` | ❌ No — respected |
| Frontend overrides admin's item/category timing | ❌ No — respected |
| Frontend overrides admin's `status` flag | ⚠ **Effectively yes** — by ignoring it. An admin who deactivates an item via `status: 0` will still see it on the customer app if `live_web` is `Y`. |
| Frontend overrides admin's `egg` flag | ⚠ **Effectively yes** — by ignoring the dedicated `egg` field and inferring egg-ness from a different field (`veg`). |
| Frontend overrides admin's `jain` flag | ⚠ **Effectively yes** — by dropping the field. |
| Frontend overrides admin's per-item `discount` | ⚠ **Effectively yes** — by dropping. |
| Frontend overrides admin's `tax_calc` | ⚠ **Effectively yes** — by hardcoding "exclusive" math. |
| Frontend overrides admin's channel availability | n/a — admin can't configure it because the API doesn't carry it |

Net: there is no *active* override (no `if admin says X then we do Y`), but there are **silent drops** at the transformer that have the *effect* of overriding admin config.

---

## 11. Root-cause summary

1. **Transformer whitelist is too narrow.** `useMenuData.js:63-82` carries 17 fields from a 25-field contract. Six of the seven dropped fields (`status`, `egg`, `jain`, `discount`, `discount_type`, `tax_calc`) encode admin-side configuration. (`attributes` is the only one with unclear intent.)
2. **`egg` derivation is wrong.** The transformer uses `(veg === 2)` to mean egg, but the API has a dedicated `egg` field. This is a contract-mismatch from a previous iteration.
3. **`status` is not interpreted as active/inactive.** The frontend uses only `live_web === 'Y'` as the kill-switch.
4. **Channel availability is missing from the contract entirely** (per the owner-provided sample). No frontend filter could fix this without coordinated backend work or proof that the sample is non-representative.
5. **Add-to-cart has no defensive eligibility check.** If any visibility gate ever leaks (search, deep link, programmatic add), the cart will silently accept any item.

---

## 12. Ownership classification

| Concern | Owner | Confidence |
|---|---|---|
| Transformer drops `status`, `egg`, `jain`, `discount`, `discount_type`, `tax_calc` | **Frontend** | High |
| Egg-ness derived from `veg === 2` instead of `egg` field | **Frontend** | High |
| No Jain filter UI | **Frontend** | High |
| No `status === 0` visibility gate | **Frontend** | High |
| Cart has no eligibility check | **Frontend** | High |
| Per-item `tax_calc` (Inclusive vs Exclusive) ignored in tax math | **Frontend** (calc) + **Backend confirmation** (semantics) | Medium — confirm meaning before changing math |
| Per-item `discount`/`discount_type` ignored in pricing | **Frontend** (calc) + **Backend confirmation** (intent) | Medium — confirm whether it's a promo discount applied at order time or display only |
| `attributes` field intent | **Backend / Product** | Low |
| Channel-availability fields not returned by API | **Backend (POS contract)** | High — confirmed by sample |
| `order_type` not sent in request | **Frontend** (request shape) + **Backend** (whether it would honor it) | Medium |

---

## 13. Proposed minimal fix options (NOT applied — for future approval)

> **Step 0 (mandatory before *any* fix):** capture **two more** real `/web/restaurant-product` responses from preprod for restaurants that, per POS admin: (a) have channel-restricted items, (b) have at least one `status: 0` item, (c) have at least one `jain: 1` item, (d) have at least one item flagged as egg in the dedicated `egg` field with `veg !== 2`. This is the only way to verify the actual contract before coding mappings against it.

### Option I — Transformer field-coverage fix (low-risk, no business-logic change)
Pure data preservation. Carry `status`, `egg`, `jain`, `discount`, `discount_type`, `tax_calc`, `attributes` through the transformer under stable keys. Do **not** yet wire any visibility/pricing gate to them.

- Files touched: `useMenuData.js` (transformer only).
- Risk: zero, since no consumer reads them yet.
- Benefit: unblocks subsequent work; auditable contract coverage.

### Option II — Visibility/filtering corrections (additive gates only)
Add (after Option I):
1. **`status === 0` → treat as kill-switch alongside `live_web !== 'Y'`** — extend `isItemAvailable` in `utils/itemAvailability.js` (one new clause, no removal).
2. **Egg correction** — change `isEgg = (veg === 2)` → `isEgg = (item.egg === 1) || (item.veg === 2)` (defensive, supports both contract shapes; reversible).
3. **Jain filter** — add `isJain = (item.jain === 1)` and a new (optional) filter button in `MenuItems.jsx`. Behavior stays opt-in; no existing filter changes.

- Files touched: `useMenuData.js`, `utils/itemAvailability.js`, `MenuItems.jsx` (filter UI).
- Order placement payload: unchanged (these are render-time gates only).
- Tax/total math: unchanged.

### Option III — Per-item `tax_calc` honor (requires backend semantics confirmation)
**Do not implement before Step-0 confirms the intended semantics.** If `tax_calc === "Inclusive"` means the `price` already includes tax, the formula in `taxCalculation.js:18` should branch:
- Exclusive: `tax = price × tax% / 100` (current)
- Inclusive: `tax = price × tax% / (100 + tax%)`

Risk: this WILL change displayed totals for restaurants that mix inclusive/exclusive items. Owner approval is mandatory after a number-by-number diff against pre-fix totals on a known order.

### Option IV — Per-item `discount`/`discount_type` honor (requires backend intent confirmation)
**Do not implement before Step-0 confirms whether this is a customer-visible promo, a manager-only display field, or an unrelated POS internal.** If approved:
- Apply at cart-line level (display + math), keep coupons separate, never alter the order placement payload's `discount` channel without explicit owner OK.

### Option V — Channel availability (carries forward from previous CR)
- Step 0a: probe `/web/restaurant-product` for a deliberately channel-restricted item. If channel fields exist → frontend-only fix (transformer + filter + add-to-cart guard).
- Step 0b: if fields don't exist → backend extends contract (or accepts `order_type` request param to pre-filter).
- Step 1+: apply Option B/C from the previous CR.

### Option VI — Defensive add-to-cart guard
Move the render-time eligibility check into `CartContext.addToCart`:
- Re-check `live_web === 'Y'`, `status !== 0`, time-window, channel (once available).
- Reject silently with a toast.
- Files touched: `CartContext.js` only.
- Order placement payload: unchanged.

### What NOT to do
- ❌ Do not change `pages/ReviewOrder.jsx` payload or `orderService.ts` send-shape based on this CR.
- ❌ Do not retroactively interpret the dropped fields without backend confirmation of intent.
- ❌ Do not change the request payload to send `order_type` until backend confirms it pre-filters or we've decided to filter client-side.
- ❌ Do not introduce hardcoded channel allow-lists.
- ❌ Do not repurpose `food_for` as a channel signal — it is the menu sub-axis.

---

## 14. Validation checklist (for future implementation)

### Step-0 evidence collection (must precede any code change)
- [ ] Captured `/web/restaurant-product` response for a restaurant with a channel-restricted item
- [ ] Captured response for an item with `status: 0`
- [ ] Captured response for an item with `jain: 1`
- [ ] Captured response for an item with `egg: 1` (and `veg` ≠ 2)
- [ ] Captured response for an item with `tax_calc: "Inclusive"`
- [ ] Captured response for an item with non-zero `discount`
- [ ] Documented backend's exact field semantics for each (active/inactive, dietary, pricing math, channel)

### Visibility-gate validation
- [ ] `live_web === 'Y'` → ADD shown
- [ ] `live_web !== 'Y'` → ADD hidden, search hides item
- [ ] `status: 1` → visible
- [ ] `status: 0` → hidden / not addable (after Option II)
- [ ] Item outside `web_available_time_starts/ends` → ADD hidden
- [ ] Category-timing override → ADD hidden outside window
- [ ] Item-timing override → ADD hidden outside window
- [ ] Search results respect all of the above
- [ ] Empty category after filter → section hidden gracefully

### Dietary-filter validation (after Option II)
- [ ] `veg: 1` → veg dot green; passes Veg filter; fails Non-Veg filter
- [ ] `veg: 0, egg: 0, jain: 0` → non-veg; fails Veg + Egg; passes Non-Veg
- [ ] `veg: 0, egg: 1` → egg dot; passes Egg filter; fails Veg
- [ ] `veg: 1, egg: 0, jain: 1` → passes Jain filter (new)
- [ ] Existing dietary-tag filter (allergens) continues to work in combination

### Add-to-cart validation (after Option VI)
- [ ] Cannot add `live_web !== 'Y'` item via deep link
- [ ] Cannot add `status: 0` item via search
- [ ] Cannot add channel-disallowed item once Option V is in (after channel contract is confirmed)
- [ ] Variants/add-ons modal still requires required selections

### Pricing/tax validation (Options III/IV — strictly after backend confirmation)
- [ ] `tax_calc: Exclusive` totals byte-equal to pre-fix
- [ ] `tax_calc: Inclusive` totals match a manually-computed reference for at least 3 sample carts
- [ ] Per-item `discount` applied at the correct line — coupon discounts unchanged
- [ ] Order placement payload byte-equal where intent is unchanged (Exclusive items, no discount); diff explicitly approved where intent is to change

### Regression validation
- [ ] Cart quantities, subtotal, tax, service charge, delivery charge unchanged for non-affected items
- [ ] Place Order succeeds across dine-in, takeaway, delivery, room
- [ ] Razorpay flow unchanged
- [ ] KOT/bill/print unchanged (no payload change unless Option IV alters per-item discount field — owner-gated)
- [ ] React Query cache key drift handled when channel/order-type added to request
- [ ] No new console errors, no 4xx/5xx on `/web/restaurant-product`

---

## 15. Approval gate

> 🛑 **No code has been changed. No probe call has been issued. Awaiting owner approval.**

Please decide / authorize:

1. ✅ Approve / ❌ No / 🔄 Clarify — the investigation findings above.
2. **Authorize Step 0** — capture additional `/web/restaurant-product` responses from preprod for the 6 scenarios listed in §14 Step-0. Please share:
   - `restaurant_id` to probe
   - 1–2 known item IDs that are: (a) channel-restricted, (b) `status: 0`, (c) `jain: 1`, (d) `egg: 1` with `veg ≠ 2`, (e) `tax_calc: "Inclusive"`, (f) non-zero `discount`.
3. **Which fix options to plan around** (independent toggles):
   - [ ] Option I — transformer field-coverage (zero-risk preservation)
   - [ ] Option II — visibility/filtering corrections (`status` kill-switch, egg fix, optional Jain filter)
   - [ ] Option III — per-item `tax_calc` honor (backend-semantics-gated)
   - [ ] Option IV — per-item `discount` honor (backend-intent-gated)
   - [ ] Option V — channel availability (depends on Step-0 outcome; carries forward from prior CR)
   - [ ] Option VI — defensive add-to-cart guard
4. **For Option II — Jain filter UX:** add a new pill alongside Veg/Non-Veg/Egg, OR fold under dietary-tags multi-select?
5. **For Option II — `status: 0` UX:** silently hide vs. show greyed-out card with "Currently unavailable" badge?
6. **For Option III/IV:** require a number-by-number diff on a sample cart against pre-fix totals before approving the math change?
7. **Edit-order flow:** include eligibility re-check on previously-ordered items in scope, or defer?
8. Permission to run testing agent (Playwright) for end-to-end validation of whichever options you authorize?

Once you reply, I'll proceed to either (a) issue the read-only Step-0 probe(s), or (b) implement the option(s) you've authorized — with each option behind its own diff and validation cycle.
