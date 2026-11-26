# IMPACT ANALYSIS — BUG-2026-11-14-002 + CR-2026-11-14-002 (Joint)

**IDs:** BUG-2026-11-14-002 · CR-2026-11-14-002  
**Planning date:** 2026-11-25  
**Role:** PLANNING (Role 2)  
**Risk:** BUG-002 = MEDIUM · CR-002 = MEDIUM  

---

## SECTION 1 — Code Reality Check

### BUG-002: Search ranking

**filterItems() — lines 377–435 of MenuItems.jsx**

Confirmed: `filterItems(items, categoryId)` applies 5 filter layers in order:
1. Channel availability (item admin override → category override → POS flag)
2. Time availability (live_web, admin timing, POS time window)
3. Stock-out (skip when inventoryEnforced=false per BUG-2026-10-14-001)
4. Search text (name.includes OR description.includes — no sort)
5. Veg / dietary tag filters

The function accepts per-section `categoryId` because channel and timing overrides are keyed by category. This must be preserved in the flat-list path.

**Render loop — lines 831–945 of MenuItems.jsx**

Confirmed: before calling `filterItems()`, each section runs an item-ordering block (lines 844–880):
- Admin item order (from `menuOrder.itemOrder[categoryId]`) 
- Admin item visibility (hide items where `itemVis[id] === false`)
- POS `food_order` sort as fallback

This ordering logic runs per-section. The flat-list path must reproduce this per-section before flattening.

After `filterItems()`, `reorderItemsByCart()` runs to bump cart items to the top of each section. For the flat list, this must still apply — cart items should stay at top within their relevance tier.

**selectedCategory interaction:** When a user has a category tab selected AND starts typing, the flat-list path will search across ALL sections (not just the selected category). This is intentional — the whole point is cross-category relevance. If the user wants just one category they can clear the search.

---

### CR-002: APS label

**MenuItem.jsx line 79 — price display:**
```jsx
<div className="item-price">₹{item.price}</div>
```
This is inside `headerBlock` which is used in BOTH image and no-image card layouts. One change covers both.

**OrderItemCard.jsx line 217 — cart/review price:**
```jsx
<div className="order-item-price">₹{itemPrice.toFixed(2)}</div>
```
`itemPrice` is computed by `calculateCartItemPrice(cartItem)` (line 26). For APS items (price=1), `itemPrice` will be `1.00`. Detection must use `cartItem.item?.price`, not `itemPrice` (which could be 1 × quantity + add-ons).

**ReviewOrder.jsx** — does NOT directly render item prices. It delegates to `OrderItemCard` via line 2020. So `ReviewOrder.jsx` itself does NOT need to change. The intake doc said it would change, but code reality shows it goes through `OrderItemCard`. ← **Scope correction from intake.**

**Bill total / order_amount** — both computed from `cartItem.totalPrice` or `cartItem.price` fields in CartContext, not from `item.price`. APS items will show ₹1 in the total — this is correct per spec (POS updates later).

---

## SECTION 2 — Files WILL Change

| File | Item | What changes | Lines |
|---|---|---|---|
| `frontend/src/pages/MenuItems.jsx` | BUG-002 | Add search-active flat-list branch before render loop | ~50 lines added before line 831 |
| `frontend/src/components/MenuItem/MenuItem.jsx` | CR-002 | Replace `₹{item.price}` with APS badge when price===1 | Line 79 |
| `frontend/src/components/OrderItemCard/OrderItemCard.jsx` | CR-002 | Replace `₹{itemPrice.toFixed(2)}` with "APS" when base price===1 | Line 217 |

**Scope correction:** `ReviewOrder.jsx` will NOT change (intake doc said it would). Price display in review order goes through `OrderItemCard` — that one change is sufficient.

---

## SECTION 3 — Files WILL NOT Change

`CartContext.js` · `AuthContext.jsx` · `ReviewOrder.jsx` · `orderService.ts` · `RestaurantConfigContext.jsx` · `backend/server.py` · any other component

---

## SECTION 4 — Conflict Check (between BUG-002 and CR-002)

| Check | Result |
|---|---|
| Both touch MenuItems.jsx? | NO — CR-002 does not touch MenuItems.jsx |
| Both touch MenuItem.jsx? | NO — BUG-002 does not touch MenuItem.jsx |
| Render flow conflict? | NO — BUG-002 adds a branch BEFORE the loop; CR-002 changes what MenuItem renders inside the loop. Zero overlap. |
| Implement in same session? | YES — safe. No ordering dependency. |

---

