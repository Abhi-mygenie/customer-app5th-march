# IMPLEMENTATION PLAN — BUG-2026-11-14-002 + CR-2026-11-14-002 (Joint)

**IDs:** BUG-2026-11-14-002 · CR-2026-11-14-002  
**Plan date:** 2026-11-25  
**Role:** PLANNING (Role 2) — Line-by-line Implementation Plan  
**Based on:** IMPACT_ANALYSIS.md + design_guidelines.json  
**Owner decision locked:** No tier/match labels shown to customer  
**Status:** AWAITING OWNER APPROVAL (Role 3 gate)

---

## FILES THAT WILL CHANGE

| # | File | Item | Nature |
|---|---|---|---|
| E1 | `frontend/src/pages/MenuItems.jsx` | BUG-002 | Add flat-search block inside existing IIFE |
| E2 | `frontend/src/components/MenuItem/MenuItem.jsx` | BUG-002 + CR-002 | Add `categoryName` prop, category tag, APS badge |
| E3 | `frontend/src/components/OrderItemCard/OrderItemCard.jsx` | CR-002 | Replace price div with APS-aware render |
| E4 | `frontend/src/pages/ReviewOrder.jsx` | CR-002 | Add APS info notice above price breakdown (display only) |
| E5 | `frontend/src/pages/MenuItems.css` | BUG-002 | Add `.search-meta-banner` styles |
| E6 | `frontend/src/components/MenuItem/MenuItem.css` | BUG-002 + CR-002 | Add `.item-category-tag` and `.item-aps-badge` styles |
| E7 | `frontend/src/components/OrderItemCard/OrderItemCard.css` | CR-002 | Add `.order-item-aps-badge` styles |

**Files that WILL NOT change:** `CartContext.js` · `AuthContext.jsx` · `orderService.ts` · `server.py` · `RestaurantConfigContext.jsx`

---

## E1 — MenuItems.jsx: Flat-search block

**Where:** Inside `{!menuLoading && !menuError && (() => {` (line 831).  
Insert AFTER `const sectionsToDisplay = ...` (line 834), BEFORE `return (` (line 836).

### Exact insertion — replace lines 831–949 with:

