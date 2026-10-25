# INVESTIGATION REPORT — INV-2026-10-14-002
## How a menu item becomes visible / orderable for a customer, with respect to inventory (stock)

| Field | Value |
|---|---|
| **ID** | INV-2026-10-14-002-menu-item-visibility-inventory-logic |
| **Role** | Role 6 — INVESTIGATION (read-only; **no code edited**, owner instruction "no edits") |
| **Date** | 2026-10-14 |
| **Owner question** | "What is the logic of menu items showing to customers, with respect to inventory — I guess there are CRs related to this." |
| **Steps used** | 8 / 10 |
| **Env probed** | Code on `main` in `/app/frontend/src`; POS preprod (`MYGENIE_API_URL`) read-only `web/restaurant-product` + `web/restaurant-info` for rids 689, 478, 716 |
| **Related CRs found** | **CR-2026-09-07-001** Inventory / stock-out control (CLOSED, QA PASS 2026-09-08) · **CR-2026-06-17-003** Customer menu availability APP-11/12/13 (IMPLEMENTED) · **CR-2026-06-17-001** APP-3 admin channel overrides · **CR-2026-09-08-001** no-image card add-channel guard (INTAKE) · INV-2026-06-17-002 default ordering · `BE_ASK_STOCKOUT_INV-2026-09-07-001.md` (POS clarifications) |

---

## 0. Answer in one paragraph

A menu item reaches the customer only if it survives **five gates, in this order**, all evaluated in the browser on data POS returns from `POST /web/restaurant-product`: **(1) channel** — the item's `dinein/takeaway/delivery` flag (or an admin override) allows the scanned order type; **(2) kill-switch** — `live_web === 'Y'`; **(3) time** — admin category timing > admin item timing > POS `web_available_time_starts/ends` > else 24 h; **(4) inventory** — `stock_out !== 'Y'`, unless the restaurant's POS setting `show_out_of_stock_items === 'Yes'`, in which case the item is shown with a **Sold Out** badge and no ADD button; **(5) search / veg / dietary filters** chosen by the customer. Inventory is enforced in **three layers** (CR-2026-09-07-001): hide on the menu, block in `addToCart()`, and a pre-submit cache check plus a POS **422 `out_of_stock_items`** hard stop at order placement. The *only* inventory signal that decides visibility is the POS-computed boolean `stock_out`; the numeric `food_stock` is used solely for an "Only N left" badge (<=3) and a quantity cap at place-order. Two POS fields that look like kill-switches — `is_disable` and `status` — are mapped but **never enforced** (verified live: item 62420 "Test" on rid 478 has `is_disable='Y'` and is shown/orderable).

---

## 1. Hypotheses and how they fared

| # | Hypothesis | Evidence | Result |
|---|---|---|---|
| H1 | Visibility w.r.t. inventory is driven by one POS boolean (`stock_out`), not by the stock count | `MenuItems.jsx:399-404`, `MenuItem.jsx:56`, `CartContext.js:228`; live crosstab on 689: 27 items have `food_stock=0` **and** `stock_out='N'` -> shown | **CONFIRMED.** `food_stock` never hides anything |
| H2 | FE also enforces POS `is_disable` / `status` kill-switches | grep: only `useMenuData.js:102-103` maps them; `channelEligibility.js:29` comment says "not this file"; no consumer; live item 62420 (`is_disable='Y'`) orderable | **REFUTED — gap F-2** (planned "CR A-2" never shipped) |
| H3 | POS pre-filters hidden items server-side, so FE gates are defence-in-depth only | Live payloads contain `live_web='N'` (478: 1, 716: 2), `is_disable='Y'` (478: 1), `stock_out='Y'` (689: 69, 478: 10) | **REFUTED.** POS returns everything; the FE is the only filter for web customers |

Classification: **FE (logic) + DATA (POS fields)** · Confidence: **HIGH** on the FE cascade (code + live data), **MEDIUM** on POS semantics of `is_disable`, `inventory_negative`, `food_stock=0` (need POS confirmation).

---

## 2. The visibility cascade, exactly as coded

### 2.1 Data in — `hooks/useMenuData.js` L55-125 (transform of `web/restaurant-product`)
Fields carried per item (permissive defaults by design, PRODUCT_API audit D-1):

