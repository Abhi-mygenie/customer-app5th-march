# BUG INVESTIGATION — Item Channel Availability Not Applied in Customer Menu

**Date:** 2026-05-08
**Owner:** E1 Agent (investigation only — **NO CODE CHANGED**, no fix applied)
**Branch:** `main` @ `b89587d` · `/app/memory/` from branch `6-may`
**Scope:** Investigation only. Implementation gated on owner approval.

---

## 1. Bug classification

| Field | Value |
|---|---|
| Type | Functional / Business-rule enforcement gap |
| Class | Item-level channel-availability not respected in Scan & Order customer menu |
| Severity | **High** for restaurants that configure per-channel availability — disallowed items are visible AND addable to cart on every channel |
| Reproducibility | Deterministic — there is no channel filter anywhere in the menu pipeline |
| Affects business logic? | The bug itself is an *absence* of a business-rule gate. Fixing it does not require changing payloads, totals, taxes, or KOT. |
| Affects desktop & mobile? | Yes — same code path, no breakpoint dependence |

---

## 2. Affected flows

All four customer order channels (and the walk-in variants) feed into the same `MenuItems.jsx` rendering pipeline with no per-channel branching:

| Channel | Entry point | Active orderType seen by app |
|---|---|---|
| **Dine-in (Table QR)** | `/{restaurantId}?type=table&tableId=…&orderType=dinein` | `dinein` |
| **Dine-in (Room QR)** | `/{restaurantId}?type=room&tableId=…&orderType=dinein` | `dinein` (room context detected via `roomOrTable`) |
| **Walk-in dine-in** | `/{restaurantId}?type=walkin&orderType=dinein` | `dinein` |
| **Takeaway** | `/{restaurantId}?type=walkin&orderType=takeaway` (or `take_away`) | `takeaway` / `take_away` |
| **Delivery** | `/{restaurantId}?type=walkin&orderType=delivery` | `delivery` |
| **Direct URL (no QR)** | `/{restaurantId}` | defaults to `dinein` (backward compat) |

In every case the user lands on `/{restaurantId}/{station}` and sees the **same** menu sections — no per-channel filter is applied.

---

## 3. Current menu/product API in use

| Concern | Value |
|---|---|
| Frontend service | `frontend/src/api/services/restaurantService.js` → `getRestaurantProducts()` |
| HTTP call | `POST {REACT_APP_API_BASE_URL}/web/restaurant-product` |
| Where called | `frontend/src/hooks/useMenuData.js` → `fetchMenuSections()` (consumed by `useMenuSections`) |
| Request payload | `{ restaurant_id: String, category_id: "0", food_for?: String }` |
| `food_for` semantics | Sub-menu / station name (`Normal`, `Party`, `Premium`, `Aggregator`, or station-named menu). **NOT** an order-channel filter. |
| Backend documented in baseline | `current-state/API_USAGE_MAP.md` §A2; `current-state/RUNTIME_API_FLOW_AUDIT.md:36`; `API_MAPPING_v2.md:73-77`; `CUSTOMER_ENDPOINTS_v2.md:251` |

> The frontend currently does **not** send an `order_type` (or equivalent) parameter to this endpoint, so it cannot be relying on backend-side pre-filtering by channel.

---

## 4. API response fields the frontend currently CONSUMES on each item

Source of truth: `useMenuData.js` `fetchMenuSections` lines 39–82 (transformer).

Whitelisted fields that survive the transformer:
```
id  name  description  price  image  veg(→isVeg/isEgg)  allergens  variations
add_ons  portion_size  station_name  live_web
web_available_time_starts  web_available_time_ends  tax  tax_type  kcal
```

This list is also recorded in `current-state/API_USAGE_MAP.md:85`.

**No channel-availability field is in that whitelist.** Even if the backend were to return any of:
- `dine_in`, `dinein`, `is_dine_in`, `dineIn`
- `delivery`, `is_delivery`
- `takeaway`, `take_away`, `is_takeaway`
- `room`, `room_service`, `is_room`
- `order_channels` / `allowed_channels` (an array)
- `order_type` (per-item allowed list)

…the transformer at `useMenuData.js:63–82` would silently drop it before any UI code ever saw it. Channel info is **definitively** not propagated past the transformer today.

---

## 5. Current frontend filtering logic — where filters happen