```jsx
{/* Menu Items */}
{!menuLoading && !menuError && (() => {
  const sectionsToDisplay = selectedCategory
    ? menuSections.filter(section => section.sectionName === selectedCategory)
    : menuSections;

  // BUG-2026-11-14-002: Flat ranked search — when search active, bypass per-section render
  if (searchQuery.trim()) {
    // Step 1: Flatten — per section apply admin ordering, then filterItems (all 5 filter layers)
    const flatItems = menuSections.flatMap(section => {
      const categoryId = section.categoryId;
      const itemOrderKey = stationId ? `${stationId}__${categoryId}` : categoryId;
      const itemOrder = stationId
        ? (menuOrder?.stationItemOrder?.[itemOrderKey] || [])
        : (menuOrder?.itemOrder?.[categoryId] || []);
      const itemVis = stationId
        ? (menuOrder?.stationItemVisibility?.[itemOrderKey] || {})
        : (menuOrder?.itemVisibility?.[categoryId] || {});

      let orderedItems = section.items;
      if (itemOrder.length > 0) {
        const ordered = [];
        const seen = new Set();
        for (const o of itemOrder) {
          const item = section.items.find(i => String(i.id) === String(o.id));
          if (item) {
            if (itemVis[o.id] !== false) ordered.push(item);
            seen.add(String(item.id));
          }
        }
        for (const item of section.items) {
          if (!seen.has(String(item.id))) ordered.push(item);
        }
        orderedItems = ordered;
      } else {
        const hasFoodOrder = orderedItems.some(i => (i.food_order || 0) > 0);
        if (hasFoodOrder) {
          orderedItems = [...orderedItems].sort((a, b) => {
            const fa = a.food_order || 0;
            const fb = b.food_order || 0;
            if (fa === 0 && fb === 0) return 0;
            if (fa === 0) return 1;
            if (fb === 0) return -1;
            return fa - fb;
          });
        }
      }

      return filterItems(orderedItems, categoryId).map(item => ({
        ...item,
        _sectionName: section.sectionName,
        _categoryId: categoryId,
      }));
    });

    // Step 2: Score by relevance — INTERNAL ONLY, never shown to customer
    const q = searchQuery.trim().toLowerCase();
    const scoreItem = (item) => {
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      if (name === q)           return 0;  // exact
      if (name.startsWith(q))   return 1;  // starts with
      if (name.includes(q))     return 2;  // partial name
      if (desc.includes(q))     return 3;  // description only
      return 99;
    };

    // Step 3: Sort by score, then apply cart reorder within tiers
    const sorted = flatItems
      .filter(i => scoreItem(i) < 99)
      .sort((a, b) => scoreItem(a) - scoreItem(b));
    const ranked = reorderItemsByCart(sorted);

    // Step 4: Render flat list
    return (
      <>
        {ranked.length > 0 && (
          <>
            <div className="search-meta-banner" data-testid="search-results-count-banner">
              <span className="search-meta-count">
                {ranked.length} {ranked.length === 1 ? 'result' : 'results'} for "{searchQuery}"
              </span>
              <button
                className="search-meta-clear"
                data-testid="search-meta-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕ Clear
              </button>
            </div>
            <div id="items-section">
              <div className="menu-section">
                <div className="items-list">
                  {ranked.map((item) => {
                    const itemQuantity = getTotalQuantityForItem(item.id);
                    const inCart = itemQuantity > 0;
                    return (
                      <MenuItem
                        key={item.id}
                        item={item}
                        categoryName={item._sectionName}
                        isExpanded={expandedDescriptions[item.id]}
                        descriptionLimit={descriptionLimit}
                        onToggleDescription={toggleDescription}
                        getAllergenIcon={getAllergenIcon}
                        quantity={itemQuantity}
                        isInCart={inCart}
                        onAddToCart={() => handleAddToCart(item)}
                        onIncrement={() => handleIncrement(item)}
                        onDecrement={() => handleDecrement(item)}
                        currentTimeInSeconds={currentTimeInSeconds}
                        isOnlineOrderEnabled={isOnlineOrderEnabled}
                        categoryTiming={categoryTimings?.[item._categoryId]}
                        itemTiming={itemTimings?.[String(item.id)]}
                        orderType={scannedOrderType}
                        inventoryEnforced={inventoryEnforced}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {ranked.length === 0 && (
          <div className="empty-search-state" data-testid="empty-search-state">
            <div className="empty-search-icon" data-testid="empty-search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none"
                viewBox="0 0 24 24" stroke="#E8622A" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <h3 className="empty-search-title" data-testid="empty-search-title">
              No matching dishes found
            </h3>
            <p className="empty-search-desc" data-testid="empty-search-description">
              We couldn't find anything matching "{searchQuery}". Try another dish or ingredient.
            </p>
            <button
              className="empty-search-clear-btn"
              data-testid="empty-search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        )}
      </>
    );
  }
  // ── END BUG-2026-11-14-002 flat search block ──

  // No search active — existing per-section render (unchanged below)
  return (
    <>
      {sectionsToDisplay.length > 0 && (
        <div id="items-section">
          {sectionsToDisplay.map((section, sectionIndex) => {
            // ... KEEP ALL EXISTING CODE FROM LINE 841 TO 935 EXACTLY AS-IS ...
          })}
        </div>
      )}

      {/* Empty State */}
      {sectionsToDisplay.length === 0 && (
        <div className="empty-state">
          <p>No menu items available at the moment.</p>
        </div>
      )}
    </>
  );
})()}
```

**Critical notes for implementer:**
- Use `menuSections` (not `sectionsToDisplay`) in `flatMap` so search is cross-category regardless of selectedCategory tab
- The admin item-order/visibility block (lines 852–880) is **copy-pasted verbatim** into the flatMap — do NOT simplify it
- `filterItems()` is called per-section with `section.categoryId` — do NOT call it on the full flat array
- `reorderItemsByCart()` is applied AFTER sorting — not before
- The existing render loop (lines 836–949) is **completely unchanged** — only the early-return branch is new

---

## E2 — MenuItem.jsx: categoryName prop + category tag + APS badge

### Edit E2-a: Add `categoryName` to props (line 26, after `inventoryEnforced`)

**Current line 25–26:**
```jsx
  inventoryEnforced = true, // BUG-2026-10-14-001: default true preserves existing behaviour
}) => {
```

