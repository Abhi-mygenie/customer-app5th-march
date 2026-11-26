# IMPLEMENTATION PLAN — BUG-2026-10-14-001
## Negative-stock mode: bypass all inventory gates when `inventory_negative !== 'No'`

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-14-001 |
| **Role** | Role 2 — PLANNING (Implementation Plan) |
| **Date** | 2026-10-25 |
| **Risk** | **HIGH** |
| **Owner approvals** | D-1 P1 confirmed · D-2 hotspot touches approved · D-3 Option A (caller param) · D-4 test order approved |
| **Prerequisite** | Impact Analysis CLOSED (same folder) |

---

## 0. Rules for the implementer

1. Follow edits E-1 through E-8 **in order**. Each edit is self-contained and testable.
2. Every edit gets a code marker: `// BUG-2026-10-14-001: <brief reason>`.
3. **Do not** touch any file or line not listed below.
4. **Do not** change behaviour for `inventory_negative === 'No'` restaurants — that path must be byte-identical to today.
5. After all edits, run self-test (§2) and build verification (§3).

---

## 1. Edits

### E-1 — `MenuItems.jsx`: Derive `inventoryEnforced` flag

**File:** `frontend/src/pages/MenuItems.jsx`
**Where:** After L62 (after `const numericRestaurantId = ...`), before L64.

**Add:**
```jsx
  // BUG-2026-10-14-001: inventory gates only enforced when restaurant explicitly opts in
  const inventoryEnforced = restaurant?.inventory_negative === 'No';
```

**Why:** Single derivation point. Used by E-2, E-3, E-5, E-6. `restaurant` is already in scope (L59).

---

### E-2 — `MenuItems.jsx`: Wrap Layer-1 stock-out filter

**File:** `frontend/src/pages/MenuItems.jsx`
**Where:** L398-404 (the stock-out filter block).

**Current code (L398-404):**
```jsx
    // CR-2026-09-07-001: Stock-out filter (Layer 1).
    // Default: hide OOS items. If show_out_of_stock_items='Yes', keep them
    // visible (sold-out state rendered in MenuItem.jsx).
    const showStockOut = restaurant?.show_out_of_stock_items === 'Yes';
    if (!showStockOut) {
      filtered = filtered.filter(item => item.stock_out !== 'Y');
    }
```

**Replace with:**
```jsx
    // CR-2026-09-07-001: Stock-out filter (Layer 1).
    // BUG-2026-10-14-001: skip entire block when inventory is not enforced (negative-stock mode)
    if (inventoryEnforced) {
      // Default: hide OOS items. If show_out_of_stock_items='Yes', keep them
      // visible (sold-out state rendered in MenuItem.jsx).
      const showStockOut = restaurant?.show_out_of_stock_items === 'Yes';
      if (!showStockOut) {
        filtered = filtered.filter(item => item.stock_out !== 'Y');
      }
    }
```

**Why:** When `inventoryEnforced` is `false`, all items pass through regardless of `stock_out`. The `show_out_of_stock_items` check inside is also irrelevant — nothing is treated as sold out.

---

### E-3 — `MenuItems.jsx`: Pass `inventoryEnforced` prop to `<MenuItem>`

**File:** `frontend/src/pages/MenuItems.jsx`
**Where:** L918 (inside the `<MenuItem>` JSX, after the `orderType` prop).

**Current code (L918):**
```jsx
                                    orderType={scannedOrderType}
```

**After that line, add:**
```jsx
                                    inventoryEnforced={inventoryEnforced}
```

---

### E-4 — `MenuItem.jsx`: Accept prop and suppress stock booleans

**File:** `frontend/src/components/MenuItem/MenuItem.jsx`
**Where:** Two changes.

**4a — Props (L24, after `orderType = null,`):**

**Current code (L24):**
```jsx
  orderType = null,
}) => {
```

**Replace with:**
```jsx
  orderType = null,
  inventoryEnforced = true, // BUG-2026-10-14-001: default true preserves existing behaviour
}) => {
```

**4b — Stock booleans (L55-57):**

**Current code (L55-57):**
```jsx
  // CR-2026-09-07-001: Stock-out state (Layer 1 render).
  const isStockOut = item.stock_out === 'Y';
  const isLowStock = !isStockOut && item.food_stock !== null && item.food_stock > 0 && item.food_stock <= 3;
```

**Replace with:**
```jsx
  // CR-2026-09-07-001: Stock-out state (Layer 1 render).
  // BUG-2026-10-14-001: suppress when inventory not enforced (negative-stock mode)
  const isStockOut = inventoryEnforced && item.stock_out === 'Y';
  const isLowStock = inventoryEnforced && !isStockOut && item.food_stock !== null && item.food_stock > 0 && item.food_stock <= 3;
```