| Stage | File / line | What is filtered | Channel-aware? |
|---|---|---|---|
| Render-time per-item availability gate | `components/MenuItem/MenuItem.jsx:46`, `utils/itemAvailability.js` (`isItemAvailable`) | `live_web`, category timing, item timing, POS time-of-day | ❌ **No** |
| Search / category filters in menu page | `pages/MenuItems.jsx:331-359` (`filterItems`) + `pages/MenuItems.jsx:687-688` | Search text, Veg/Non-Veg/Egg, Dietary tags | ❌ **No** |
| Add-to-cart eligibility | `context/CartContext.js:205-251` (`addToCart`) | (none — accepts any item) | ❌ **No** |
| Variant/add-on selection | `components/CookingInstructionsModal/*`, variations modal | (none related to channel) | ❌ **No** |

> `MenuItems.jsx` does **not** read `useScannedTable().orderType`. The only place `orderType` is read inside the customer flow is `ReviewOrder.jsx`, `LandingPage.jsx`, and `OrderSuccess.jsx` — all post-menu screens. The signal exists; it just never reaches menu rendering.

---

## 6. Active order-type detection — confirmed working

Single source of truth: `frontend/src/hooks/useScannedTable.js`.

| Source | Behavior |
|---|---|
| URL params on first scan | `orderType` / `order_type` (values: `dinein` / `delivery` / `takeaway` / `take_away`) |
| Persistence | `sessionStorage["scanned_table_${restaurantId}"]` |
| Mode-switch UI | `OrderModeSelector` writes via `updateOrderType(...)` (line 78) — for switching between takeaway and delivery |
| Walk-in vs scanned | `roomOrTable` ∈ `'table' | 'room' | 'walkin' | null` |
| Fallback | If `orderType` missing → defaults to `'dinein'` (intentional backward-compat for old QR codes — `useScannedTable.js:36-39`) |

So at any point in the menu flow we can read `useScannedTable().orderType`. The plumbing is there; only the consumption is missing in the menu pipeline.

---

## 7. Does the frontend filter items by channel today? — **No**

| Question | Answer | Evidence |
|---|---|---|
| Does the transformer carry channel fields? | No | `useMenuData.js:63-82` whitelists only 17 specific fields |
| Does the menu page filter by channel? | No | `MenuItems.jsx:331-359` filters only on text/veg/dietary |
| Does the item card hide/disable by channel? | No | `MenuItem.jsx:150` gates only on `isAvailable` (live_web + timings) and `isOnlineOrderEnabled` (a global on/off flag, not a per-channel flag) |
| Does add-to-cart enforce channel? | No | `CartContext.addToCart` accepts any item |
| Does search reveal disallowed items? | Yes | Same data set is searched; nothing about channel is removed first |
| Does category list hide empty categories on a given channel? | N/A | No category is ever empty due to channel — all items remain in all channels |

---

## 8. Are disallowed items still addable to cart? — **Yes** (confirmed by code path)

Because there is no channel-side filter at any layer, the user can:
- See the item in browse/search
- Open variants/add-ons
- Press “ADD” → `MenuItems.jsx:onAddToCart` → `CartContext.addToCart` → item is added with no eligibility check
- Reach Review screen with that item
- Submit the order with that item in the payload

No frontend layer prevents this. Whether the **backend POS** then quietly accepts, rejects, or downgrades such an order is a separate question we cannot answer from the codebase alone (see §9 ownership).

---

## 9. Ownership classification

| Concern | Owner | Confidence |
|---|---|---|
| Frontend transformer drops any channel field | **Frontend** | High — verified in code |
| Frontend has no channel-filter in `MenuItems.jsx` | **Frontend** | High — verified in code |
| Frontend has no add-to-cart eligibility guard | **Frontend** | High — verified in code |
| Active `orderType` is captured and persisted | **Frontend (already done)** | High |
| **Whether `/web/restaurant-product` returns channel-availability fields at all** | **Unclear → Backend (POS) ownership for the contract** | **Low — never observed in this codebase** |
| Whether the request payload SHOULD include `order_type` so backend pre-filters | **Backend (POS) for contract; Frontend for sending it** | Unclear |
| Whether channel availability is configured on the POS admin side per-item today | **Backend / Product** | Unclear |

> **Critical unknown:** The current codebase, baseline docs (`API_USAGE_MAP.md`, `RUNTIME_API_FLOW_AUDIT.md`, `API_MAPPING_v2.md`, `CUSTOMER_ENDPOINTS_v2.md`), and v2 sprint docs contain **zero** references to per-item channel-availability fields. We need a confirmed sample response from `/web/restaurant-product` (preprod) to know the exact field shape before any frontend filter can be implemented correctly.

---

## 10. Proposed minimal fix options (NOT applied)

> **Step 0 (mandatory before any fix):** Capture one real `/web/restaurant-product` response from preprod for a restaurant that has channel-restricted items configured, and document the exact field name(s) used to express channel availability. Without this, any frontend filter would be guessing.