| Field | Default if missing | Consumed by | Effect |
|---|---|---|---|
| `live_web` | `null` -> treated as unavailable | `itemAvailability.isItemAvailable` step 1 | hard hide |
| `web_available_time_starts/ends` | `null` -> 24 h | step 3 | time window (overnight supported; `start===end` = always) |
| `dinein` / `takeaway` / `delivery` | `'Yes'` | `channelEligibility.isItemAllowedForChannel` | hide for the scanned channel; room falls back to `dinein` |
| `stock_out` | `'N'` | menu filter, card render, `addToCart`, pre-submit check | **the inventory gate** |
| `food_stock` | `null` ("not enforced") | `MenuItem.isLowStock` (1-3 -> "Only N left"), `ReviewOrder` pre-submit quantity cap | badge + cap only, never hides |
| `status`, `is_disable` | `1`, `'N'` | **nobody** | none (F-2) |
| `add_ons[].stock_out` | — | `CustomizeItemModal.jsx:264` | addon checkbox disabled, item still orderable (D6) |
| `food_order`, `category_order` | 0 | ordering (INV-2026-06-17-002) + admin `menuOrder` overrides | order, not visibility |

React Query: `staleTime 30 s`, `refetchOnWindowFocus`, `refetchOnReconnect` (APP-13) — so a POS stock change reaches an open menu within ~30 s or on tab focus.

### 2.2 Page-level filter — `pages/MenuItems.jsx` `filterItems()` L374-420 (order matters)
1. **Channel** (CR A-1 + APP-3): `isItemAllowedForChannel(item, scannedOrderType, {categoryOverride, itemOverride})` — priority item admin override > category admin override > POS flag; `orderType` null -> allowed.
2. **Availability** (APP-11): `isItemAvailable(item, now, {categoryTiming, itemTiming})`:
   - step 1 `live_web !== 'Y'` -> hidden;
   - step 2 admin `categoryTimings[categoryId]` window -> hidden if outside;
   - step 3 admin `itemTimings[itemId]` if set -> decides; else POS `web_available_time_*` (null/malformed/equal -> 24 h).
3. **Inventory** (CR-2026-09-07-001 Layer 1): `if (restaurant.show_out_of_stock_items !== 'Yes') filtered = filtered.filter(i => i.stock_out !== 'Y')`. Default = **hide**. `show_out_of_stock_items` comes from POS `web/restaurant-info` (root, `"Yes"/"No"`), **not** from our admin config.
4. Customer **search**, **veg/non-veg/egg**, **dietary tags**.

Sections whose items all fail -> `return null` (no header) in the "All" view (L879) — but the **category boxes are rendered from the unfiltered `menuSections` (L778)**, so a fully-hidden category still shows as a tappable box that opens to "(0 Items)" (finding F-3).

### 2.3 Card-level render — `components/MenuItem/MenuItem.jsx` L40-60, L161-170, L231-240
Defence-in-depth, re-evaluated per card:
- `isAvailable` (same cascade) · `isChannelAllowed` (POS flag only — **no admin overrides passed here**, unlike the page filter) · `isStockOut` · `isLowStock` (`0 < food_stock <= 3`) · prop `isOnlineOrderEnabled` (restaurant `online_order`).
- Render order: in-cart stepper -> `isStockOut ? "Sold Out"` -> `isAvailable && isOnlineOrderEnabled [&& isChannelAllowed]` -> ADD -> else nothing. The **no-image card omits `isChannelAllowed`** — that is exactly CR-2026-09-08-001 (parked).
- "Only N left" badge shown when `isLowStock && !isInCart`.

### 2.4 Cart — `context/CartContext.js` `addToCart()` L220-236 (Layer 2)
1. channel guard (`activeOrderType` passed by caller) -> toast "not available for X orders";
2. **`item.stock_out === 'Y'` -> toast "currently out of stock", return.**
No `food_stock` quantity cap here — a customer may add 10 of an item with `food_stock = 2`; caught only at 2.5.

### 2.5 Mid-session — `MenuItems.jsx` L163-188 (APP-11 option C)
Every minute (and on menu refetch) cart items are re-checked with `isItemAvailable`; failures are **auto-removed** with a toast. **Not** re-checked for `stock_out` — an item that goes out of stock while in the cart stays in the cart until Layer 3 (finding F-4, by design per CR-09-07-001 but worth knowing).