**Why:** When `inventoryEnforced` is `false`, both booleans are always `false`. This suppresses:
- "Sold Out" badge (L161-164, L231-234)
- "Only N left" badge (L170-173)
- Image sold-out dimming (L199)
- ADD button blocking (L161, L231)

All driven by the same two booleans — no further changes needed in render.

---

### E-5 — `MenuItems.jsx`: Pass `inventoryEnforced` to `addToCart` calls and `CustomizeItemModal`

**File:** `frontend/src/pages/MenuItems.jsx`

**5a — `handleAddToCart` function.** Find the function (search for `const handleAddToCart`). It calls `addToCart(item, ...)`. Add `{ inventoryEnforced }` as the 5th argument.

**Current pattern:**
```jsx
addToCart(item, [], [], scannedOrderType);
```

**Replace with:**
```jsx
addToCart(item, [], [], scannedOrderType, { inventoryEnforced });
```

**5b — `handleAddToCartFromModal` function.** Same pattern — find where it calls `addToCart(...)` and add the 5th argument `{ inventoryEnforced }`.

**5c — `<CustomizeItemModal>` (L946-951):**

**Current code:**
```jsx
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={selectedItemForCustomization}
          onAddToCart={handleAddToCartFromModal}
        />
```

**Add prop:**
```jsx
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={selectedItemForCustomization}
          onAddToCart={handleAddToCartFromModal}
          inventoryEnforced={inventoryEnforced}
        />
```

---

### E-6 — `CartContext.js`: Accept optional options param, skip stock guard

**File:** `frontend/src/context/CartContext.js`
**Where:** L219 (addToCart signature) and L227-232 (stock guard).

**6a — Signature (L219):**

**Current code:**
```jsx
  const addToCart = useCallback((item, variations = [], add_ons = [], activeOrderType = null) => {
```

**Replace with:**
```jsx
  // BUG-2026-10-14-001: 5th param `options` carries inventoryEnforced flag
  const addToCart = useCallback((item, variations = [], add_ons = [], activeOrderType = null, options = {}) => {
```

**6b — Stock guard (L227-232):**

**Current code:**
```jsx
    // CR-2026-09-07-001: Stock-out guard (Layer 2).
    if (item.stock_out === 'Y') {
      toast.error(`"${item?.name || 'This item'}" is currently out of stock.`);
      logger.cart('addToCart blocked by stock-out', { itemId: item?.id, name: item?.name });
      return;
    }
```

**Replace with:**
```jsx
    // CR-2026-09-07-001: Stock-out guard (Layer 2).
    // BUG-2026-10-14-001: skip when inventory not enforced (negative-stock mode)
    if (options.inventoryEnforced !== false && item.stock_out === 'Y') {
      toast.error(`"${item?.name || 'This item'}" is currently out of stock.`);
      logger.cart('addToCart blocked by stock-out', { itemId: item?.id, name: item?.name });
      return;
    }
```