## SECTION 5 — Implementation Plan

### BUG-002: Flat-list ranked search (MenuItems.jsx, ~50 lines before line 831)

```
STEP B1: Inside the {!menuLoading && !menuError && (() => { ... render block,
         BEFORE the existing sectionsToDisplay loop:

         if (searchQuery) {
           // 1. Flatten all sections (all menuSections, ignore selectedCategory)
           //    Per section: apply same item-order/visibility logic as the loop does,
           //    then call filterItems(orderedSectionItems, section.categoryId)
           //    to apply channel/availability/stock/search/veg filters.
           //    Tag each item with _sectionName for optional display.

           // 2. Score each item:
           //    name === query        → 0 (exact)
           //    name.startsWith(q)   → 1
           //    name.includes(q)     → 2
           //    desc.includes(q)     → 3

           // 3. Sort by score. Apply reorderItemsByCart on result
           //    so cart items stay at top within their tier.

           // 4. Render as single <div id="items-section"> flat list
           //    using the same <MenuItem .../> with same props as the loop.
           //    No category-info-header rows.

           // 5. Return early — do NOT fall through to the existing loop.
         }

         // existing per-section loop runs only when searchQuery is empty
```

**Regression guard:** filterItems() is called per-section with correct categoryId — all 5 filter layers (channel, timing, stock, veg, dietary) continue to apply. reorderItemsByCart applied after sort.

---

### CR-002: APS badge (MenuItem.jsx + OrderItemCard.jsx)

```
STEP C1 — MenuItem.jsx line 79:
  BEFORE: <div className="item-price">₹{item.price}</div>
  AFTER:  const isAPS = parseFloat(item.price) === 1;
          <div className="item-price">
            {isAPS ? <span className="aps-badge">APS</span> : `₹${item.price}`}
          </div>

STEP C2 — OrderItemCard.jsx line 217:
  BEFORE: <div className="order-item-price">₹{itemPrice.toFixed(2)}</div>
  AFTER:  const isAPS = parseFloat(cartItem.item?.price) === 1;
          <div className="order-item-price">
            {isAPS ? 'APS' : `₹${itemPrice.toFixed(2)}`}
          </div>

STEP C3 — Add minimal CSS for .aps-badge in MenuItem.css:
  Suggested: orange chip, small caps, same position as price.
  (Or inline style — implementer decides.)
```

---

## SECTION 6 — Verification Matrix

| # | Test | Item |
|---|---|---|
| V1 | Search "Tea" → exact match "Tea" is first result | BUG-002 |
| V2 | Search "Ice" → all name-partial matches come before desc-only matches | BUG-002 |
| V3 | Veg filter ON + search → only veg items in results | BUG-002 |
| V4 | Cart item in search results → still appears at top of its tier | BUG-002 |
| V5 | Clear search → category-grouped view returns unchanged | BUG-002 |
| V6 | Stock-out items hidden in search results (when inventoryEnforced=true) | BUG-002 |
| V7 | No search → banner + category nav visible, existing render loop runs | BUG-002 |
| V8 | item.price=1 on menu card shows "APS" not "₹1" | CR-002 |
| V9 | item.price=50 shows "₹50" (unaffected) | CR-002 |
| V10 | APS item in ReviewOrder shows "APS" not "₹1.00" | CR-002 |
| V11 | ADD button on APS item works normally | CR-002 |
| V12 | Regular + APS items in same cart — both display correctly | CR-002 |
| V13 | Bill total includes ₹1 per APS item (correct) | CR-002 |

---

## SECTION 7 — Risk Summary

| Item | Risk | Reason |
|---|---|---|
| BUG-002 | MEDIUM | New render path when searchQuery active. Existing path (no search) is 100% untouched. Regression risk: all 5 filter layers must be preserved in flat-list path. |
| CR-002 | LOW-MEDIUM | Display-only. OrderItemCard and MenuItem are leaf components. No cart/order/payment logic. ReviewOrder.jsx not touched. |

---

**Planning complete: BUG-2026-11-14-002 + CR-2026-11-14-002**  
Stage: Impact Analysis + Implementation Plan  
Code reality: FULL (all 3 changed files inspected)  
Scope correction: ReviewOrder.jsx does NOT need to change — OrderItemCard handles it  
Files WILL change: MenuItems.jsx · MenuItem.jsx · OrderItemCard.jsx  
Files WILL NOT touch: ReviewOrder.jsx · CartContext.js · orderService.ts · server.py  
Owner decisions: none required — spec fully resolved  
Next: Implementation (Role 3) — owner approval to proceed
