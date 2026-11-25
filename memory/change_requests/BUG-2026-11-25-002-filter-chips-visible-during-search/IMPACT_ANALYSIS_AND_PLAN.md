# IMPACT ANALYSIS + IMPLEMENTATION PLAN
# BUG-2026-11-25-001 + BUG-2026-11-25-002 (Joint)

**IDs:** BUG-2026-11-25-001 · BUG-2026-11-25-002
**Planning date:** 2026-11-25
**Role:** PLANNING (Role 2)
**Risk:** LOW both items
**Status:** AWAITING OWNER APPROVAL (Role 3 gate)

---

## PART A — IMPACT ANALYSIS

### A1 — Code Reality Check

#### BUG-2026-11-25-001 (Card layout)

**Current headerBlock in `MenuItem.jsx` lines 83–97 (from live code):**
```jsx
<div className="item-price-row">
  {isAPS ? (
    <div className="item-aps-badge" ...>APS</div>
  ) : (
    <div className="item-price">₹{item.price}</div>  // ← price FIRST
  )}
  {categoryName && (
    <span className="item-category-tag" ...>{categoryName}</span>  // ← category SECOND
  )}
</div>
```
**Issue:** Category tag is AFTER price. Owner decision: category BEFORE price (`BEER  ₹180`).

**Current card outer div — `MenuItem.jsx` line 204:**
```jsx
<div className={`menu-item ${!hasImage ? 'menu-item--no-image' : ''}`}>
```
No compact class. No search-mode padding reduction.

**Current no-image padding — `MenuItem.css` line 397:**
```css
.menu-item.menu-item--no-image { padding: 12px 15px; }
```
Target in search mode: `7px 15px` (saves 10px per card).

#### BUG-2026-11-25-002 (Filter chips)

**Current `SearchAndFilterBar.jsx` — props (lines 4–13):**
```jsx
const SearchAndFilterBar = ({ 
  searchQuery, onSearchChange, activeFilter, onFilterChange,
  activeDietaryTags = [], onDietaryTagChange, availableDietaryTags = [],
}) => {
```
No `hideFilters` prop.

**Veg toggle group — lines 62–87:** Rendered unconditionally inside `search-filter-row`. No searchQuery guard.

**Dietary tags row — lines 91–117:** Guarded only by `availableDietaryTags.length > 0`. No searchQuery guard.

**`MenuItems.jsx` — SearchAndFilterBar call lines 697–705:**
```jsx
<SearchAndFilterBar
  searchQuery={searchQuery}
  onSearchChange={...}
  activeFilter={activeFilter}
  onFilterChange={handleFilterChange}
  activeDietaryTags={activeDietaryTags}
  onDietaryTagChange={setActiveDietaryTags}
  availableDietaryTags={availableDietaryTags}
/>
```
No `hideFilters` prop passed.

---

### A2 — Conflict Check

| Check | Result |
|---|---|
| Both touch MenuItem.jsx? | BUG-001 only. No conflict. |
| Both touch MenuItems.jsx? | BUG-002 only (1 prop addition). No conflict. |
| BUG-001 conflicts with BUG-2026-11-14-002? | NO — BUG-002 added `item-price-row` and `categoryName` prop; BUG-001 just reorders children inside that div. Compatible. |
| BUG-002 conflicts with BUG-2026-11-14-001? | NO — BUG-001 guarded PromoBanner and CategoryBox; BUG-002 guards the filter chips. Different components. |
| Safe to implement together? | YES |

---

### A3 — Files WILL Change

| # | File | Bug | Change |
|---|---|---|---|
| E1 | `frontend/src/components/MenuItem/MenuItem.jsx` | BUG-001 | Swap category+price order; add compact class to outer div |
| E2 | `frontend/src/components/MenuItem/MenuItem.css` | BUG-001 | Add `.menu-item--compact` padding rule |
| E3 | `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.jsx` | BUG-002 | Add `hideFilters` prop; wrap chips in guard |
| E4 | `frontend/src/pages/MenuItems.jsx` | BUG-002 | Pass `hideFilters` prop to SearchAndFilterBar |

