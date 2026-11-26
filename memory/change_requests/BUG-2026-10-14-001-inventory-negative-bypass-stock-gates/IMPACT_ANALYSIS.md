# IMPACT ANALYSIS — BUG-2026-10-14-001
## Negative-stock mode ignored — inventory gates must be bypassed when `inventory_negative='Yes'`

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-14-001 |
| **Role** | Role 2 — PLANNING (Impact Analysis) |
| **Date** | 2026-10-25 |
| **Risk** | **HIGH** — touches `ReviewOrder.jsx` (CRITICAL hotspot) and `CartContext.js` (HIGH hotspot) |
| **Severity** | **P1** |

---

## 1. Code reality check

### 1.1 Flag source — already available, zero fetch work

`inventory_negative` is returned by POS `POST /web/restaurant-info` (verified live 2026-10-25):

| rid | `inventory` | `inventory_negative` | `show_out_of_stock_items` |
|-----|-------------|---------------------|--------------------------|
| 689 | Yes | **Yes** | No |
| 478 | Yes | **Yes** | No |
| 716 | **No** | **No** | No |

The FE already fetches this endpoint via `useRestaurantDetails(restaurantId)` in both `MenuItems.jsx` (L59) and `ReviewOrder.jsx` (L164). The response is cached in React Query under `['restaurant', restaurantId]` with 10-min `staleTime`. The `restaurant` object carries all root keys from the POS response — including `inventory_negative` — but **no code reads it today** (`grep -rn inventory_negative frontend/src` → 0 hits, confirmed 2026-10-25).

### 1.2 Derived flag design

Per owner decision OD-INV2-5, the rule is: only an explicit `'No'` enforces inventory. All other values (including `'Yes'`, absent, null, undefined, unknown strings) bypass.

```
inventoryEnforced = restaurant?.inventory_negative === 'No'
```

This is a **one-liner derivation** — no new hooks, no new API calls, no new context.

---

## 2. Touch points — file-by-file analysis

### TP-1: `MenuItems.jsx` L398-404 — Layer 1 page filter

**Current code:**
```jsx
// CR-2026-09-07-001: Stock-out filter (Layer 1).
const showStockOut = restaurant?.show_out_of_stock_items === 'Yes';
if (!showStockOut) {
  filtered = filtered.filter(item => item.stock_out !== 'Y');
}
```

**Impact:** `restaurant` is already available in scope (L59: `const { restaurant } = useRestaurantDetails(restaurantId)`). When `inventoryEnforced` is `false`, the entire stock-out filter block is skipped — all items pass through regardless of `stock_out` or `show_out_of_stock_items`.

**Change:** Wrap the existing block in an `if (inventoryEnforced)` guard. ~3 lines added.

**Risk:** LOW within this touch point. The `restaurant` object is the same one already used here for `show_out_of_stock_items`. No new data dependency.

---

### TP-2: `MenuItem.jsx` L56-57, L161-164, L170-173, L199, L231-234 — Sold Out badge + low-stock badge + image dimming

**Current code:**
```jsx
const isStockOut = item.stock_out === 'Y';
const isLowStock = !isStockOut && item.food_stock !== null && item.food_stock > 0 && item.food_stock <= 3;
```
These booleans drive: "Sold Out" badge (L161-164, L231-234), "Only N left" badge (L170-173), image sold-out dimming (L199).

**Impact:** `MenuItem` does **not** currently receive `restaurant` or any inventory-mode prop. It needs a new prop to know whether inventory is enforced.

**Change:** Add prop `inventoryEnforced` (default `true` for safety — preserves existing behaviour if prop is missing). When `false`, force `isStockOut = false` and `isLowStock = false`. ~2 lines changed at L56-57.

**Caller change:** `MenuItems.jsx` L902-919 `<MenuItem>` call — add `inventoryEnforced={inventoryEnforced}` prop. ~1 line.

**Risk:** LOW. The prop is a boolean that only suppresses two existing booleans. No new logic branches.