**Replace with:**
```jsx
  inventoryEnforced = true, // BUG-2026-10-14-001: default true preserves existing behaviour
  categoryName = null,       // BUG-2026-11-14-002: set when rendered in flat search mode
}) => {
```

---

### Edit E2-b: Replace price div with APS-aware render + category tag inline with price (lines 73–81)

**OWNER DECISION 2026-11-25:** Category tag is rendered INLINE on the same line as the price — NOT on its own row above the item name. This saves ~20px per card in search mode (the full row height of a standalone tag).

**Visual layout in search mode:**
```
[veg dot]  Item Name
₹180  ·  Beer          ← price and category on ONE line
```

**Current lines 73–81:**
```jsx
  // ─── Reusable JSX blocks ──────────────────────────────────────────────────
  // Veg/Name/Price header — used in BOTH image and no-image layouts.
  const headerBlock = (
    <>
      <span className={`veg-label ${item.isEgg ? 'egg' : item.isVeg ? 'veg' : 'non-veg'}`}>
        <span className="veg-dot"></span>
      </span>
      <h3 className="item-name">{item.name}</h3>
      <div className="item-price">₹{item.price}</div>
    </>
  );
```

**Replace with:**
```jsx
  // ─── Reusable JSX blocks ──────────────────────────────────────────────────
  // Veg/Name/Price header — used in BOTH image and no-image layouts.
  // CR-2026-11-14-002: APS badge replaces ₹1 for variable-price items (price===1)
  // BUG-2026-11-14-002: category tag shown INLINE with price when categoryName prop is set
  //   OWNER DECISION 2026-11-25: tag on same line as price, not own row (saves ~20px/card)
  const isAPS = parseFloat(item.price) === 1;
  const headerBlock = (
    <>
      <span className={`veg-label ${item.isEgg ? 'egg' : item.isVeg ? 'veg' : 'non-veg'}`}>
        <span className="veg-dot"></span>
      </span>
      <h3 className="item-name">{item.name}</h3>
      <div className="item-price-row">
        {isAPS ? (
          <div className="item-aps-badge" data-testid="menu-item-aps-badge">
            <span className="aps-badge-text">APS</span>
            <span className="aps-badge-sub">As Per Size</span>
          </div>
        ) : (
          <div className="item-price">₹{item.price}</div>
        )}
        {categoryName && (
          <span className="item-category-tag" data-testid="search-item-category-tag">
            {categoryName}
          </span>
        )}
      </div>
    </>
  );
```

**CSS addition for `.item-price-row`** (append to E6):
```css
/* BUG-2026-11-14-002: price + category tag on same line */
.item-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
```

---

## E3 — OrderItemCard.jsx: APS-aware price (line 217)

**Current line 154 and line 217:**
```jsx
  const itemPrice = getItemPrice();         // line 154
  ...
  <div className="order-item-price">₹{itemPrice.toFixed(2)}</div>   // line 217
```

**Keep line 154 as-is.**

**Replace line 217 only:**
```jsx
          {/* CR-2026-11-14-002: show APS badge for variable-price items (base price===1) */}
          {parseFloat(cartItem.item?.price) === 1 ? (
            <div className="order-item-aps-badge" data-testid="order-item-aps-badge">
              <span className="order-aps-text">APS</span>
              <span className="order-aps-sub">As Per Size</span>
            </div>
          ) : (
            <div className="order-item-price">₹{itemPrice.toFixed(2)}</div>
          )}
```

**Why `cartItem.item?.price` not `itemPrice`:** `itemPrice` is computed total (may include add-ons). We detect APS from the original POS base price (`item.price === 1`), not the computed display total.

---

## E4 — ReviewOrder.jsx: APS info notice (display only)

**Where:** Inside the `showPriceBreakdown` block, just before `<div className="review-order-price-card">` (around line 2048).

**Find (line ~2041–2048):**
```jsx
        <div className="review-order-price-card">
          {/* Item Total */}
          <div className="price-row">
```

**Insert BEFORE that div:**
```jsx
          {/* CR-2026-11-14-002: APS notice — display only when cart has variable-price items */}
          {cartItems.some(ci => parseFloat(ci.item?.price) === 1) && (
            <div className="review-aps-notice" data-testid="review-order-aps-notice">
              <span className="review-aps-notice-icon">ℹ</span>
              <span>
                {cartItems.filter(ci => parseFloat(ci.item?.price) === 1).length === 1
                  ? 'One item has'
                  : `${cartItems.filter(ci => parseFloat(ci.item?.price) === 1).length} items have`
                } variable pricing (APS). Final price confirmed at the counter.
              </span>
            </div>
          )}
```