### 2.6 Place order — `pages/ReviewOrder.jsx` + `api/services/orderService.ts` (Layer 3)
- Pre-submit **cache check** (L1189-1240): reads React-Query cache; `stock_out==='Y'` -> "sold out, remove it"; `0 < food_stock < quantity` -> "Only N available (you have M)"; blocks submit, cart preserved.
- APP-12 re-validation (L1505-1530): forced `refetchQueries(['menuSections'...])`, then `isItemAvailable` for each cart item; unavailable items **removed** with toast; customer must click again.
- POS backstop: `placeOrder` / `updateCustomerOrder` detect **HTTP 422 with `out_of_stock_items[]`** (`orderService.ts:447-456, 590-599`) -> typed `isStockOut` error -> `ReviewOrder.jsx:1823-1838` toasts item/addon names, **does not navigate, does not clear cart**.

### 2.7 Admin controls that participate (all local config, see INV-2026-10-14-001 S4-G)
`channelOverrides`, `categoryTimings`, `itemTimings`, `menuOrder` (order + category/item **visibility** toggles applied upstream in `MenuItems.jsx` L99-135), `stationTimings` (DiningMenu). None of them touches inventory; inventory is POS-only.

---

## 3. What POS sends today (live, preprod, 2026-10-14)

| rid | items | `live_web` N | `is_disable` Y | `stock_out` Y | `food_stock` =0 / 1-3 / >3 | addons `stock_out` Y | `inventory` | `inventory_negative` | `show_out_of_stock_items` |
|---|---|---|---|---|---|---|---|---|---|
| 689 Kunafa Mahal (UAT) | 126 | 0 | 0 | **69 (55 %)** | 96 / 4 / 26 | 0 | Yes | **Yes** | No |
| 478 (18march) | 149 | 1 | **1** | 10 | 149 / 0 / 0 | 39 | Yes | Yes | No |
| 716 (multi-menu) | 373 | 2 | 0 | 0 | 373 / 0 / 0 | 0 | No | No | No |

Observations:
- **689 hides 69 of 126 items right now**, and six categories are entirely empty for customers (Indo-Fusion Kunafa, Kunafa Cones, Kunafa Bombs, Shakes, Valentine Kunafa, Mini Kunafa) while still appearing as category boxes (F-3).
- `stock_out` is **not** `food_stock == 0`: on 689, 27 items have `food_stock=0` yet `stock_out='N'`; on 478 **all** items have `food_stock=0` (inventory not tracked at finished-goods level) and only 10 are `stock_out='Y'`. Per `BE_ASK_STOCKOUT` reply, `stock_out` is computed by POS from **ingredient/recipe inventory** ("Not enough stock for ingredient ID ..."). The FE's decision to treat `stock_out` as the single source of truth is therefore correct; treating `food_stock=0` as "out" would wrongly hide whole menus.
- `inventory_negative = 'Yes'` on both inventory-enabled restaurants means POS *allows selling into negative stock* — yet it still flags `stock_out='Y'` and (per CR-09-07-001 evidence) rejects with 422. Whether POS intends web customers to be blocked when negative stock is allowed is **unconfirmed** (open question Q-1). If POS says "no", 689's 55 % hidden menu is a POS-side over-restriction, not an app bug.
- `inventory_alert_number` is a phone number (478: 10 digits), not a threshold — the FE's low-stock badge threshold (<=3) is a hard-coded FE constant with no POS counterpart.
- POS does **not** pre-filter `live_web='N'` or `is_disable='Y'` items for the web endpoint; the FE is the only filter.

---

## 4. Findings

| ID | Finding | Severity | Where | Suggested home |
|---|---|---|---|---|
| **F-1** | Inventory visibility = `stock_out` only; `food_stock` never hides; design is coherent with POS ingredient-level inventory | — (information) | S2 | none |
| **F-2** | `is_disable='Y'` (and `status=0`) items are **shown and orderable** — fields mapped since PRODUCT_API audit D-1, "CR A-2 kill-switch" never registered/shipped. Live: 478 item 62420 "Test" | **P2 bug / gap** (customer could order a POS-disabled item; POS may or may not reject at placement) | `useMenuData.js:102-103`, `itemAvailability.js:57-61` | new CR (one-line `isItemAvailable` step 1b) **after POS confirms semantics** |
| **F-3** | Category boxes rendered from unfiltered `menuSections` -> fully hidden categories remain tappable and open to "(0 Items)". On 689 today: 6 such boxes | **P3 UX** | `MenuItems.jsx:778` vs `:874-881` | new small CR; or fold into CR-2026-09-08-001 planning (same page) |
| **F-4** | In-cart items are auto-removed when they go **out of time window** mid-session, but **not** when they go out of stock; the customer learns at place-order (Layer 3) | P3 UX (accepted by CR-09-07-001 design) | `MenuItems.jsx:163-188` | optional follow-up; owner call |
| **F-5** | `addToCart` has no `food_stock` quantity cap; cap only at pre-submit cache check | P3 UX | `CartContext.js:228`, `ReviewOrder.jsx:1205-1215` | optional; depends on Q-2 (is `food_stock` authoritative?) |
| **F-6** | Card-level `isChannelAllowed` ignores admin channel overrides (page filter applies them) — harmless today because the page filter runs first, but the two guards disagree; and the no-image card omits the guard entirely | P3 | `MenuItem.jsx:53, 165, 235` | **already CR-2026-09-08-001** (INTAKE) — add the override-parity note at its Planning |
| **F-7** | 55 % of 689's menu hidden with `inventory_negative='Yes'` — possibly intended (UAT data), possibly POS over-restriction | business question | S3 | Q-1 to POS/owner |