---

### TP-3: `CartContext.js` L227-232 — Layer 2 addToCart guard

**Current code:**
```jsx
if (item.stock_out === 'Y') {
  toast.error(`"${item?.name || 'This item'}" is currently out of stock.`);
  logger.cart('addToCart blocked by stock-out', { itemId: item?.id, name: item?.name });
  return;
}
```

**Impact:** `CartContext` does **not** have access to `restaurant` or `inventory_negative`. It receives `restaurantId` as a prop but does not fetch restaurant details.

**Design decision (Intake §8 item 3):** How does `inventoryEnforced` reach `addToCart`?

**Options:**
| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A: Caller param** | `addToCart(item, vars, addons, orderType, { inventoryEnforced })` | No context change; CartContext stays pure-cart | Every caller of `addToCart` must pass the flag; callers today: `MenuItems.jsx` `handleAddToCart`, `CustomizeItemModal` confirm button |
| **B: Context injection** | `CartProvider` receives `inventoryEnforced` prop or reads from React Query cache | Single source, all `addToCart` calls auto-guarded | CartContext gains a `restaurant` dependency; slightly wider blast radius |
| **C: Query cache read inside addToCart** | `addToCart` reads `queryClient.getQueryData(['restaurant', restaurantId])?.inventory_negative` | No prop threading; self-contained | CartContext needs `useQueryClient` import; couples cart to React Query |