### Files WILL NOT Change

`CartContext.js` · `ReviewOrder.jsx` · `AuthContext.jsx` · `server.py` · `orderService.ts`

---

## PART B — IMPLEMENTATION PLAN

### E1 — MenuItem.jsx: two targeted edits

---

#### E1-a: Swap category before price in `item-price-row` (lines 83–97)

**Find (exact current code):**
```jsx
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
```

**Replace with:**
```jsx
      {/* BUG-2026-11-25-001: category tag BEFORE price (owner decision 2026-11-25) */}
      <div className="item-price-row">
        {categoryName && (
          <span className="item-category-tag" data-testid="search-item-category-tag">
            {categoryName}
          </span>
        )}
        {isAPS ? (
          <div className="item-aps-badge" data-testid="menu-item-aps-badge">
            <span className="aps-badge-text">APS</span>
            <span className="aps-badge-sub">As Per Size</span>
          </div>
        ) : (
          <div className="item-price">₹{item.price}</div>
        )}
      </div>
```

**What changes:** Category tag moved before price inside the flex row. `item-price-row` is `display:flex` so they sit side-by-side. Layout: `BEER  ₹180`.

---

#### E1-b: Add `menu-item--compact` class when in search mode (line 204)

**Find:**
```jsx
    <div className={`menu-item ${!hasImage ? 'menu-item--no-image' : ''}`}>
```

**Replace with:**
```jsx
    {/* BUG-2026-11-25-001: compact padding in search mode (categoryName set = search mode) */}
    <div className={`menu-item ${!hasImage ? 'menu-item--no-image' : ''} ${categoryName ? 'menu-item--compact' : ''}`}>
```

**What changes:** When `categoryName` is set (search mode only), the outer card gets `menu-item--compact`. Normal browse: class absent, full padding preserved.

---

### E2 — MenuItem.css: compact padding rule

**Append to end of file:**
```css
/* BUG-2026-11-25-001: compact card padding in search mode — search only, normal browse unchanged */
.menu-item.menu-item--compact {
  padding: 7px 15px;
}
.menu-item.menu-item--no-image.menu-item--compact {
  padding: 7px 15px;
  gap: 10px;
}
```

**What changes:** Reduces vertical padding from 12px → 7px each side (saves 10px/card) in search mode.

---

### E3 — SearchAndFilterBar.jsx: add `hideFilters` prop and guards

**Edit E3-a: Add `hideFilters` to props (lines 4–13)**

**Find:**
```jsx
const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  activeFilter, 
  onFilterChange,
  // New props for dietary tags
  activeDietaryTags = [],
  onDietaryTagChange,
  availableDietaryTags = [],
}) => {
```

**Replace with:**
```jsx
const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  activeFilter, 
  onFilterChange,
  // New props for dietary tags
  activeDietaryTags = [],
  onDietaryTagChange,
  availableDietaryTags = [],
  hideFilters = false,  // BUG-2026-11-25-002: hide chips during active search
}) => {
```

---

**Edit E3-b: Guard veg-toggle-group (lines 61–88)**

**Find:**
```jsx
        {/* Veg/Non-Veg/Egg Toggle */}
        <div className="veg-toggle-group" data-testid="veg-toggle-group">
```

**Replace with:**
```jsx
        {/* Veg/Non-Veg/Egg Toggle — BUG-2026-11-25-002: hidden during active search */}
        {!hideFilters && (
        <div className="veg-toggle-group" data-testid="veg-toggle-group">
```

And close the conditional AFTER the closing `</div>` of `veg-toggle-group` (before `</div>` of `search-filter-row`):

**Find:**
```jsx
        </div>
      </div>

      {/* Row 2: Dietary Tags Chips
```