---

## 4b. Owner follow-up 2026-10-14 — negative-stock mode (F-8, decisions OD-INV2-1...6)

Owner asked: *"if `inventory_negative=Yes` then we should not use inventory logic, all foods should be shown and user should be able to order — is that logic missing?"* Investigated read-only; answer: **yes, missing** — `grep -rn inventory_negative frontend/src` -> 0 hits; CR-2026-09-07-001 (intake, impact, plan, POS ask, QA) never mentions negative-stock mode; POS still sends `stock_out='Y'` under `inventory_negative='Yes'` (541: 62 items incl. 30/32 coffees + all cold brew; 689: 69; 478: 10 — all `is_inventory='Yes'` items).

| ID | Finding / decision | Owner answer (verbatim -> recorded meaning) |
|---|---|---|
| **F-8** | Negative-stock bypass is **missing**: FE never reads `inventory_negative`; all stock gates apply regardless | — |
| **OD-INV2-1** | Does POS `customer/order/place` still 422 when `inventory_negative='Yes'`? | "confirmed" -> **No 422; customer can order.** (Owner-confirmed; QA to prove with one preprod order on 541/689 before closure.) |
| **OD-INV2-2** | Rule | **`inventory_negative='Yes'` -> no inventory logic at all**: show every item, fully orderable, no Sold-Out state, no "Only N left" badge, no `addToCart` block, no pre-submit stock check |
| **OD-INV2-3** | Addons with `stock_out='Y'` in negative mode | "yes" -> **fully selectable** |
| **OD-INV2-4** | `show_out_of_stock_items` in negative mode | "fine, no sold out badge" -> **irrelevant; nothing rendered as sold out** |
| **OD-INV2-5** | Missing / unknown `inventory_negative` | "default is always yes" -> **treat absent/unknown as `'Yes'` = bypass** (only an explicit `'No'` enforces inventory) |
| **OD-INV2-6** | Where the fix lives | "FE fix, also will ask backend" -> **FE reads the flag from `web/restaurant-info`**; in parallel the owner asks POS to stop sending `stock_out='Y'` for web in negative mode (draft ask: `inbox/OUTBOUND_TO_POS_INVENTORY_NEGATIVE_STOCK_OUT_2026_10_14.md`) |
| **OD-INV2-7** | Behaviour when `inventory_negative='No'` | unchanged — current three-layer enforcement stays |

**Registered as:** `BUG-2026-10-14-001-inventory-negative-bypass-stock-gates` (INTAKE — **stays at the Planning gate** per owner "stay at gate"). Proposed P1 (cafe 541 shows 2 of 32 coffees today), risk HIGH (`CartContext.js` HIGH, `ReviewOrder.jsx` CRITICAL hotspots -> no fast lane).

Touch points for Planning (five reads of `stock_out`/`food_stock`): `MenuItems.jsx:399-404` (Layer-1 filter) · `MenuItem.jsx:56-57, 161-170, 231-240` (Sold-Out / low-stock render) · `CartContext.js:228-232` (Layer-2 guard) · `ReviewOrder.jsx:1189-1240` (pre-submit cache check) · `CustomizeItemModal.jsx:264-275` (addon disable). `orderService.ts` 422 handler stays as harmless backstop. Flag source: `restaurant.inventory_negative` from `web/restaurant-info` (already fetched, anonymous; `'Yes'/'No'` strings).

## 5. Open questions for POS (no action taken; for the next outbound brief or a one-off ask)