**Recommendation: Option A (caller param).** Reasons:
1. CartContext is a HIGH hotspot — the less we change its signature/dependencies, the better.
2. Only 2 callers need updating (both already in scope of this bug's changes).
3. Preserves CartContext's purity — it's a cart manager, not a restaurant-aware service.
4. The flag is already computed in `MenuItems.jsx` where the main caller lives.

**Change:** Add optional 5th parameter `options = {}` to `addToCart`. When `options.inventoryEnforced === false`, skip the `stock_out` guard. ~3 lines changed.

**Risk:** MEDIUM — this is a HIGH hotspot file. But the change is an additive guard skip, not a restructuring.

---

### TP-4: `ReviewOrder.jsx` L1190-1233 — Layer 3 pre-submit cache check

**Current code:**
```jsx
const cachedMenu = queryClient.getQueryData(['menuSections', restaurantId, stationId]) || [];
const stockProblems = [];
for (const cartItem of cartItems) {
  // ... finds cachedItem ...
  if (cachedItem.stock_out === 'Y') {
    stockProblems.push({ type: 'oos', name: ... });
  } else if (cachedItem.food_stock !== null && cachedItem.food_stock > 0 && cartItem.quantity > cachedItem.food_stock) {
    stockProblems.push({ type: 'low', ... });
  }
}
if (stockProblems.length > 0) { toast.error(...); return; }
```

**Impact:** `restaurant` is already available in scope (L164: `const { restaurant } = useRestaurantDetails(restaurantId)`). When `inventoryEnforced` is `false`, the entire stock-problems block is skipped — the order proceeds directly to the double-click guard.

**Change:** Wrap the block in `if (inventoryEnforced) { ... }`. ~2 lines added.

**Risk:** MEDIUM — this is a CRITICAL hotspot file. But the change is a conditional wrapper around an existing block, not a rewrite. The block is self-contained (L1192-1233) with a clear entry/exit. No variables from inside the block leak out.

---

### TP-5: `CustomizeItemModal.jsx` L264, L266-274, L283-285 — addon stock-out disable

**Current code:**
```jsx
const isAddonStockOut = addon.stock_out === 'Y';
// ... drives: className sold-out, disabled={isAddonStockOut}, aria-disabled, "Sold Out" pill
```

**Impact:** `CustomizeItemModal` does not currently receive `restaurant` or an inventory-mode prop. It needs a new prop.

**Change:** Add prop `inventoryEnforced` (default `true`). When `false`, force `isAddonStockOut = false`. ~1 line at L264.

**Caller change:** Trace who renders `<CustomizeItemModal>`. Check:

```
grep -n "CustomizeItemModal" /app/frontend/src/pages/MenuItems.jsx
```

**Risk:** LOW. Same pattern as TP-2 — a boolean that suppresses an existing boolean.

---

## 3. Files WILL change

| # | File | Lines | Risk | Change summary |
|---|------|-------|------|---------------|
| 1 | `frontend/src/pages/MenuItems.jsx` | ~398-404, ~902 | MEDIUM | Derive `inventoryEnforced`; wrap Layer-1 filter; pass prop to `MenuItem` and `CustomizeItemModal` |
| 2 | `frontend/src/components/MenuItem/MenuItem.jsx` | ~25 (props), ~56-57 | LOW | Accept `inventoryEnforced` prop; suppress `isStockOut`/`isLowStock` when `false` |
| 3 | `frontend/src/context/CartContext.js` | ~219, ~228 | MEDIUM (hotspot) | Accept optional `options` param in `addToCart`; skip stock guard when `inventoryEnforced === false` |
| 4 | `frontend/src/pages/ReviewOrder.jsx` | ~1190-1233 | MEDIUM (hotspot) | Derive `inventoryEnforced`; wrap pre-submit stock check |
| 5 | `frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx` | ~264 | LOW | Accept `inventoryEnforced` prop; suppress addon `isAddonStockOut` when `false` |
| 6 | `frontend/src/components/OrderItemCard/OrderItemCard.jsx` | ~221 | LOW | Accept and thread `inventoryEnforced` prop to `CustomizeItemModal` |

## 4. Files WILL NOT touch

| File | Reason |
|------|--------|
| `backend/server.py` | No backend change (OD-INV2-6: FE-only fix) |
| `frontend/src/hooks/useMenuData.js` | `useRestaurantDetails` already returns the full POS response; no transform change |
| `frontend/src/api/services/restaurantService.js` | Endpoint unchanged |
| `frontend/src/api/services/orderService.ts` | 422 handler stays as harmless backstop (unchanged) |
| `frontend/src/utils/itemAvailability.js` | Time/live_web gates — unrelated to inventory |
| `frontend/src/utils/channelEligibility.js` | Channel gates — unrelated to inventory |
| `frontend/src/context/RestaurantConfigContext.jsx` | Admin config — inventory is POS-native, not admin |
| `frontend/src/context/AuthContext.jsx` | Auth — unrelated |

## 5. Downstream consumers and interaction risk

| Consumer | Risk | Notes |
|----------|------|-------|
| `CartContext.addToCart` callers | LOW | Only 2 callers: `MenuItems.handleAddToCart` and `CustomizeItemModal` confirm. Both are in-scope files |
| `MenuItem` callers | NONE | Only called from `MenuItems.jsx` (in-scope) |
| `CustomizeItemModal` callers | LOW | Called from `MenuItems.jsx` (in-scope) and `OrderItemCard.jsx` (L221, used in ReviewOrder cart list). OrderItemCard needs `inventoryEnforced` prop threaded from ReviewOrder |
| POS 422 handler in `orderService.ts` | NONE | Unchanged; harmless backstop. If POS ever 422s in negative mode (contradicting OD-INV2-1), the existing handler shows a toast — acceptable |
| Mid-session cart auto-removal (`MenuItems.jsx` L163-188) | NONE | This checks `isItemAvailable` (time/live_web), not stock_out. Unaffected by this change |
| React Query cache reads | NONE | `['restaurant', rid]` cache is read-only for this change; we just access a field that's already there |

## 6. Conflicts with active items

| Item | Conflict? | Notes |
|------|-----------|-------|
| CR-2026-09-08-001 (no-image card guard, INTAKE) | **LOW** — touches `MenuItem.jsx` render branch. If both ship, coordinate: `isChannelAllowed` guard parity note and `inventoryEnforced` prop both land on the same component. No semantic conflict |
| CR-2026-10-14-001 (Config → POS programme) | **NONE** — inventory is already POS-native; nothing moves in that migration |
| CR-2026-09-12-012 (ReviewOrder decomposition, INTAKE) | **LOW** — if ReviewOrder is decomposed, the pre-submit stock check moves to a sub-component. The `inventoryEnforced` guard moves with it. No design conflict |

## 7. Verification matrix

| # | Test | What proves | Type |
|---|------|-------------|------|
| V-1 | Restaurant 689 (`inventory_negative='Yes'`): browse menu → all 126 items visible (including the 69 currently hidden) | Layer 1 bypass works |  Playwright |
| V-2 | Restaurant 689: tap ADD on a `stock_out='Y'` item → item added to cart, no toast | Layer 2 bypass works | Playwright |
| V-3 | Restaurant 689: item with `stock_out='Y'` in cart → proceed to ReviewOrder → no "sold out" toast, order proceeds | Layer 3 bypass works | Playwright |
| V-4 | Restaurant 689: `MenuItem` card — no "Sold Out" badge, no "Only N left" badge, no dimmed image on `stock_out='Y'` items | Render bypass works | Playwright + visual |
| V-5 | Restaurant 689: `CustomizeItemModal` — addon with `stock_out='Y'` is selectable, no "Sold Out" pill | Addon bypass works | Playwright |
| V-6 | Restaurant 716 (`inventory_negative='No'`, `inventory='No'`): behaviour **identical to today** — stock-out items hidden (if any), badges shown, addToCart blocks | Control: no regression for `'No'` restaurants | Playwright snapshot comparison |
| V-7 | Restaurant 478 (`inventory_negative='Yes'`): 10 previously hidden items now visible + 39 addons now selectable | Cross-restaurant confirmation | Playwright |
| V-8 | New restaurant with `inventory_negative` absent/null: treated as `'Yes'` (bypass) per OD-INV2-5 | Default behaviour correct | Mock or find a restaurant without the field |
| V-9 | **One real preprod order** on 689 containing a `stock_out='Y'` item → POS accepts (no 422) | Proves OD-INV2-1 end-to-end | Manual curl or Playwright |
| V-10 | Contract snapshots: `pytest backend/tests/contracts/` → unchanged | No backend regression | pytest |

## 8. Owner decisions — APPROVED 2026-10-25

| # | Decision | Owner answer | Recorded |
|---|----------|-------------|----------|
| D-1 | Confirm P1 severity | **Yes — P1 confirmed** | 2026-10-25 |
| D-2 | Approve touching `ReviewOrder.jsx` (CRITICAL) and `CartContext.js` (HIGH) | **Yes — approved** | 2026-10-25 |
| D-3 | How flag reaches `addToCart` | **Option A: caller param — approved** | 2026-10-25 |
| D-4 | Approve one preprod test order for V-9 | **Yes — approved** | 2026-10-25 |

**Impact Analysis: CLOSED. All decisions locked. Proceed to Implementation Plan.**

---

```text
Planning complete: BUG-2026-10-14-001
Stage: Impact Analysis
Code reality: CONFIRMED — all 5 touch points verified in code; POS field verified live (2026-10-25); 0 hits for inventory_negative in frontend/src
Risk: HIGH (CRITICAL + HIGH hotspot files, but changes are conditional wrappers)
Files WILL change: MenuItems.jsx, MenuItem.jsx, CartContext.js, ReviewOrder.jsx, CustomizeItemModal.jsx
Files WILL NOT touch: server.py, useMenuData.js, restaurantService.js, orderService.ts, itemAvailability.js, channelEligibility.js, RestaurantConfigContext.jsx, AuthContext.jsx
Owner decisions: D-1 (confirm P1), D-2 (approve hotspot touches), D-3 (caller param recommended), D-4 (approve test order)
Docs: this file (IMPACT_ANALYSIS.md)
Next: Owner approval → Implementation Plan → Implementation
```