**Scope rule:** This is display-only. `cartItems` array is READ-ONLY here. No write, no mutation, no payment logic change.

---

## E5 — MenuItems.css: Search meta banner + empty search state

**Append to end of file:**
```css
/* BUG-2026-11-14-002: search meta banner */
.search-meta-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #F9FAFB;
  border-bottom: 1px solid #F0F0F0;
  font-size: 12px;
  color: #6B7280;
}
.search-meta-clear {
  background: none;
  border: none;
  color: #E8622A;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

/* BUG-2026-11-14-002: empty search state */
.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
.empty-search-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #FFF4ED;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.empty-search-title {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 8px;
}
.empty-search-desc {
  font-size: 12px;
  color: #6B7280;
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: 20px;
}
.empty-search-clear-btn {
  padding: 8px 20px;
  border-radius: 8px;
  background: #FFF4ED;
  color: #E8622A;
  border: 1.5px solid #FED7C3;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
```

---

## E6 — MenuItem.css: Category tag + APS badge

**Append to end of file:**
```css
/* BUG-2026-11-14-002: category tag shown in search mode */
.item-category-tag {
  display: inline-block;
  padding: 2px 7px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  color: #6B7280;
  margin-bottom: 4px;
  line-height: 1.4;
}

/* CR-2026-11-14-002: APS badge — replaces ₹1 on menu item card */
.item-aps-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #FFF4ED;
  border: 1.5px solid #FED7C3;
  border-radius: 6px;
  margin-top: 2px;
}
.aps-badge-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #E8622A;
  text-transform: uppercase;
}
.aps-badge-sub {
  font-size: 10px;
  color: #9CA3AF;
  font-style: italic;
}
```

---

## E7 — OrderItemCard.css: APS badge in review

**Append to end of file:**
```css
/* CR-2026-11-14-002: APS badge in order review */
.order-item-aps-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.order-aps-text {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #FFF4ED;
  border: 1.5px solid #FED7C3;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #E8622A;
  text-transform: uppercase;
}
.order-aps-sub {
  font-size: 10px;
  color: #9CA3AF;
  font-style: italic;
}
```

---

## Verification Matrix (unchanged from IA)

| # | Test | Item |
|---|---|---|
| V1 | Search "Tea" → exact match "Tea" is first result | BUG-002 |
| V2 | Search "Ice" → all name-partial matches before desc-only matches | BUG-002 |
| V3 | Veg filter ON + search → only veg items in results | BUG-002 |
| V4 | Cart item in search results → still appears at top of its tier | BUG-002 |
| V5 | Clear search → category-grouped view returns unchanged | BUG-002 |
| V6 | Stock-out items hidden in search results (inventoryEnforced=true) | BUG-002 |
| V7 | No search → banner + category nav visible, existing render loop runs | BUG-002 |
| V8 | No tier labels / match labels visible to customer anywhere | BUG-002 |
| V9 | item.price=1 on menu card shows "APS / As Per Size" not "₹1" | CR-002 |
| V10 | item.price=50 shows "₹50" (unaffected) | CR-002 |
| V11 | APS item in ReviewOrder shows "APS" badge not "₹1.00" | CR-002 |
| V12 | ADD button on APS item works normally | CR-002 |
| V13 | Mixed regular + APS cart — both display correctly | CR-002 |
| V14 | Bill total includes ₹1 per APS item (correct — POS updates) | CR-002 |
| V15 | APS notice appears in price breakdown when APS item in cart | CR-002 |
| V16 | No JS errors, clean compile after all edits | BOTH |

---

## Code Marker Convention

Every changed line must carry:
```
// BUG-2026-11-14-002: <reason>
// CR-2026-11-14-002: <reason>
```

---

**Planning complete: BUG-2026-11-14-002 + CR-2026-11-14-002**  
Stage: Implementation Plan  
7 files · 7 edits · all edit sites verified against live code  
Owner decisions baked in: no tier labels, APS=price===1, ReviewOrder notice display-only  
Next: **OWNER APPROVAL → Role 3 Implementation**