**Replace with:**
```jsx
        </div>
        )}
      </div>

      {/* Row 2: Dietary Tags Chips
```

---

**Edit E3-c: Guard dietary tags row (line 91)**

**Find:**
```jsx
      {availableDietaryTags.length > 0 && (
        <div className="dietary-tags-row" data-testid="dietary-tags-row">
```

**Replace with:**
```jsx
      {/* BUG-2026-11-25-002: also hide dietary tag chips during search */}
      {!hideFilters && availableDietaryTags.length > 0 && (
        <div className="dietary-tags-row" data-testid="dietary-tags-row">
```

---

### E4 — MenuItems.jsx: pass `hideFilters` prop (lines 697–705)

**Find:**
```jsx
          <SearchAndFilterBar
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            activeDietaryTags={activeDietaryTags}
            onDietaryTagChange={setActiveDietaryTags}
            availableDietaryTags={availableDietaryTags}
          />
```

**Replace with:**
```jsx
          {/* BUG-2026-11-25-002: hideFilters hides veg/dietary chips during active search */}
          <SearchAndFilterBar
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            activeDietaryTags={activeDietaryTags}
            onDietaryTagChange={setActiveDietaryTags}
            availableDietaryTags={availableDietaryTags}
            hideFilters={!!searchQuery.trim()}
          />
```

**What changes:** When `searchQuery` has any characters, `hideFilters` is `true` → veg chips and dietary chips both hidden. When cleared, `hideFilters` is `false` → chips reappear.

**Important:** `activeFilter` and `activeDietaryTags` state values are PRESERVED when chips are hidden. If a user had "Veg" selected before typing, that filter is still applied to search results — just the chip UI is hidden.

---

## PART C — VERIFICATION MATRIX

| # | Test | Bug |
|---|---|---|
| V1 | Search "Beer" → each result shows `BEER  ₹180` (category before price) | BUG-001 |
| V2 | Searching shows compact cards (~80px), not tall cards (~100px) | BUG-001 |
| V3 | Normal browse (no search) → full 12px padding, no category tag, unchanged | BUG-001 |
| V4 | APS item in search → `BEER  APS` (category before APS badge) | BUG-001 |
| V5 | Type any search term → filter chips (Veg/Non-Veg/Egg) disappear | BUG-002 |
| V6 | Clear search → filter chips reappear | BUG-002 |
| V7 | Select "Veg" filter, then type search → filter applies in results, chips just hidden | BUG-002 |
| V8 | Dietary tags (if present) also hidden during search | BUG-002 |
| V9 | Normal browse → veg + dietary chips fully visible and functional | BUG-002 |
| V10 | No JS errors, clean compile after all edits | BOTH |

---

## PART D — EDIT SUMMARY (for Role 3)

| Edit | File | Lines | Type |
|---|---|---|---|
| E1-a | MenuItem.jsx | 83–97 | search_replace — swap category/price order |
| E1-b | MenuItem.jsx | 204 | search_replace — add compact class |
| E2 | MenuItem.css | EOF | append — compact padding rule |
| E3-a | SearchAndFilterBar.jsx | 4–13 | search_replace — add hideFilters prop |
| E3-b | SearchAndFilterBar.jsx | 61–88 | search_replace — wrap veg-toggle-group |
| E3-c | SearchAndFilterBar.jsx | 91 | search_replace — guard dietary tags |
| E4 | MenuItems.jsx | 697–705 | search_replace — pass hideFilters prop |

**7 edits · 4 files · all edit sites verified against live code**

---

**Planning complete: BUG-2026-11-25-001 + BUG-2026-11-25-002**
Stage: Impact Analysis + Implementation Plan
Code reality: FULL — all 4 files inspected at exact lines
Risk confirmed: LOW both items
No owner decisions outstanding
Next: **OWNER APPROVAL → Role 3 Implementation**
