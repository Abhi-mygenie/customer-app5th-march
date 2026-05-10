# PRODUCT API FIELD MAPPING + BUSINESS LOGIC AUDIT (FULL)

**Date:** 2026-05-08
**Scope:** Investigation only — **NO CODE CHANGED**, no fix applied.
**Branch:** `main` @ `b89587d` · `/app/memory/` from branch `6-may`
**Companion CRs (prior in this thread):**
- `/app/memory/change_requests/ITEM_CHANNEL_AVAILABILITY_BUG_INVESTIGATION_2026-05-08.md`
- `/app/memory/change_requests/PRODUCT_API_FIELD_MAPPING_INVESTIGATION_2026-05-08.md`

> **This audit supersedes the previous channel-availability conclusions.** Earlier sample lacked channel fields; the now-confirmed full Product API response **does** include `dinein` / `takeaway` / `delivery` per-item plus 11 other previously unseen fields. The frontend silently drops all of them.

---

## 1. Bug / investigation classification

| Field | Value |
|---|---|
| Type | Field-mapping / Contract-coverage gap |
| Class | Customer-app transformer drops at minimum **14 raw Product API fields** that encode admin-side configuration (channel availability, kill-switch, stock, discount eligibility, item-level charges, complementary, prep/serve times, sort order, item code) |
| Severity | **High.** Channel mismatch (item available in delivery shown in dine-in or vice-versa), disabled-by-admin items still addable, complementary mechanic non-functional, item-level charges ignored |
| Reproducibility | Deterministic — these fields are simply never read |
| Affects business logic? | Yes — visibility, eligibility, and possibly pricing (item-level `takeaway_charge` / `delivery_charge`) |
| Affects desktop & mobile? | Yes |

---

## 2. Endpoint and request shape

### 2.1 Endpoint
- **Service:** `frontend/src/api/services/restaurantService.js:61-84` — `getRestaurantProducts(restaurantId, categoryId="0", stationId)`
- **Method:** `POST`
- **URL:** `${REACT_APP_API_BASE_URL}/web/restaurant-product`
- **Caller:** `frontend/src/hooks/useMenuData.js:32` (`fetchMenuSections`)
- **Hook:** `useMenuSections(stationId, restaurantId)` (line 144)

### 2.2 Request payload (current)
```json
{
  "restaurant_id": "<restaurantId>",
  "category_id": "0",
  "food_for": "<station-or-menu-name (optional)>"
}
```

### 2.3 Question audit
| Q | Answer |
|---|---|
| Is `type=all` sent? | **No.** The owner's URL `?type=all` is likely a Postman/GET demo. The runtime app sends a POST body with the 3 fields above only. |
| Is `order_type` sent? | **No.** Confirmed by grep in both `restaurantService.js` and `useMenuData.js`. |
| Does response include `dinein`/`takeaway`/`delivery` per-item? | Yes (per owner-supplied sample fragment). |
| Does response include `room` / `room_service` / `is_room` / `dine_in` per-item? | **Not observed** in the sample. **BACKEND CONFIRMATION NEEDED** for whether room is a separate flag or treated as `dinein`. |
| Does backend pre-filter by channel? | No (it returns flags; no `order_type` is sent so it cannot pre-filter even if it wanted to). |

---

## 3. Raw Product API field inventory

From the consolidated owner samples (id 87597 + new fragment), the Product API today returns **at least these 25+ fields per item**:

```
id, name, description, price, image, portion_size, variations, add_ons, attributes,
tax, tax_type, tax_calc, discount, discount_type, give_discount,
web_available_time_starts, web_available_time_ends, live_web, status, is_disable,
veg, egg, jain, allergens, kcal,
station_name, item_code, food_stock, food_order,
dinein, takeaway, delivery, takeaway_charge, delivery_charge,
prepration_time_min, serve_time_in_min,
complementary, complementary_price
```

= **38 distinct keys** observed across both samples. The frontend transformer carries **17** of them.

**Not observed (need backend confirmation):** `room` / `room_service` / `is_room` / `is_dine_in` / explicit room channel flag, `is_walkin`, `online`, `out_of_stock`, `available`, `packing_charge`, `parcel_charge`, `service_charge` (per-item), category visibility flags.

---

