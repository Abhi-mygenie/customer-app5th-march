# Status Log — Product API Field Mapping (D-1: Transformer Coverage)

**Last updated:** 2026-05-09
**Owner-approved scope:** D-1 only — pure transformer field coverage. **Zero behavior change.**
**Owner direction recap:**
- ✅ Approve audit findings
- 🔄 For now: map all fields in transformation; building business logic = **separate CRs**
- ✅ Room flow falls back to `dinein` flag (decided)
- ✅ Cart-on-channel-switch policy: **(b) prompt + confirm**
- ⏸ Edit-order eligibility re-check on previous items: **deferred**
- ✅ Permission to run testing agent for downstream CRs

---

## What was changed in this CR (D-1)

Single file: `frontend/src/hooks/useMenuData.js`
**+45 / −0** lines — purely additive, inside the existing per-item `return { ... }` literal of `fetchMenuSections`.

### 14 new keys carried from API → transformer output (with permissive defaults)

| FE key on each item | Raw API source | Default | Future consumer |
|---|---|---|---|
| `dinein` | `item.dinein` | `'Yes'` | A-1 channel filter (room flow uses this too) |
| `takeaway` | `item.takeaway` | `'Yes'` | A-1 |
| `delivery` | `item.delivery` | `'Yes'` | A-1 |
| `status` | `item.status` | `1` | A-2 kill-switch |
| `is_disable` | `item.is_disable` | `'N'` | A-2 |
| `egg_raw` | `item.egg` | `0` | A-3 (egg correction; new isEgg derivation) |
| `jain` | `item.jain` | `0` | A-3 (Jain filter pill) |
| `food_stock` | `item.food_stock` | `null` (sentinel = not enforced) | A-4 |
| `food_order` | `item.food_order` | `0` | A-5 (sort order) |
| `item_code` | `item.item_code` | `''` | (low priority, support traceability) |
| `tax_calc` | `item.tax_calc` | `'Exclusive'` | A-7 (deferred — math) |
| `discount` | `item.discount` | `0` | A-7 (deferred — math) |
| `discount_type` | `item.discount_type` | `'percent'` | A-7 (deferred — math) |
| `give_discount` | `item.give_discount` | `'Yes'` | A-7 (deferred — coupon eligibility) |
| `takeaway_charge` | `item.takeaway_charge` | `'0.00'` | A-7 (deferred — math) |
| `item_delivery_charge` | `item.delivery_charge` (renamed) | `'0.00'` | A-7 (deferred — math) |
| `complementary` | `item.complementary` | `'No'` | A-7 (deferred — mechanic spec) |
| `complementary_price` | `item.complementary_price` | `'0'` | A-7 (deferred — mechanic spec) |
| `prepration_time_min` | `item.prepration_time_min` | `0` | UX (ETA chip — future) |
| `serve_time_in_min` | `item.serve_time_in_min` | `0` | UX (ETA chip — future) |
| `attributes` | `item.attributes` | `'[]'` | unclear intent — pending backend |

> 18 new keys total (14 unique audit-list fields + a few sub-pairs like `discount_type` + `complementary_price`).

### Why the `delivery_charge` was renamed
Item-level `delivery_charge` from the Product API was renamed to `item_delivery_charge` in the FE transformer output. This avoids a name-collision with the **cart-payload-level** field `delivery_charge` already used at:
- `helpers.js:450` (`delivery_charge: String(deliveryCharge || 0)` in multi-menu payload)
- `orderService.ts:327, 459` (placeOrder + updateCustomerOrder restaurant-level field)
- `ReviewOrder.jsx:103` (state binding to restaurant-level setting)

These two are different concepts (per-item vs cart-level total) and must not be conflated. The rename is reversible at any downstream CR if the math team prefers a different naming convention.

### Why no consumer reads any of these yet
By design. D-1 is a **pure data-preservation** step. Each downstream CR (A-1 / A-2 / …) wires its own consumer with its own validation cycle and its own owner approval. This guarantees:
- D-1 alone has **zero** risk of changing UI behavior, payload, totals, KOT, or any downstream system.
- Each business-logic gate ships independently with its own backend-semantic confirmation.

---

## Validation (already done)

| Check | Result |
|---|---|
| ESLint | ✅ No issues found |
| Webpack | ✅ compiled with 1 (pre-existing) warning, "No issues found" |
| Frontend HTTP `/` | ✅ HTTP 200 |
| Per-item transformer output (full payload — channel-restricted vodka) | ✅ all 14 new keys carried verbatim |
| Per-item transformer output (legacy minimal payload) | ✅ permissive defaults applied (all gates default to "allowed") |
| Per-item transformer output (egg via dedicated field) | ✅ `egg_raw=1` carried separately; `isEgg` behavior unchanged (A-3 will fix) |

Simulation script archived: `/root/.emergent/automation_output/20260509_140353/`.

---

## Next-CR sequence (each is a separate diff + separate approval gate)

> All future CRs are **gated** on owner approval and (where noted) **backend-semantics confirmation**.

| # | CR | What it does | Backend confirmation needed | Decision points |
|---|---|---|---|---|
| **A-1** | Channel filter (`dinein`/`takeaway`/`delivery`) | `MenuItems.jsx` + `MenuItem.jsx` + add-to-cart guard. Room flow uses `dinein` flag (decided). | None (`"Yes"`/`"No"` enum confirmed by sample) | Cart-on-channel-switch UX = **(b) prompt + confirm** (decided) |
| A-2 | `is_disable` + `status` kill-switch | Add to `utils/itemAvailability.js` alongside `live_web` | (i) `status: 0` semantics, (ii) `is_disable` channel scope, (iii) precedence vs `live_web` | UX: silent hide vs greyed badge |
| A-3 | `egg` correction + Jain filter | `isEgg = (egg_raw===1) || (veg===2)` (defensive); add Jain filter pill | None | Filter UX: new pill vs fold into dietary multi-select |
| A-4 | `food_stock` kill-switch | Hide / disable ADD when `food_stock <= 0` | Is `0` = out, count, or unused? Threshold? | UX: hide vs "Out of stock" badge |
| A-5 | `food_order` sort | Sort items ascending within category | Confirm it's sort_order | None |
| A-6 | Defensive add-to-cart guard | `CartContext.addToCart` re-checks every gate from D-1/A-1/A-2/A-4 | None | None |
| A-7 (deferred) | Per-item `tax_calc`, `discount`, `takeaway_charge`, `item_delivery_charge`, `complementary` mechanic | Math/payload-affecting | All semantics + precedence + complementary spec | Per-CR owner sign-off + cart-total diff |
| Out of scope | Edit-order flow eligibility re-check | — | — | **Deferred** |

---

## Closure criteria for D-1

- [x] Code applied and lint-clean
- [x] Webpack compiles
- [x] Simulation verifies all new keys are carried with permissive defaults
- [x] Status log written
- [ ] Owner acknowledges step done and gives go-ahead for **A-1** (channel filter) — **awaiting**

No further work in this CR. Standing by for go-ahead on A-1.