### Option A — Frontend-only filter (assumes backend already returns channel fields)
**Use when:** Step 0 confirms each item carries explicit channel fields (e.g. `is_dine_in`, `is_delivery`, `is_takeaway`, `is_room`) or an array (`order_channels: ["dine_in", "delivery"]`).

Three small surgical changes, all CSS-isolated to filtering layers:

1. **Transformer** (`useMenuData.js:63-82`) — extend the whitelist to carry the channel fields verbatim under a single normalised key, e.g. `allowedChannels: { dineIn: !!item.is_dine_in, delivery: !!item.is_delivery, takeaway: !!item.is_takeaway, room: !!item.is_room }`. **No payload-builder, no cart, no order-service touched.**

2. **Filter helper** (new tiny pure function `utils/channelEligibility.js`) — `isItemAllowedForChannel(item, orderType, roomOrTable)` returning boolean. No external state.

3. **MenuItems.jsx** — call the helper in `filterItems(items)` (around line 331). Empty-after-filter categories should be hidden (collapse in the existing rendering loop at `:687-688`).

4. **MenuItem.jsx** + **CartContext.addToCart** — defensive: also gate the ADD button on `isItemAllowedForChannel`. Add-to-cart should refuse silently or with a toast for any item that slips through (e.g. via deep links, search).

**Files touched (Option A):** 4 frontend files, JS-only, no JSX-structural change, no payload change, no API change. Estimated diff <50 lines net.

### Option B — Backend pre-filter (recommended if backend supports a request param)
**Use when:** Step 0 reveals the POS API supports an `order_type` request parameter that pre-filters items.

1. Extend `restaurantService.getRestaurantProducts` to accept an optional `orderType` and forward it into the payload — e.g. `{ restaurant_id, category_id: "0", food_for?, order_type? }`.
2. `useMenuSections(stationId, restaurantId, orderType)` — append `orderType` to the React-Query key so different channels cache separately.
3. `MenuItems.jsx` — pass `useScannedTable().orderType` into the hook.

**No transformer change, no per-card guard.** Lowest visual risk; backend stays the source of truth.

### Option C — Hybrid (defense-in-depth)
Apply Option B (channel awareness baked into the request) **and** Option A's add-to-cart guard, so even direct-link / cached cases are safe. Recommended if the data model is large or admin-configurable from POS.

### What we should explicitly NOT do
- ❌ Do **not** introduce a hardcoded channel-allow list in the frontend.
- ❌ Do **not** mutate the order placement payload to include channel data the backend does not currently expect.
- ❌ Do **not** rename `food_for` or repurpose it as a channel filter — it's a sub-menu axis (`Normal`/`Party`/`Premium`).
- ❌ Do **not** introduce a global flag toggle to switch channel filtering on/off — make it data-driven from the API.

---

## 11. Risks & edge cases

| Risk | Mitigation |
|---|---|
| Backend doesn't actually return channel fields → silent filter does nothing | Step 0 confirms field shape before coding. If absent, escalate to backend team. |
| Field present but optional/absent on legacy items → undefined → treated as "disallowed everywhere" | Default rule: if all four flags absent/empty/null → treat as **allowed on all channels** (backwards-safe). Add explicit docstring. |
| Customer adds item on dine-in then switches mode to takeaway/delivery via `OrderModeSelector` → cart now has disallowed item | Decision needed: (a) silently drop disallowed items from cart with a toast, (b) prompt user to confirm removal, or (c) block the mode switch. **Prefer (b) for transparency.** |
| Empty category after filter → blank section header | Hide section if `filteredItems.length === 0` (already a pattern at `MenuItems.jsx:687-688`). |
| Search returns 0 results because all matches are filtered out | Show existing empty-state message — same UX as veg/dietary filter. |
| React Query cache shared across channels in Option A → stale UI on quick channel switch | Not an issue: items are not re-fetched, only re-filtered. |
| React Query cache key drift in Option B | Add `orderType` to the query key (one-line change). |
| Order placement payload accidentally changes | None of the options touch `orderService.ts` or `paymentService.ts` payload builders. Add a regression assertion: byte-equal payload diff against pre-fix baseline. |
| Variants/add-ons of disallowed items | Filter at top level only — once item is excluded, its variants/add-ons can never be reached. No separate work needed. |
| Live mode-switch (`updateOrderType`) doesn't trigger menu re-render | `MenuItems.jsx` consumes `useScannedTable()` already through the parent; once channel is part of filter input it will re-render automatically. |
| Edit-order flow (`isEditMode`) — previousItems may include items not allowed on a different channel | Out of strict scope; document as a follow-up to address in a separate CR. |