## 4. Field-by-field mapping table

> Verification method: grep across `/app/frontend/src` for each raw API field name + reverse grep for the transformer output keys produced in `useMenuData.js:39-91`.

| # | Raw API field | Present in API | Mapped in FE? | FE name | Used for display? | Used for business logic? | Used for visibility gate? | Used for add-to-cart gate? | Risk if ignored | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | ✅ | ✅ | `id` (String) | ✅ DOM key, cart key | ✅ payload | — | — | none | OK |
| 2 | `name` | ✅ | ✅ | `name` | ✅ | search match | — | — | none | OK |
| 3 | `description` | ✅ | ✅ | `description` | ✅ | — | — | — | none | OK |
| 4 | `price` | ✅ | ✅ | `price` | ✅ | ✅ subtotal/tax base | — | — | medium if 0 | OK |
| 5 | `image` | ✅ | ✅ | `image` | ✅ | — | — | — | none | OK |
| 6 | `portion_size` | ✅ | ✅ (renamed) | `portion` | display only | — | — | — | low | OK |
| 7 | `variations` | ✅ | ✅ | `variations` | ✅ modal | ✅ pricing/payload | — | (modal validation) | none | OK |
| 8 | `add_ons` | ✅ | ✅ | `add_ons` | ✅ modal | ✅ pricing/payload | — | (modal validation) | none | OK |
| 9 | `attributes` | ✅ (string `"[]"`) | ❌ DROPPED | — | — | — | — | — | unknown intent | **BACKEND CONFIRMATION NEEDED** |
| 10 | `tax` | ✅ | ✅ | `tax` | — | ✅ tax calc | — | — | none | OK |
| 11 | `tax_type` | ✅ | ✅ | `tax_type` | — | ✅ GST/VAT branch | — | — | none | OK |
| 12 | `tax_calc` | ✅ ("Exclusive") | ❌ DROPPED | — | — | — | — | — | **High** for restaurants mixing inclusive/exclusive items — totals will be wrong | Map; honor in `taxCalculation.js` (gated on backend semantics) |
| 13 | `discount` (item) | ✅ | ❌ DROPPED | — | — | — | — | — | High — admin promo discount silently ignored | **BACKEND CONFIRMATION NEEDED** on intent before applying |
| 14 | `discount_type` | ✅ | ❌ DROPPED | — | — | — | — | — | Same as 13 | Same |
| 15 | `give_discount` | ✅ ("Yes") | ❌ DROPPED | — | — | — | — | — | Medium — likely controls whether a coupon can apply to this item; coupons may currently apply to disallowed items | **BACKEND CONFIRMATION NEEDED** |
| 16 | `web_available_time_starts` | ✅ | ✅ | same | — | ✅ time gate | ✅ ADD-button hide | — | none | OK |
| 17 | `web_available_time_ends` | ✅ | ✅ | same | — | ✅ time gate | ✅ ADD-button hide | — | none | OK |
| 18 | `live_web` | ✅ ("Y"/"N") | ✅ | `live_web` | — | ✅ kill-switch | ✅ ADD-button hide | — | none | OK |
| 19 | `status` | ✅ (1/0) | ❌ DROPPED | — | — | — | — | — | High if 0 = inactive — admin's deactivation does nothing | **BACKEND CONFIRMATION NEEDED** on intent (active/inactive vs other) |
| 20 | `is_disable` | ✅ ("Y"/"N") | ❌ DROPPED | — | — | — | — | — | High if "Y" = disabled — admin's per-channel-or-global disable ignored | **BACKEND CONFIRMATION NEEDED** on relationship to `live_web` & `status` |
| 21 | `veg` | ✅ (0/1/2) | ✅ derived | `isVeg = (veg===1)` | ✅ veg dot | ✅ Veg filter | — | — | none | OK |
| 22 | `egg` (separate) | ✅ (0/1) | ❌ DROPPED — but `isEgg` is incorrectly derived from `(veg===2)` instead | — | broken | broken | — | — | High — items flagged egg via dedicated field render as plain non-veg, Egg filter misses them | **MAPPING BUG** — derive from `egg===1`; consider keeping `(veg===2)` as fallback |
| 23 | `jain` | ✅ (0/1) | ❌ DROPPED | — | — | — | — | — | High — Jain filter cannot exist; admin's flag silently lost | Map → `isJain = (jain===1)`; add new filter pill or fold into dietary |
| 24 | `allergens` | ✅ | ✅ | `allergens` | ✅ chips | ✅ dietary filter | — | — | none | OK |
| 25 | `kcal` | ✅ | ✅ | `kcal` | ✅ when >0 | — | — | — | none | OK |
| 26 | `station_name` | ✅ ("BAR") | ✅ (renamed) | `station` | — | KOT routing in payload elsewhere | — | — | none | OK |
| 27 | `item_code` | ✅ | ❌ DROPPED | — | — | — | — | — | Low — internal SKU; rarely customer-visible. Could help support/QA | **BACKEND CONFIRMATION NEEDED** — useful in error reports |
| 28 | `food_stock` | ✅ (0/N) | ❌ DROPPED | — | — | — | — | — | High if it means "stock count" or "out of stock when 0" — disallowed items would still be addable | **BACKEND CONFIRMATION NEEDED** — count vs flag vs disabled-bool |
| 29 | `food_order` | ✅ | ❌ DROPPED | — | — | — | — | — | Medium — likely admin-set sort order; menu may render in arbitrary or alphabetic order today | **BACKEND CONFIRMATION NEEDED** — confirm it's `sort_order`; then sort items by it |
| 30 | `dinein` | ✅ ("Yes"/"No") | ❌ DROPPED | — | — | — | — | — | **CRITICAL.** Item shown / addable on dine-in flow regardless of admin config | Map → `allowedDinein` boolean; gate visibility + add-to-cart for `orderType==='dinein'` |
| 31 | `takeaway` | ✅ ("Yes"/"No") | ❌ DROPPED | — | — | — | — | — | **CRITICAL.** Same — takeaway flow shows takeaway-disabled items | Same — gate on `orderType==='takeaway'` (or `'take_away'`) |
| 32 | `delivery` | ✅ ("Yes"/"No") | ❌ DROPPED | — | — | — | — | — | **CRITICAL.** Same — delivery flow shows delivery-disabled items | Same — gate on `orderType==='delivery'` |
| 33 | `takeaway_charge` (item-level) | ✅ ("0.00") | ❌ DROPPED | — | — | — | — | — | High if non-zero — per-item takeaway surcharge ignored; cart subtotal/POS may diverge | **BACKEND CONFIRMATION NEEDED** on whether to add to line price or as a separate fee |
| 34 | `delivery_charge` (item-level) | ✅ ("0.00") | ❌ DROPPED — ⚠ **conflicts with restaurant-level `delivery_charge`** which IS used (at `helpers.js:450`, `orderService.ts:327, 459`, `ReviewOrder.jsx:103`) | — | — | — | — | — | High if non-zero — item-level surcharge silently lost; restaurant-level is what's applied | **BACKEND CONFIRMATION NEEDED** — define which level wins; document precedence |
| 35 | `prepration_time_min` | ✅ (0/N) | ❌ DROPPED | — | — | — | — | — | Low for pricing, Medium for UX — customer-facing ETA cannot be shown today | **BACKEND CONFIRMATION NEEDED** — confirm semantics, then show as ETA chip |
| 36 | `serve_time_in_min` | ✅ (0/N) | ❌ DROPPED | — | — | — | — | — | Same as 35 | Same |
| 37 | `complementary` | ✅ ("Yes"/"No") | ❌ DROPPED | — | — | — | — | — | High if "Yes" = freebie / gift-with-purchase — feature non-functional today | **BACKEND CONFIRMATION NEEDED** — full mechanic spec (gating rule, 1-per-cart vs N, when triggered) |
| 38 | `complementary_price` | ✅ ("0") | ❌ DROPPED | — | — | — | — | — | Same as 37 — possibly the "from" price displayed when promo active | Same |