**Why `options.inventoryEnforced !== false`:** This is a safe default — if the option is omitted (existing callers that don't pass it), the guard fires as before. Only an explicit `false` disables it. This protects against any caller we missed.

---

### E-7 — `ReviewOrder.jsx`: Derive flag and wrap Layer-3 pre-submit check

**File:** `frontend/src/pages/ReviewOrder.jsx`

**7a — Derive flag.** After L167 (`const numericRestaurantId = ...`), add:
```jsx
  // BUG-2026-10-14-001: inventory gates only enforced when restaurant explicitly opts in
  const inventoryEnforced = restaurant?.inventory_negative === 'No';
```

**7b — Wrap pre-submit block (L1190-1233).**

**Current code (L1190):**
```jsx
    // CR-2026-09-07-001: Layer 3 pre-submission cache-check.
    // Reads React Query cache — no API call. Layer 3 API (422) is the backstop for cache misses.
    {
```

**Replace opening with:**
```jsx
    // CR-2026-09-07-001: Layer 3 pre-submission cache-check.
    // BUG-2026-10-14-001: skip when inventory not enforced (negative-stock mode)
    if (inventoryEnforced) {
```

And the matching closing brace at L1233 (`}`) stays — it was already the block's closing brace. No change needed at the end since it's already a block `{ ... }`.

**7c — Pass `inventoryEnforced` to `<OrderItemCard>` (L2011).**

**Current code:**
```jsx
                <OrderItemCard key={cartItem.cartId} cartItem={cartItem} showCookingInstructions={showCookingInstructions} />
```

**Replace with:**
```jsx
                <OrderItemCard key={cartItem.cartId} cartItem={cartItem} showCookingInstructions={showCookingInstructions} inventoryEnforced={inventoryEnforced} />
```

---

### E-8 — `OrderItemCard.jsx` + `CustomizeItemModal.jsx`: Thread prop

**8a — `OrderItemCard.jsx` (L13):**

**Current code:**
```jsx
const OrderItemCard = ({ cartItem, showCookingInstructions = true }) => {
```

**Replace with:**
```jsx
// BUG-2026-10-14-001: inventoryEnforced threaded to CustomizeItemModal
const OrderItemCard = ({ cartItem, showCookingInstructions = true, inventoryEnforced = true }) => {
```

**8b — `OrderItemCard.jsx` (L221-226, `<CustomizeItemModal>`):**

**Current code:**
```jsx
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={cartItem.item}
          onAddToCart={handleAddToCartFromModal}
        />
```

**Replace with:**
```jsx
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={cartItem.item}
          onAddToCart={handleAddToCartFromModal}
          inventoryEnforced={inventoryEnforced}
        />
```

**8c — `CustomizeItemModal.jsx` (L7-12, props):**

**Current code:**
```jsx
const CustomizeItemModal = ({
  isOpen,
  onClose,
  item,
  onAddToCart
}) => {
```

**Replace with:**
```jsx
const CustomizeItemModal = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
  inventoryEnforced = true, // BUG-2026-10-14-001: default true preserves existing behaviour
}) => {
```

**8d — `CustomizeItemModal.jsx` (L264):**

**Current code:**
```jsx
                    const isAddonStockOut = addon.stock_out === 'Y';
```

**Replace with:**
```jsx
                    // BUG-2026-10-14-001: suppress addon stock-out when inventory not enforced
                    const isAddonStockOut = inventoryEnforced && addon.stock_out === 'Y';
```

---

## 2. Self-test matrix

After all 8 edits, the implementer must verify:

| # | Test | Method | Expected |
|---|------|--------|----------|
| ST-1 | `yarn start` compiles without errors | Terminal | `Compiled successfully` |
| ST-2 | Restaurant 689 (`inventory_negative='Yes'`): open menu → count visible items | Browser / Playwright | All 126 items visible (69 previously hidden now shown) |
| ST-3 | Restaurant 689: tap ADD on item known to have `stock_out='Y'` | Browser | Item added to cart, no "out of stock" toast |
| ST-4 | Restaurant 689: item with `stock_out='Y'` in cart → ReviewOrder → tap Place Order | Browser | No "sold out" pre-submit toast; order proceeds to POS |
| ST-5 | Restaurant 689: `MenuItem` card for `stock_out='Y'` item — no "Sold Out" badge, no image dimming | Browser visual | ADD button visible, no sold-out state |
| ST-6 | Restaurant 689: open customization modal for item with `stock_out='Y'` addon → addon is selectable | Browser | Addon checkbox enabled, no "Sold Out" pill |
| ST-7 | Restaurant 716 (`inventory_negative='No'`, `inventory='No'`): full menu browse → **identical to today** | Browser | No visible difference; stock-out items (if any) still hidden/blocked |
| ST-8 | Backend contract snapshots: `cd /app/backend && python -m pytest tests/contracts/ -v` | Terminal | All PASS (no backend change) |

## 3. Build verification

```bash
cd /app/frontend && yarn start
# Wait for "Compiled successfully"
# No ESLint errors, no TypeScript errors
```

Do NOT run `CI=true yarn build` (per project rule §12.7).

## 4. QA handover checklist (for implementer to write after code-complete)

The implementer must produce:
1. `QA_HANDOVER.md` in this folder
2. Verification matrix V-1 through V-10 (from Impact Analysis §7)
3. List of exact code changes with before/after
4. Self-test results (ST-1 through ST-8)

---

```text
Planning complete: BUG-2026-10-14-001
Stage: Implementation Plan
Code reality: CONFIRMED
Risk: HIGH
Edits: E-1 through E-8 (8 edits across 6 files)
Files WILL change: MenuItems.jsx, MenuItem.jsx, CartContext.js, ReviewOrder.jsx, CustomizeItemModal.jsx, OrderItemCard.jsx
Files WILL NOT touch: server.py, useMenuData.js, restaurantService.js, orderService.ts, itemAvailability.js, channelEligibility.js, RestaurantConfigContext.jsx, AuthContext.jsx
Owner decisions: ALL APPROVED (D-1..D-4)
Docs: IMPLEMENTATION_PLAN.md
Next: Owner approval → Role 3 (Implementation)
```