| ID | Question |
|---|---|
| Q-1 | ~~When `inventory_negative='Yes'`, should web customers still be blocked?~~ **Answered by owner (OD-INV2-1/2): no.** Remaining ask to POS: stop sending `stock_out='Y'` for the web product endpoint when `inventory_negative='Yes'` (OD-INV2-6, draft ask filed) |
| Q-2 | Is `food_stock` authoritative finished-goods stock (so a quantity cap is correct), or informational only? Why is it `0` for every item on 478 and 716? |
| Q-3 | Semantics of `is_disable='Y'` and `status=0` for the web channel: hide, show-disabled, or ignore? Does `customer/order/place` reject them? |
| Q-4 | Does POS intend `web/restaurant-product` to return `live_web='N'` items (FE filters them) — or should the endpoint pre-filter? (Affects the Config -> POS programme Phase 5 "menu-base" cluster.) |

---

## 6. Relationship to the Config -> POS programme (CR-2026-10-14-001)
Inventory logic is **already POS-native end to end** (`stock_out`, `show_out_of_stock_items`, 422) — nothing here moves in the migration. The admin override layers that sit in the same cascade (`channelOverrides`, `categoryTimings`, `itemTimings`, `menuOrder` visibility) are the Phase-5 "menu-base" cluster (owner D-3: keep in blob through Phase 4). F-2 and F-3 are independent small fixes and do not need to wait for the programme.

---

## 7. Evidence
- Code: `frontend/src/hooks/useMenuData.js` L55-125, L179-181 · `frontend/src/pages/MenuItems.jsx` L99-135, L163-188, L374-420, L778, L874-881 · `frontend/src/components/MenuItem/MenuItem.jsx` L40-60, L161-170, L231-240 · `frontend/src/utils/itemAvailability.js` L57-98 · `frontend/src/utils/channelEligibility.js` · `frontend/src/context/CartContext.js` L220-236 · `frontend/src/pages/ReviewOrder.jsx` L1189-1240, L1505-1530, L1823-1838 · `frontend/src/api/services/orderService.ts` L447-456, L590-599 · `frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx` L258-275.
- Registry/docs: `change_requests/CR-2026-09-07-001-inventory-stock-out-control/{INTAKE_DOC,IMPLEMENTATION_PLAN,QA_REPORT}.md` · `change_requests/CR-2026-06-17-003-customer-menu-availability/CR.md` · `change_requests/CR-2026-06-17-001-menu-order-enhancements/` · `change_requests/INV-2026-06-17-002-menu-order-investigation/` · `change_requests/CR-2026-09-08-001-menuitem-no-image-add-channel-guard/INTAKE_DOC.md` · `memory/BE_ASK_STOCKOUT_INV-2026-09-07-001.md`.
- Live POS (read-only, 2026-10-14): `POST /web/restaurant-product {restaurant_id, category_id:"0"}` for 689/478/716 — counts in S3; `POST /web/restaurant-info` for the same rids — `inventory`, `inventory_negative`, `inventory_alert_number`, `show_out_of_stock_items`; item 62420 (478) `is_disable='Y', live_web='Y', stock_out='N'`; item 100779 (478) `live_web='N'`.

---

```text
Investigation complete: INV-2026-10-14-002
Root cause: n/a (logic trace) — customer visibility = channel -> live_web -> time (admin > POS) -> stock_out (unless show_out_of_stock_items=Yes -> Sold Out badge) -> customer filters; inventory enforced in 3 layers (menu / addToCart / pre-submit + POS 422). Gaps: is_disable & status never enforced (F-2); hidden categories still shown as boxes (F-3)
Classification: FE + DATA
Confidence: HIGH (FE cascade; F-8 missing-logic confirmed by grep + CR archaeology + live data) · MEDIUM (POS semantics of is_disable / food_stock)
Steps used: 10/10 (8 original + 2 for the negative-stock follow-up: FE/CR grep, live is_inventory crosstab on 541/689/478)
Evidence: S7 of this report; S3 + S4b live tables (541 added 2026-10-14)
Recommendation: BUG-2026-10-14-001 registered (F-8) -> Planning gate, owner "go" required · F-2/F-3 -> owner decision on follow-up CRs (F-2 after POS answers Q-3) · F-6 -> CR-2026-09-08-001 Planning · Q-2...Q-4 + negative-mode suppression ask -> POS
Investigation CLOSED 2026-10-14 (owner: "close investigation, stay at gate")
Report: /app/memory/change_requests/INV-2026-10-14-002-menu-item-visibility-inventory-logic/INVESTIGATION_REPORT.md
```