---

## 12. Validation checklist (to run AFTER the owner approves a fix option)

### Step-0 evidence (must collect first)
- [ ] Captured one real `/web/restaurant-product` response (preprod, restaurant id with channel-restricted items)
- [ ] Documented exact field name(s) used by POS for channel availability
- [ ] Confirmed whether the API supports an `order_type` request parameter

### Functional regression — must remain unchanged
- [ ] Cart quantities, item totals, subtotal, tax, service charge, delivery charge unchanged
- [ ] Order placement payload byte-equal for an order containing only universally-allowed items (dine-in scenario)
- [ ] Place Order succeeds (dine-in, takeaway, delivery, room)
- [ ] Razorpay flow unchanged
- [ ] KOT/bill/print unchanged (no change is possible since neither the payload nor any backend file is touched)
- [ ] Coupon, loyalty, wallet sections unaffected
- [ ] Search returns expected results for the active channel only
- [ ] Veg/Non-Veg/Egg + Dietary tag filters still work, in combination with channel filter
- [ ] Variants and add-on selection still work for items that ARE allowed on the active channel

### Channel-availability scenarios — primary
1. **Item allowed only for dine-in**
   - [ ] Visible + addable on Table QR (dine-in)
   - [ ] Visible + addable on Room QR (dine-in/room)
   - [ ] Visible + addable on Walk-in dine-in
   - [ ] Hidden / not-addable on Walk-in takeaway
   - [ ] Hidden / not-addable on Walk-in delivery
2. **Item allowed only for delivery**
   - [ ] Visible + addable on delivery
   - [ ] Hidden / not-addable on dine-in (table, room, walk-in)
   - [ ] Hidden / not-addable on takeaway
3. **Item allowed for takeaway + delivery**
   - [ ] Visible + addable on takeaway
   - [ ] Visible + addable on delivery
   - [ ] Hidden / not-addable on all dine-in flavors
4. **Item allowed for room only**
   - [ ] Visible + addable on Room QR
   - [ ] Hidden / not-addable on table dine-in / takeaway / delivery / walk-in dine-in
5. **Item allowed for ALL channels** (legacy items with no flags set)
   - [ ] Visible + addable everywhere (backwards-compat default)

### Search / category validation
- [ ] Search inside any single channel hides items disallowed for that channel
- [ ] Empty category sections after filter are hidden gracefully
- [ ] Category navigation jump still works for non-empty sections only

### Cart validation
- [ ] Cannot add disallowed item via direct deep-link to a variant modal
- [ ] If user switches mode (`OrderModeSelector` takeaway↔delivery), cart behavior is the chosen one (a/b/c above)

### Cross-platform smoke
- [ ] Mobile Safari (iOS), Mobile Chrome (Android) — channel filter works
- [ ] Desktop browsers — same
- [ ] React Query cache: refresh, return — channel filter persists from `sessionStorage` and shows correct items

### Telemetry / logs
- [ ] Frontend logger reports zero "Item filtered" errors for normal flows
- [ ] No 4xx/5xx introduced on `/web/restaurant-product` calls
- [ ] No new console errors on menu pages

---

## 13. Approval gate

> 🛑 **No code has been changed. No test order has been placed. Awaiting owner approval.**

Please confirm:

1. **Approve the investigation findings?** ✅ Yes / ❌ No / 🔄 Need clarification.
2. **Authorize Step 0?** OK to make ONE read-only `POST /web/restaurant-product` call against preprod for a restaurant that the owner specifies (please share `restaurant_id` to use, and any channel-restricted item id(s) to look for) and document the response fields. **No write/test orders. No backend changes. No POS admin changes.**
3. **Preferred fix option to plan around (subject to Step 0 outcome):**
   - (A) Frontend-only filter (if API already returns channel fields)
   - (B) Backend pre-filter via `order_type` request param (if supported)
   - (C) Hybrid — Option B + Option A's defensive add-to-cart guard
4. **Cart-on-channel-switch policy:**
   - (a) Silently drop disallowed items + toast
   - (b) Prompt user to confirm removal *(recommended)*
   - (c) Block the mode switch until cart is cleared/edited
5. **Empty-category UX:** hide silently / show "No items available for this channel" stub?
6. **Edit-order flow scope:** include now (extra surface) or defer to a separate CR?
7. **Permission to run testing agent** afterward (Playwright/mobile-emulation only — no backend changes) to validate the channel filter for all 4 channels?

Once you reply with answers, I'll either issue the read-only Step 0 probe or proceed directly to the chosen option (A/B/C) with a focused diff and the validation checklist above.
