# Status Log — A-1: Channel Filter (dinein / takeaway / delivery)

**Last updated:** 2026-05-09
**Owner-approved scope:** A-1 only — channel-availability filter for menu visibility + add-to-cart, with prompt-and-confirm channel-switch UX. Room flow falls back to `dinein`.
**Status:** Implemented · lint-clean · webpack green · simulation-validated for 4 channels × 6 item variants

---

## 1. Files changed (5 — exactly per scope)

| # | File | Lines | Type |
|---|---|---|---|
| 1 | `frontend/src/utils/channelEligibility.js` | **+71** | NEW (helper: `isItemAllowedForChannel` + `getChannelLabel`) |
| 2 | `frontend/src/pages/MenuItems.jsx` | +9 / −4 | Read `scannedOrderType`, channel-first filter step, pass prop, channel-aware `addToCart` calls |
| 3 | `frontend/src/components/MenuItem/MenuItem.jsx` | +9 / −2 | Accept `orderType` prop, gate ADD button (2 sites) |
| 4 | `frontend/src/context/CartContext.js` | +18 / −3 | Defensive 4th-param channel guard with rejection toast |
| 5 | `frontend/src/pages/LandingPage.jsx` | +35 / −2 | Prompt-and-confirm UX in `handleModeChange` |

> Out-of-scope files confirmed UNTOUCHED: `orderService.ts`, `helpers.js`, `ReviewOrder.jsx`, `OrderSuccess.jsx`, `server.py`, payment / KOT / bill / print / tax / firebase / socket / interceptor / axios / CRM / auth / `previousOrderItems` / `getPreviousOrderTotal` / `updateCustomerOrder` payload.

## 2. Exact logic added

### 2.1 Helper (`utils/channelEligibility.js`)
```js
export const isItemAllowedForChannel = (item, orderType) => {
  if (!item) return false;
  if (!orderType) return true;                    // permissive default
  switch (orderType) {
    case 'dinein':                       return item.dinein   !== 'No';
    case 'takeaway':
    case 'take_away':                    return item.takeaway !== 'No';
    case 'delivery':                     return item.delivery !== 'No';
    default:                             return true;
  }
};
export const getChannelLabel = (orderType) => /* 'Dine-in' | 'Takeaway' | 'Delivery' */;
```
- `!== 'No'` (not `=== 'Yes'`) → any non-`'No'` value treated as allowed. Combined with D-1's permissive `'Yes'` defaults, this is bulletproof against missing fields.
- `take_away` alias normalized to same as `takeaway` (matches `useScannedTable` parser).

### 2.2 `MenuItems.jsx` filter pipeline
- `useScannedTable()` now also returns `orderType` (renamed locally to `scannedOrderType`).
- `filterItems(items)` applies the channel filter **first**, before search / veg-non-veg-egg / dietary-tags. This guarantees:
  - Search inside an active channel cannot reveal disallowed items
  - Empty-after-filter categories collapse via existing rendering loop
  - All downstream filters see only channel-allowed items
- `<MenuItem orderType={scannedOrderType} />` prop wired (line 783)
- `handleAddToCart`, `handleAddToCartFromModal`, `handleIncrement` all pass `scannedOrderType` as the new 4th argument to `addToCart(...)`.

### 2.3 `MenuItem.jsx` (defense-in-depth on the card)
- New prop `orderType={null}` (permissive default).
- `isChannelAllowed = isItemAllowedForChannel(item, orderType)` computed once.
- Both ADD-button sites (inline header at line ~155, large card at line ~217) gate on `isAvailable && isOnlineOrderEnabled && isChannelAllowed`.

### 2.4 `CartContext.addToCart` defensive guard
- Signature extended: `addToCart(item, variations = [], add_ons = [], activeOrderType = null)`.
- When `activeOrderType` is provided AND `!isItemAllowedForChannel(item, activeOrderType)` → **reject silently with `toast.error("'<name>' is not available for <Channel> orders.")`**, log via `logger.cart`, return early without mutating state.
- When `activeOrderType` is `null` (legacy callers), behavior is byte-identical to pre-A-1.

### 2.5 `LandingPage.jsx` prompt-and-confirm
- Now reads `cartItems` and `removeFromCart` from `useCart()`.
- `handleModeChange(newMode)` (the takeaway↔delivery toggle in `OrderModeSelector`):
  1. Compute `disallowed = cartItems.filter(ci => !isItemAllowedForChannel(ci.item, newMode))`.
  2. If non-empty → `window.confirm("Switching to <Channel> will remove <N> item(s) ...: <names>. Continue?")`.
  3. On **cancel** → return early (no state change).
  4. On **confirm** → `removeFromCart(ci.cartId)` for each disallowed, success toast, then proceed with `setSelectedMode(newMode)` + `updateOrderType(newMode)`.
- When no items are disallowed → identical behavior to pre-A-1 (no prompt).

## 3. Channel-eligibility mapping used

| URL param `orderType` (from `useScannedTable`) | Item field gate | Notes |
|---|---|---|
| `'dinein'` (incl. table QR + room QR + walk-in dine-in) | `item.dinein` | **Room flow shares this gate** per owner decision (no separate room flag) |
| `'takeaway'` | `item.takeaway` | |
| `'take_away'` | `item.takeaway` | alias normalized |
| `'delivery'` | `item.delivery` | |
| `null` / unknown | (allow all) | permissive default |