### 4.1 Reverse map — fields the FE reads that DO survive
```
id, name, description, price, image, isVeg, (broken)isEgg, allergens, variations, add_ons,
kcal, portion, station, live_web, web_available_time_starts, web_available_time_ends,
tax, tax_type
```
17 mapped keys. **`isEgg` is incorrectly derived** from `veg===2` instead of the dedicated `egg` field.

### 4.2 Reverse map — fields PRESENT in API but NEVER read by the FE
```
attributes, tax_calc, discount, discount_type, give_discount,
status, is_disable, egg (raw field — see #22), jain,
station_name (kept as `station` but not used for visibility),
item_code, food_stock, food_order,
dinein, takeaway, delivery, takeaway_charge, delivery_charge (item-level),
prepration_time_min, serve_time_in_min, complementary, complementary_price
```
**21 raw keys silently dropped or mismapped.**

---

## 5. Current visibility gate flow

`MenuItems.jsx:331-359` (`filterItems`) → `MenuItem.jsx:46,150` (per-card render) → ADD button.

| Stage | Driven by | Channel-aware? |
|---|---|---|
| Search input | `name` | ❌ |
| Veg/Non-Veg/Egg radio | `isVeg`, `isEgg` (broken — see #22) | ❌ |
| Dietary tags multi | `allergens` + `dietaryTagsMapping` | ❌ |
| Per-item `isAvailable` | `live_web`, category timing, item timing, `web_available_time_starts/ends` | ❌ |
| Restaurant-level `isOnlineOrderEnabled` | `restaurant.online_order`, `restaurantOpen`, `isRestaurantOpen(shifts)` | ❌ (global ON/OFF) |
| Card visibility (always shown) | none | ❌ |
| **No filter consumes:** `dinein`, `takeaway`, `delivery`, `is_disable`, `food_stock`, `status`, `jain`, `complementary`, `food_order` | | |

The card is **always rendered**; only the ADD button is hidden when `isAvailable && isOnlineOrderEnabled` is false. Search and veg/dietary still surface the item.

---

## 6. Current add-to-cart gate flow

`MenuItems.jsx:380-431` (handler) → `CartContext.addToCart:205-251`.

| Gate | Where | Behavior |
|---|---|---|
| `isAvailable && isOnlineOrderEnabled` | Render-time only — hides ADD button | If hidden, can't click |
| `live_web !== 'Y'` re-check on add | — | None |
| `status: 0` re-check | — | None |
| `is_disable: 'Y'` re-check | — | None |
| `food_stock <= 0` re-check | — | None |
| `dinein/takeaway/delivery: 'No'` for active channel | — | None |
| Variants/add-ons required selections | `CustomizeItemModal` | ✅ enforced |
| Quantity max | — | None |
| Edit-order rules | `CartContext.previousItems` | Tracks previous items but no eligibility check |

> **Net:** if a card is rendered and the ADD button shows, the item lands in the cart with zero defensive eligibility checks. Search, deep-link, or programmatic flows that bypass the ADD-render gate face zero defense.

---

## 7. Current channel availability behavior (key questions answered)

| Q | Answer |
|---|---|
| If `dinein === "No"`, can the item show in the dine-in flow today? | **YES — fully visible and addable.** No code path reads `item.dinein`. |
| If `delivery === "No"`, can the item show in the delivery flow today? | **YES — fully visible and addable.** |
| If `takeaway === "No"`, can the item show in the takeaway flow today? | **YES — fully visible and addable.** |
| Is there a room-specific item-level field? | **Not observed** in the API samples. **BACKEND CONFIRMATION NEEDED.** |
| Current room behavior | Treated as dine-in for menu purposes (because `useScannedTable` returns `orderType='dinein'` for room QRs and the menu filter doesn't check anything channel-related anyway). |
| Should `room` fall back to `dinein` for filtering? | **NOT SAFE TO ASSUME.** Possible policies: (a) room follows `dinein` flag, (b) room follows a dedicated `room`/`is_room` flag, (c) hotel-specific opt-in items only. **BACKEND CONFIRMATION NEEDED** before coding. |

---

## 8. Admin-config respect / ignore summary

| Admin field | Honored today? |
|---|---|
| `live_web` (kill-switch) | ✅ Yes |
| Item / category time windows | ✅ Yes |
| `tax`, `tax_type` | ✅ Yes (calc only — `tax_calc` per-item not honored) |
| `variations`, `add_ons` | ✅ Yes |
| `allergens` | ✅ Yes |
| `veg` (1=veg) | ✅ Yes |
| `egg` (dedicated field) | 🔴 **NO** — `isEgg` derived from `veg===2` |
| `jain` | 🔴 No |
| `status` (active/inactive) | 🔴 No |
| `is_disable` | 🔴 No |
| `dinein` / `takeaway` / `delivery` per-channel | 🔴 No |
| `food_stock` (out-of-stock) | 🔴 No |
| `give_discount` | 🔴 No |
| Per-item `discount` / `discount_type` | 🔴 No |
| Per-item `tax_calc` | 🔴 No |
| Per-item `takeaway_charge` / `delivery_charge` | 🔴 No |
| `complementary` / `complementary_price` | 🔴 No |
| `food_order` (sort) | 🔴 No |
| `item_code` | 🔴 No (low criticality) |

---

## 9. Business logic gaps caused by ignored / dropped keys

1. **Channel mismatch (CRITICAL).** Items configured per-channel surface and are addable in every channel. Direct cause of the existing channel-availability CR symptom.
2. **`is_disable` ignored (HIGH).** Admin's targeted disable is silently overridden.
3. **`status` ignored (HIGH if it means active/inactive).** Same impact as 2.
4. **`food_stock` ignored (HIGH if it means stock).** Out-of-stock items are addable; orders may be partially fulfilled or cancelled by POS.
5. **`give_discount` ignored (MEDIUM).** Coupons may apply to ineligible items, distorting POS expected totals.
6. **Per-item `takeaway_charge` / `delivery_charge` ignored (HIGH if non-zero in production).** Cart total diverges from POS-computed total. Today the FE only honors restaurant-level `delivery_charge`.
7. **Per-item `discount` / `discount_type` / `tax_calc` ignored (HIGH for inclusive-tax restaurants).** Mathematical totals drift.
8. **`complementary` mechanic non-functional (FEATURE GAP).** If admin marks an item as "Complimentary with order ≥ ₹X", customer never sees it.
9. **`prepration_time_min` / `serve_time_in_min` ignored (UX GAP).** Cannot show ETAs to customer.
10. **`food_order` ignored (UX/MERCHANDISING GAP).** Item sequence is whatever the API returns (or alphabetic).
11. **`jain` filter missing (DIETARY ACCESS GAP).**
12. **`egg` mapping broken (FILTER ACCURACY).**
13. **`item_code` ignored (LOW).** Customer-support traceability harder.
14. **`attributes` ignored (UNKNOWN).**

---

## 10. Frontend-owned fixes (no backend dependency)

These can be implemented today without any contract change, assuming the API's field semantics for `dinein`/`takeaway`/`delivery`/`food_stock`/`is_disable`/`status`/`jain`/`egg`/`food_order` are confirmed:

1. **Transformer field-coverage extension** (`useMenuData.js:39-91`) — carry the dropped fields under stable keys.
2. **Channel filter** in `MenuItems.jsx:331-359` — read `useScannedTable().orderType` and exclude items where the matching channel flag is `"No"`.
3. **`is_disable` / `status` kill-switch** in `utils/itemAvailability.js`.
4. **`food_stock` kill-switch** (subject to confirming whether 0 = "out" or "unlimited").
5. **`egg` correction**: `isEgg = (item.egg === 1) || (item.veg === 2)` (defensive — supports both contracts).
6. **Jain filter** (new pill or dietary multi-select).
7. **Sort by `food_order`** if it's confirmed as sort_order.
8. **Defensive add-to-cart guard** in `CartContext.addToCart` — re-check the same gates before appending.
9. **Diagnostic log** at place-order time to expose which item-level fields were considered.

---

## 11. Backend confirmation needed before implementation

Treat these as **BLOCKERS** for any code that consumes the field:

| Field | Question for POS / backend team |
|---|---|
| `status` | Does `0` mean inactive? Is the relationship to `live_web` AND or OR (i.e., is it redundant or independent)? |
| `is_disable` | Does `"Y"` mean disabled across all channels? Any channel-specific variant? Relationship to `live_web` and `status`? |
| `food_stock` | Is `0` = out-of-stock, or is it a count, or always 0 today (unused in POS)? Threshold semantics? |
| `food_order` | Is this a sort_order (lower = first) or category position? Used by POS? |
| `give_discount` | Does `"No"` mean coupons must NOT discount this item? Does it block per-item promo `discount` too? |
| `complementary` / `complementary_price` | Mechanic spec — when is the freebie unlocked, displayed, added to cart, priced? |
| `prepration_time_min` / `serve_time_in_min` | Customer-displayable or kitchen-internal? Aggregation rule when cart has multiple items? |
| `dinein` / `takeaway` / `delivery` | Confirm `"Yes"`/`"No"` are the only values. Any other value (`null`, `""`, `"NA"`) and its meaning? |
| `room` channel | **Is there a per-item room flag?** If not, should room follow `dinein`, or follow a dedicated rule? Restaurant-level setting? |
| `tax_calc` per-item | Inclusive vs Exclusive math semantics — exact formula confirmation. |
| Per-item `discount` / `discount_type` | Display only or applied at POS? When does FE need to apply vs not? |
| Per-item `takeaway_charge` / `delivery_charge` | Applied per line at FE, or rolled up by POS? Precedence vs restaurant-level `delivery_charge`. |
| `attributes` | Stringified JSON — what schema? |
| `item_code` | Stable across menus / restaurants? Customer-displayable? |

---

## 12. Implementation options (NOT applied)

### Option A — Map and filter frontend only
Bring all dropped fields into the transformer, add filters/gates in `MenuItems.jsx` + `MenuItem.jsx` + `CartContext.addToCart`.
- **Pros:** Zero backend changes; can ship as soon as field semantics are confirmed.
- **Cons:** Frontend owns the full filtering logic; any drift in API field semantics breaks silently.
- **Files touched:** `useMenuData.js`, `MenuItems.jsx`, `MenuItem.jsx`, `utils/itemAvailability.js`, `CartContext.js` — all JS-only.

### Option B — Send `order_type` and let backend pre-filter
Extend the request payload to include `order_type`. Backend filters items not allowed for that channel before responding.
- **Pros:** Single source of truth; FE doesn't need transformer changes for channel.
- **Cons:** Requires backend coordination and contract guarantee. Doesn't help with `is_disable`, `status`, `food_stock`, `complementary`, `give_discount` etc. — still need FE work for those.

### Option C — Backend pre-filter (channel) + frontend defensive guard (everything else)
Backend filters channel; FE keeps a defensive add-to-cart guard for `live_web/is_disable/status/food_stock/timing` and applies dietary/sort/complementary FE-side.
- **Pros:** Defense-in-depth; survives backend regressions.
- **Cons:** Highest coordination effort.

### Option D — Full field preservation + visibility/add-to-cart gate audit
Step 1: enlarge transformer whitelist to carry every API field verbatim under stable keys (zero-risk, no consumer reads them yet).
Step 2: incrementally light up consumers — channel filter first, then `is_disable`/`status`, then `food_stock`, then per-item charges, etc. Each behind its own CR with backend semantics confirmed.
- **Pros:** Lowest-risk, smallest blast radius per step. Auditable contract coverage.
- **Cons:** Multi-CR delivery — slowest end-to-end.

### Recommended option
> **D + (subset of A)**, in this order:
> 1. **D Step 1 only** (transformer field-coverage). Pure data-preservation, zero behavior change. Unblocks every subsequent CR.
> 2. **A — channel filter** (`dinein`/`takeaway`/`delivery`) once field semantics confirmed for the 3 channel flags. Gate visibility AND add-to-cart. *Owner-decision: cart-on-channel-switch policy (drop+toast / confirm / block).*
> 3. **A — `is_disable` and `status` kill-switch** once semantics confirmed.
> 4. **A — `egg` correction + Jain filter.** No backend question; smallest CR.
> 5. **A — `food_stock` kill-switch** once semantics confirmed.
> 6. **A — `food_order` sort.**
> 7. **A — defensive add-to-cart guard** (cumulative — hardens all of the above).
> 8. *(Deferred — owner gate)* per-item `tax_calc`, `discount`, charges, complementary mechanic — each its own CR with full math reconciliation.
>
> If POS team wants to move channel filtering server-side, switch to **C** for step 2 (request adds `order_type`, FE defensive guard remains).

---

## 13. Validation checklist (for future implementation — apply per CR step)

### Step-0 (mandatory before steps 2-8)
- [ ] Captured a real `/web/restaurant-product` response containing items with each of the dropped flags set to non-default values
- [ ] POS / backend team confirmed semantics for each field in §11
- [ ] Decided on `room` policy

### Channel-filter validation
- [ ] `dinein === "No"` item: visible+addable on dine-in (table/room/walk-in dine-in) → **must become hidden / not-addable** for those flows
- [ ] Same for `takeaway === "No"` on takeaway flow
- [ ] Same for `delivery === "No"` on delivery flow
- [ ] Item with all three `"Yes"`: visible+addable on every channel (regression)
- [ ] Item with all three `"No"`: hidden everywhere (edge sanity)
- [ ] Search and category nav respect the filter
- [ ] Empty category after filter → hidden gracefully
- [ ] Cart switching channel mid-session → defined policy applies (a/b/c)

### `is_disable` / `status` kill-switch validation
- [ ] `is_disable === "Y"` item: hidden / not-addable everywhere
- [ ] `status === 0` item: hidden / not-addable everywhere (subject to confirmed semantics)
- [ ] `live_web === "Y"` + `is_disable === "Y"` → still hidden (kill-switches are AND-cumulative)
- [ ] `live_web === "N"` + `is_disable === "N"` → still hidden (existing behavior preserved)

### Egg / Jain validation
- [ ] `egg === 1` + `veg === 0` → renders as egg item; passes Egg filter
- [ ] `egg === 0` + `veg === 2` → still passes Egg filter (defensive)
- [ ] `jain === 1` → passes Jain filter; hidden when "Veg only" radio is on, etc.

### `food_stock` validation (subject to semantics)
- [ ] `food_stock === 0` → hidden / not-addable (or "Out of stock" badge per UX choice)
- [ ] `food_stock` undefined / null → behaves as "available" (backwards-compat)

### Sort validation
- [ ] Items sorted ascending by `food_order` within a category (or per confirmed policy)
- [ ] Ties fall back to API order

### Add-to-cart guard regression
- [ ] Cannot add a hidden item via deep-link / modal route
- [ ] Cannot add a hidden item via search after filter
- [ ] Variants/add-ons modal still works for valid items

### Functional regression — must remain unchanged
- [ ] Cart subtotal, taxes, service charge, delivery charge math byte-equal for items unaffected by the new gates
- [ ] Order placement payload unchanged unless the specific CR step explicitly approves a new field
- [ ] Razorpay flow unchanged
- [ ] KOT/bill/print payloads unchanged
- [ ] Sockets/Firebase/buzzer unchanged

### Cross-platform smoke
- [ ] Mobile Safari, Mobile Chrome, Android Chrome, Desktop — no console errors, no 4xx/5xx on `/web/restaurant-product`

---

## 14. Stop condition / approval gate

> 🛑 **No code has been changed. No probe call has been issued. Awaiting owner approval and POS-side semantic confirmations.**

Please confirm / supply:

1. ✅ Approve / ❌ No / 🔄 Clarify the audit findings.
2. **Step-0 evidence** — capture one or two real `/web/restaurant-product` responses for items where each of the following is at a non-default value:
   - `dinein/takeaway/delivery === "No"`
   - `is_disable === "Y"`
   - `status === 0`
   - `food_stock === 0`
   - `give_discount === "No"`
   - `complementary === "Yes"` and non-zero `complementary_price`
   - non-zero `takeaway_charge` / `delivery_charge` per item
   - non-zero `prepration_time_min` / `serve_time_in_min`
   - `tax_calc === "Inclusive"`
   - `discount > 0`
3. **POS-team confirmation** on the questions in §11.
4. **Room channel decision** — is there a per-item room flag, should `room` follow `dinein`, or define a separate rule?
5. **Implementation option to plan around** — D (full preservation) → A (incremental enable) recommended. Confirm.
6. **Cart-on-channel-switch policy** — (a) silent drop + toast, (b) prompt + confirm, (c) block until cleared. Recommend (b).
7. **Edit-order flow** — include eligibility re-check for previous items in scope, or defer?
8. **Permission to run the testing agent** (Playwright) for end-to-end validation of whichever steps you authorize?

Once you reply with confirmations and authorization, I'll proceed step-by-step (D Step 1 first, then incremental A steps), each behind its own focused diff, validation cycle, and per-step approval gate.

— End of audit.