Item with field === `'No'` → blocked. Anything else (`'Yes'` / null / undefined / missing) → allowed.

## 4. Cart-on-channel-switch UX (implemented)

```
User taps OrderModeSelector toggle
       │
       ▼
handleModeChange(newMode)
       │
       ▼
disallowed = cart items where item channel-flag === 'No' for newMode
       │
       ├─ disallowed.length === 0
       │    └─► immediate switch (no prompt)
       │
       └─ disallowed.length > 0
            │
            ▼
       window.confirm("Switching to <Channel> will remove <N> item(s):
                        <up to 5 names + '... and X more' if >5>.
                        Continue?")
            │
            ├─ Cancel → return early, no change
            │
            └─ Confirm → removeFromCart(cartId) ∀ disallowed
                        → toast.success("Removed N item(s)...")
                        → setSelectedMode(newMode)
                        → updateOrderType(newMode)
```

## 5. Validation evidence

### 5.1 Build / compile
| Check | Result |
|---|---|
| ESLint per file (5 files) | ✅ all clean (no issues) |
| Webpack hot-reload | ✅ compiled, only pre-existing OrderSuccess.jsx warnings (unrelated) |
| Frontend HTTP `/` | ✅ HTTP 200 |

### 5.2 Channel-eligibility matrix (in-page Playwright simulation)
**6 items × 4 channels = 24 cells. All match expected.**

| Item | dinein | takeaway | take_away | delivery |
|---|---|---|---|---|
| all-allowed (`'Yes'`/`'Yes'`/`'Yes'`) | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| dinein-only (`'Yes'`/`'No'`/`'No'`) | ✅ YES | ✅ no | ✅ no | ✅ no |
| delivery-only (`'No'`/`'No'`/`'Yes'`) | ✅ no | ✅ no | ✅ no | ✅ YES |
| takeaway-only (`'No'`/`'Yes'`/`'No'`) | ✅ no | ✅ YES | ✅ YES | ✅ no |
| legacy (no flags — D-1 default) | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| all-disabled (`'No'`/`'No'`/`'No'`) | ✅ no | ✅ no | ✅ no | ✅ no |

### 5.3 Room-flow assertion
For all 6 items, **room scan result == dinein scan result** (since both invoke `orderType='dinein'` and the helper gates on `item.dinein`). Confirmed by simulation.

### 5.4 Cart-on-channel-switch detection
Cart `[dinein-only, delivery-only, all-allowed]`:
- Switch to **delivery** → flags `[dinein-only]` ✅
- Switch to **takeaway** → flags `[dinein-only, delivery-only]` ✅

### 5.5 Manual validation that owner should run on a real device
- [ ] Scan dine-in QR → confirm `dinein='No'` items are absent from menu / search; ADD button hidden if any leak through
- [ ] Scan delivery URL (or switch via OrderModeSelector) → confirm `delivery='No'` items absent
- [ ] Scan takeaway URL → confirm `takeaway='No'` items absent
- [ ] Scan **room QR** → confirm same set as dine-in (room shares dinein gate)
- [ ] In takeaway flow with cart full of dine-in-only items → toggle to delivery → confirm prompt appears with the correct list, Cancel reverts, Confirm removes items
- [ ] Edit-order flow: previous items still render and are read-only (untouched per scope)

## 6. Out-of-scope confirmation

Verified by `git diff --name-only` against the 5-file allowlist:

```
frontend/src/components/MenuItem/MenuItem.jsx        ← in scope ✓
frontend/src/context/CartContext.js                  ← in scope ✓
frontend/src/pages/LandingPage.jsx                   ← in scope ✓
frontend/src/pages/MenuItems.jsx                     ← in scope ✓
frontend/src/utils/channelEligibility.js (new)       ← in scope ✓
```

Not touched: `orderService.ts`, `transformers/helpers.js`, `ReviewOrder.jsx`, `OrderSuccess.jsx`, `server.py`, payment / KOT / bill / print / tax / firebase / socket / interceptor / axios / CRM / auth / `<PreviousOrderItems>` rendering / `getPreviousOrderTotal` / `updateCustomerOrder` payload / `food_for` semantics. **`previousOrderItems` re-check explicitly NOT implemented (deferred).**

## 7. Stop-condition check

The implementation did NOT require touching:
- ❌ Order placement payload — confirmed
- ❌ Backend contract — confirmed
- ❌ Tax / payment / print logic — confirmed
- ❌ Edit-order previous items — confirmed (read-only path untouched)

No stop-condition triggered. Implementation completed cleanly within strict scope.

## 8. Closure criteria

- [x] Code applied (5 files; +142 / −11 lines)
- [x] Lint clean
- [x] Webpack compiles
- [x] Simulation 100% pass
- [x] Out-of-scope files untouched
- [ ] Owner real-device validation per §5.5 — **pending**
- [ ] Testing-agent end-to-end run — pending owner go-ahead (allowed per scope point 8 of approval message)

Standing by for real-device validation results and / or go-ahead for next CR (A-2: `is_disable` + `status` kill-switch — gated on backend semantic confirmation per audit §11).
